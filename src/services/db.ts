import { Item, Workspace, UserSettings, ActivityLog } from '../types';

const DB_NAME = 'workpad_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
let isIdbSupported = typeof indexedDB !== 'undefined';

function openDatabase(): Promise<IDBDatabase> {
  if (!isIdbSupported) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
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

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      isIdbSupported = false;
      reject(request.error);
    };
  });

  return dbPromise;
}

// Fallback LocalStorage Keys
const LS_ITEMS = 'workpad_ls_items';
const LS_WORKSPACES = 'workpad_ls_workspaces';
const LS_SETTINGS = 'workpad_ls_settings';
const LS_ACTIVITY = 'workpad_ls_activity';

export const db = {
  async getAllItems(): Promise<Item[]> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('items', 'readonly');
        const store = tx.objectStore('items');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      const raw = localStorage.getItem(LS_ITEMS);
      return raw ? JSON.parse(raw) : [];
    }
  },

  async saveItem(item: Item): Promise<void> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      const items = await this.getAllItems();
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      localStorage.setItem(LS_ITEMS, JSON.stringify(items));
    }
  },

  async saveItems(items: Item[]): Promise<void> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        for (const item of items) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      localStorage.setItem(LS_ITEMS, JSON.stringify(items));
    }
  },

  async deleteItem(id: string): Promise<void> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      const items = (await this.getAllItems()).filter((i) => i.id !== id);
      localStorage.setItem(LS_ITEMS, JSON.stringify(items));
    }
  },

  async clearAllItems(): Promise<void> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      localStorage.removeItem(LS_ITEMS);
    }
  },

  async getAllWorkspaces(): Promise<Workspace[]> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('workspaces', 'readonly');
        const store = tx.objectStore('workspaces');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      const raw = localStorage.getItem(LS_WORKSPACES);
      return raw ? JSON.parse(raw) : [];
    }
  },

  async saveWorkspace(ws: Workspace): Promise<void> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('workspaces', 'readwrite');
        const store = tx.objectStore('workspaces');
        const req = store.put(ws);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      const list = await this.getAllWorkspaces();
      const idx = list.findIndex((w) => w.id === ws.id);
      if (idx >= 0) list[idx] = ws;
      else list.push(ws);
      localStorage.setItem(LS_WORKSPACES, JSON.stringify(list));
    }
  },

  async saveWorkspaces(workspaces: Workspace[]): Promise<void> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('workspaces', 'readwrite');
        const store = tx.objectStore('workspaces');
        for (const ws of workspaces) {
          store.put(ws);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      localStorage.setItem(LS_WORKSPACES, JSON.stringify(workspaces));
    }
  },

  async deleteWorkspace(id: string): Promise<void> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('workspaces', 'readwrite');
        const store = tx.objectStore('workspaces');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      const list = (await this.getAllWorkspaces()).filter((w) => w.id !== id);
      localStorage.setItem(LS_WORKSPACES, JSON.stringify(list));
    }
  },

  async getSettings(): Promise<UserSettings | null> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('user_settings');
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      const raw = localStorage.getItem(LS_SETTINGS);
      return raw ? JSON.parse(raw) : null;
    }
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        const req = store.put({ key: 'user_settings', value: settings });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
    }
  },

  async getRecentActivity(limit = 100): Promise<ActivityLog[]> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
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
      });
    } catch {
      const raw = localStorage.getItem(LS_ACTIVITY);
      const list: ActivityLog[] = raw ? JSON.parse(raw) : [];
      return list.slice(0, limit);
    }
  },

  async logActivity(entry: ActivityLog): Promise<void> {
    try {
      const idb = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction('activity', 'readwrite');
        const store = tx.objectStore('activity');
        const req = store.put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      const raw = localStorage.getItem(LS_ACTIVITY);
      const list: ActivityLog[] = raw ? JSON.parse(raw) : [];
      list.unshift(entry);
      if (list.length > 200) list.length = 200;
      localStorage.setItem(LS_ACTIVITY, JSON.stringify(list));
    }
  },

  async clearAllData(): Promise<void> {
    try {
      const idb = await openDatabase();
      const tx = idb.transaction(['items', 'workspaces', 'activity'], 'readwrite');
      tx.objectStore('items').clear();
      tx.objectStore('workspaces').clear();
      tx.objectStore('activity').clear();
      await new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
      });
    } catch {
      localStorage.removeItem(LS_ITEMS);
      localStorage.removeItem(LS_WORKSPACES);
      localStorage.removeItem(LS_ACTIVITY);
    }
  }
};
