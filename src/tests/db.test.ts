import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../services/db';
import { Item, Workspace } from '../types';

// Mock localStorage for Node testing environment
if (typeof localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: 0,
  } as Storage;
}

describe('Database & Persistence Layer', () => {
  beforeEach(async () => {
    localStorage.clear();
    try {
      await db.clearAllData();
    } catch {}
  });

  it('saves and retrieves items successfully', async () => {
    const item: Item = {
      id: 'test-item-1',
      workspaceId: null,
      type: 'text',
      content: 'Persistence test content',
      status: 'active',
      order: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.saveItem(item);
    const items = await db.getAllItems();
    expect(items.some((i) => i.id === 'test-item-1')).toBe(true);
  });

  it('performs bulk item deletion reliably', async () => {
    const item1: Item = {
      id: 'del-1',
      workspaceId: null,
      type: 'text',
      content: 'Item 1',
      status: 'deleted',
      order: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const item2: Item = {
      id: 'del-2',
      workspaceId: null,
      type: 'text',
      content: 'Item 2',
      status: 'deleted',
      order: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.saveItems([item1, item2]);
    await db.deleteItems(['del-1', 'del-2']);

    const remaining = await db.getAllItems();
    expect(remaining.some((i) => i.id === 'del-1' || i.id === 'del-2')).toBe(false);
  });

  it('persists and updates workspaces correctly', async () => {
    const ws: Workspace = {
      id: 'ws-test',
      name: 'Test Project',
      color: '#10b981',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.saveWorkspace(ws);
    const workspaces = await db.getAllWorkspaces();
    expect(workspaces.some((w) => w.id === 'ws-test')).toBe(true);

    await db.deleteWorkspace('ws-test');
    const remaining = await db.getAllWorkspaces();
    expect(remaining.some((w) => w.id === 'ws-test')).toBe(false);
  });
});
