import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, DB_NAME, DB_VERSION, _resetDbForTests, _setIndexedDBSupportedForTests, openDatabase } from '../services/db';
import { generateExportData, validateSideleafData } from '../services/exportImport';
import { Item, Workspace, WorkspaceGroup } from '../types';

class LocalStorageMock implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new LocalStorageMock();
}

const group: WorkspaceGroup = {
  id: 'group-client-a',
  name: 'Client A',
  color: '#0f766e',
  order: 0,
  collapsed: false,
  createdAt: 100,
  updatedAt: 100,
};

const workspace: Workspace = {
  id: 'ws-client-a-design',
  name: 'Design',
  groupId: group.id,
  order: 0,
  createdAt: 100,
  updatedAt: 100,
};

describe('Workspace groups persistence and portability', () => {
  beforeEach(() => {
    _resetDbForTests();
    localStorage.clear();
    indexedDB.deleteDatabase(DB_NAME);
  });

  afterEach(() => {
    _resetDbForTests();
  });

  it('creates the version 4 group store with ordering indexes', async () => {
    const database = await openDatabase();
    expect(database.version).toBe(DB_VERSION);
    expect(database.objectStoreNames.contains('workspaceGroups')).toBe(true);
    const tx = database.transaction('workspaceGroups', 'readonly');
    expect(tx.objectStore('workspaceGroups').indexNames.contains('order')).toBe(true);
    expect(tx.objectStore('workspaceGroups').indexNames.contains('updatedAt')).toBe(true);
  });

  it('persists group membership and clears groups without deleting workspaces', async () => {
    await db.saveWorkspaceGroup(group);
    await db.saveWorkspace(workspace);
    expect(await db.getAllWorkspaceGroups()).toEqual([group]);
    expect((await db.getAllWorkspaces())[0].groupId).toBe(group.id);

    await db.deleteWorkspaceGroup(group.id);
    expect(await db.getAllWorkspaceGroups()).toHaveLength(0);
    expect(await db.getAllWorkspaces()).toHaveLength(1);

    await db.saveWorkspaceGroup(group);
    await db.clearContentData();
    expect(await db.getAllWorkspaceGroups()).toHaveLength(0);
    expect(await db.getAllWorkspaces()).toHaveLength(0);
  });

  it('uses localStorage fallback for groups', async () => {
    _setIndexedDBSupportedForTests(false);
    await db.saveWorkspaceGroup(group);
    expect(await db.getAllWorkspaceGroups()).toEqual([group]);
    await db.deleteWorkspaceGroup(group.id);
    expect(await db.getAllWorkspaceGroups()).toHaveLength(0);
    _setIndexedDBSupportedForTests(true);
  });

  it('round-trips optional groups while accepting legacy exports', () => {
    const item: Item = {
      id: 'item-client-a',
      workspaceId: workspace.id,
      type: 'text',
      content: 'Review homepage direction',
      status: 'active',
      order: 0,
      createdAt: 100,
      updatedAt: 100,
    };
    const exported = generateExportData([workspace], [item], undefined, undefined, undefined, undefined, [group]);
    const validation = validateSideleafData(exported);
    expect(validation.valid).toBe(true);
    expect(validation.stats?.workspaceGroupsCount).toBe(1);
    expect(validation.data?.workspaceGroups?.[0].name).toBe('Client A');

    const legacy = validateSideleafData({ schema: 'workpad-v1', version: '1.0.0', workspaces: [workspace], items: [item] });
    expect(legacy.valid).toBe(true);
    expect(legacy.stats?.workspaceGroupsCount).toBeUndefined();
  });
});
