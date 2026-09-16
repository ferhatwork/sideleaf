import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import {
  Item,
  Workspace,
  WorkspaceGroup,
  Section,
  Reminder,
  CreateReminderParams,
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
import { calculateNextOccurrence } from '../utils/reminderDomain';
import { syncRemindersToRuntime } from '../services/runtimeApi';
import { usePwaInstall } from './usePwaInstall';
import { createDemoData } from '../utils/demoData';

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
  workspaceGroups: WorkspaceGroup[];
  sections: Section[];
  reminders: Reminder[];
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
  reminderModalItem: Item | null;
  openReminderModal: (item: Item) => void;
  closeReminderModal: () => void;

  // CRUD / Commands
  addItem: (params: CreateItemParams) => Promise<Item>;
  createItem: (params: CreateItemParams) => Promise<Item>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  reorderItems: (itemIds: string[]) => Promise<void>;
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

  // Reminders
  addReminder: (params: CreateReminderParams) => Promise<Reminder>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  toggleReminderEnabled: (id: string) => Promise<void>;

  // Sections & Bulk
  createSection: (workspaceId: string, name: string) => Promise<Section>;
  updateSection: (id: string, updates: Partial<Section>) => Promise<void>;
  toggleSectionCollapse: (id: string) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  reorderSections: (workspaceId: string, sectionIds: string[]) => Promise<void>;
  moveItemToSection: (itemId: string, sectionId: string | null) => Promise<void>;
  updateWorkspaceViewMode: (workspaceId: string, viewMode: 'normal' | 'compact') => Promise<void>;
  addBulkItems: (paramsList: CreateItemParams[]) => Promise<Item[]>;
  bulkMoveItems: (itemIds: string[], targetSectionId: string | null, targetWorkspaceId?: string | null) => Promise<void>;
  bulkArchiveItems: (itemIds: string[]) => Promise<void>;
  bulkDeleteItems: (itemIds: string[]) => Promise<void>;

  // Workspaces
  createWorkspace: (name: string, color?: string, description?: string, groupId?: string | null) => Promise<Workspace>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  createWorkspaceGroup: (name: string, color?: string) => Promise<WorkspaceGroup>;
  updateWorkspaceGroup: (id: string, updates: Partial<WorkspaceGroup>) => Promise<void>;
  deleteWorkspaceGroup: (id: string) => Promise<void>;
  reorderWorkspaceGroups: (groupIds: string[]) => Promise<void>;
  reorderWorkspaces: (groupId: string | null, workspaceIds: string[]) => Promise<void>;
  moveWorkspaceToGroup: (workspaceId: string, groupId: string | null) => Promise<void>;

  // Settings & Data
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  importSideleafData: (
    items: Item[],
    workspaces: Workspace[],
    mode: 'merge' | 'replace' | 'new_workspace',
    newWorkspaceName?: string,
    sections?: Section[],
    settings?: UserSettings,
    activity?: ActivityLog[],
    importedReminders?: Reminder[],
    importedWorkspaceGroups?: WorkspaceGroup[]
  ) => Promise<void>;
  importWorkpadData: (
    items: Item[],
    workspaces: Workspace[],
    mode: 'merge' | 'replace' | 'new_workspace',
    newWorkspaceName?: string,
    sections?: Section[],
    settings?: UserSettings,
    activity?: ActivityLog[],
    importedReminders?: Reminder[],
    importedWorkspaceGroups?: WorkspaceGroup[]
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
  theme: 'light',
  locale: 'en',
  quickCaptureShortcut: 'Ctrl+Space',
  searchShortcut: 'Ctrl+K',
  autoSaveIntervalMs: 200,
  defaultView: 'today',
  hasInitialized: false,
};

function normalizeWorkspaceCollections(
  rawWorkspaces: Workspace[],
  rawGroups: WorkspaceGroup[]
): { workspaces: Workspace[]; groups: WorkspaceGroup[] } {
  const groups = rawGroups
    .map((group, index) => ({
      ...group,
      order: Number.isFinite(group.order) ? group.order : index,
      collapsed: Boolean(group.collapsed),
    }))
    .sort((a, b) => a.order - b.order);
  const validGroupIds = new Set(groups.map((group) => group.id));
  const groupOrder = new Map(groups.map((group) => [group.id, group.order]));
  const workspaces = rawWorkspaces
    .map((workspace, index) => ({
      ...workspace,
      groupId: workspace.groupId && validGroupIds.has(workspace.groupId) ? workspace.groupId : null,
      order: Number.isFinite(workspace.order) ? workspace.order : index,
    }))
    .sort((a, b) => {
      const groupA = a.groupId ? (groupOrder.get(a.groupId) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      const groupB = b.groupId ? (groupOrder.get(b.groupId) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      return groupA - groupB || (a.order ?? a.createdAt) - (b.order ?? b.createdAt);
    });
  return { workspaces, groups };
}

export const SideleafContext = createContext<SideleafContextType | null>(null);

export function SideleafProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceGroups, setWorkspaceGroups] = useState<WorkspaceGroup[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<ExtendedUserSettings>(defaultSettings);
  const currentLocale: Locale = settings.locale || detectSystemLocale();
  const t: TranslationSchema = useMemo(() => getTranslation(currentLocale), [currentLocale]);
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
  const [reminderModalItem, setReminderModalItem] = useState<Item | null>(null);

  const openReminderModal = useCallback((item: Item) => {
    setReminderModalItem(item);
  }, []);

  const closeReminderModal = useCallback(() => {
    setReminderModalItem(null);
  }, []);

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
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1') {
          const demo = createDemoData();
          setItems(demo.items);
          setWorkspaces(demo.workspaces);
          setWorkspaceGroups(demo.workspaceGroups);
          setSections(demo.sections);
          setReminders([]);
          setActivity([]);
          setSettings(demo.settings);
          setActiveView({ type: 'workspace', workspaceId: demo.activeWorkspaceId });
          applyTheme('light');
          document.documentElement.lang = 'en';
          return;
        }

        const [loadedItems, loadedWorkspaces, loadedWorkspaceGroups, loadedSections, loadedReminders, loadedSettings, loadedActivity] = await Promise.all([
          db.getAllItems(),
          db.getAllWorkspaces(),
          db.getAllWorkspaceGroups(),
          db.getAllSections(),
          db.getAllReminders(),
          db.getSettings() as Promise<ExtendedUserSettings | null>,
          db.getRecentActivity(100),
        ]);

        if (!isMounted) return;

        const currentSettings: ExtendedUserSettings = loadedSettings
          ? { ...defaultSettings, ...loadedSettings }
          : { ...defaultSettings };
        const normalizedWorkspaceData = normalizeWorkspaceCollections(loadedWorkspaces, loadedWorkspaceGroups);
        await Promise.all([
          db.saveWorkspaces(normalizedWorkspaceData.workspaces),
          normalizedWorkspaceData.groups.length > 0 ? db.saveWorkspaceGroups(normalizedWorkspaceData.groups) : Promise.resolve(),
        ]);
        setSettings(currentSettings);
        applyTheme(currentSettings.theme);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = currentSettings.locale;
        }

        setSections(loadedSections);
        setWorkspaceGroups(normalizedWorkspaceData.groups);
        setReminders(loadedReminders);

        // Only seed realistic starter data on very first run (no fake tutorial/marketing cards!)
        if (!currentSettings.hasInitialized && loadedItems.length === 0) {
          const starterItems: Item[] = [
            {
              id: generateId('item'),
              workspaceId: null,
              sectionId: null,
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
          setWorkspaces(normalizedWorkspaceData.workspaces);
          setWorkspaceGroups(normalizedWorkspaceData.groups);
          setActivity(loadedActivity);
          setSettings(updatedSettings);
        } else {
          setItems(loadedItems);
          setWorkspaces(normalizedWorkspaceData.workspaces);
          setWorkspaceGroups(normalizedWorkspaceData.groups);
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

  // Synchronize schedulable reminders with the local background runtime mirror
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      syncRemindersToRuntime(items, reminders, currentLocale);
    }, 350);
    return () => clearTimeout(timer);
  }, [items, reminders, currentLocale, isLoading]);

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
        details: t.recent.actionCapture,
        timestamp: Date.now(),
      };
      setActivity((prev) => [act, ...prev.slice(0, 99)]);
      db.logActivity(act).catch(() => {});

      return newItem;
    },
    [currentWorkspaceId, touchSession, t]
  );

  const createItem = addItem;

  // Update Item (Uses functional update to prevent stale closure clobbering)
  const updateItem = useCallback(
    async (id: string, updates: Partial<Item>) => {
      let itemToSave: Item | null = null;
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          itemToSave = { ...it, ...updates, updatedAt: Date.now() };
          return itemToSave;
        })
      );
      if (itemToSave) {
        await db.saveItem(itemToSave);
      }
    },
    []
  );

  // Persist the visual order without changing note content or updatedAt.
  const reorderItems = useCallback(async (itemIds: string[]) => {
    const idOrderMap = new Map(itemIds.map((id, index) => [id, index]));
    const baseOrder = Date.now() + itemIds.length;
    let updatedList: Item[] = [];

    setItems((prev) => {
      updatedList = prev.map((item) => {
        const index = idOrderMap.get(item.id);
        if (index === undefined) return item;
        return { ...item, order: baseOrder - index };
      });
      return updatedList;
    });

    const toSave = updatedList.filter((item) => idOrderMap.has(item.id));
    if (toSave.length > 0) {
      await db.saveItems(toSave);
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
        touchSession(target.workspaceId);

        const act: ActivityLog = {
          id: generateId('act'),
          itemId: target.id,
          itemTextPreview: target.content.slice(0, 40),
          action: 'toggle_task',
          details: newCheckedState ? t.recent.actionCompleted : t.recent.actionIncomplete,
          timestamp: Date.now(),
        };
        setActivity((prev) => [act, ...prev.slice(0, 99)]);
        db.logActivity(act).catch(() => {});
      }
    },
    [touchSession, t]
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
        const targetTypeName = t.types[targetType as keyof typeof t.types] || targetType;
        const act: ActivityLog = {
          id: generateId('act'),
          itemId: id,
          itemTextPreview: (convertedItem as Item).content.slice(0, 40),
          action: actionType,
          details: targetType === 'checklist' ? t.recent.actionConvertTask : `${t.common.edit}: ${targetTypeName}`,
          timestamp: Date.now(),
        };
        setActivity((prev) => [act, ...prev.slice(0, 99)]);
        db.logActivity(act).catch(() => {});

        triggerToast(targetType === 'checklist' ? t.toast.convertedToTask : t.toast.convertedToType(targetTypeName), {
          description: t.toast.undoConversion(targetTypeName),
          revert: async () => {
            await updateItem(id, { type: previousType, checked: previousChecked });
          },
        });
      }
    },
    [triggerToast, updateItem, touchSession, t]
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
          ? workspaces.find((w) => w.id === targetWorkspaceId)?.name || t.workspace.newWorkspace
          : t.item.scratchOption;

        triggerToast(t.toast.movedToWorkspace(destName), {
          description: t.toast.undoMove,
          revert: async () => {
            await updateItem(id, { workspaceId: prevWorkspaceId });
          },
        });
      }
    },
    [workspaces, triggerToast, updateItem, touchSession, t]
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

        triggerToast(t.toast.itemArchived, {
          description: t.toast.undoArchive,
          revert: async () => {
            await updateItem(id, { status: prevStatus as any, archivedAt: undefined });
          },
        });
      }
    },
    [triggerToast, updateItem, touchSession, t]
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
        triggerToast(t.toast.itemRestored, {
          description: t.toast.undoRestore,
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
    [triggerToast, updateItem, touchSession, t]
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

        triggerToast(t.toast.itemMovedToTrash, {
          description: t.toast.undoDelete,
          revert: async () => {
            await updateItem(id, { status: prevStatus as any, deletedAt: undefined });
          },
        });
      }
    },
    [triggerToast, updateItem, touchSession, t]
  );

  // deleteItem alias for softDeleteItem (Spec Section 80-81)
  const deleteItem = softDeleteItem;

  // Permanently Delete Item
  const permanentlyDeleteItem = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      setReminders((prev) => prev.filter((r) => r.itemId !== id));
      await db.deleteItem(id);
      await db.deleteRemindersByItem(id);
      triggerToast(t.toast.itemPermanentlyDeleted);
    },
    [triggerToast, t]
  );

  // Permanently Delete Items (Bulk)
  const permanentlyDeleteItems = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      setItems((prev) => prev.filter((it) => !idSet.has(it.id)));
      setReminders((prev) => prev.filter((r) => !idSet.has(r.itemId)));
      await db.deleteItems(ids);
      for (const id of ids) {
        await db.deleteRemindersByItem(id);
      }
      triggerToast(t.toast.itemsPermanentlyDeleted(ids.length));
    },
    [triggerToast, t]
  );

  // Reminder Operations
  const addReminder = useCallback(
    async (params: CreateReminderParams): Promise<Reminder> => {
      const now = Date.now();
      const scheduledAt =
        typeof params.scheduledAt === 'number'
          ? params.scheduledAt
          : (params.type === 'once'
              ? now + 3600000
              : calculateNextOccurrence(
                  { type: params.type, time: params.time, weekdays: params.weekdays },
                  new Date(now)
                )) ?? now + 3600000;

      const newRem: Reminder = {
        id: generateId('rem'),
        itemId: params.itemId,
        type: params.type,
        scheduledAt,
        time: params.time,
        weekdays: params.weekdays,
        enabled: params.enabled ?? true,
        createdAt: now,
        updatedAt: now,
      };

      setReminders((prev) => [...prev, newRem]);
      await db.saveReminder(newRem);
      triggerToast(t.reminder.reminderAdded);
      return newRem;
    },
    [triggerToast, t]
  );

  const updateReminder = useCallback(
    async (id: string, updates: Partial<Reminder>) => {
      let remToSave: Reminder | null = null;
      setReminders((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          remToSave = { ...r, ...updates, updatedAt: Date.now() };
          return remToSave;
        })
      );
      if (remToSave) {
        await db.saveReminder(remToSave);
        triggerToast(t.reminder.reminderUpdated);
      }
    },
    [triggerToast, t]
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      let deletedRem: Reminder | undefined;
      setReminders((prev) => {
        deletedRem = prev.find((r) => r.id === id);
        return prev.filter((r) => r.id !== id);
      });
      await db.deleteReminder(id);
      triggerToast(t.reminder.reminderDeleted, {
        description: t.common.cancel,
        revert: async () => {
          if (deletedRem) {
            setReminders((prev) => [...prev, deletedRem!]);
            await db.saveReminder(deletedRem!);
          }
        },
      });
    },
    [triggerToast, t]
  );

  const toggleReminderEnabled = useCallback(
    async (id: string) => {
      let remToSave: Reminder | null = null;
      setReminders((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          remToSave = { ...r, enabled: !r.enabled, updatedAt: Date.now() };
          return remToSave;
        })
      );
      if (remToSave) {
        await db.saveReminder(remToSave);
        triggerToast((remToSave as Reminder).enabled ? t.reminder.enabled : t.reminder.disabled);
      }
    },
    [triggerToast, t]
  );

  // Section Operations
  const createSection = useCallback(
    async (workspaceId: string, name: string): Promise<Section> => {
      const trimmed = name.trim();
      const now = Date.now();
      let createdSection: Section | null = null;

      setSections((prev) => {
        const wsSections = prev.filter((s) => s.workspaceId === workspaceId);
        const maxOrder = wsSections.length > 0 ? Math.max(...wsSections.map((s) => s.order)) : -1;
        const newSec: Section = {
          id: generateId('sec'),
          workspaceId,
          name: trimmed || 'Untitled Section',
          order: maxOrder + 1,
          collapsed: false,
          createdAt: now,
          updatedAt: now,
        };
        createdSection = newSec;
        return [...prev, newSec];
      });

      if (createdSection) {
        const secRef = createdSection as Section;
        await db.saveSection(secRef);

        triggerToast(t.toast.sectionCreated(secRef.name), {
          description: t.toast.undoCreateSection,
          revert: async () => {
            setSections((prev) => prev.filter((s) => s.id !== secRef.id));
            await db.deleteSection(secRef.id);
          },
        });

        return secRef;
      }

      throw new Error('Failed to create section');
    },
    [triggerToast, t]
  );

  const updateSection = useCallback(
    async (id: string, updates: Partial<Section>) => {
      let secToSave: Section | null = null;
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          secToSave = { ...s, ...updates, updatedAt: Date.now() };
          return secToSave;
        })
      );
      if (secToSave) {
        await db.saveSection(secToSave);
      }
    },
    []
  );

  const toggleSectionCollapse = useCallback(
    async (id: string) => {
      let secToSave: Section | null = null;
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          secToSave = { ...s, collapsed: !s.collapsed, updatedAt: Date.now() };
          return secToSave;
        })
      );
      if (secToSave) {
        await db.saveSection(secToSave);
      }
    },
    []
  );

  const deleteSection = useCallback(
    async (id: string) => {
      let secToDelete: Section | undefined;
      setSections((prev) => {
        secToDelete = prev.find((s) => s.id === id);
        return prev.filter((s) => s.id !== id);
      });
      if (!secToDelete) return;

      await db.deleteSection(id);

      const affectedItemIds: string[] = [];
      const updatedItemsToSave: Item[] = [];
      setItems((prev) =>
        prev.map((it) => {
          if (it.sectionId === id) {
            affectedItemIds.push(it.id);
            const updated = { ...it, sectionId: null, updatedAt: Date.now() };
            updatedItemsToSave.push(updated);
            return updated;
          }
          return it;
        })
      );

      if (updatedItemsToSave.length > 0) {
        await db.saveItems(updatedItemsToSave);
      }

      const deletedSec = secToDelete as Section;
      triggerToast(t.toast.sectionDeleted(deletedSec.name), {
        description: t.toast.undoDeleteSection,
        revert: async () => {
          setSections((prev) => [...prev, deletedSec]);
          await db.saveSection(deletedSec);

          if (affectedItemIds.length > 0) {
            const restoredItems: Item[] = [];
            setItems((prev) =>
              prev.map((it) => {
                if (affectedItemIds.includes(it.id)) {
                  const restored = { ...it, sectionId: id, updatedAt: Date.now() };
                  restoredItems.push(restored);
                  return restored;
                }
                return it;
              })
            );
            if (restoredItems.length > 0) {
              await db.saveItems(restoredItems);
            }
          }
        },
      });
    },
    [triggerToast, t]
  );

  const reorderSections = useCallback(
    async (workspaceId: string, sectionIds: string[]) => {
      const idOrderMap = new Map(sectionIds.map((id, index) => [id, index]));
      let updatedList: Section[] = [];
      setSections((prev) => {
        updatedList = prev.map((s) => {
          if (s.workspaceId === workspaceId && idOrderMap.has(s.id)) {
            return { ...s, order: idOrderMap.get(s.id)!, updatedAt: Date.now() };
          }
          return s;
        });
        return updatedList;
      });

      const toSave = updatedList.filter((s) => s.workspaceId === workspaceId && idOrderMap.has(s.id));
      if (toSave.length > 0) {
        await db.saveSections(toSave);
      }
    },
    []
  );

  const moveItemToSection = useCallback(
    async (itemId: string, sectionId: string | null) => {
      let prevSectionId: string | null = null;
      let targetItem: Item | null = null;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== itemId) return it;
          prevSectionId = it.sectionId ?? null;
          targetItem = { ...it, sectionId, updatedAt: Date.now() };
          return targetItem;
        })
      );

      if (targetItem) {
        await db.saveItem(targetItem);
        touchSession((targetItem as Item).workspaceId);

        const secName = sectionId ? sections.find((s) => s.id === sectionId)?.name || t.section.section : t.section.unsectioned;
        triggerToast(t.toast.movedToSection(secName), {
          description: t.toast.undoMoveToSection,
          revert: async () => {
            await updateItem(itemId, { sectionId: prevSectionId });
          },
        });
      }
    },
    [sections, touchSession, triggerToast, updateItem, t]
  );

  // Bulk Operations
  const addBulkItems = useCallback(
    async (paramsList: CreateItemParams[]): Promise<Item[]> => {
      if (paramsList.length === 0) return [];
      const now = Date.now();
      const count = paramsList.length;
      const newItems = paramsList.map((p, idx) =>
        createItemRecord(p, currentWorkspaceId, now + (count - idx))
      );

      setItems((prev) => [...newItems, ...prev]);
      await db.saveItems(newItems);

      const firstWsId = newItems[0]?.workspaceId;
      touchSession(firstWsId);

      triggerToast(t.toast.itemsAdded(count), {
        description: t.toast.undoAddItems(count),
        revert: async () => {
          const ids = new Set(newItems.map((i) => i.id));
          setItems((prev) => prev.filter((i) => !ids.has(i.id)));
          await db.deleteItems(newItems.map((i) => i.id));
        },
      });

      return newItems;
    },
    [currentWorkspaceId, touchSession, triggerToast, t]
  );

  const bulkMoveItems = useCallback(
    async (itemIds: string[], targetSectionId: string | null, targetWorkspaceId?: string | null) => {
      if (itemIds.length === 0) return;
      const idSet = new Set(itemIds);
      const previousMap = new Map<string, { sectionId: string | null; workspaceId: string | null }>();

      const updatedItems: Item[] = [];
      setItems((prev) =>
        prev.map((it) => {
          if (!idSet.has(it.id)) return it;
          previousMap.set(it.id, { sectionId: it.sectionId ?? null, workspaceId: it.workspaceId });
          const updated: Item = {
            ...it,
            sectionId: targetSectionId,
            workspaceId: targetWorkspaceId !== undefined ? targetWorkspaceId : it.workspaceId,
            updatedAt: Date.now(),
          };
          updatedItems.push(updated);
          return updated;
        })
      );

      await db.saveItems(updatedItems);
      const targetName = targetSectionId
        ? sections.find((s) => s.id === targetSectionId)?.name || t.section.section
        : t.section.unsectioned;

      triggerToast(t.toast.itemsBulkMoved(itemIds.length, targetName), {
        description: t.toast.undoMove,
        revert: async () => {
          const restored: Item[] = [];
          setItems((prev) =>
            prev.map((it) => {
              const prevData = previousMap.get(it.id);
              if (!prevData) return it;
              const rest: Item = {
                ...it,
                sectionId: prevData.sectionId,
                workspaceId: prevData.workspaceId,
                updatedAt: Date.now(),
              };
              restored.push(rest);
              return rest;
            })
          );
          await db.saveItems(restored);
        },
      });
    },
    [sections, triggerToast, t]
  );

  const bulkArchiveItems = useCallback(
    async (itemIds: string[]) => {
      if (itemIds.length === 0) return;
      const idSet = new Set(itemIds);
      const prevStatusMap = new Map<string, { status: string; archivedAt?: number }>();
      const now = Date.now();
      const updatedItems: Item[] = [];

      setItems((prev) =>
        prev.map((it) => {
          if (!idSet.has(it.id)) return it;
          prevStatusMap.set(it.id, { status: it.status, archivedAt: it.archivedAt });
          const updated: Item = {
            ...it,
            status: 'archived',
            archivedAt: now,
            updatedAt: now,
          };
          updatedItems.push(updated);
          return updated;
        })
      );

      await db.saveItems(updatedItems);
      triggerToast(t.toast.itemsBulkArchived(itemIds.length), {
        description: t.toast.undoArchive,
        revert: async () => {
          const restored: Item[] = [];
          setItems((prev) =>
            prev.map((it) => {
              const prevData = prevStatusMap.get(it.id);
              if (!prevData) return it;
              const rest: Item = {
                ...it,
                status: prevData.status as any,
                archivedAt: prevData.archivedAt,
                updatedAt: Date.now(),
              };
              restored.push(rest);
              return rest;
            })
          );
          await db.saveItems(restored);
        },
      });
    },
    [triggerToast, t]
  );

  const bulkDeleteItems = useCallback(
    async (itemIds: string[]) => {
      if (itemIds.length === 0) return;
      const idSet = new Set(itemIds);
      const prevStatusMap = new Map<string, { status: string; deletedAt?: number }>();
      const now = Date.now();
      const updatedItems: Item[] = [];

      setItems((prev) =>
        prev.map((it) => {
          if (!idSet.has(it.id)) return it;
          prevStatusMap.set(it.id, { status: it.status, deletedAt: it.deletedAt });
          const updated: Item = {
            ...it,
            status: 'deleted',
            deletedAt: now,
            updatedAt: now,
          };
          updatedItems.push(updated);
          return updated;
        })
      );

      await db.saveItems(updatedItems);
      triggerToast(t.toast.itemsBulkDeleted(itemIds.length), {
        description: t.toast.undoDelete,
        revert: async () => {
          const restored: Item[] = [];
          setItems((prev) =>
            prev.map((it) => {
              const prevData = prevStatusMap.get(it.id);
              if (!prevData) return it;
              const rest: Item = {
                ...it,
                status: prevData.status as any,
                deletedAt: prevData.deletedAt,
                updatedAt: Date.now(),
              };
              restored.push(rest);
              return rest;
            })
          );
          await db.saveItems(restored);
        },
      });
    },
    [triggerToast, t]
  );

  // Workspaces
  const createWorkspace = useCallback(
    async (name: string, color = '#3b82f6', description = '', groupId: string | null = null): Promise<Workspace> => {
      const siblingOrders = workspaces
        .filter((workspace) => (workspace.groupId || null) === groupId)
        .map((workspace) => workspace.order ?? workspace.createdAt);
      const nextOrder = siblingOrders.length > 0 ? Math.max(...siblingOrders) + 1 : 0;
      const newWs: Workspace = {
        id: generateId('ws'),
        name: name.trim(),
        color,
        description: description.trim(),
        groupId,
        order: nextOrder,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setWorkspaces((prev) => [...prev, newWs]);
      await db.saveWorkspace(newWs);
      triggerToast(t.toast.workspaceCreated(newWs.name));
      return newWs;
    },
    [workspaces, triggerToast, t]
  );

  const updateWorkspace = useCallback(async (id: string, updates: Partial<Workspace>) => {
    const currentWorkspace = workspaces.find((workspace) => workspace.id === id);
    if (!currentWorkspace) return;

    const nextGroupId = updates.groupId === undefined ? currentWorkspace.groupId || null : updates.groupId || null;
    const groupChanged = nextGroupId !== (currentWorkspace.groupId || null);
    const siblingOrders = groupChanged
      ? workspaces
          .filter((workspace) => workspace.id !== id && (workspace.groupId || null) === nextGroupId)
          .map((workspace) => workspace.order ?? workspace.createdAt)
      : [];
    const nextOrder = groupChanged && !('order' in updates)
      ? (siblingOrders.length > 0 ? Math.max(...siblingOrders) + 1 : 0)
      : updates.order ?? currentWorkspace.order;
    const wsToSave: Workspace = {
      ...currentWorkspace,
      ...updates,
      groupId: nextGroupId,
      ...(nextOrder !== undefined ? { order: nextOrder } : {}),
      updatedAt: Date.now(),
    };
    setWorkspaces((prev) => prev.map((workspace) => (workspace.id === id ? wsToSave : workspace)));
    await db.saveWorkspace(wsToSave);
  }, [workspaces]);

  const createWorkspaceGroup = useCallback(
    async (name: string, color = '#0f766e'): Promise<WorkspaceGroup> => {
      const groupOrders = workspaceGroups.map((item) => item.order ?? item.createdAt);
      const nextOrder = groupOrders.length > 0 ? Math.max(...groupOrders) + 1 : 0;
      const group: WorkspaceGroup = {
        id: generateId('wsg'),
        name: name.trim(),
        color,
        order: nextOrder,
        collapsed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setWorkspaceGroups((prev) => [...prev, group]);
      await db.saveWorkspaceGroup(group);
      return group;
    },
    [workspaceGroups]
  );

  const updateWorkspaceGroup = useCallback(async (id: string, updates: Partial<WorkspaceGroup>) => {
    let groupToSave: WorkspaceGroup | null = null;
    setWorkspaceGroups((prev) =>
      prev.map((group) => {
        if (group.id !== id) return group;
        groupToSave = { ...group, ...updates, updatedAt: Date.now() };
        return groupToSave;
      })
    );
    if (groupToSave) await db.saveWorkspaceGroup(groupToSave);
  }, []);

  const reorderWorkspaceGroups = useCallback(async (groupIds: string[]) => {
    const orderMap = new Map(groupIds.map((id, index) => [id, index]));
    const updatedList = workspaceGroups.map((group) => {
        const order = orderMap.get(group.id);
        return order === undefined ? group : { ...group, order, updatedAt: Date.now() };
      });
    const toSave = updatedList.filter((group) => orderMap.has(group.id));
    setWorkspaceGroups(updatedList);
    if (toSave.length > 0) await db.saveWorkspaceGroups(toSave);
  }, [workspaceGroups]);

  const reorderWorkspaces = useCallback(async (groupId: string | null, workspaceIds: string[]) => {
    const orderMap = new Map(workspaceIds.map((id, index) => [id, index]));
    const updatedList = workspaces.map((workspace) => {
        const order = orderMap.get(workspace.id);
        return order === undefined
          ? workspace
          : { ...workspace, groupId, order, updatedAt: Date.now() };
      });
    const toSave = updatedList.filter((workspace) => orderMap.has(workspace.id));
    setWorkspaces(updatedList);
    if (toSave.length > 0) await db.saveWorkspaces(toSave);
  }, [workspaces]);

  const moveWorkspaceToGroup = useCallback(
    async (workspaceId: string, groupId: string | null) => {
      const movingWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
      if (!movingWorkspace) return;
      const sourceGroupId = movingWorkspace.groupId || null;
      const targetWorkspaces = workspaces
        .filter((workspace) => (workspace.groupId || null) === groupId && workspace.id !== workspaceId)
        .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
      const targetIds = [...targetWorkspaces.map((workspace) => workspace.id), workspaceId];
      const updates = new Map<string, Workspace>();
      targetIds.forEach((id, index) => {
        const workspace = workspaces.find((item) => item.id === id);
        if (workspace) updates.set(id, { ...workspace, groupId, order: index, updatedAt: Date.now() });
      });
      if (sourceGroupId !== groupId) {
        workspaces
          .filter((workspace) => (workspace.groupId || null) === sourceGroupId && workspace.id !== workspaceId)
          .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))
          .forEach((workspace, index) => updates.set(workspace.id, { ...workspace, groupId: sourceGroupId, order: index, updatedAt: Date.now() }));
      }
      const updatedWorkspaces = workspaces.map((workspace) => updates.get(workspace.id) || workspace);
      setWorkspaces(updatedWorkspaces);
      await db.saveWorkspaces(Array.from(updates.values()));
    },
    [workspaces]
  );

  const deleteWorkspaceGroup = useCallback(
    async (id: string) => {
      const remainingUngrouped = workspaces
        .filter((workspace) => (workspace.groupId || null) === null)
        .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
      const releasedWorkspaces = workspaces
        .filter((workspace) => workspace.groupId === id)
        .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
      const ungroupedIds = [...remainingUngrouped, ...releasedWorkspaces].map((workspace) => workspace.id);
      const releasedIds = new Set(releasedWorkspaces.map((workspace) => workspace.id));
      const updatedWorkspaces = workspaces.map((workspace) => {
        const order = ungroupedIds.indexOf(workspace.id);
        return releasedIds.has(workspace.id)
          ? { ...workspace, groupId: null, order, updatedAt: Date.now() }
          : workspace;
      });
      if (updatedWorkspaces.length > 0) {
        await db.saveWorkspaces(updatedWorkspaces);
        setWorkspaces(updatedWorkspaces);
      }
      setWorkspaceGroups((prev) => prev.filter((group) => group.id !== id));
      await db.deleteWorkspaceGroup(id);
    },
    [workspaces]
  );

  const updateWorkspaceViewMode = useCallback(
    async (workspaceId: string, viewMode: 'normal' | 'compact') => {
      await updateWorkspace(workspaceId, { viewMode });
    },
    [updateWorkspace]
  );

  const deleteWorkspace = useCallback(
    async (id: string) => {
      const wsToDelete = workspaces.find((w) => w.id === id);
      if (!wsToDelete) return;

      // Keep items by moving them safely to scratch (Spec Section 27 - never lose data)
      setItems((prev) =>
        prev.map((it) => (it.workspaceId === id ? { ...it, workspaceId: null, sectionId: null, updatedAt: Date.now() } : it))
      );
      const itemsToUpdate = items
        .filter((i) => i.workspaceId === id)
        .map((i) => ({ ...i, workspaceId: null, sectionId: null, updatedAt: Date.now() }));
      await db.saveItems(itemsToUpdate);

      // Remove sections of this workspace
      const wsSections = sections.filter((s) => s.workspaceId === id);
      setSections((prev) => prev.filter((s) => s.workspaceId !== id));
      if (wsSections.length > 0) {
        await db.deleteSections(wsSections.map((s) => s.id));
      }

      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      await db.deleteWorkspace(id);

      if (currentWorkspaceId === id) {
        setCurrentWorkspace(null);
      }

      if (activeView.type === 'workspace' && activeView.workspaceId === id) {
        setActiveView({ type: 'today' });
      }

      triggerToast(t.toast.workspaceDeleted(wsToDelete.name));
    },
    [workspaces, items, sections, activeView, currentWorkspaceId, setCurrentWorkspace, triggerToast, t]
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
      newWorkspaceName?: string,
      importedSections?: Section[],
      importedSettings?: UserSettings,
      importedActivity?: ActivityLog[],
      importedReminders?: Reminder[],
      importedWorkspaceGroups?: WorkspaceGroup[]
    ) => {
      // Validate all workspace references so orphaned items safely fall back to Scratch
      const validWsIds = new Set(
        mode === 'replace'
          ? importedWorkspaces.map((w) => w.id)
          : [...workspaces.map((w) => w.id), ...importedWorkspaces.map((w) => w.id)]
      );

      const rawSections = importedSections || [];
      const rawWorkspaceGroups = importedWorkspaceGroups || [];
      const normalizedImportedWorkspaceData = normalizeWorkspaceCollections(importedWorkspaces, rawWorkspaceGroups);
      const validImportedGroupIds = new Set(
        mode === 'replace'
          ? normalizedImportedWorkspaceData.groups.map((group) => group.id)
          : [...workspaceGroups.map((group) => group.id), ...normalizedImportedWorkspaceData.groups.map((group) => group.id)]
      );
      const sanitizedImportedWorkspaces = normalizedImportedWorkspaceData.workspaces.map((workspace) => ({
        ...workspace,
        groupId: workspace.groupId && validImportedGroupIds.has(workspace.groupId) ? workspace.groupId : null,
      }));

      if (mode === 'replace') {
        const sanitizedItems = importedItems.map((item) => ({
          ...item,
          workspaceId: item.workspaceId && validWsIds.has(item.workspaceId) ? item.workspaceId : null,
          sectionId: item.sectionId || null,
        }));

        await db.clearContentData();
        await db.saveWorkspaceGroups(normalizedImportedWorkspaceData.groups);
        await db.saveWorkspaces(sanitizedImportedWorkspaces);
        await db.saveSections(rawSections);
        await db.saveItems(sanitizedItems);
        setWorkspaceGroups(normalizedImportedWorkspaceData.groups);
        setWorkspaces(sanitizedImportedWorkspaces);
        setSections(rawSections);
        setItems(sanitizedItems);

        if (importedReminders) {
          const validItemIds = new Set(sanitizedItems.map((it) => it.id));
          const sanitizedReminders = importedReminders.filter((r) => validItemIds.has(r.itemId));
          await db.saveReminders(sanitizedReminders);
          setReminders(sanitizedReminders);
        } else {
          setReminders([]);
        }

        // Replace semantics for settings: restore if present, preserve current if absent (legacy)
        if (importedSettings) {
          await db.saveSettings(importedSettings);
          setSettings(importedSettings);
          if (importedSettings.locale && typeof document !== 'undefined') {
            document.documentElement.lang = importedSettings.locale;
          }
        }

        // Replace semantics for activity: restore if present, preserve current if absent (legacy)
        if (importedActivity) {
          await db.restoreActivity(importedActivity);
          setActivity(importedActivity);
        }
      } else if (mode === 'new_workspace') {
        const ws: Workspace = {
          id: generateId('ws'),
          name: newWorkspaceName || `Imported ${new Date().toLocaleDateString()}`,
          color: '#6366f1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          order: Date.now(),
          groupId: null,
        };

        // Remap sections for this new workspace
        const sectionIdMap = new Map<string, string>();
        const newSections: Section[] = rawSections.map((s) => {
          const newSecId = generateId('sec');
          sectionIdMap.set(s.id, newSecId);
          return {
            ...s,
            id: newSecId,
            workspaceId: ws.id,
          };
        });

        const itemIdMap = new Map<string, string>();
        const adjustedItems = importedItems.map((it) => {
          const newItemId = generateId('item');
          itemIdMap.set(it.id, newItemId);
          return {
            ...it,
            id: newItemId,
            workspaceId: ws.id,
            sectionId: it.sectionId ? (sectionIdMap.get(it.sectionId) || null) : null,
          };
        });

        const newReminders: Reminder[] = (importedReminders || [])
          .filter((r) => itemIdMap.has(r.itemId))
          .map((r) => ({
            ...r,
            id: generateId('rem'),
            itemId: itemIdMap.get(r.itemId)!,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));

        await db.saveWorkspace(ws);
        await db.saveSections(newSections);
        await db.saveItems(adjustedItems);
        if (newReminders.length > 0) {
          await db.saveReminders(newReminders);
        }
        setWorkspaces((prev) => [...prev, ws]);
        setSections((prev) => [...newSections, ...prev]);
        setItems((prev) => [...adjustedItems, ...prev]);
        if (newReminders.length > 0) {
          setReminders((prev) => [...newReminders, ...prev]);
        }
        setActiveView({ type: 'workspace', workspaceId: ws.id });
      } else {
        // Merge mode: keep newer record if IDs conflict
        const existingWsMap = new Map(workspaces.map((w) => [w.id, w]));
        for (const w of sanitizedImportedWorkspaces) {
          const existing = existingWsMap.get(w.id);
          if (!existing || w.updatedAt > existing.updatedAt) {
            existingWsMap.set(w.id, w);
          }
        }
        const mergedWorkspaces = Array.from(existingWsMap.values());

        const existingGroupMap = new Map(workspaceGroups.map((group) => [group.id, group]));
        for (const group of rawWorkspaceGroups) {
          const existing = existingGroupMap.get(group.id);
          if (!existing || group.updatedAt > existing.updatedAt) {
            existingGroupMap.set(group.id, group);
          }
        }
        const mergedWorkspaceGroups = Array.from(existingGroupMap.values());
        const normalizedMergedWorkspaceData = normalizeWorkspaceCollections(mergedWorkspaces, mergedWorkspaceGroups);

        const existingSecMap = new Map(sections.map((s) => [s.id, s]));
        for (const s of rawSections) {
          const existing = existingSecMap.get(s.id);
          if (!existing || s.updatedAt > existing.updatedAt) {
            existingSecMap.set(s.id, s);
          }
        }
        const mergedSections = Array.from(existingSecMap.values());
        const validSectionIds = new Set(mergedSections.map((s) => s.id));

        const sanitizedItems = importedItems.map((item) => ({
          ...item,
          workspaceId: item.workspaceId && validWsIds.has(item.workspaceId) ? item.workspaceId : null,
          sectionId: item.sectionId && validSectionIds.has(item.sectionId) ? item.sectionId : null,
        }));

        const existingItemMap = new Map(items.map((i) => [i.id, i]));
        for (const it of sanitizedItems) {
          const existing = existingItemMap.get(it.id);
          if (!existing || it.updatedAt > existing.updatedAt) {
            existingItemMap.set(it.id, it);
          }
        }
        const mergedItems = Array.from(existingItemMap.values());

        await db.saveWorkspaces(normalizedMergedWorkspaceData.workspaces);
        await db.saveWorkspaceGroups(normalizedMergedWorkspaceData.groups);
        await db.saveSections(mergedSections);
        await db.saveItems(mergedItems);
        setWorkspaces(normalizedMergedWorkspaceData.workspaces);
        setWorkspaceGroups(normalizedMergedWorkspaceData.groups);
        setSections(mergedSections);
        setItems(mergedItems);

        if (importedReminders && importedReminders.length > 0) {
          const validItemIds = new Set(mergedItems.map((it) => it.id));
          const existingRemMap = new Map(reminders.map((r) => [r.id, r]));
          for (const r of importedReminders) {
            if (!validItemIds.has(r.itemId)) continue;
            const existing = existingRemMap.get(r.id);
            if (!existing || r.updatedAt > existing.updatedAt) {
              existingRemMap.set(r.id, r);
            }
          }
          const mergedReminders = Array.from(existingRemMap.values());
          await db.saveReminders(mergedReminders);
          setReminders(mergedReminders);
        }
      }

      triggerToast(t.toast.itemsImported(importedItems.length));
    },
    [items, workspaces, workspaceGroups, sections, reminders, triggerToast, t]
  );

  // Reset All (Sets hasInitialized to true so starter notes never re-seed!)
  const resetAllData = useCallback(async () => {
    await db.clearAllData();
    const cleanSettings: ExtendedUserSettings = { ...settings, hasInitialized: true };
    await db.saveSettings(cleanSettings);
    setItems([]);
    setWorkspaces([]);
    setWorkspaceGroups([]);
    setSections([]);
    setReminders([]);
    setActivity([]);
    setCurrentSession(null);
    setCurrentWorkspaceId(null);
    undoStackRef.current = [];
    setSettings(cleanSettings);
    setActiveView({ type: 'today' });
    triggerToast(t.toast.allDataCleared);
  }, [settings, triggerToast, t]);

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
      workspaceGroups,
      sections,
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
      reminderModalItem,
      openReminderModal,
      closeReminderModal,
      addItem,
      createItem,
      updateItem,
      reorderItems,
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
      reminders,
      addReminder,
      updateReminder,
      deleteReminder,
      toggleReminderEnabled,
      createSection,
      updateSection,
      toggleSectionCollapse,
      deleteSection,
      reorderSections,
      moveItemToSection,
      updateWorkspaceViewMode,
      addBulkItems,
      bulkMoveItems,
      bulkArchiveItems,
      bulkDeleteItems,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      createWorkspaceGroup,
      updateWorkspaceGroup,
      deleteWorkspaceGroup,
      reorderWorkspaceGroups,
      reorderWorkspaces,
      moveWorkspaceToGroup,
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
      workspaceGroups,
      sections,
      reminders,
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
      reminderModalItem,
      openReminderModal,
      closeReminderModal,
      addItem,
      createItem,
      updateItem,
      reorderItems,
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
      addReminder,
      updateReminder,
      deleteReminder,
      toggleReminderEnabled,
      createSection,
      updateSection,
      toggleSectionCollapse,
      deleteSection,
      reorderSections,
      moveItemToSection,
      updateWorkspaceViewMode,
      addBulkItems,
      bulkMoveItems,
      bulkArchiveItems,
      bulkDeleteItems,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      createWorkspaceGroup,
      updateWorkspaceGroup,
      deleteWorkspaceGroup,
      reorderWorkspaceGroups,
      reorderWorkspaces,
      moveWorkspaceToGroup,
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

