import React, { useState, useEffect, useMemo } from 'react';
import { useWorkpad } from '../hooks/useWorkpad';
import { registerGlobalShortcuts } from '../services/shortcuts';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TodayView } from './TodayView';
import { ScratchView } from './ScratchView';
import { WorkspaceView } from './WorkspaceView';
import { RecentView } from './RecentView';
import { ArchiveView } from './ArchiveView';
import { TrashView } from './TrashView';
import { QuickCaptureModal } from './QuickCaptureModal';
import { SearchModal } from './SearchModal';
import { SettingsModal } from './SettingsModal';
import { WorkspaceModal } from './WorkspaceModal';
import { ShortcutsModal } from './ShortcutsModal';
import { Toast } from './Toast';
import { Workspace, Item } from '../types';
import { generateExportData, downloadJsonFile } from '../services/exportImport';

export const AppShell: React.FC = () => {
  const {
    items,
    workspaces,
    settings,
    activity,
    activeView,
    setActiveView,
    isLoading,

    // Modals
    isQuickCaptureOpen,
    setIsQuickCaptureOpen,
    isSearchOpen,
    setIsSearchOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    isWorkspaceModalOpen,
    setIsWorkspaceModalOpen,

    // CRUD
    addItem,
    updateItem,
    toggleItemCheck,
    convertItemType,
    moveItem,
    archiveItem,
    restoreItem,
    softDeleteItem,
    permanentlyDeleteItem,
    permanentlyDeleteItems,

    // Workspaces
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,

    // Settings & Import
    updateSettings,
    importWorkpadData,
    resetAllData,

    // Toast & Undo/Redo
    toast,
    performUndo,
    performRedo,
    dismissToast,
  } = useWorkpad();

  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Keyboard Shortcuts (Spec Section 9 & 13 & 29)
  useEffect(() => {
    const unregister = registerGlobalShortcuts([
      {
        key: 'space',
        ctrlOrCmd: true,
        description: 'Quick Capture',
        allowInInputs: true,
        action: () => setIsQuickCaptureOpen(true),
      },
      // Mac fallback for Spotlight collision (Spec Section 9.1)
      {
        key: 'space',
        ctrlOrCmd: true,
        shift: true,
        description: 'Quick Capture Fallback',
        allowInInputs: true,
        action: () => setIsQuickCaptureOpen(true),
      },
      {
        key: 'k',
        ctrlOrCmd: true,
        description: 'Search',
        allowInInputs: true,
        action: () => setIsSearchOpen(true),
      },
      {
        key: 's',
        ctrlOrCmd: true,
        description: 'Save / Export Backup',
        allowInInputs: true,
        action: () => {
          const data = generateExportData(workspaces, items, settings, activity);
          const dateStr = new Date().toISOString().split('T')[0];
          downloadJsonFile(`workpad-backup-${dateStr}.workpad`, data);
        },
      },
      // Global Undo (Spec Section 13, 29)
      {
        key: 'z',
        ctrlOrCmd: true,
        description: 'Undo last action',
        allowInInputs: false,
        action: () => performUndo(),
      },
      // Global Redo (Spec Section 29)
      {
        key: 'z',
        ctrlOrCmd: true,
        shift: true,
        description: 'Redo previously undone action',
        allowInInputs: false,
        action: () => performRedo(),
      },
      {
        key: '?',
        shift: true,
        description: 'Keyboard Shortcuts',
        allowInInputs: false,
        action: () => setIsShortcutsOpen(true),
      },
      {
        key: 'Escape',
        description: 'Close Modals',
        allowInInputs: true,
        action: () => {
          setIsQuickCaptureOpen(false);
          setIsSearchOpen(false);
          setIsSettingsOpen(false);
          setIsShortcutsOpen(false);
          setIsWorkspaceModalOpen(false);
          setIsMobileSidebarOpen(false);
        },
      },
    ]);

    return () => unregister();
  }, [
    workspaces,
    items,
    settings,
    activity,
    performUndo,
    performRedo,
    setIsQuickCaptureOpen,
    setIsSearchOpen,
    setIsSettingsOpen,
    setIsShortcutsOpen,
    setIsWorkspaceModalOpen,
  ]);

  // Counts
  const counts = useMemo(() => {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const active = items.filter((i) => i.status === 'active');

    const today = active.filter((i) => i.updatedAt >= startOfToday).length;
    const scratch = active.filter((i) => !i.workspaceId).length;
    const recent = activity.length;
    const archive = items.filter((i) => i.status === 'archived').length;
    const trash = items.filter((i) => i.status === 'deleted').length;

    const wsMap: Record<string, number> = {};
    for (const ws of workspaces) {
      wsMap[ws.id] = active.filter((i) => i.workspaceId === ws.id).length;
    }

    return { today, scratch, recent, archive, trash, wsMap };
  }, [items, activity, workspaces]);

  const activeWorkspaceId = activeView.type === 'workspace' ? activeView.workspaceId : null;

  const handleSelectItemFromSearch = (item: Item) => {
    if (item.status === 'archived') {
      setActiveView({ type: 'archive' });
    } else if (item.status === 'deleted') {
      setActiveView({ type: 'trash' });
    } else if (item.workspaceId) {
      setActiveView({ type: 'workspace', workspaceId: item.workspaceId });
    } else {
      setActiveView({ type: 'scratch' });
    }
  };

  const handleEmptyTrash = async () => {
    const trashIds = items.filter((i) => i.status === 'deleted').map((i) => i.id);
    await permanentlyDeleteItems(trashIds);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-workpad-light-bg dark:bg-workpad-dark-bg text-neutral-400 font-mono text-xs">
        Loading Workpad...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-workpad-light-bg dark:bg-workpad-dark-bg text-workpad-light-text dark:text-workpad-dark-text">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          workspaces={workspaces}
          onOpenNewWorkspace={() => {
            setEditingWorkspace(null);
            setIsWorkspaceModalOpen(true);
          }}
          onEditWorkspace={(ws) => {
            setEditingWorkspace(ws);
            setIsWorkspaceModalOpen(true);
          }}
          onDeleteWorkspace={deleteWorkspace}
          onOpenSettings={() => setIsSettingsOpen(true)}
          todayCount={counts.today}
          scratchCount={counts.scratch}
          recentCount={counts.recent}
          archiveCount={counts.archive}
          trashCount={counts.trash}
          workspaceCounts={counts.wsMap}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <Header
            activeView={activeView}
            workspaces={workspaces}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />

          <main className="flex-1 overflow-y-auto">
            {activeView.type === 'today' && (
              <TodayView
                items={items}
                workspaces={workspaces}
                onAdd={addItem}
                onUpdate={updateItem}
                onToggleCheck={toggleItemCheck}
                onConvertType={convertItemType}
                onMove={moveItem}
                onArchive={archiveItem}
                onDelete={softDeleteItem}
                onNavigateToScratch={() => setActiveView({ type: 'scratch' })}
                onNavigateToRecent={() => setActiveView({ type: 'recent' })}
                onNavigateToWorkspace={(id) => setActiveView({ type: 'workspace', workspaceId: id })}
              />
            )}

            {activeView.type === 'scratch' && (
              <ScratchView
                items={items}
                workspaces={workspaces}
                onAdd={addItem}
                onUpdate={updateItem}
                onToggleCheck={toggleItemCheck}
                onConvertType={convertItemType}
                onMove={moveItem}
                onArchive={archiveItem}
                onDelete={softDeleteItem}
              />
            )}

            {activeView.type === 'workspace' && (
              <WorkspaceView
                workspace={
                  workspaces.find((w) => w.id === activeView.workspaceId) || {
                    id: activeView.workspaceId,
                    name: 'Workspace',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  }
                }
                items={items}
                allWorkspaces={workspaces}
                onAdd={addItem}
                onUpdate={updateItem}
                onToggleCheck={toggleItemCheck}
                onConvertType={convertItemType}
                onMove={moveItem}
                onArchive={archiveItem}
                onDelete={softDeleteItem}
                onEditWorkspace={(ws) => {
                  setEditingWorkspace(ws);
                  setIsWorkspaceModalOpen(true);
                }}
                onDeleteWorkspace={deleteWorkspace}
              />
            )}

            {activeView.type === 'recent' && (
              <RecentView
                activity={activity}
                items={items}
                workspaces={workspaces}
                onSelectItem={handleSelectItemFromSearch}
              />
            )}

            {activeView.type === 'archive' && (
              <ArchiveView
                items={items}
                workspaces={workspaces}
                onUpdate={updateItem}
                onToggleCheck={toggleItemCheck}
                onConvertType={convertItemType}
                onMove={moveItem}
                onArchive={archiveItem}
                onRestore={restoreItem}
                onDelete={softDeleteItem}
              />
            )}

            {activeView.type === 'trash' && (
              <TrashView
                items={items}
                workspaces={workspaces}
                onRestore={restoreItem}
                onPermanentDelete={permanentlyDeleteItem}
                onEmptyTrash={handleEmptyTrash}
              />
            )}
          </main>
        </div>
      </div>

      {/* Overlays & Modals */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        onSave={addItem}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        items={items}
        workspaces={workspaces}
        onSelectItem={handleSelectItemFromSearch}
        activeWorkspaceId={activeWorkspaceId}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        workspaces={workspaces}
        items={items}
        activity={activity}
        onImportData={importWorkpadData}
        onResetAllData={resetAllData}
      />

      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => {
          setIsWorkspaceModalOpen(false);
          setEditingWorkspace(null);
        }}
        onCreateWorkspace={createWorkspace}
        editingWorkspace={editingWorkspace}
        onUpdateWorkspace={updateWorkspace}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Floating Toast with Undo */}
      {toast && (
        <Toast
          message={toast.text}
          undoable={toast.undoable}
          onUndo={performUndo}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
};

