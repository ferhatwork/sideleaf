import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Item, Workspace, UserSettings, ActivityLog, ActiveView, ItemType } from '../types';
import { db } from '../services/db';
import { generateId } from '../utils/id';
import { extractDomain, extractUrls } from '../utils/format';

interface UndoAction {
  description: string;
  revert: () => Promise<void>;
}

interface ToastMessage {
  id: string;
  text: string;
  undoable?: boolean;
  undoAction?: UndoAction;
}

interface ExtendedUserSettings extends UserSettings {
  hasInitialized?: boolean;
}

interface WorkpadContextType {
  items: Item[];
  workspaces: Workspace[];
  settings: ExtendedUserSettings;
  activity: ActivityLog[];
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isLoading: boolean;

  // Modals
  isQuickCaptureOpen: boolean;
  setIsQuickCaptureOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isShortcutsOpen: boolean;
  setIsShortcutsOpen: (open: boolean) => void;
  isWorkspaceModalOpen: boolean;
  setIsWorkspaceModalOpen: (open: boolean) => void;

  // CRUD
  addItem: (params: {
    content: string;
    type?: ItemType;
    workspaceId?: string | null;
    checked?: boolean;
    sourceUrl?: string;
  }) => Promise<Item>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  toggleItemCheck: (id: string) => Promise<void>;
  convertItemType: (id: string, targetType: ItemType) => Promise<void>;
  moveItem: (id: string, targetWorkspaceId: string | null) => Promise<void>;
  archiveItem: (id: string) => Promise<void>;
  restoreItem: (id: string) => Promise<void>;
  softDeleteItem: (id: string) => Promise<void>;
  permanentlyDeleteItem: (id: string) => Promise<void>;
  permanentlyDeleteItems: (ids: string[]) => Promise<void>;

  // Workspaces
  createWorkspace: (name: string, color?: string, description?: string) => Promise<Workspace>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;

  // Settings & Data
  updateSettings: (updates: Partial<ExtendedUserSettings>) => Promise<void>;
  importWorkpadData: (
    importedItems: Item[],
    importedWorkspaces: Workspace[],
    mode: 'merge' | 'replace' | 'new_workspace',
    newWorkspaceName?: string
  ) => Promise<void>;
  resetAllData: () => Promise<void>;

  // Toasts & Undo
  toast: ToastMessage | null;
  triggerToast: (text: string, undoAction?: UndoAction) => void;
  performUndo: () => void;
  dismissToast: () => void;
}

const defaultSettings: ExtendedUserSettings = {
  theme: 'dark',
  quickCaptureShortcut: 'Ctrl+Space',
  searchShortcut: 'Ctrl+K',
  autoSaveIntervalMs: 200,
  defaultView: 'today',
  hasInitialized: false,
};

const WorkpadContext = createContext<WorkpadContextType | null>(null);

export function WorkpadProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [settings, setSettings] = useState<ExtendedUserSettings>(defaultSettings);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'today' });
  const [isLoading, setIsLoading] = useState(true);

  // Modal visibility states
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  // Toast & Undo
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const triggerToast = useCallback((text: string, undoAction?: UndoAction) => {
    const id = generateId('toast');
    setToast({
      id,
      text,
      undoable: !!undoAction,
      undoAction,
    });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const performUndo = useCallback(async () => {
    if (toast?.undoAction) {
      const action = toast.undoAction;
      setToast(null);
      await action.revert();
    }
  }, [toast]);

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [loadedItems, loadedWorkspaces, loadedSettings, loadedActivity] = await Promise.all([
          db.getAllItems(),
          db.getAllWorkspaces(),
          db.getSettings() as Promise<ExtendedUserSettings | null>,
          db.getRecentActivity(100),
        ]);

        if (!isMounted) return;

        const currentSettings = loadedSettings || defaultSettings;
        setSettings(currentSettings);
        applyTheme(currentSettings.theme);

        // Only seed starter data on the very first visit (when hasInitialized is not true)
        if (!currentSettings.hasInitialized && loadedItems.length === 0 && loadedWorkspaces.length === 0) {
          const starterWorkspace: Workspace = {
            id: generateId('ws'),
            name: 'Website Redesign',
            color: '#3b82f6',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const starterItems: Item[] = [
            {
              id: generateId('item'),
              workspaceId: null,
              type: 'text',
              content: 'Welcome to Workpad. Press Ctrl+Space anytime to capture a thought.',
              status: 'active',
              order: 1,
              createdAt: Date.now() - 1000 * 60 * 10,
              updatedAt: Date.now() - 1000 * 60 * 10,
            },
            {
              id: generateId('item'),
              workspaceId: null,
              type: 'checklist',
              content: 'Try converting any note into a task with one click',
              checked: false,
              status: 'active',
              order: 2,
              createdAt: Date.now() - 1000 * 60 * 8,
              updatedAt: Date.now() - 1000 * 60 * 8,
            },
            {
              id: generateId('item'),
              workspaceId: starterWorkspace.id,
              type: 'link',
              content: 'Review Stripe webhook documentation for API limits',
              status: 'active',
              order: 3,
              source: {
                url: 'https://docs.stripe.com/webhooks',
                domain: 'docs.stripe.com',
                title: 'Stripe Webhook Limits',
                capturedAt: Date.now() - 1000 * 60 * 5,
              },
              createdAt: Date.now() - 1000 * 60 * 5,
              updatedAt: Date.now() - 1000 * 60 * 5,
            },
          ];

          const updatedSettings = { ...currentSettings, hasInitialized: true };
          await Promise.all([
            db.saveWorkspaces([starterWorkspace]),
            db.saveItems(starterItems),
            db.saveSettings(updatedSettings),
          ]);

          setWorkspaces([starterWorkspace]);
          setItems(starterItems);
          setSettings(updatedSettings);
        } else {
          setItems(loadedItems);
          setWorkspaces(loadedWorkspaces);
          setActivity(loadedActivity);
        }
      } catch (err) {
        console.error('Failed to load Workpad data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // Add Item
  const addItem = useCallback(
    async (params: {
      content: string;
      type?: ItemType;
      workspaceId?: string | null;
      checked?: boolean;
      sourceUrl?: string;
    }): Promise<Item> => {
      const content = params.content.trim();
      let determinedType = params.type || 'text';

      // Auto-detect divider if content is "---"
      if (content === '---' || content === '***') {
        determinedType = 'divider';
      }

      // Auto-detect quote if starts with > or quotes
      if (!params.type && (content.startsWith('>') || /^["“].*["”]$/.test(content))) {
        determinedType = 'quote';
      }

      // Auto-detect URLs if present
      const urls = extractUrls(content);
      let source = undefined;
      if (params.sourceUrl || urls.length > 0) {
        const targetUrl = params.sourceUrl || urls[0];
        source = {
          url: targetUrl,
          domain: extractDomain(targetUrl) || undefined,
          capturedAt: Date.now(),
        };

        // If content is just the URL and type wasn't explicitly set to checklist/quote
        if ((!params.type || params.type === 'text') && urls.length === 1 && content === urls[0]) {
          determinedType = 'link';
        }
      }

      const newItem: Item = {
        id: generateId('item'),
        workspaceId: params.workspaceId !== undefined ? params.workspaceId : null,
        type: determinedType,
        content: content,
        checked: params.checked || false,
        status: 'active',
        order: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        source,
      };

      setItems((prev) => [newItem, ...prev]);
      await db.saveItem(newItem);

      const act: ActivityLog = {
        id: generateId('act'),
        itemId: newItem.id,
        itemTextPreview: newItem.content.slice(0, 40),
        action: 'capture',
        details: `Captured ${newItem.type} item`,
        timestamp: Date.now(),
      };
      setActivity((prev) => [act, ...prev.slice(0, 99)]);
      db.logActivity(act).catch(() => {});

      return newItem;
    },
    []
  );

  // Update Item (Uses functional update to prevent stale closure clobbering)
  const updateItem = useCallback(async (id: string, updates: Partial<Item>) => {
    let itemToPersist: Item | null = null;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const merged = { ...it, ...updates, updatedAt: Date.now() };
        itemToPersist = merged;
        return merged;
      })
    );

    if (itemToPersist) {
      await db.saveItem(itemToPersist);
    }
  }, []);

  // Toggle checklist (Uses functional update)
  const toggleItemCheck = useCallback(
    async (id: string) => {
      let toggledItem: Item | null = null;
      let newCheckedState = false;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          newCheckedState = !it.checked;
          toggledItem = { ...it, checked: newCheckedState, updatedAt: Date.now() };
          return toggledItem;
        })
      );

      if (toggledItem) {
        await db.saveItem(toggledItem);

        const target = toggledItem as Item;
        const act: ActivityLog = {
          id: generateId('act'),
          itemId: target.id,
          itemTextPreview: target.content.slice(0, 40),
          action: 'toggle_task',
          details: newCheckedState ? 'Marked task completed' : 'Marked task incomplete',
          timestamp: Date.now(),
        };
        setActivity((prev) => [act, ...prev.slice(0, 99)]);
        db.logActivity(act).catch(() => {});
      }
    },
    []
  );

  // Convert Item Type
  const convertItemType = useCallback(
    async (id: string, targetType: ItemType) => {
      let previousType: ItemType = 'text';
      let convertedItem: Item | null = null;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          previousType = it.type;
          convertedItem = {
            ...it,
            type: targetType,
            checked: targetType === 'checklist' ? it.checked ?? false : undefined,
            updatedAt: Date.now(),
          };
          return convertedItem;
        })
      );

      if (convertedItem) {
        await db.saveItem(convertedItem);

        triggerToast(`Converted to ${targetType}`, {
          description: `Undo conversion to ${targetType}`,
          revert: async () => {
            await updateItem(id, { type: previousType });
          },
        });
      }
    },
    [triggerToast, updateItem]
  );

  // Move Item to Workspace
  const moveItem = useCallback(
    async (id: string, targetWorkspaceId: string | null) => {
      let prevWorkspaceId: string | null = null;
      let movedItem: Item | null = null;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          prevWorkspaceId = it.workspaceId;
          movedItem = { ...it, workspaceId: targetWorkspaceId, updatedAt: Date.now() };
          return movedItem;
        })
      );

      if (movedItem) {
        await db.saveItem(movedItem);

        const destName = targetWorkspaceId
          ? workspaces.find((w) => w.id === targetWorkspaceId)?.name || 'Workspace'
          : 'Scratch';

        triggerToast(`Moved to ${destName}`, {
          description: 'Undo move',
          revert: async () => {
            await updateItem(id, { workspaceId: prevWorkspaceId });
          },
        });
      }
    },
    [workspaces, triggerToast, updateItem]
  );

  // Archive Item
  const archiveItem = useCallback(
    async (id: string) => {
      let archivedItem: Item | null = null;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          archivedItem = {
            ...it,
            status: 'archived',
            archivedAt: Date.now(),
            updatedAt: Date.now(),
          };
          return archivedItem;
        })
      );

      if (archivedItem) {
        await db.saveItem(archivedItem);

        triggerToast('Item archived', {
          description: 'Undo archive',
          revert: async () => {
            await updateItem(id, { status: 'active', archivedAt: undefined });
          },
        });
      }
    },
    [triggerToast, updateItem]
  );

  // Restore Item
  const restoreItem = useCallback(
    async (id: string) => {
      let restoredItem: Item | null = null;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          restoredItem = {
            ...it,
            status: 'active',
            archivedAt: undefined,
            deletedAt: undefined,
            updatedAt: Date.now(),
          };
          return restoredItem;
        })
      );

      if (restoredItem) {
        await db.saveItem(restoredItem);
        triggerToast('Item restored to active surface');
      }
    },
    [triggerToast]
  );

  // Soft Delete Item (Move to Trash)
  const softDeleteItem = useCallback(
    async (id: string) => {
      let deletedItem: Item | null = null;
      let prevStatus = 'active';

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          prevStatus = it.status;
          deletedItem = {
            ...it,
            status: 'deleted',
            deletedAt: Date.now(),
            updatedAt: Date.now(),
          };
          return deletedItem;
        })
      );

      if (deletedItem) {
        await db.saveItem(deletedItem);

        triggerToast('Item moved to trash', {
          description: 'Undo delete',
          revert: async () => {
            await updateItem(id, { status: prevStatus as any, deletedAt: undefined });
          },
        });
      }
    },
    [triggerToast, updateItem]
  );

  // Permanently Delete Item
  const permanentlyDeleteItem = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      await db.deleteItem(id);
      triggerToast('Item permanently deleted');
    },
    [triggerToast]
  );

  // Permanently Delete Items (Bulk)
  const permanentlyDeleteItems = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      setItems((prev) => prev.filter((it) => !idSet.has(it.id)));
      await db.deleteItems(ids);
      triggerToast(`${ids.length} items permanently deleted`);
    },
    [triggerToast]
  );

  // Workspaces
  const createWorkspace = useCallback(
    async (name: string, color = '#3b82f6', description = ''): Promise<Workspace> => {
      const newWs: Workspace = {
        id: generateId('ws'),
        name: name.trim(),
        color,
        description: description.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setWorkspaces((prev) => [...prev, newWs]);
      await db.saveWorkspace(newWs);
      triggerToast(`Created workspace "${newWs.name}"`);
      return newWs;
    },
    [triggerToast]
  );

  const updateWorkspace = useCallback(async (id: string, updates: Partial<Workspace>) => {
    let wsToSave: Workspace | null = null;
    setWorkspaces((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        wsToSave = { ...w, ...updates, updatedAt: Date.now() };
        return wsToSave;
      })
    );

    if (wsToSave) {
      await db.saveWorkspace(wsToSave);
    }
  }, []);

  const deleteWorkspace = useCallback(
    async (id: string) => {
      const wsToDelete = workspaces.find((w) => w.id === id);
      if (!wsToDelete) return;

      // Keep items by moving them safely to scratch (Spec Section 27 - never lose data)
      setItems((prev) =>
        prev.map((it) => (it.workspaceId === id ? { ...it, workspaceId: null, updatedAt: Date.now() } : it))
      );
      const itemsToUpdate = items
        .filter((i) => i.workspaceId === id)
        .map((i) => ({ ...i, workspaceId: null, updatedAt: Date.now() }));
      await db.saveItems(itemsToUpdate);

      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      await db.deleteWorkspace(id);

      if (activeView.type === 'workspace' && activeView.workspaceId === id) {
        setActiveView({ type: 'today' });
      }

      triggerToast(`Workspace "${wsToDelete.name}" deleted. Notes preserved in Scratch.`);
    },
    [workspaces, items, activeView, triggerToast]
  );

  // Update Settings
  const updateSettings = useCallback(
    async (updates: Partial<ExtendedUserSettings>) => {
      const updated = { ...settings, ...updates };
      setSettings(updated);
      if (updates.theme) {
        applyTheme(updates.theme);
      }
      await db.saveSettings(updated);
    },
    [settings]
  );

  // Import Data (Robust with orphan check and merge recency check)
  const importWorkpadData = useCallback(
    async (
      importedItems: Item[],
      importedWorkspaces: Workspace[],
      mode: 'merge' | 'replace' | 'new_workspace',
      newWorkspaceName?: string
    ) => {
      // Validate all workspace references so orphaned items safely fall back to Scratch
      const validWsIds = new Set(
        mode === 'replace'
          ? importedWorkspaces.map((w) => w.id)
          : [...workspaces.map((w) => w.id), ...importedWorkspaces.map((w) => w.id)]
      );

      const sanitizedItems = importedItems.map((item) => ({
        ...item,
        workspaceId: item.workspaceId && validWsIds.has(item.workspaceId) ? item.workspaceId : null,
      }));

      if (mode === 'replace') {
        // Atomic save new data first before setting state
        await db.saveWorkspaces(importedWorkspaces);
        await db.saveItems(sanitizedItems);
        setWorkspaces(importedWorkspaces);
        setItems(sanitizedItems);
      } else if (mode === 'new_workspace') {
        const ws: Workspace = {
          id: generateId('ws'),
          name: newWorkspaceName || `Imported ${new Date().toLocaleDateString()}`,
          color: '#6366f1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const adjustedItems = sanitizedItems.map((it) => ({
          ...it,
          id: generateId('item'),
          workspaceId: ws.id,
        }));
        await db.saveWorkspace(ws);
        await db.saveItems(adjustedItems);
        setWorkspaces((prev) => [...prev, ws]);
        setItems((prev) => [...adjustedItems, ...prev]);
        setActiveView({ type: 'workspace', workspaceId: ws.id });
      } else {
        // Merge mode: keep newer record if IDs conflict
        const existingItemMap = new Map(items.map((i) => [i.id, i]));
        for (const it of sanitizedItems) {
          const existing = existingItemMap.get(it.id);
          if (!existing || it.updatedAt > existing.updatedAt) {
            existingItemMap.set(it.id, it);
          }
        }
        const mergedItems = Array.from(existingItemMap.values());

        const existingWsMap = new Map(workspaces.map((w) => [w.id, w]));
        for (const w of importedWorkspaces) {
          const existing = existingWsMap.get(w.id);
          if (!existing || w.updatedAt > existing.updatedAt) {
            existingWsMap.set(w.id, w);
          }
        }
        const mergedWorkspaces = Array.from(existingWsMap.values());

        await db.saveWorkspaces(mergedWorkspaces);
        await db.saveItems(mergedItems);
        setWorkspaces(mergedWorkspaces);
        setItems(mergedItems);
      }

      triggerToast(`Imported ${importedItems.length} items successfully`);
    },
    [items, workspaces, triggerToast]
  );

  // Reset All (Sets hasInitialized to true so starter notes never re-seed!)
  const resetAllData = useCallback(async () => {
    await db.clearAllData();
    const cleanSettings: ExtendedUserSettings = { ...settings, hasInitialized: true };
    await db.saveSettings(cleanSettings);
    setItems([]);
    setWorkspaces([]);
    setActivity([]);
    setSettings(cleanSettings);
    setActiveView({ type: 'today' });
    triggerToast('All data cleared. Empty workspace ready.');
  }, [settings, triggerToast]);

  const value = useMemo(
    () => ({
      items,
      workspaces,
      settings,
      activity,
      activeView,
      setActiveView,
      isLoading,
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
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      updateSettings,
      importWorkpadData,
      resetAllData,
      toast,
      triggerToast,
      performUndo,
      dismissToast,
    }),
    [
      items,
      workspaces,
      settings,
      activity,
      activeView,
      isLoading,
      isQuickCaptureOpen,
      isSearchOpen,
      isSettingsOpen,
      isShortcutsOpen,
      isWorkspaceModalOpen,
      addItem,
      updateItem,
      toggleItemCheck,
      convertItemType,
      moveItem,
      archiveItem,
      restoreItem,
      softDeleteItem,
      permanentlyDeleteItems,
      permanentlyDeleteItem,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      updateSettings,
      importWorkpadData,
      resetAllData,
      toast,
      triggerToast,
      performUndo,
      dismissToast,
    ]
  );

  return <WorkpadContext.Provider value={value}>{children}</WorkpadContext.Provider>;
}

export function useWorkpad() {
  const context = useContext(WorkpadContext);
  if (!context) {
    throw new Error('useWorkpad must be used within a WorkpadProvider');
  }
  return context;
}
