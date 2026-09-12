import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  migrateFromLegacyWorkpad,
  openDatabase,
  safeLsGet,
  _resetDbForTests,
  DB_NAME,
  LEGACY_DB_NAME,
  LS_ITEMS,
  LS_WORKSPACES,
  LS_SETTINGS,
  LS_ACTIVITY,
  db,
} from '../services/db';
import { Item, Workspace, UserSettings, ActivityLog } from '../types';

class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const mockWorkspaces: Workspace[] = [
  {
    id: 'ws_legacy_1',
    name: 'Project Alpha',
    color: '#3b82f6',
    createdAt: 1690000000000,
    updatedAt: 1690000001000,
  },
  {
    id: 'ws_legacy_2',
    name: 'Research & Ideas',
    color: '#10b981',
    createdAt: 1690000002000,
    updatedAt: 1690000003000,
  },
];

const mockItems: Item[] = [
  {
    id: 'item_legacy_1',
    workspaceId: 'ws_legacy_1',
    content: 'Review migration requirements',
    type: 'checklist',
    checked: true,
    status: 'active',
    order: 0,
    createdAt: 1690000010000,
    updatedAt: 1690000011000,
  },
  {
    id: 'item_legacy_2',
    workspaceId: null,
    content: 'Quick note on scratchpad before organizing',
    type: 'text',
    status: 'active',
    order: 1,
    createdAt: 1690000020000,
    updatedAt: 1690000021000,
  },
  {
    id: 'item_legacy_3',
    workspaceId: 'ws_legacy_2',
    content: 'Architectural Decision: Local-first persistence',
    type: 'decision',
    status: 'active',
    order: 2,
    createdAt: 1690000030000,
    updatedAt: 1690000031000,
  },
];

const mockSettings: UserSettings = {
  theme: 'dark',
  locale: 'en',
  quickCaptureShortcut: 'Ctrl+Shift+Space',
  searchShortcut: 'Ctrl+K',
  autoSaveIntervalMs: 2000,
  defaultView: 'today',
};

const mockActivity: ActivityLog[] = [
  {
    id: 'act_legacy_1',
    action: 'capture',
    details: 'Initial migration task created',
    timestamp: 1690000010000,
    itemId: 'item_legacy_1',
  },
  {
    id: 'act_legacy_2',
    action: 'edit',
    details: 'Scratch note captured',
    timestamp: 1690000020000,
    itemId: 'item_legacy_2',
  },
];

function seedLegacyWorkpadDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LEGACY_DB_NAME, 1);
    req.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains('items')) {
        dbInstance.createObjectStore('items', { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains('workspaces')) {
        dbInstance.createObjectStore('workspaces', { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains('settings')) {
        dbInstance.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!dbInstance.objectStoreNames.contains('activity')) {
        const actStore = dbInstance.createObjectStore('activity', { keyPath: 'id' });
        actStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = () => {
      const dbInstance = req.result;
      const tx = dbInstance.transaction(
        ['items', 'workspaces', 'settings', 'activity'],
        'readwrite'
      );
      const itemStore = tx.objectStore('items');
      for (const item of mockItems) {
        itemStore.put(item);
      }
      const wsStore = tx.objectStore('workspaces');
      for (const ws of mockWorkspaces) {
        wsStore.put(ws);
      }
      const setStore = tx.objectStore('settings');
      setStore.put({ key: 'user_settings', value: mockSettings });

      const actStore = tx.objectStore('activity');
      for (const act of mockActivity) {
        actStore.put(act);
      }

      tx.oncomplete = () => {
        dbInstance.close();
        resolve();
      };
      tx.onerror = () => {
        dbInstance.close();
        reject(tx.error);
      };
    };
    req.onerror = () => reject(req.error);
  });
}

async function cleanDatabases(): Promise<void> {
  _resetDbForTests();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(LEGACY_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

describe('Sideleaf Migration Test Suite', () => {
  beforeEach(async () => {
    globalThis.localStorage = new LocalStorageMock();
    await cleanDatabases();
  });

  afterEach(async () => {
    await cleanDatabases();
  });

  describe('IndexedDB Migration (workpad_db -> sideleaf_db)', () => {
    it('seeds legacy workpad_db and migrates all data into sideleaf_db via openDatabase()', async () => {
      await seedLegacyWorkpadDb();

      const newDb = await openDatabase();
      expect(newDb.name).toBe(DB_NAME);

      // Verify items
      const items = await db.getAllItems();
      expect(items).toHaveLength(mockItems.length);
      expect(items.find((i) => i.id === 'item_legacy_1')?.content).toBe('Review migration requirements');
      expect(items.find((i) => i.id === 'item_legacy_2')?.content).toBe(
        'Quick note on scratchpad before organizing'
      );
      expect(items.find((i) => i.id === 'item_legacy_3')?.type).toBe('decision');

      // Verify workspaces
      const workspaces = await db.getAllWorkspaces();
      expect(workspaces).toHaveLength(mockWorkspaces.length);
      expect(workspaces.find((w) => w.id === 'ws_legacy_1')?.name).toBe('Project Alpha');
      expect(workspaces.find((w) => w.id === 'ws_legacy_2')?.name).toBe('Research & Ideas');

      // Verify settings
      const settings = await db.getSettings();
      expect(settings).not.toBeNull();
      expect(settings?.theme).toBe('dark');
      expect(settings?.locale).toBe('en');

      // Verify activity
      const activity = await db.getRecentActivity(10);
      expect(activity).toHaveLength(mockActivity.length);
      expect(activity.some((a) => a.id === 'act_legacy_1')).toBe(true);
      expect(activity.some((a) => a.id === 'act_legacy_2')).toBe(true);

      // Verify migrated_from_workpad flag is set
      const isMigrated = await new Promise<boolean>((resolve) => {
        const tx = newDb.transaction('settings', 'readonly');
        const req = tx.objectStore('settings').get('migrated_from_workpad');
        req.onsuccess = () => resolve(Boolean(req.result?.value));
        req.onerror = () => resolve(false);
      });
      expect(isMigrated).toBe(true);

      // Verify original data in workpad_db is PRESERVED (not deleted)
      const legacyCheck = await new Promise<boolean>((resolve) => {
        const req = indexedDB.open(LEGACY_DB_NAME);
        req.onsuccess = () => {
          const idb = req.result;
          const count = idb.objectStoreNames.length;
          idb.close();
          resolve(count > 0);
        };
        req.onerror = () => resolve(false);
      });
      expect(legacyCheck).toBe(true);
    });

    it('direct migrateFromLegacyWorkpad() copies data and sets migrated flag', async () => {
      await seedLegacyWorkpadDb();

      const sideleafDb = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const d = (e.target as IDBOpenDBRequest).result;
          d.createObjectStore('items', { keyPath: 'id' });
          d.createObjectStore('workspaces', { keyPath: 'id' });
          d.createObjectStore('settings', { keyPath: 'key' });
          d.createObjectStore('activity', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      await migrateFromLegacyWorkpad(sideleafDb);

      const flag = await new Promise<boolean>((resolve) => {
        const tx = sideleafDb.transaction('settings', 'readonly');
        const req = tx.objectStore('settings').get('migrated_from_workpad');
        req.onsuccess = () => resolve(req.result?.value);
      });
      expect(flag).toBe(true);

      sideleafDb.close();

      const allItems = await db.getAllItems();
      expect(allItems).toHaveLength(mockItems.length);
    });

    it('is idempotent: running migration multiple times does not overwrite newer data in sideleaf_db', async () => {
      await seedLegacyWorkpadDb();

      const newDb = await openDatabase();
      await migrateFromLegacyWorkpad(newDb);

      await db.saveItem({
        ...mockItems[0],
        content: 'Updated content in Sideleaf',
        updatedAt: Date.now() + 50000,
      });

      await migrateFromLegacyWorkpad(newDb);

      const items = await db.getAllItems();
      expect(items).toHaveLength(mockItems.length);
      const updated = items.find((i) => i.id === 'item_legacy_1');
      expect(updated?.content).toBe('Updated content in Sideleaf');
    });

    it('handles clean installs gracefully when no legacy database exists', async () => {
      const newDb = await openDatabase();
      expect(newDb.name).toBe(DB_NAME);

      const items = await db.getAllItems();
      expect(items).toHaveLength(0);

      const workspaces = await db.getAllWorkspaces();
      expect(workspaces).toHaveLength(0);
    });
  });

  describe('LocalStorage Fallback Migration', () => {
    it('migrates legacy workpad_ls_* keys to sideleaf_ls_* keys without deleting original keys', () => {
      localStorage.setItem('workpad_ls_items', JSON.stringify(mockItems));
      localStorage.setItem('workpad_ls_workspaces', JSON.stringify(mockWorkspaces));
      localStorage.setItem('workpad_ls_settings', JSON.stringify(mockSettings));
      localStorage.setItem('workpad_ls_activity', JSON.stringify(mockActivity));

      expect(localStorage.getItem(LS_ITEMS)).toBeNull();
      expect(localStorage.getItem(LS_WORKSPACES)).toBeNull();

      const items = safeLsGet<Item[]>(LS_ITEMS, []);
      const workspaces = safeLsGet<Workspace[]>(LS_WORKSPACES, []);
      const settings = safeLsGet<UserSettings | null>(LS_SETTINGS, null);
      const activity = safeLsGet<ActivityLog[]>(LS_ACTIVITY, []);

      expect(items).toHaveLength(mockItems.length);
      expect(workspaces).toHaveLength(mockWorkspaces.length);
      expect(settings?.theme).toBe('dark');
      expect(settings?.locale).toBe('en');
      expect(activity).toHaveLength(mockActivity.length);

      expect(localStorage.getItem(LS_ITEMS)).not.toBeNull();
      expect(localStorage.getItem(LS_WORKSPACES)).not.toBeNull();
      expect(localStorage.getItem(LS_SETTINGS)).not.toBeNull();
      expect(localStorage.getItem(LS_ACTIVITY)).not.toBeNull();

      expect(localStorage.getItem('workpad_ls_items')).not.toBeNull();
      expect(localStorage.getItem('workpad_ls_workspaces')).not.toBeNull();
    });

    it('prefers sideleaf_ls_* data if already populated, without overwriting with legacy', () => {
      const existingSideleafItems: Item[] = [
        {
          id: 'item_new_1',
          workspaceId: null,
          content: 'Brand new note created in Sideleaf',
          type: 'text',
          status: 'active',
          order: 0,
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        },
      ];

      localStorage.setItem('workpad_ls_items', JSON.stringify(mockItems));
      localStorage.setItem(LS_ITEMS, JSON.stringify(existingSideleafItems));

      const items = safeLsGet<Item[]>(LS_ITEMS, []);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item_new_1');
    });

    it('clearing all data removes both sideleaf and legacy fallback keys', async () => {
      localStorage.setItem('workpad_ls_items', JSON.stringify(mockItems));
      localStorage.setItem('workpad_ls_workspaces', JSON.stringify(mockWorkspaces));
      localStorage.setItem('workpad_ls_activity', JSON.stringify(mockActivity));
      localStorage.setItem(LS_ITEMS, JSON.stringify(mockItems));

      await db.clearAllData();

      expect(localStorage.getItem('workpad_ls_items')).toBeNull();
      expect(localStorage.getItem('workpad_ls_workspaces')).toBeNull();
      expect(localStorage.getItem('workpad_ls_activity')).toBeNull();
      expect(safeLsGet<Item[]>(LS_ITEMS, [])).toEqual([]);
    });
  });
});
