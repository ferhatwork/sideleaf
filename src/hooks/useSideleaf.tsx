import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import {
  Item,
  Workspace,
  UserSettings,
  Locale,
  ActivityLog,
  ActiveView,
  ItemType,
  WorkSession,
  CreateItemParams,
  ApplicationCommands,
  ActivityAction,
} from '../types';
import { detectSystemLocale, getTranslation, TranslationSchema } from '../i18n';
import { db } from '../services/db';
import { generateId } from '../utils/id';
import { createItemRecord, updateWorkSession } from '../utils/domain';
import { usePwaInstall } from './usePwaInstall';

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

interface SideleafContextType extends ApplicationCommands {
  items: Item[];
  workspaces: Workspace[];
  settings: ExtendedUserSettings;
  activity: ActivityLog[];
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isLoading: boolean;

  // Working On / Context & Work Session (Spec Sections 15, 16, 58)
  currentWorkspaceId: string | null;
  setCurrentWorkspace: (workspaceId: string | null) => void;
  setCurrentWorkspaceId: (workspaceId: string | null) => void;
  currentSession: WorkSession | null;

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

  // CRUD / Commands
  addItem: (params: CreateItemParams) => Promise<Item>;
  createItem: (params: CreateItemParams) => Promise<Item>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  toggleItemCheck: (id: string) => Promise<void>;
  convertToTask: (id: string) => Promise<void>;
  convertItemType: (id: string, targetType: ItemType) => Promise<void>;
  moveItem: (id: string, targetWorkspaceId: string | null) => Promise<void>;
  archiveItem: (id: string) => Promise<void>;
  restoreItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  softDeleteItem: (id: string) => Promise<void>;
  permanentlyDeleteItem: (id: string) => Promise<void>;
  permanentlyDeleteItems: (ids: string[]) => Promise<void>;

  // Workspaces
  createWorkspace: (name: string, color?: string, description?: string) => Promise<Workspace>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;

  // Settings & Data
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  importSideleafData: (
    items: Item[],
    workspaces: Workspace[],
    mode: 'merge' | 'replace' | 'new_workspace',
    newWorkspaceName?: string
  ) => Promise<void>;
  importWorkpadData: (
    items: Item[],
    workspaces: Workspace[],
    mode: 'merge' | 'replace' | 'new_workspace',
    newWorkspaceName?: string
  ) => Promise<void>;
  resetAllData: () => Promise<void>;

  // i18n & Localization
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: TranslationSchema;

  // Toasts & Undo
  toast: ToastMessage | null;
  triggerToast: (text: string, undoAction?: UndoAction) => void;
  performUndo: () => void;
  performRedo: () => void;
  dismissToast: () => void;

  // PWA Installation (Spec Sections 11, 13)
  canInstallPwa: boolean;
  installPwa: () => Promise<void>;
}

const defaultSettings: ExtendedUserSettings = {
  theme: 'dark',
  locale: detectSystemLocale(),
  quickCaptureShortcut: 'Ctrl+Space',
  searchShortcut: 'Ctrl+K',
  autoSaveIntervalMs: 200,
  defaultView: 'today',
  hasInitialized: false,
};

const SideleafContext = createContext<SideleafContextType | null>(null);

export function SideleafProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [settings, setSettings] = useState<ExtendedUserSettings>(defaultSettings);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'today' });
  const [isLoading, setIsLoading] = useState(true);

  // Working On / Context & Work Session (Spec Sections 15, 16, 58)
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);

  // Modal visibility states
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  // PWA Installation state & prompt
  const { canInstallPwa, installPwa } = usePwaInstall();

  // Toast & Undo/Redo Stack (Spec Section 29, 53, 54)
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const undoStackRef = useRef<UndoAction[]>([]);
  const redoStackRef = useRef<UndoAction[]>([]);

  const triggerToast = useCallback((text: string, undoAction?: UndoAction) => {
    const id = generateId('toast');
    if (undoAction) {
      undoStackRef.current.push(undoAction);
      if (undoStackRef.current.length > 50) {
        undoStackRef.current.shift();
      }
    }
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
    const action = undoStackRef.current.pop();
    if (action) {
      setToast(null);
      await action.revert();
    }
  }, []);

  const performRedo = useCallback(async () => {
    const action = redoStackRef.current.pop();
    if (action) {
      setToast(null);
      await action.revert();
    }
  }, []);

  // Sync currentWorkspaceId and session when activeView changes to a workspace
  useEffect(() => {
    if (activeView.type === 'workspace') {
      setCurrentWorkspaceId(activeView.workspaceId);
      const wsName = workspaces.find((w) => w.id === activeView.workspaceId)?.name;
      setCurrentSession((prev) =>
        updateWorkSession(prev, activeView.workspaceId, wsName, Date.now(), false)
      );
    }
  }, [activeView, workspaces]);

  // Touch session helper (Spec Section 16)
  const touchSession = useCallback(
    (targetWorkspaceId?: string | null) => {
      const effectiveWsId = targetWorkspaceId !== undefined ? targetWorkspaceId : currentWorkspaceId;
      const wsName = effectiveWsId ? workspaces.find((w) => w.id === effectiveWsId)?.name : undefined;
      setCurrentSession((prev) =>
        updateWorkSession(prev, effectiveWsId ?? null, wsName, Date.now(), true)
      );
    },
    [currentWorkspaceId, workspaces]
  );

  // Set current workspace context (Spec Section 15, 58)
  const setCurrentWorkspace = useCallback(
    (workspaceId: string | null) => {
      setCurrentWorkspaceId(workspaceId);
      const wsName = workspaceId ? workspaces.find((w) => w.id === workspaceId)?.name : undefined;
      setCurrentSession((prev) =>
        updateWorkSession(prev, workspaceId, wsName, Date.now(), false)
      );
    },
    [workspaces]
  );

  // Load initial data (Clean first-run experience: Spec Section 13, 27)
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

        const detectedLocale = detectSystemLocale();
        const currentSettings: ExtendedUserSettings = loadedSettings
          ? {
              ...defaultSettings,
              ...loadedSettings,
              locale: loadedSettings.locale || detectedLocale,
            }
          : { ...defaultSettings, locale: detectedLocale };
        setSettings(currentSettings);
        applyTheme(currentSettings.theme);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = currentSettings.locale;
        }

        // Only seed realistic starter data on very first run (no fake tutorial/marketing cards!)
        if (!currentSettings.hasInitialized && loadedItems.length === 0) {
          const starterItems: Item[] = [
            {
              id: generateId('item'),
              workspaceId: null,
              type: 'text',
              content: 'Review project notes',
              status: 'active',
              order: Date.now(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ];

          const updatedSettings = { ...currentSettings, hasInitialized: true };
          await Promise.all([
            db.saveItems(starterItems),
            db.saveSettings(updatedSettings),
          ]);

          setItems(starterItems);
          setWorkspaces(loadedWorkspaces);
          setActivity(loadedActivity);
          setSettings(updatedSettings);
        } else {
          setItems(loadedItems);
          setWorkspaces(loadedWorkspaces);
          setActivity(loadedActivity);
        }
      } catch (err) {
        console.error('Failed to load Sideleaf data', err);
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

  // Add / Create Item (Spec Section 80-81, 101: silent workspace inheritance)
  const addItem = useCallback(
    async (params: CreateItemParams): Promise<Item> => {
      const newItem = createItemRecord(params, currentWorkspaceId, Date.now());

      setItems((prev) => [newItem, ...prev]);
      await db.saveItem(newItem);

      touchSession(newItem.workspaceId);

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
    [currentWorkspaceId, touchSession]
  );

  const createItem = addItem;

  // Update Item (Uses functional update to prevent stale closure clobbering)
  const updateItem = useCallback(
    async (id: string, updates: Partial<Item>) => {
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
        touchSession((itemToPersist as Item).workspaceId);
      }
    },
    [touchSession]
  );

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
        touchSession(target.workspaceId);

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
    [touchSession]
  );

  // Convert Item Type (General)
  const convertItemType = useCallback(
    async (id: string, targetType: ItemType) => {
      let previousType: ItemType = 'text';
      let previousChecked: boolean | undefined = undefined;
      let convertedItem: Item | null = null;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          previousType = it.type;
          previousChecked = it.checked;
          convertedItem = {
            ...it,
            type: targetType,
            checked: targetType === 'checklist' ? (it.checked ?? false) : undefined,
            updatedAt: Date.now(),
          };
          return convertedItem;
        })
      );

      if (convertedItem) {
        await db.saveItem(convertedItem);
        touchSession((convertedItem as Item).workspaceId);

        const actionType: ActivityAction = targetType === 'checklist' ? 'convert_task' : 'edit';
        const act: ActivityLog = {
          id: generateId('act'),
          itemId: id,
          itemTextPreview: (convertedItem as Item).content.slice(0, 40),
          action: actionType,
          details: `Converted item to ${targetType}`,
          timestamp: Date.now(),
        };
        setActivity((prev) => [act, ...prev.slice(0, 99)]);
        db.logActivity(act).catch(() => {});

        triggerToast(targetType === 'checklist' ? 'Converted to task' : `Converted to ${targetType}`, {
          description: `Undo conversion to ${targetType}`,
          revert: async () => {
            await updateItem(id, { type: previousType, checked: previousChecked });
          },
        });
      }
    },
    [triggerToast, updateItem, touchSession]
  );

  // Convert to task command (Spec Section 80-81, 12)
  const convertToTask = useCallback(
    async (id: string) => {
      await convertItemType(id, 'checklist');
    },
    [convertItemType]
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
        touchSession(targetWorkspaceId);

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
    [workspaces, triggerToast, updateItem, touchSession]
  );

  // Archive Item
  const archiveItem = useCallback(
    async (id: string) => {
      let archivedItem: Item | null = null;
      let prevStatus = 'active';

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          prevStatus = it.status;
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
        touchSession((archivedItem as Item).workspaceId);

        triggerToast('Item archived', {
          description: 'Undo archive',
          revert: async () => {
            await updateItem(id, { status: prevStatus as any, archivedAt: undefined });
          },
        });
      }
    },
    [triggerToast, updateItem, touchSession]
  );

  // Restore Item
  const restoreItem = useCallback(
    async (id: string) => {
      let restoredItem: Item | null = null;
      let prevStatus = 'archived';
      let prevArchivedAt: number | undefined = undefined;
      let prevDeletedAt: number | undefined = undefined;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          prevStatus = it.status;
          prevArchivedAt = it.archivedAt;
          prevDeletedAt = it.deletedAt;
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
        touchSession((restoredItem as Item).workspaceId);
        triggerToast('Item restored to active surface', {
          description: 'Undo restore',
          revert: async () => {
            await updateItem(id, {
              status: prevStatus as any,
              archivedAt: prevArchivedAt,
              deletedAt: prevDeletedAt,
            });
          },
        });
      }
    },
    [triggerToast, updateItem, touchSession]
  );

  // Soft Delete Item (Move to Trash, Spec Section 53, 54)
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
        touchSession((deletedItem as Item).workspaceId);

        triggerToast('Item moved to trash', {
          description: 'Undo delete',
          revert: async () => {
            await updateItem(id, { status: prevStatus as any, deletedAt: undefined });
          },
        });
      }
    },
    [triggerToast, updateItem, touchSession]
  );

  // deleteItem alias for softDeleteItem (Spec Section 80-81)
  const deleteItem = softDeleteItem;

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

      if (currentWorkspaceId === id) {
        setCurrentWorkspace(null);
      }

      if (activeView.type === 'workspace' && activeView.workspaceId === id) {
        setActiveView({ type: 'today' });
      }

      triggerToast(`Workspace "${wsToDelete.name}" deleted. Notes preserved in Scratch.`);
    },
    [workspaces, items, activeView, currentWorkspaceId, setCurrentWorkspace, triggerToast]
  );

  // Update Settings
  const updateSettings = useCallback(
    async (updates: Partial<ExtendedUserSettings>) => {
      const updated = { ...settings, ...updates };
      setSettings(updated);
      if (updates.theme) {
        applyTheme(updates.theme);
      }
      if (updates.locale && typeof document !== 'undefined') {
        document.documentElement.lang = updates.locale;
      }
      await db.saveSettings(updated);
    },
    [settings]
  );

  // Import Data (Robust with orphan check and merge recency check)
  const importSideleafData = useCallback(
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
    setCurrentSession(null);
    setCurrentWorkspaceId(null);
    undoStackRef.current = [];
    setSettings(cleanSettings);
    setActiveView({ type: 'today' });
    triggerToast('All data cleared. Empty workspace ready.');
  }, [settings, triggerToast]);

  const currentLocale: Locale = settings.locale || detectSystemLocale();
  const t: TranslationSchema = useMemo(() => getTranslation(currentLocale), [currentLocale]);

  const setLocale = useCallback(
    async (newLocale: Locale) => {
      await updateSettings({ locale: newLocale });
    },
    [updateSettings]
  );

  const value = useMemo(
    () => ({
      items,
      workspaces,
      settings,
      activity,
      activeView,
      setActiveView,
      isLoading,
      currentWorkspaceId,
      setCurrentWorkspace,
      setCurrentWorkspaceId: setCurrentWorkspace,
      currentSession,
      locale: currentLocale,
      setLocale,
      t,
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
      createItem,
      updateItem,
      toggleItemCheck,
      convertToTask,
      convertItemType,
      moveItem,
      archiveItem,
      restoreItem,
      deleteItem,
      softDeleteItem,
      permanentlyDeleteItem,
      permanentlyDeleteItems,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      updateSettings,
      importSideleafData,
      importWorkpadData: importSideleafData,
      resetAllData,
      toast,
      triggerToast,
      performUndo,
      performRedo,
      dismissToast,
      canInstallPwa,
      installPwa,
    }),
    [
      items,
      workspaces,
      settings,
      activity,
      activeView,
      isLoading,
      currentWorkspaceId,
      setCurrentWorkspace,
      currentSession,
      currentLocale,
      setLocale,
      t,
      isQuickCaptureOpen,
      isSearchOpen,
      isSettingsOpen,
      isShortcutsOpen,
      isWorkspaceModalOpen,
      addItem,
      createItem,
      updateItem,
      toggleItemCheck,
      convertToTask,
      convertItemType,
      moveItem,
      archiveItem,
      restoreItem,
      deleteItem,
      softDeleteItem,
      permanentlyDeleteItems,
      permanentlyDeleteItem,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      updateSettings,
      importSideleafData,
      resetAllData,
      toast,
      triggerToast,
      performUndo,
      performRedo,
      dismissToast,
      canInstallPwa,
      installPwa,
    ]
  );

  return <SideleafContext.Provider value={value}>{children}</SideleafContext.Provider>;
}

export function useSideleaf() {
  const context = useContext(SideleafContext);
  if (!context) {
    throw new Error('useSideleaf must be used within a SideleafProvider');
  }
  return context;
}

// Backward compatibility exports
export const useWorkpad = useSideleaf;
export const WorkpadProvider = SideleafProvider;
export type WorkpadContextType = SideleafContextType;

export { usePwaInstall };

