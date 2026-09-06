import React, { useState } from 'react';
import { ActiveView, Workspace } from '../types';
import {
  Calendar,
  FileEdit,
  Plus,
  Clock,
  Archive,
  Trash2,
  Settings,
  MoreHorizontal,
  Edit2,
} from 'lucide-react';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  workspaces: Workspace[];
  onOpenNewWorkspace: () => void;
  onEditWorkspace: (ws: Workspace) => void;
  onDeleteWorkspace: (id: string) => void;
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

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  workspaces,
  onOpenNewWorkspace,
  onEditWorkspace,
  onDeleteWorkspace,
  onOpenSettings,
  archiveCount,
  trashCount,
  workspaceCounts,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [activeMenuWsId, setActiveMenuWsId] = useState<string | null>(null);

  const handleNav = (view: ActiveView) => {
    setActiveView(view);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-60 flex-shrink-0 bg-neutral-50/70 dark:bg-workpad-dark-surface border-r border-neutral-200/80 dark:border-workpad-dark-border flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Logo & Primary Nav */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Logo / Brand */}
          <div className="px-3 py-2 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-wider">
              W
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
                Workpad
              </span>
              <span className="text-[10px] text-neutral-400 block font-mono -mt-0.5">
                local-first surface
              </span>
            </div>
          </div>

          {/* Primary Sections */}
          <div className="space-y-0.5">
            <button
              onClick={() => handleNav({ type: 'today' })}
              className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors focus-ring ${
                activeView.type === 'today'
                  ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Today</span>
              </div>
            </button>

            <button
              onClick={() => handleNav({ type: 'scratch' })}
              className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors focus-ring ${
                activeView.type === 'scratch'
                  ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileEdit className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Scratch</span>
              </div>
            </button>

            <button
              onClick={() => handleNav({ type: 'recent' })}
              className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors focus-ring ${
                activeView.type === 'recent'
                  ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Recent</span>
              </div>
            </button>
          </div>

          {/* Workspaces Section */}
          <div className="pt-1">
            <div className="px-3 py-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Workspaces
              </span>
              <button
                onClick={onOpenNewWorkspace}
                className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors focus-ring"
                title="Create Workspace"
                aria-label="Create new workspace"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5 mt-1">
              {workspaces.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-neutral-400 italic">
                  Create a workspace when a project deserves one.
                </div>
              ) : (
                workspaces.map((ws) => {
                  const isActive =
                    activeView.type === 'workspace' && activeView.workspaceId === ws.id;
                  const isMenuOpen = activeMenuWsId === ws.id;
                  const count = workspaceCounts[ws.id] || 0;

                  return (
                    <div key={ws.id} className="relative group">
                      <button
                        onClick={() => handleNav({ type: 'workspace', workspaceId: ws.id })}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors focus-ring ${
                          isActive
                            ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: ws.color || '#3b82f6' }}
                          />
                          <span className="truncate">{ws.name}</span>
                          {isActive && (
                            <span className="text-[9px] text-blue-500 font-bold ml-0.5" title="Active">
                              ●
                            </span>
                          )}
                        </div>
                        {count > 0 && (
                          <span className="text-[11px] font-mono text-neutral-400 group-hover:opacity-0 group-focus-within:opacity-0 transition-opacity">
                            {count}
                          </span>
                        )}
                      </button>

                      {/* Options menu trigger (visible on hover AND focus) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuWsId(isMenuOpen ? null : ws.id);
                        }}
                        className="absolute right-2 top-1.5 p-0.5 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-opacity focus-ring"
                        aria-label={`Options for workspace ${ws.name}`}
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <div
                          className="absolute right-2 top-8 z-50 w-36 py-1 rounded-md bg-white dark:bg-workpad-dark-elevated shadow-lg border border-neutral-200 dark:border-neutral-700 text-xs"
                          onMouseLeave={() => setActiveMenuWsId(null)}
                        >
                          <button
                            onClick={() => {
                              onEditWorkspace(ws);
                              setActiveMenuWsId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-200"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              onDeleteWorkspace(ws.id);
                              setActiveMenuWsId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Archive & Trash */}
          <div className="pt-2 border-t border-neutral-200/50 dark:border-neutral-800/60 space-y-0.5">
            <button
              onClick={() => handleNav({ type: 'archive' })}
              className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors focus-ring ${
                activeView.type === 'archive'
                  ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Archive className="w-3.5 h-3.5 text-neutral-400" />
                <span>Archive</span>
              </div>
              {archiveCount > 0 && (
                <span className="text-[11px] font-mono text-neutral-400">{archiveCount}</span>
              )}
            </button>

            <button
              onClick={() => handleNav({ type: 'trash' })}
              className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors focus-ring ${
                activeView.type === 'trash'
                  ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Trash</span>
              </div>
              {trashCount > 0 && (
                <span className="text-[11px] font-mono text-neutral-400">{trashCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Bar: Settings */}
        <div className="p-3 border-t border-neutral-200/80 dark:border-workpad-dark-border">
          <button
            onClick={onOpenSettings}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 flex items-center gap-2.5 transition-colors focus-ring"
          >
            <Settings className="w-4 h-4 text-neutral-400" />
            <span>Settings & Data</span>
          </button>
        </div>
      </aside>
    </>
  );
};
