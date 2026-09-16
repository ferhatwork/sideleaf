import React, { useMemo, useState } from 'react';
import { ActiveView, Workspace, WorkspaceGroup } from '../types';
import {
  Archive,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  FileEdit,
  Folder,
  FolderPlus,
  GripVertical,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { useSideleaf } from '../hooks/useSideleaf';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  workspaces: Workspace[];
  workspaceGroups: WorkspaceGroup[];
  onOpenNewWorkspace: () => void;
  onEditWorkspace: (ws: Workspace) => void;
  onDeleteWorkspace: (id: string) => void;
  onOpenNewGroup: () => void;
  onEditWorkspaceGroup: (group: WorkspaceGroup) => void;
  onDeleteWorkspaceGroup: (id: string) => void;
  onUpdateWorkspaceGroup: (id: string, updates: Partial<WorkspaceGroup>) => Promise<void>;
  onReorderWorkspaceGroups: (groupIds: string[]) => Promise<void>;
  onReorderWorkspaces: (groupId: string | null, workspaceIds: string[]) => Promise<void>;
  onMoveWorkspaceToGroup: (workspaceId: string, groupId: string | null) => Promise<void>;
  onOpenSettings: () => void;
  todayCount?: number;
  scratchCount?: number;
  recentCount?: number;
  archiveCount: number;
  trashCount: number;
  workspaceCounts: Record<string, number>;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

type DragPayload = { type: 'workspace' | 'group'; id: string };

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  workspaces,
  workspaceGroups,
  onOpenNewWorkspace,
  onEditWorkspace,
  onDeleteWorkspace,
  onOpenNewGroup,
  onEditWorkspaceGroup,
  onDeleteWorkspaceGroup,
  onUpdateWorkspaceGroup,
  onReorderWorkspaceGroups,
  onReorderWorkspaces,
  onMoveWorkspaceToGroup,
  onOpenSettings,
  archiveCount,
  trashCount,
  workspaceCounts,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { t } = useSideleaf();
  const [activeMenuWsId, setActiveMenuWsId] = useState<string | null>(null);
  const [activeMenuGroupId, setActiveMenuGroupId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragPayload | null>(null);

  const sortedGroups = useMemo(
    () => [...workspaceGroups].sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt)),
    [workspaceGroups]
  );

  const sortedWorkspaces = (groupId: string | null) =>
    workspaces
      .filter((workspace) => (workspace.groupId || null) === groupId)
      .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));

  const handleNav = (view: ActiveView) => {
    setActiveView(view);
    onCloseMobile();
  };

  const readDragPayload = (event: React.DragEvent): DragPayload | null => {
    const raw = event.dataTransfer.getData('application/x-sideleaf-drag') || event.dataTransfer.getData('text/plain');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as DragPayload;
      return parsed.type && parsed.id ? parsed : null;
    } catch {
      return null;
    }
  };

  const startDrag = (event: React.DragEvent, payload: DragPayload) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-sideleaf-drag', JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', JSON.stringify(payload));
    setDragging(payload);
  };

  const finishDrag = () => setDragging(null);

  const dropOnGroup = async (event: React.DragEvent, groupId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = readDragPayload(event) || dragging;
    if (!payload) return;

    if (payload.type === 'workspace') {
      await onMoveWorkspaceToGroup(payload.id, groupId);
    } else if (payload.id !== groupId) {
      const groupIds = sortedGroups.map((group) => group.id);
      const fromIndex = groupIds.indexOf(payload.id);
      const toIndex = groupIds.indexOf(groupId);
      if (fromIndex >= 0 && toIndex >= 0) {
        groupIds.splice(fromIndex, 1);
        groupIds.splice(toIndex, 0, payload.id);
        await onReorderWorkspaceGroups(groupIds);
      }
    }
    finishDrag();
  };

  const dropOnWorkspace = async (event: React.DragEvent, target: Workspace) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = readDragPayload(event) || dragging;
    if (!payload || payload.type !== 'workspace' || payload.id === target.id) return finishDrag();

    const groupId = target.groupId || null;
    const bucketIds = sortedWorkspaces(groupId).map((workspace) => workspace.id).filter((id) => id !== payload.id);
    const targetIndex = bucketIds.indexOf(target.id);
    bucketIds.splice(Math.max(targetIndex, 0), 0, payload.id);
    await onReorderWorkspaces(groupId, bucketIds);
    finishDrag();
  };

  const renderWorkspace = (workspace: Workspace, groupId: string | null) => {
    const isActive = activeView.type === 'workspace' && activeView.workspaceId === workspace.id;
    const isMenuOpen = activeMenuWsId === workspace.id;
    const count = workspaceCounts[workspace.id] || 0;

    return (
      <div
        key={workspace.id}
        className={`relative group rounded-lg ${dragging?.id === workspace.id ? 'opacity-50' : ''}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => void dropOnWorkspace(event, workspace)}
      >
        <button
          onClick={() => handleNav({ type: 'workspace', workspaceId: workspace.id })}
          className={`w-full pl-1.5 pr-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors focus-ring ${
            isActive
              ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <span
              draggable
              onDragStart={(event) => startDrag(event, { type: 'workspace', id: workspace.id })}
              onDragEnd={finishDrag}
              className="p-1 -ml-1 rounded cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-300 touch-none"
              title={t.workspace.dragToReorderWorkspace}
              aria-label={t.workspace.dragToReorderWorkspace}
              onClick={(event) => event.stopPropagation()}
            >
              <GripVertical className="w-3 h-3" />
            </span>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: workspace.color || '#3b82f6' }} />
            <span className="truncate">{workspace.name}</span>
            {isActive && <span className="text-[9px] text-blue-500 font-bold ml-0.5" title={t.common.activeStatus}>●</span>}
          </div>
          {count > 0 && <span className="text-[11px] font-mono text-neutral-400 group-hover:opacity-0 group-focus-within:opacity-0 transition-opacity">{count}</span>}
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            setActiveMenuWsId(isMenuOpen ? null : workspace.id);
            setActiveMenuGroupId(null);
          }}
          className="absolute right-2 top-1.5 p-0.5 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-opacity focus-ring"
          aria-label={t.workspace.workspaceOptions(workspace.name)}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-2 top-8 z-50 w-48 py-1 rounded-md bg-white dark:bg-sideleaf-dark-elevated shadow-lg border border-neutral-200 dark:border-neutral-700 text-xs" onMouseLeave={() => setActiveMenuWsId(null)}>
            <button onClick={() => { onEditWorkspace(workspace); setActiveMenuWsId(null); }} className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-200"><Edit2 className="w-3 h-3" /> {t.common.edit}</button>
            <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-semibold text-neutral-400">{t.workspace.workspaceGroup}</div>
            <button onClick={() => { void onMoveWorkspaceToGroup(workspace.id, null); setActiveMenuWsId(null); }} className={`w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 ${groupId === null ? 'font-semibold' : ''}`}>{t.workspace.workspaceGroupNone}</button>
            {sortedGroups.map((group) => (
              <button key={group.id} onClick={() => { void onMoveWorkspaceToGroup(workspace.id, group.id); setActiveMenuWsId(null); }} className={`w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 truncate ${groupId === group.id ? 'font-semibold' : ''}`}>{group.name}</button>
            ))}
            <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
            <button onClick={() => { onDeleteWorkspace(workspace.id); setActiveMenuWsId(null); }} className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 text-red-600 dark:text-red-400"><Trash2 className="w-3 h-3" /> {t.common.delete}</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isOpenMobile && <div onClick={onCloseMobile} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden" />}

      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-60 flex-shrink-0 bg-neutral-50/70 dark:bg-sideleaf-dark-surface border-r border-neutral-200/80 dark:border-sideleaf-dark-border flex flex-col justify-between transition-transform duration-200 ease-in-out ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="px-3 py-2 flex items-center gap-2.5">
            <img src="/sideleaf-mainsymbol.png" alt="Sideleaf" className="w-7 h-7 rounded-md object-cover" />
            <div><span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">Sideleaf</span><span className="text-[10px] text-neutral-400 block font-mono -mt-0.5">{t.common.localOnly}</span></div>
          </div>

          <div className="space-y-0.5">
            <button onClick={() => handleNav({ type: 'today' })} className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center transition-colors focus-ring ${activeView.type === 'today' ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'}`}><Calendar className="w-3.5 h-3.5 mr-2.5 text-neutral-500 dark:text-neutral-400" /><span>{t.navigation.today}</span></button>
            <button onClick={() => handleNav({ type: 'scratch' })} className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center transition-colors focus-ring ${activeView.type === 'scratch' ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'}`}><FileEdit className="w-3.5 h-3.5 mr-2.5 text-neutral-500 dark:text-neutral-400" /><span>{t.navigation.scratch}</span></button>
            <button onClick={() => handleNav({ type: 'recent' })} className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center transition-colors focus-ring ${activeView.type === 'recent' ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'}`}><Clock className="w-3.5 h-3.5 mr-2.5 text-neutral-500 dark:text-neutral-400" /><span>{t.navigation.recent}</span></button>
          </div>

          <div className="pt-1">
            <div className="px-3 py-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{t.navigation.workspaces}</span>
              <div className="flex items-center gap-0.5">
                <button onClick={onOpenNewGroup} className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors focus-ring" title={t.workspace.newWorkspaceGroup} aria-label={t.workspace.newWorkspaceGroup}><FolderPlus className="w-3.5 h-3.5" /></button>
                <button onClick={onOpenNewWorkspace} className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors focus-ring" title={t.workspace.newWorkspace} aria-label={t.workspace.newWorkspace}><Plus className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="space-y-1 mt-1">
              {sortedGroups.map((group) => {
                const members = sortedWorkspaces(group.id);
                const isGroupMenuOpen = activeMenuGroupId === group.id;
                const isDraggingGroup = dragging?.type === 'group' && dragging.id === group.id;
                const activeWorkspaceIsInside = members.some((workspace) => activeView.type === 'workspace' && activeView.workspaceId === workspace.id);
                const isGroupCollapsed = Boolean(group.collapsed) && !activeWorkspaceIsInside;
                return (
                  <div key={group.id} className={`${isDraggingGroup ? 'opacity-50' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => void dropOnGroup(event, group.id)}>
                    <div className="relative group flex items-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/40">
                      <span draggable onDragStart={(event) => startDrag(event, { type: 'group', id: group.id })} onDragEnd={finishDrag} className="p-1 ml-1 rounded cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-300 touch-none" title={t.workspace.dragToReorderWorkspaceGroup} aria-label={t.workspace.dragToReorderWorkspaceGroup}><GripVertical className="w-3 h-3" /></span>
                      <button onClick={() => void onUpdateWorkspaceGroup(group.id, { collapsed: !group.collapsed })} className="flex-1 min-w-0 px-1.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 text-left focus-ring" aria-label={isGroupCollapsed ? t.workspace.expandWorkspaceGroup : t.workspace.collapseWorkspaceGroup}>
                        {isGroupCollapsed ? <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />}<Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: group.color || '#0f766e' }} /><span className="truncate">{group.name}</span><span className="text-[10px] font-mono text-neutral-400 ml-auto">{members.length}</span>
                      </button>
                      <button onClick={() => { setActiveMenuGroupId(isGroupMenuOpen ? null : group.id); setActiveMenuWsId(null); }} className="p-1 mr-1 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 focus-ring" aria-label={t.workspace.workspaceGroupOptions(group.name)}><MoreHorizontal className="w-3.5 h-3.5" /></button>
                      {isGroupMenuOpen && <div className="absolute right-1 top-8 z-50 w-40 py-1 rounded-md bg-white dark:bg-sideleaf-dark-elevated shadow-lg border border-neutral-200 dark:border-neutral-700 text-xs" onMouseLeave={() => setActiveMenuGroupId(null)}><button onClick={() => { onEditWorkspaceGroup(group); setActiveMenuGroupId(null); }} className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-200"><Edit2 className="w-3 h-3" /> {t.common.edit}</button><button onClick={() => { if (window.confirm(t.workspace.deleteWorkspaceGroupConfirmPrompt)) onDeleteWorkspaceGroup(group.id); setActiveMenuGroupId(null); }} className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 text-red-600 dark:text-red-400"><Trash2 className="w-3 h-3" /> {t.workspace.deleteWorkspaceGroup}</button></div>}
                    </div>
                    {!isGroupCollapsed && <div className="ml-3 pl-2 border-l border-neutral-200 dark:border-neutral-800 space-y-0.5">{members.map((workspace) => renderWorkspace(workspace, group.id))}</div>}
                  </div>
                );
              })}

              {(sortedWorkspaces(null).length > 0 || sortedGroups.length > 0) && <div className="pt-1">{sortedGroups.length > 0 && <div className="px-3 pb-1 text-[9px] uppercase tracking-wider font-semibold text-neutral-400">{t.workspace.workspaceGroupNone}</div>}<div className="space-y-0.5">{sortedWorkspaces(null).map((workspace) => renderWorkspace(workspace, null))}</div></div>}
              {workspaces.length === 0 && workspaceGroups.length === 0 && <div className="px-3 py-2 text-[11px] text-neutral-400 italic">{t.workspace.emptySubheading}</div>}
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-200/50 dark:border-neutral-800/60 space-y-0.5">
            <button onClick={() => handleNav({ type: 'archive' })} className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors focus-ring ${activeView.type === 'archive' ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'}`}><span className="flex items-center gap-2.5"><Archive className="w-3.5 h-3.5 text-neutral-400" /><span>{t.navigation.archive}</span></span>{archiveCount > 0 && <span className="text-[11px] font-mono text-neutral-400">{archiveCount}</span>}</button>
            <button onClick={() => handleNav({ type: 'trash' })} className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors focus-ring ${activeView.type === 'trash' ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'}`}><span className="flex items-center gap-2.5"><Trash2 className="w-3.5 h-3.5 text-neutral-400" /><span>{t.navigation.trash}</span></span>{trashCount > 0 && <span className="text-[11px] font-mono text-neutral-400">{trashCount}</span>}</button>
          </div>
        </div>

        <div className="p-3 border-t border-neutral-200/80 dark:border-sideleaf-dark-border"><button onClick={onOpenSettings} className="w-full px-3 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 flex items-center gap-2.5 transition-colors focus-ring"><Settings className="w-4 h-4 text-neutral-400" /><span>{t.navigation.settingsAndData}</span></button></div>
      </aside>
    </>
  );
};
