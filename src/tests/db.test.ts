import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../services/db';
import { Item, Workspace, ItemType } from '../types';

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

  it('saves, retrieves, and mutates decision items cleanly (Spec Section 17, 82)', async () => {
    const decisionItem: Item = {
      id: 'decision-item-1',
      workspaceId: 'ws-arch',
      type: 'decision',
      content: 'Selected IndexedDB with localStorage fallback for reliable browser-native persistence',
      status: 'active',
      tags: ['persistence', 'storage'],
      order: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };

    await db.saveItem(decisionItem);

    let items = await db.getAllItems();
    const retrieved = items.find((i) => i.id === 'decision-item-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.type).toBe('decision');
    expect(retrieved?.workspaceId).toBe('ws-arch');
    expect(retrieved?.tags).toEqual(['persistence', 'storage']);

    // Mutate decision in database
    const updatedDecision: Item = {
      ...decisionItem,
      content: 'Selected IndexedDB with localStorage fallback (Audited for Safari and Firefox)',
      updatedAt: 2000,
    };
    await db.saveItem(updatedDecision);

    items = await db.getAllItems();
    const updatedRetrieved = items.find((i) => i.id === 'decision-item-1');
    expect(updatedRetrieved?.content).toContain('(Audited for Safari and Firefox)');
    expect(updatedRetrieved?.updatedAt).toBe(2000);
    expect(updatedRetrieved?.type).toBe('decision');
  });

  it('persists items across all supported ItemType variants', async () => {
    const types: ItemType[] = ['text', 'checklist', 'quote', 'link', 'divider', 'decision'];

    const itemsToSave: Item[] = types.map((type, idx) => ({
      id: `type-item-${idx}`,
      workspaceId: null,
      type,
      content: `Item of type ${type}`,
      checked: type === 'checklist' ? false : undefined,
      status: 'active',
      order: idx,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    await db.saveItems(itemsToSave);

    const retrievedItems = await db.getAllItems();
    for (const type of types) {
      const match = retrievedItems.find((i) => i.type === type);
      expect(match).toBeDefined();
      expect(match?.type).toBe(type);
    }
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
