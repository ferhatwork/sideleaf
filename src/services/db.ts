import { Item, Workspace, UserSettings, ActivityLog } from '../types';

// Primary Sideleaf Database
export const DB_NAME = 'sideleaf_db';
export const DB_VERSION = 1;

// Legacy Workpad Database (preserved for zero-data-loss migration)
export const LEGACY_DB_NAME = 'workpad_db';

let dbPromise: Promise<IDBDatabase> | null = null;
let isIdbSupported = typeof indexedDB !== 'undefined';

export async function migrateFromLegacyWorkpad(newDb: IDBDatabase): Promise<void> {
  try {
    // Check if migration was already recorded
    const isMigrated = await new Promise<boolean>((resolve) => {
      try {
        const tx = newDb.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('migrated_from_workpad');
        req.onsuccess = () => resolve(Boolean(req.result?.value));
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });

    if (isMigrated) return;

    // Check if legacy workpad_db exists and has data
    const legacyDb = await new Promise<IDBDatabase | null>((resolve) => {
      try {
        const req = indexedDB.open(LEGACY_DB_NAME);
        req.onsuccess = () => {
          const db = req.result;
          if (db.objectStoreNames.contains('items') || db.objectStoreNames.contains('workspaces')) {
            resolve(db);
          } else {
            db.close();
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    if (legacyDb) {
      // Read legacy records
      const legacyItems = await new Promise<Item[]>((resolve) => {
        try {
          if (!legacyDb.objectStoreNames.contains('items')) return resolve([]);
          const tx = legacyDb.transaction('items', 'readonly');
          const req = tx.objectStore('items').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });

      const legacyWorkspaces = await new Promise<Workspace[]>((resolve) => {
        try {
          if (!legacyDb.objectStoreNames.contains('workspaces')) return resolve([]);
          const tx = legacyDb.transaction('workspaces', 'readonly');
          const req = tx.objectStore('workspaces').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });

      const legacySettings = await new Promise<UserSettings | null>((resolve) => {
        try {
          if (!legacyDb.objectStoreNames.contains('settings')) return resolve(null);
          const tx = legacyDb.transaction('settings', 'readonly');
          const req = tx.objectStore('settings').get('user_settings');
          req.onsuccess = () => resolve(req.result?.value || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      const legacyActivity = await new Promise<ActivityLog[]>((resolve) => {
        try {
          if (!legacyDb.objectStoreNames.contains('activity')) return resolve([]);
          const tx = legacyDb.transaction('activity', 'readonly');
          const req = tx.objectStore('activity').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });

      legacyDb.close();

      // Write into sideleaf_db if records were found
      if (legacyItems.length > 0 || legacyWorkspaces.length > 0 || legacySettings || legacyActivity.length > 0) {
        await new Promise<void>((resolve) => {
          const tx = newDb.transaction(['items', 'workspaces', 'settings', 'activity'], 'readwrite');
          const itemStore = tx.objectStore('items');
          for (const item of legacyItems) {
            itemStore.put(item);
          }
          const wsStore = tx.objectStore('workspaces');
          for (const ws of legacyWorkspaces) {
            wsStore.put(ws);
          }
          const setStore = tx.objectStore('settings');
          if (legacySettings) {
            setStore.put({ key: 'user_settings', value: legacySettings });
          }
          setStore.put({ key: 'migrated_from_workpad', value: true });

          const actStore = tx.objectStore('activity');
          for (const act of legacyActivity) {
            actStore.put(act);
          }

          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        });
      }
    }

    // Record migration completed flag in sideleaf_db
    try {
      const tx = newDb.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key: 'migrated_from_workpad', value: true });
    } catch {}
  } catch (err) {
    console.warn('Sideleaf: legacy data migration check completed with note:', err);
  }
}

export function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined' || !isIdbSupported) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('items')) {
          const itemStore = db.createObjectStore('items', { keyPath: 'id' });
          itemStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          itemStore.createIndex('status', 'status', { unique: false });
          itemStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          itemStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains('workspaces')) {
          const wsStore = db.createObjectStore('workspaces', { keyPath: 'id' });
          wsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('activity')) {
          const actStore = db.createObjectStore('activity', { keyPath: 'id' });
          actStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = async () => {
        const db = request.result;
        // Perform one-time legacy migration safely in background
        await migrateFromLegacyWorkpad(db);
        resolve(db);
      };

      request.onerror = () => {
        isIdbSupported = false;
        reject(request.error);
      };
      request.onblocked = () => {
        console.warn('Sideleaf IndexedDB blocked by another open connection');
      };
    } catch (err) {
      isIdbSupported = false;
      reject(err);
    }
  });

  return dbPromise;
}

// Sideleaf LocalStorage Keys
export const LS_ITEMS = 'sideleaf_ls_items';
export const LS_WORKSPACES = 'sideleaf_ls_workspaces';
export const LS_SETTINGS = 'sideleaf_ls_settings';
export const LS_ACTIVITY = 'sideleaf_ls_activity';

// Legacy LocalStorage Keys mapping for fallback migration
export const LEGACY_LS_MAP: Record<string, string> = {
  [LS_ITEMS]: 'workpad_ls_items',
  [LS_WORKSPACES]: 'workpad_ls_workspaces',
  [LS_SETTINGS]: 'workpad_ls_settings',
  [LS_ACTIVITY]: 'workpad_ls_activity'
};

export function safeLsGet<T>(key: string, fallback: T): T {
  try {
    let raw = localStorage.getItem(key);
    // Legacy migration check: if sideleaf key is missing, check workpad key
    if (!raw && LEGACY_LS_MAP[key]) {
      const legacyRaw = localStorage.getItem(LEGACY_LS_MAP[key]);
      if (legacyRaw) {
        raw = legacyRaw;
        // Copy to new key safely without destroying legacy key
        localStorage.setItem(key, legacyRaw);
      }
    }
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function safeLsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Sideleaf storage quota exceeded or restricted', err);
  }
}

export function _resetDbForTests(): void {
  if (dbPromise) {
    dbPromise.then((d) => {
      try {
        d.close();
      } catch {}
    }).catch(() => {});
  }
  dbPromise = null;
  isIdbSupported = typeof indexedDB !== 'undefined';
}

export const db = {
  async getAllItems(): Promise<Item[]> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('items', 'readonly');
        const store = tx.objectStore('items');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      return safeLsGet<Item[]>(LS_ITEMS, []);
    }
  },

  async saveItem(item: Item): Promise<void> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      });
    } catch {
      const items = safeLsGet<Item[]>(LS_ITEMS, []);
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.unshift(item);
      safeLsSet(LS_ITEMS, items);
    }
  },

  async saveItems(items: Item[]): Promise<void> {
    if (items.length === 0) return;
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        for (const item of items) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      });
    } catch {
      const existing = safeLsGet<Item[]>(LS_ITEMS, []);
      const map = new Map(existing.map((i) => [i.id, i]));
      for (const it of items) {
        map.set(it.id, it);
      }
      safeLsSet(LS_ITEMS, Array.from(map.values()));
    }
  },

  async deleteItem(id: string): Promise<void> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      });
    } catch {
      const items = safeLsGet<Item[]>(LS_ITEMS, []).filter((i) => i.id !== id);
      safeLsSet(LS_ITEMS, items);
    }
  },

  async deleteItems(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        for (const id of ids) {
          store.delete(id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      });
    } catch {
      const items = safeLsGet<Item[]>(LS_ITEMS, []).filter((i) => !idSet.has(i.id));
      safeLsSet(LS_ITEMS, items);
    }
  },

  async clearAllItems(): Promise<void> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch {
      safeLsSet(LS_ITEMS, []);
    }
  },

  async getAllWorkspaces(): Promise<Workspace[]> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('workspaces', 'readonly');
        const store = tx.objectStore('workspaces');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      return safeLsGet<Workspace[]>(LS_WORKSPACES, []);
    }
  },

  async saveWorkspace(ws: Workspace): Promise<void> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('workspaces', 'readwrite');
        const store = tx.objectStore('workspaces');
        store.put(ws);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch {
      const list = safeLsGet<Workspace[]>(LS_WORKSPACES, []);
      const idx = list.findIndex((w) => w.id === ws.id);
      if (idx >= 0) list[idx] = ws;
      else list.push(ws);
      safeLsSet(LS_WORKSPACES, list);
    }
  },

  async saveWorkspaces(workspaces: Workspace[]): Promise<void> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('workspaces', 'readwrite');
        const store = tx.objectStore('workspaces');
        for (const ws of workspaces) {
          store.put(ws);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch {
      safeLsSet(LS_WORKSPACES, workspaces);
    }
  },

  async deleteWorkspace(id: string): Promise<void> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('workspaces', 'readwrite');
        const store = tx.objectStore('workspaces');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch {
      const list = safeLsGet<Workspace[]>(LS_WORKSPACES, []).filter((w) => w.id !== id);
      safeLsSet(LS_WORKSPACES, list);
    }
  },

  async getSettings(): Promise<UserSettings | null> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('user_settings');
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      return safeLsGet<UserSettings | null>(LS_SETTINGS, null);
    }
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        store.put({ key: 'user_settings', value: settings });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch {
      safeLsSet(LS_SETTINGS, settings);
    }
  },

  async getRecentActivity(limit = 100): Promise<ActivityLog[]> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('activity', 'readonly');
        const store = tx.objectStore('activity');
        const index = store.index('timestamp');
        const req = index.openCursor(null, 'prev');
        const results: ActivityLog[] = [];
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor && results.length < limit) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      const list = safeLsGet<ActivityLog[]>(LS_ACTIVITY, []);
      return list.slice(0, limit);
    }
  },

  async logActivity(entry: ActivityLog): Promise<void> {
    try {
      const idb = await openDatabase();
      return await new Promise((resolve, reject) => {
        const tx = idb.transaction('activity', 'readwrite');
        const store = tx.objectStore('activity');
        store.put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch {
      const list = safeLsGet<ActivityLog[]>(LS_ACTIVITY, []);
      list.unshift(entry);
      if (list.length > 200) list.length = 200;
      safeLsSet(LS_ACTIVITY, list);
    }
  },

  async clearAllData(): Promise<void> {
    try {
      const idb = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction(['items', 'workspaces', 'activity'], 'readwrite');
        tx.objectStore('items').clear();
        tx.objectStore('workspaces').clear();
        tx.objectStore('activity').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch {}

    // Always clear both modern Sideleaf and legacy LocalStorage fallback keys
    safeLsSet(LS_ITEMS, []);
    safeLsSet(LS_WORKSPACES, []);
    safeLsSet(LS_ACTIVITY, []);
    try {
      localStorage.removeItem('workpad_ls_items');
      localStorage.removeItem('workpad_ls_workspaces');
      localStorage.removeItem('workpad_ls_activity');
    } catch {}
  }
};

