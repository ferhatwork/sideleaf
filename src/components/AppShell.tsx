import React, { useState, useEffect, useMemo } from 'react';
import { useSideleaf } from '../hooks/useSideleaf';
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
import { ReminderModal } from './ReminderModal';
import { Toast } from './Toast';
import { Workspace, Item } from '../types';
import { generateExportData, getExportFilename, downloadJsonFile } from '../services/exportImport';

export const AppShell: React.FC = () => {
  const {
    t,
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
    reminderModalItem,
    closeReminderModal,

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
    importSideleafData,
    resetAllData,

    // Toast & Undo/Redo
    toast,
    performUndo,
    performRedo,
    dismissToast,

    // Sections
    sections,
  } = useSideleaf();

  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [ephemeralRevealedSectionId, setEphemeralRevealedSectionId] = useState<string | null>(null);

  // Global Keyboard Shortcuts (Spec Section 9 & 13 & 29)
  useEffect(() => {
    const unregister = registerGlobalShortcuts([
      {
        key: 'space',
        ctrlOrCmd: true,
        description: t.capture.quickCaptureTitle,
        allowInInputs: true,
        action: () => setIsQuickCaptureOpen(true),
      },
      // Mac fallback for Spotlight collision (Spec Section 9.1)
      {
        key: 'space',
        ctrlOrCmd: true,
        shift: true,
        description: t.shortcuts.quickCaptureAlt,
        allowInInputs: true,
        action: () => setIsQuickCaptureOpen(true),
      },
      {
        key: 'k',
        ctrlOrCmd: true,
        description: t.common.search,
        allowInInputs: true,
        action: () => setIsSearchOpen(true),
      },
      {
        key: 's',
        ctrlOrCmd: true,
        description: t.shortcuts.saveBackup,
        allowInInputs: true,
        action: () => {
          const data = generateExportData(workspaces, items, settings, activity, sections);
          downloadJsonFile(getExportFilename(), data);
        },
      },
      // Global Undo (Spec Section 13, 29)
      {
        key: 'z',
        ctrlOrCmd: true,
        description: t.shortcuts.undo,
        allowInInputs: false,
        action: () => performUndo(),
      },
      // Global Redo (Spec Section 29)
      {
        key: 'z',
        ctrlOrCmd: true,
        shift: true,
        description: t.shortcuts.redo,
        allowInInputs: false,
        action: () => performRedo(),
      },
      {
        key: '?',
        shift: true,
        description: t.settings.keyboardTitle,
        allowInInputs: false,
        action: () => setIsShortcutsOpen(true),
      },
      {
        key: 'Escape',
        description: t.shortcuts.closeDialog,
        allowInInputs: true,
        action: () => {
          if (isQuickCaptureOpen) return;
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
    t,
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

  const navigateToItem = (targetItem: Item) => {
    if (targetItem.status === 'archived') {
      setEphemeralRevealedSectionId(null);
      setActiveView({ type: 'archive' });
    } else if (targetItem.status === 'deleted') {
      setEphemeralRevealedSectionId(null);
      setActiveView({ type: 'trash' });
    } else if (targetItem.workspaceId) {
      setEphemeralRevealedSectionId(targetItem.sectionId || null);
      setActiveView({ type: 'workspace', workspaceId: targetItem.workspaceId });
    } else {
      setEphemeralRevealedSectionId(null);
      setActiveView({ type: 'scratch' });
    }

    setTimeout(() => {
      const el = document.getElementById(`item-${targetItem.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-blue-500', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-blue-500');
        }, 2000);
      }
    }, 150);
  };

  const handleSelectItemFromSearch = (item: Item) => {
    navigateToItem(item);
  };

  // Deep-linking from notification click or URL (?item=<id>)
  useEffect(() => {
    if (isLoading || items.length === 0) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('item');
    if (itemId) {
      const target = items.find((i) => i.id === itemId);
      if (target) {
        navigateToItem(target);
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('item');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
    }
  }, [isLoading, items]);

  const handleEmptyTrash = async () => {
    const trashIds = items.filter((i) => i.status === 'deleted').map((i) => i.id);
    await permanentlyDeleteItems(trashIds);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sideleaf-light-bg dark:bg-sideleaf-dark-bg text-neutral-400 font-mono text-xs">
        {t.common.loadingSideleaf}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-sideleaf-light-bg dark:bg-sideleaf-dark-bg text-sideleaf-light-text dark:text-sideleaf-dark-text">
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
                    name: t.workspace.workspaceName,
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
                ephemeralRevealedSectionId={ephemeralRevealedSectionId}
                onClearEphemeralReveal={() => setEphemeralRevealedSectionId(null)}
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
        onImportData={importSideleafData}
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

      <ReminderModal
        isOpen={!!reminderModalItem}
        onClose={closeReminderModal}
        item={reminderModalItem}
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

