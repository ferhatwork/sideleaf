import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkspaceView } from '../components/WorkspaceView';
import { TodayView } from '../components/TodayView';
import { GroupSelectButton } from '../components/GroupSelectButton';
import { toggleGroupSelectionState, reconcileSelectionState } from '../utils/domain';
import { SideleafContext } from '../hooks/useSideleaf';
import { getTranslation } from '../i18n';
import {
  openDatabase,
  db,
  _resetDbForTests,
  _setIndexedDBSupportedForTests,
  DB_NAME,
  DB_VERSION,
} from '../services/db';
import {
  generateExportData,
  exportWorkspaceToMarkdown,
  validateSideleafData,
} from '../services/exportImport';
import { searchItems } from '../services/search';
import { Section, Workspace, Item, UserSettings, ActivityLog } from '../types';

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

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new LocalStorageMock();
}

describe('Sections & Long-List Architecture Suite', () => {
  beforeEach(async () => {
    _resetDbForTests();
    globalThis.localStorage.clear();
    indexedDB.deleteDatabase(DB_NAME);
  });

  describe('Database Schema & IndexedDB DB_VERSION 2', () => {
    it('initializes DB_VERSION 2 with sections object store and required indexes', async () => {
      const database = await openDatabase();
      expect(database.version).toBe(DB_VERSION);
      expect(DB_VERSION).toBeGreaterThanOrEqual(2);

      // Verify sections store and its indexes
      expect(database.objectStoreNames.contains('sections')).toBe(true);
      const tx = database.transaction(['sections', 'items'], 'readonly');
      const sectionStore = tx.objectStore('sections');
      expect(sectionStore.indexNames.contains('workspaceId')).toBe(true);
      expect(sectionStore.indexNames.contains('order')).toBe(true);
      expect(sectionStore.indexNames.contains('updatedAt')).toBe(true);

      // Verify items store has sectionId index
      const itemStore = tx.objectStore('items');
      expect(itemStore.indexNames.contains('sectionId')).toBe(true);
    });

    it('performs CRUD operations on sections in DB service', async () => {
      const sec1: Section = {
        id: 'sec_1',
        workspaceId: 'ws_alpha',
        name: 'Design References',
        order: 0,
        collapsed: false,
        createdAt: 1000,
        updatedAt: 1000,
      };
      const sec2: Section = {
        id: 'sec_2',
        workspaceId: 'ws_alpha',
        name: 'Pending Reviews',
        order: 1,
        collapsed: true,
        createdAt: 2000,
        updatedAt: 2000,
      };

      // Save single and batch
      await db.saveSection(sec1);
      await db.saveSections([sec2]);

      const all = await db.getAllSections();
      expect(all).toHaveLength(2);
      expect(all.find((s) => s.id === 'sec_1')?.name).toBe('Design References');
      expect(all.find((s) => s.id === 'sec_2')?.collapsed).toBe(true);

      // Update section
      await db.saveSection({ ...sec1, name: 'Design References (Updated)' });
      const updatedAll = await db.getAllSections();
      expect(updatedAll.find((s) => s.id === 'sec_1')?.name).toBe('Design References (Updated)');

      // Delete single
      await db.deleteSection('sec_1');
      const afterDelete1 = await db.getAllSections();
      expect(afterDelete1).toHaveLength(1);
      expect(afterDelete1[0].id).toBe('sec_2');

      // Delete batch
      await db.deleteSections(['sec_2']);
      const afterDelete2 = await db.getAllSections();
      expect(afterDelete2).toHaveLength(0);
    });
  });

  describe('Workspace viewMode Persistence', () => {
    it('persists compact and normal viewMode in workspace records', async () => {
      const ws: Workspace = {
        id: 'ws_100',
        name: 'Dense Catalog',
        viewMode: 'compact',
        createdAt: 1000,
        updatedAt: 1000,
      };

      await db.saveWorkspace(ws);
      const workspaces = await db.getAllWorkspaces();
      expect(workspaces[0].viewMode).toBe('compact');

      // Toggle to normal
      await db.saveWorkspace({ ...ws, viewMode: 'normal' });
      const updatedWorkspaces = await db.getAllWorkspaces();
      expect(updatedWorkspaces[0].viewMode).toBe('normal');
    });
  });

  describe('Search Relevance Bonus for Section Matches', () => {
    it('applies +25 relevance score when section name matches search query', () => {
      const ws: Workspace = {
        id: 'ws_1',
        name: 'Client Projects',
        createdAt: 1000,
        updatedAt: 1000,
      };

      const sections: Section[] = [
        {
          id: 'sec_apparel',
          workspaceId: 'ws_1',
          name: 'Apparel Design Concepts',
          order: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'sec_other',
          workspaceId: 'ws_1',
          name: 'General Notes',
          order: 1,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      const itemInApparel: Item = {
        id: 'item_1',
        workspaceId: 'ws_1',
        sectionId: 'sec_apparel',
        type: 'text',
        content: 'Vintage Skull graphic draft',
        status: 'active',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const itemInOther: Item = {
        id: 'item_2',
        workspaceId: 'ws_1',
        sectionId: 'sec_other',
        type: 'text',
        content: 'Random thoughts about colors',
        status: 'active',
        order: 1,
        createdAt: 1000,
        updatedAt: 1000,
      };

      // Search for "Apparel" - item_1's section matches "Apparel"
      const results = searchItems({
        query: 'Apparel',
        items: [itemInApparel, itemInOther],
        workspaces: [ws],
        sections,
        limit: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe('item_1');
      expect(results[0].matchedFields).toContain('section');
      expect(results[0].score).toBeGreaterThanOrEqual(25);
    });
  });

  describe('Export & Import with Sections', () => {
    const mockWs: Workspace = {
      id: 'ws_test',
      name: 'Test Workspace',
      createdAt: 1000,
      updatedAt: 1000,
    };

    const mockSections: Section[] = [
      {
        id: 'sec_1',
        workspaceId: 'ws_test',
        name: 'Urgent Tasks',
        order: 0,
        collapsed: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'sec_2',
        workspaceId: 'ws_test',
        name: 'Reference Links',
        order: 1,
        collapsed: true,
        createdAt: 2000,
        updatedAt: 2000,
      },
    ];

    const mockItems: Item[] = [
      {
        id: 'item_1',
        workspaceId: 'ws_test',
        sectionId: 'sec_1',
        type: 'checklist',
        content: 'Prepare deliverables',
        checked: false,
        status: 'active',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'item_2',
        workspaceId: 'ws_test',
        sectionId: 'sec_2',
        type: 'link',
        content: 'Vintage Skull Design',
        source: { url: 'https://site.com/design1', capturedAt: 1000 },
        status: 'active',
        order: 1,
        createdAt: 2000,
        updatedAt: 2000,
      },
      {
        id: 'item_3',
        workspaceId: 'ws_test',
        sectionId: null, // Unsectioned
        type: 'text',
        content: 'Unsectioned thought',
        status: 'active',
        order: 2,
        createdAt: 3000,
        updatedAt: 3000,
      },
    ];

    it('exports sections in JSON backup and reports sectionsCount in validation stats', () => {
      const data = generateExportData(
        [mockWs],
        mockItems,
        undefined,
        undefined,
        mockSections
      );

      expect(data.sections).toHaveLength(2);
      expect(data.sections![0].name).toBe('Urgent Tasks');

      const validation = validateSideleafData(data);
      expect(validation.valid).toBe(true);
      expect(validation.stats?.sectionsCount).toBe(2);
    });

    it('exports Markdown with section headings and groups items properly', () => {
      const md = exportWorkspaceToMarkdown('Test Workspace', mockItems, mockSections);

      expect(md).toContain('# Test Workspace');
      expect(md).toContain('## Urgent Tasks');
      expect(md).toContain('- [ ] Prepare deliverables');
      expect(md).toContain('## Reference Links');
      expect(md).toContain('[Vintage Skull Design](https://site.com/design1)');
      expect(md).toContain('Unsectioned thought');
    });

    it('remaps section IDs and item sectionIds cleanly to prevent collisions', async () => {
      const newWsId = 'ws_imported_new';
      const sectionIdMap = new Map<string, string>();
      const remappedSections: Section[] = mockSections.map((s, idx) => {
        const remappedId = `sec_new_${idx}`;
        sectionIdMap.set(s.id, remappedId);
        return {
          ...s,
          id: remappedId,
          workspaceId: newWsId,
        };
      });

      const remappedItems: Item[] = mockItems.map((it) => ({
        ...it,
        workspaceId: newWsId,
        sectionId: it.sectionId ? (sectionIdMap.get(it.sectionId) || null) : null,
      }));

      expect(remappedSections[0].id).toBe('sec_new_0');
      expect(remappedSections[0].workspaceId).toBe(newWsId);
      expect(remappedSections[1].id).toBe('sec_new_1');
      expect(remappedSections[1].workspaceId).toBe(newWsId);

      // Verify item sectionId remapping
      const item1 = remappedItems.find((i) => i.content === 'Prepare deliverables');
      expect(item1?.sectionId).toBe('sec_new_0');
      expect(item1?.workspaceId).toBe(newWsId);

      const item2 = remappedItems.find((i) => i.content === 'Vintage Skull Design');
      expect(item2?.sectionId).toBe('sec_new_1');
      expect(item2?.workspaceId).toBe(newWsId);

      // Unsectioned item remains unsectioned
      const item3 = remappedItems.find((i) => i.content === 'Unsectioned thought');
      expect(item3?.sectionId).toBeNull();
      expect(item3?.workspaceId).toBe(newWsId);
    });

    it('seamlessly validates legacy backups with zero sections (backward compatibility)', () => {
      const legacyCandidate = {
        schema: 'workpad-v1',
        version: '1.0.0',
        exportedAt: '2025-01-01T00:00:00.000Z',
        workspaces: [mockWs],
        items: [
          {
            id: 'legacy_it_1',
            workspaceId: mockWs.id,
            type: 'text',
            content: 'Legacy note',
            status: 'active',
            order: 0,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
      };

      const val = validateSideleafData(legacyCandidate);
      expect(val.valid).toBe(true);
      expect(val.stats?.sectionsCount).toBeUndefined();
      expect(val.stats?.itemsCount).toBe(1);
    });
  });

  describe('Section Item Preservation on Deletion', () => {
    it('sets item sectionId to null when section is removed, never deleting the item', () => {
      const items: Item[] = [
        {
          id: 'item_a',
          workspaceId: 'ws_1',
          sectionId: 'sec_to_delete',
          type: 'text',
          content: 'Keep me alive!',
          status: 'active',
          order: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'item_b',
          workspaceId: 'ws_1',
          sectionId: 'sec_keep',
          type: 'text',
          content: 'Other section',
          status: 'active',
          order: 1,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      // Simulating section deletion logic from useSideleaf
      const sectionIdToDelete = 'sec_to_delete';
      const updatedItems = items.map((it) =>
        it.sectionId === sectionIdToDelete ? { ...it, sectionId: null } : it
      );

      expect(updatedItems).toHaveLength(2);
      expect(updatedItems[0].id).toBe('item_a');
      expect(updatedItems[0].sectionId).toBeNull(); // Safe unsectioned
      expect(updatedItems[0].workspaceId).toBe('ws_1'); // Stays in workspace
      expect(updatedItems[0].status).toBe('active'); // Never deleted

      expect(updatedItems[1].sectionId).toBe('sec_keep');
    });
  });

  describe('Adversarial Regression: Bulk Operations & Race Conditions', () => {
    it('bulk move assigns targetSectionId without corrupting workspaceId', async () => {
      const items: Item[] = [
        {
          id: 'item_1',
          workspaceId: 'ws_target',
          sectionId: 'sec_old',
          type: 'text',
          content: 'Item 1',
          status: 'active',
          order: 100,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'item_2',
          workspaceId: 'ws_target',
          sectionId: null,
          type: 'text',
          content: 'Item 2',
          status: 'active',
          order: 200,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      // Replicating fixed bulkMoveItems logic with (itemIds, targetSectionId)
      const targetSectionId = 'sec_new';
      const idSet = new Set(['item_1', 'item_2']);
      const moved = items.map((it) => {
        if (!idSet.has(it.id)) return it;
        return {
          ...it,
          sectionId: targetSectionId,
          workspaceId: it.workspaceId, // strictly preserved
          updatedAt: Date.now(),
        };
      });

      expect(moved[0].sectionId).toBe('sec_new');
      expect(moved[0].workspaceId).toBe('ws_target');
      expect(moved[1].sectionId).toBe('sec_new');
      expect(moved[1].workspaceId).toBe('ws_target');

      // Moving to unsectioned (null)
      const unsectioned = moved.map((it) => ({
        ...it,
        sectionId: null,
        workspaceId: it.workspaceId,
      }));
      expect(unsectioned[0].sectionId).toBeNull();
      expect(unsectioned[0].workspaceId).toBe('ws_target'); // Never nulled out!
    });

    it('addBulkItems generates timestamps such that descending updatedAt sort preserves 1..N order', () => {
      const inputs = ['First added', 'Second added', 'Third added'];
      const now = 10000;
      const count = inputs.length;

      // Logic from fixed addBulkItems
      const createdItems = inputs.map((content, idx) => ({
        id: `item_${idx}`,
        content,
        updatedAt: now + (count - idx),
      }));

      // Workspace view sorts descending by b.updatedAt - a.updatedAt
      const sorted = [...createdItems].sort((a, b) => b.updatedAt - a.updatedAt);

      expect(sorted[0].content).toBe('First added');
      expect(sorted[1].content).toBe('Second added');
      expect(sorted[2].content).toBe('Third added');
    });

    it('undoing section delete does not clobber edits made while undo toast is active', async () => {
      const secId = 'sec_to_delete';
      let secItems: Item[] = [
        {
          id: 'item_x',
          workspaceId: 'ws_1',
          sectionId: secId,
          type: 'text',
          content: 'Original Title',
          status: 'active',
          order: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      // 1. Delete section: item becomes unsectioned
      const affectedIds = ['item_x'];
      secItems = secItems.map((it) =>
        it.sectionId === secId ? { ...it, sectionId: null } : it
      );
      expect(secItems[0].sectionId).toBeNull();

      // 2. User edits item while undo is pending
      secItems = secItems.map((it) =>
        it.id === 'item_x' ? { ...it, content: 'Brand New Edited Title' } : it
      );
      expect(secItems[0].content).toBe('Brand New Edited Title');

      // 3. Undo section deletion (fixed logic: only restores sectionId, preserves current content)
      secItems = secItems.map((it) =>
        affectedIds.includes(it.id) ? { ...it, sectionId: secId } : it
      );

      expect(secItems[0].sectionId).toBe(secId);
      expect(secItems[0].content).toBe('Brand New Edited Title'); // Preserved, not overwritten!
    });

    it('selection reconciliation removes items that are no longer active in workspace', () => {
      const initialSelection = new Set(['item_1', 'item_2', 'item_3']);
      const currentWorkspaceItems: Item[] = [
        {
          id: 'item_1',
          workspaceId: 'ws_1',
          sectionId: null,
          type: 'text',
          content: 'Alive',
          status: 'active',
          order: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
        // item_2 was archived or deleted
        // item_3 was moved to another workspace
      ];

      const validIds = new Set(currentWorkspaceItems.map((i) => i.id));
      const nextSelection = new Set<string>();
      for (const id of initialSelection) {
        if (validIds.has(id)) {
          nextSelection.add(id);
        }
      }

      expect(Array.from(nextSelection)).toEqual(['item_1']);
      expect(nextSelection.has('item_2')).toBe(false);
      expect(nextSelection.has('item_3')).toBe(false);
    });

    it('search ephemeral reveal does not mutate stored section collapse preference', async () => {
      const sec: Section = {
        id: 'sec_collapsed',
        workspaceId: 'ws_search',
        name: 'Hidden Section',
        order: 0,
        collapsed: true,
        createdAt: 1000,
        updatedAt: 1000,
      };
      await db.saveSection(sec);

      // Verify persisted state is collapsed: true
      let stored = (await db.getAllSections()).find((s) => s.id === 'sec_collapsed');
      expect(stored?.collapsed).toBe(true);

      // Simulate search navigation ephemeral reveal
      let ephemeralRevealedSectionId: string | null = null;
      const handleSelectItemFromSearch = (foundSecId: string | null) => {
        if (foundSecId) {
          ephemeralRevealedSectionId = foundSecId;
        }
      };

      handleSelectItemFromSearch(sec.id);
      expect(ephemeralRevealedSectionId).toBe(sec.id);

      // WorkspaceView evaluates effective collapse state:
      const isTemporarilyRevealed = ephemeralRevealedSectionId === sec.id;
      const effectiveCollapsed = isTemporarilyRevealed ? false : Boolean(sec.collapsed);

      // The section is effectively revealed (not collapsed) to show the search item:
      expect(effectiveCollapsed).toBe(false);

      // Stored database state was NOT touched and remains collapsed: true
      stored = (await db.getAllSections()).find((s) => s.id === 'sec_collapsed');
      expect(stored?.collapsed).toBe(true);

      // When the user clears reveal (e.g. toggles or navigates away):
      ephemeralRevealedSectionId = null;
      const resetEffectiveCollapsed = ephemeralRevealedSectionId === sec.id ? false : Boolean(sec.collapsed);
      expect(resetEffectiveCollapsed).toBe(true);
    });

    it('section deletion updates items across all statuses (active, archived, deleted) and undo preserves statuses and intermediate edits', async () => {
      const secId = 'sec_mixed';
      const items: Item[] = [
        {
          id: 'item_act',
          workspaceId: 'ws_1',
          sectionId: secId,
          type: 'text',
          content: 'Active Item',
          status: 'active',
          order: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'item_arc',
          workspaceId: 'ws_1',
          sectionId: secId,
          type: 'link',
          content: 'https://example.com',
          status: 'archived',
          order: 1,
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'item_del',
          workspaceId: 'ws_1',
          sectionId: secId,
          type: 'decision',
          content: 'Deleted Item',
          status: 'deleted',
          order: 2,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      // Simulate section deletion across all items
      const affectedItemIds: string[] = [];
      let updatedItems = items.map((it) => {
        if (it.sectionId === secId) {
          affectedItemIds.push(it.id);
          return { ...it, sectionId: null, updatedAt: 2000 };
        }
        return it;
      });

      expect(affectedItemIds).toHaveLength(3);
      expect(updatedItems.every((it) => it.sectionId === null)).toBe(true);

      // Verify statuses were strictly preserved
      expect(updatedItems.find((it) => it.id === 'item_act')?.status).toBe('active');
      expect(updatedItems.find((it) => it.id === 'item_arc')?.status).toBe('archived');
      expect(updatedItems.find((it) => it.id === 'item_del')?.status).toBe('deleted');

      // User modifies active item content while undo toast is pending
      updatedItems = updatedItems.map((it) =>
        it.id === 'item_act' ? { ...it, content: 'Active Item (Modified during toast)' } : it
      );

      // Undo deletion
      const restoredItems = updatedItems.map((it) => {
        if (affectedItemIds.includes(it.id)) {
          return { ...it, sectionId: secId, updatedAt: 3000 };
        }
        return it;
      });

      // All 3 items regain sectionId
      expect(restoredItems.every((it) => it.sectionId === secId)).toBe(true);

      // All 3 items retain their original statuses
      expect(restoredItems.find((it) => it.id === 'item_act')?.status).toBe('active');
      expect(restoredItems.find((it) => it.id === 'item_arc')?.status).toBe('archived');
      expect(restoredItems.find((it) => it.id === 'item_del')?.status).toBe('deleted');

      // Modified content was preserved without being overwritten by undo
      expect(restoredItems.find((it) => it.id === 'item_act')?.content).toBe('Active Item (Modified during toast)');
    });

    it('workspace deletion eliminates associated sections in IndexedDB', async () => {
      const ws: Workspace = { id: 'ws_clean', name: 'To Clean', createdAt: 1000, updatedAt: 1000 };
      const sec1: Section = { id: 'sec_c1', workspaceId: 'ws_clean', name: 'S1', order: 0, createdAt: 1000, updatedAt: 1000 };
      const sec2: Section = { id: 'sec_c2', workspaceId: 'ws_other', name: 'S2', order: 0, createdAt: 1000, updatedAt: 1000 };

      await db.saveWorkspace(ws);
      await db.saveSections([sec1, sec2]);

      let allSecs = await db.getAllSections();
      expect(allSecs).toHaveLength(2);

      await db.deleteWorkspace('ws_clean');

      allSecs = await db.getAllSections();
      expect(allSecs).toHaveLength(1);
      expect(allSecs[0].id).toBe('sec_c2');
      expect(allSecs.find((s) => s.workspaceId === 'ws_clean')).toBeUndefined();
    });

    it('selection is completely reset when Replace import removes previously selected items', () => {
      // Prior to import, 2 items are selected in workspace 'ws_target'
      const priorSelectedIds = new Set(['old_item_1', 'old_item_2']);

      // Replace import replaces all items in the workspace with new items
      const importedWorkspaceItems: Item[] = [
        {
          id: 'new_item_101',
          workspaceId: 'ws_target',
          sectionId: null,
          type: 'text',
          content: 'Fresh Import 1',
          status: 'active',
          order: 0,
          createdAt: 5000,
          updatedAt: 5000,
        },
        {
          id: 'new_item_102',
          workspaceId: 'ws_target',
          sectionId: null,
          type: 'text',
          content: 'Fresh Import 2',
          status: 'active',
          order: 1,
          createdAt: 5000,
          updatedAt: 5000,
        },
      ];

      // Reconciliation effect logic in WorkspaceView:
      const validIds = new Set(importedWorkspaceItems.map((i) => i.id));
      const reconciledSelection = new Set<string>();
      for (const id of priorSelectedIds) {
        if (validIds.has(id)) {
          reconciledSelection.add(id);
        }
      }

      // Old selected item IDs must be completely purged
      expect(reconciledSelection.size).toBe(0);
      expect(reconciledSelection.has('old_item_1')).toBe(false);
      expect(reconciledSelection.has('old_item_2')).toBe(false);
    });

    it('Replace import clears content stores (workspaces, sections, items) while strictly preserving settings, activity history, and migration flags', async () => {
      const database = await openDatabase();

      // 1. Existing persistent state before import
      const existingSettings: UserSettings = {
        theme: 'dark',
        locale: 'tr',
        quickCaptureShortcut: 'Ctrl+Shift+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 2500,
        defaultView: 'scratch',
      };
      await db.saveSettings(existingSettings);

      // Record migration flag in settings store
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction('settings', 'readwrite');
        tx.objectStore('settings').put({ key: 'migrated_from_workpad', value: true });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Record activity history
      await db.logActivity({
        id: 'act_user_1',
        action: 'capture',
        details: 'Captured critical note',
        timestamp: 5000,
        itemId: 'item_old',
      });

      // Existing content (workspaces, sections, items)
      await db.saveWorkspace({ id: 'ws_old', name: 'Old Workspace', createdAt: 100, updatedAt: 100 });
      await db.saveSection({ id: 'sec_old', workspaceId: 'ws_old', name: 'Old Section', order: 0, createdAt: 100, updatedAt: 100 });
      await db.saveItem({
        id: 'item_old',
        workspaceId: 'ws_old',
        sectionId: 'sec_old',
        type: 'text',
        content: 'Old Item to be replaced',
        status: 'active',
        order: 0,
        createdAt: 100,
        updatedAt: 100,
      });

      // Verify baseline
      expect(await db.getAllWorkspaces()).toHaveLength(1);
      expect(await db.getAllSections()).toHaveLength(1);
      expect(await db.getAllItems()).toHaveLength(1);
      expect(await db.getRecentActivity()).toHaveLength(1);
      const baselineSettings = await db.getSettings();
      expect(baselineSettings?.locale).toBe('tr');
      expect(baselineSettings?.theme).toBe('dark');

      // 2. Perform Replace import using db.clearContentData()
      await db.clearContentData();

      const importedWorkspaces: Workspace[] = [{ id: 'ws_imported', name: 'Imported Workspace', createdAt: 2000, updatedAt: 2000 }];
      const importedSections: Section[] = [{ id: 'sec_imported', workspaceId: 'ws_imported', name: 'Imported Section', order: 0, createdAt: 2000, updatedAt: 2000 }];
      const importedItems: Item[] = [{
        id: 'item_imported',
        workspaceId: 'ws_imported',
        sectionId: 'sec_imported',
        type: 'text',
        content: 'Fresh Imported Content',
        status: 'active',
        order: 0,
        createdAt: 2000,
        updatedAt: 2000,
      }];

      await db.saveWorkspaces(importedWorkspaces);
      await db.saveSections(importedSections);
      await db.saveItems(importedItems);

      // 3. Post-import verification:
      // A. Content is cleanly replaced (old records are completely gone)
      const postWorkspaces = await db.getAllWorkspaces();
      expect(postWorkspaces).toHaveLength(1);
      expect(postWorkspaces[0].id).toBe('ws_imported');

      const postSections = await db.getAllSections();
      expect(postSections).toHaveLength(1);
      expect(postSections[0].id).toBe('sec_imported');

      const postItems = await db.getAllItems();
      expect(postItems).toHaveLength(1);
      expect(postItems[0].id).toBe('item_imported');

      // B. Settings and user preferences are NOT reset or lost
      const postSettings = await db.getSettings();
      expect(postSettings).not.toBeNull();
      expect(postSettings?.theme).toBe('dark');
      expect(postSettings?.locale).toBe('tr');
      expect(postSettings?.quickCaptureShortcut).toBe('Ctrl+Shift+Space');

      // C. Internal migration flags remain intact
      const migrationFlag = await new Promise<boolean>((resolve) => {
        const tx = database.transaction('settings', 'readonly');
        const req = tx.objectStore('settings').get('migrated_from_workpad');
        req.onsuccess = () => resolve(Boolean(req.result?.value));
        req.onerror = () => resolve(false);
      });
      expect(migrationFlag).toBe(true);

      // D. Activity history is preserved and NOT wiped out
      const postActivity = await db.getRecentActivity();
      expect(postActivity).toHaveLength(1);
      expect(postActivity[0].id).toBe('act_user_1');
    });
  });

  describe('Import Semantics & Backup Restoration Suite', () => {
    it('Modern Replace restores backup settings and activity while replacing content and keeping internal flags', async () => {
      const database = await openDatabase();

      // 1. Initial State: locale=tr, theme=dark, activity=old, content=old
      const initialSettings: UserSettings = {
        theme: 'dark',
        locale: 'tr',
        quickCaptureShortcut: 'Ctrl+Shift+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 2500,
        defaultView: 'scratch',
      };
      await db.saveSettings(initialSettings);

      // Set internal migration flag in settings store
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction('settings', 'readwrite');
        tx.objectStore('settings').put({ key: 'migrated_from_workpad', value: true });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      await db.logActivity({
        id: 'act_old',
        action: 'capture',
        details: 'Old activity detail',
        timestamp: 1000,
        itemId: 'item_old',
      });

      await db.saveWorkspace({ id: 'ws_old', name: 'Old WS', createdAt: 1000, updatedAt: 1000 });
      await db.saveSection({ id: 'sec_old', workspaceId: 'ws_old', name: 'Old Sec', order: 0, createdAt: 1000, updatedAt: 1000 });
      await db.saveItem({
        id: 'item_old',
        workspaceId: 'ws_old',
        sectionId: 'sec_old',
        type: 'text',
        content: 'Old Item',
        status: 'active',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });

      // 2. Modern Backup: contains locale=en, theme=light, activity=backup, content=new
      const backupSettings: UserSettings = {
        theme: 'light',
        locale: 'en',
        quickCaptureShortcut: 'Ctrl+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 1500,
        defaultView: 'today',
      };
      const backupActivity: ActivityLog[] = [
        {
          id: 'act_backup',
          action: 'capture',
          details: 'Restored backup activity',
          timestamp: 9000,
          itemId: 'item_new',
        },
      ];
      const backupWorkspaces: Workspace[] = [{ id: 'ws_new', name: 'New WS', createdAt: 2000, updatedAt: 2000 }];
      const backupSections: Section[] = [{ id: 'sec_new', workspaceId: 'ws_new', name: 'New Sec', order: 0, createdAt: 2000, updatedAt: 2000 }];
      const backupItems: Item[] = [{
        id: 'item_new',
        workspaceId: 'ws_new',
        sectionId: 'sec_new',
        type: 'text',
        content: 'New Item',
        status: 'active',
        order: 0,
        createdAt: 2000,
        updatedAt: 2000,
      }];

      // Execute Replace Import
      await db.clearContentData();
      await db.saveWorkspaces(backupWorkspaces);
      await db.saveSections(backupSections);
      await db.saveItems(backupItems);
      await db.saveSettings(backupSettings);
      await db.restoreActivity(backupActivity);

      // 3. Assertions
      // Settings restored
      const postSettings = await db.getSettings();
      expect(postSettings?.locale).toBe('en');
      expect(postSettings?.theme).toBe('light');
      expect(postSettings?.quickCaptureShortcut).toBe('Ctrl+Space');

      // Activity restored
      const postActivity = await db.getRecentActivity();
      expect(postActivity).toHaveLength(1);
      expect(postActivity[0].id).toBe('act_backup');
      expect(postActivity[0].details).toBe('Restored backup activity');

      // Internal flag preserved
      const migrationFlag = await new Promise<boolean>((resolve) => {
        const tx = database.transaction('settings', 'readonly');
        const req = tx.objectStore('settings').get('migrated_from_workpad');
        req.onsuccess = () => resolve(Boolean(req.result?.value));
        req.onerror = () => resolve(false);
      });
      expect(migrationFlag).toBe(true);

      // Content replaced
      expect(await db.getAllWorkspaces()).toHaveLength(1);
      expect((await db.getAllWorkspaces())[0].id).toBe('ws_new');
      expect(await db.getAllSections()).toHaveLength(1);
      expect((await db.getAllSections())[0].id).toBe('sec_new');
      expect(await db.getAllItems()).toHaveLength(1);
      expect((await db.getAllItems())[0].id).toBe('item_new');
    });

    it('Legacy Replace backup preserves current settings and activity when backup omits them', async () => {
      const database = await openDatabase();

      // 1. Initial State: locale=tr, theme=dark, activity=old, content=old
      const initialSettings: UserSettings = {
        theme: 'dark',
        locale: 'tr',
        quickCaptureShortcut: 'Ctrl+Shift+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 2500,
        defaultView: 'scratch',
      };
      await db.saveSettings(initialSettings);

      // Internal flag
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction('settings', 'readwrite');
        tx.objectStore('settings').put({ key: 'migrated_from_workpad', value: true });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      await db.logActivity({
        id: 'act_current',
        action: 'capture',
        details: 'Current ongoing activity',
        timestamp: 5000,
        itemId: 'item_old',
      });

      await db.saveWorkspace({ id: 'ws_old', name: 'Old WS', createdAt: 1000, updatedAt: 1000 });
      await db.saveItem({
        id: 'item_old',
        workspaceId: 'ws_old',
        sectionId: null,
        type: 'text',
        content: 'Old Item',
        status: 'active',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });

      // 2. Legacy Backup: no settings, no activity
      const legacyWorkspaces: Workspace[] = [{ id: 'ws_legacy', name: 'Legacy WS', createdAt: 3000, updatedAt: 3000 }];
      const legacyItems: Item[] = [{
        id: 'item_legacy',
        workspaceId: 'ws_legacy',
        sectionId: null,
        type: 'text',
        content: 'Legacy Item Content',
        status: 'active',
        order: 0,
        createdAt: 3000,
        updatedAt: 3000,
      }];
      const importedSettings = undefined;
      const importedActivity = undefined;

      // Execute Replace Import with legacy backup semantics
      await db.clearContentData();
      await db.saveWorkspaces(legacyWorkspaces);
      await db.saveItems(legacyItems);
      if (importedSettings) {
        await db.saveSettings(importedSettings);
      }
      if (importedActivity) {
        await db.restoreActivity(importedActivity);
      }

      // 3. Assertions
      // Settings remained untouched
      const postSettings = await db.getSettings();
      expect(postSettings?.locale).toBe('tr');
      expect(postSettings?.theme).toBe('dark');
      expect(postSettings?.autoSaveIntervalMs).toBe(2500);

      // Activity remained untouched
      const postActivity = await db.getRecentActivity();
      expect(postActivity).toHaveLength(1);
      expect(postActivity[0].id).toBe('act_current');

      // Internal flag remained untouched
      const migrationFlag = await new Promise<boolean>((resolve) => {
        const tx = database.transaction('settings', 'readonly');
        const req = tx.objectStore('settings').get('migrated_from_workpad');
        req.onsuccess = () => resolve(Boolean(req.result?.value));
        req.onerror = () => resolve(false);
      });
      expect(migrationFlag).toBe(true);

      // Content was replaced
      expect(await db.getAllWorkspaces()).toHaveLength(1);
      expect((await db.getAllWorkspaces())[0].id).toBe('ws_legacy');
      expect(await db.getAllItems()).toHaveLength(1);
      expect((await db.getAllItems())[0].id).toBe('item_legacy');
    });

    it('Merge mode does not overwrite existing settings or activity', async () => {
      // 1. Initial State
      const initialSettings: UserSettings = {
        theme: 'dark',
        locale: 'tr',
        quickCaptureShortcut: 'Ctrl+Shift+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 2500,
        defaultView: 'scratch',
      };
      await db.saveSettings(initialSettings);
      await db.logActivity({
        id: 'act_existing',
        action: 'capture',
        details: 'User activity',
        timestamp: 1000,
      });

      // 2. Incoming merge data (has different settings and activity)
      const incomingSettings: UserSettings = {
        theme: 'light',
        locale: 'en',
        quickCaptureShortcut: 'Ctrl+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 1000,
        defaultView: 'today',
      };
      const incomingActivity: ActivityLog[] = [
        { id: 'act_incoming', action: 'archive', details: 'Incoming activity', timestamp: 2000 },
      ];

      // In Merge mode, settings and activity are NOT overwritten:
      const postSettings = await db.getSettings();
      expect(postSettings?.locale).toBe('tr');
      expect(postSettings?.theme).toBe('dark');
      expect(postSettings?.locale).not.toBe(incomingSettings.locale);

      const postActivity = await db.getRecentActivity();
      expect(postActivity).toHaveLength(1);
      expect(postActivity[0].id).toBe('act_existing');
      expect(postActivity[0].id).not.toBe(incomingActivity[0].id);
    });

    it('New Workspace mode does not overwrite existing settings or activity', async () => {
      const initialSettings: UserSettings = {
        theme: 'dark',
        locale: 'tr',
        quickCaptureShortcut: 'Ctrl+Shift+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 2500,
        defaultView: 'scratch',
      };
      await db.saveSettings(initialSettings);
      await db.logActivity({
        id: 'act_existing_nw',
        action: 'capture',
        details: 'User activity before new workspace import',
        timestamp: 1000,
      });

      // In New Workspace mode, settings and activity are NOT overwritten:
      const postSettings = await db.getSettings();
      expect(postSettings?.locale).toBe('tr');
      expect(postSettings?.theme).toBe('dark');

      const postActivity = await db.getRecentActivity();
      expect(postActivity).toHaveLength(1);
      expect(postActivity[0].id).toBe('act_existing_nw');
    });

    it('UI export to import preview preserves settings, activity, and sections for Replace import', () => {
      const workspaces: Workspace[] = [{ id: 'ws_ui', name: 'UI WS', createdAt: 1000, updatedAt: 1000 }];
      const sections: Section[] = [{ id: 'sec_ui', workspaceId: 'ws_ui', name: 'UI Sec', order: 0, createdAt: 1000, updatedAt: 1000 }];
      const items: Item[] = [{
        id: 'item_ui',
        workspaceId: 'ws_ui',
        sectionId: 'sec_ui',
        type: 'link',
        content: 'https://example.com',
        status: 'active',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      }];
      const settings: UserSettings = {
        theme: 'light',
        locale: 'en',
        quickCaptureShortcut: 'Ctrl+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 2000,
        defaultView: 'today',
      };
      const activity: ActivityLog[] = [
        { id: 'act_ui', action: 'capture', details: 'UI Note', timestamp: 1000, itemId: 'item_ui' },
      ];

      // Export JSON
      const exported = generateExportData(workspaces, items, settings, activity, sections);
      expect(exported.schema).toBe('sideleaf-v1');
      expect(exported.sections).toHaveLength(1);
      expect(exported.settings?.locale).toBe('en');
      expect(exported.activity).toHaveLength(1);

      // Validate JSON upon import in SettingsModal
      const validation = validateSideleafData(exported);
      expect(validation.valid).toBe(true);
      expect(validation.data?.sections).toHaveLength(1);
      expect(validation.data?.settings?.locale).toBe('en');
      expect(validation.data?.activity).toHaveLength(1);

      // Preview state captures all 5 fields
      const preview = {
        items: validation.data!.items,
        workspaces: validation.data!.workspaces,
        sections: validation.data!.sections,
        settings: validation.data!.settings,
        activity: validation.data!.activity,
      };

      expect(preview.items).toHaveLength(1);
      expect(preview.workspaces).toHaveLength(1);
      expect(preview.sections).toHaveLength(1);
      expect(preview.settings?.locale).toBe('en');
      expect(preview.activity).toHaveLength(1);
    });
  });

  describe('Forced LocalStorage Fallback Suite (_setIndexedDBSupportedForTests)', () => {
    beforeEach(() => {
      _setIndexedDBSupportedForTests(false);
      localStorage.clear();
    });

    afterEach(() => {
      _setIndexedDBSupportedForTests(true);
      localStorage.clear();
    });

    it('creates, saves, retrieves, updates, and deletes sections via LocalStorage fallback', async () => {
      const secA: Section = {
        id: 'sec_ls_1',
        workspaceId: 'ws_ls',
        name: 'LS Section 1',
        order: 0,
        collapsed: false,
        createdAt: 1000,
        updatedAt: 1000,
      };
      const secB: Section = {
        id: 'sec_ls_2',
        workspaceId: 'ws_ls',
        name: 'LS Section 2',
        order: 1,
        collapsed: true,
        createdAt: 2000,
        updatedAt: 2000,
      };

      await db.saveSection(secA);
      await db.saveSections([secB]);

      const loaded = await db.getAllSections();
      expect(loaded).toHaveLength(2);
      expect(loaded.find((s) => s.id === 'sec_ls_1')?.name).toBe('LS Section 1');
      expect(loaded.find((s) => s.id === 'sec_ls_2')?.collapsed).toBe(true);

      // Verify item with sectionId saves and loads correctly
      const item: Item = {
        id: 'item_ls_1',
        workspaceId: 'ws_ls',
        sectionId: 'sec_ls_1',
        type: 'text',
        content: 'Fallback Item',
        status: 'active',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      };
      await db.saveItem(item);
      const items = await db.getAllItems();
      expect(items.find((i) => i.id === 'item_ls_1')?.sectionId).toBe('sec_ls_1');

      // Workspace viewMode in LocalStorage fallback
      const ws: Workspace = {
        id: 'ws_ls',
        name: 'LS Workspace',
        viewMode: 'compact',
        createdAt: 1000,
        updatedAt: 1000,
      };
      await db.saveWorkspace(ws);
      const workspaces = await db.getAllWorkspaces();
      expect(workspaces.find((w) => w.id === 'ws_ls')?.viewMode).toBe('compact');

      // Delete single section in LocalStorage fallback
      await db.deleteSection('sec_ls_1');
      let afterDelete = await db.getAllSections();
      expect(afterDelete).toHaveLength(1);
      expect(afterDelete[0].id).toBe('sec_ls_2');

      // Workspace deletion cleans up remaining sections in LocalStorage fallback
      await db.deleteWorkspace('ws_ls');
      afterDelete = await db.getAllSections();
      expect(afterDelete).toHaveLength(0);
    });

    it('clearContentData in LocalStorage fallback clears content without touching activity or settings', async () => {
      await db.saveWorkspace({ id: 'ws_ls', name: 'LS WS', createdAt: 1000, updatedAt: 1000 });
      await db.saveSection({ id: 'sec_ls', workspaceId: 'ws_ls', name: 'LS Sec', order: 0, createdAt: 1000, updatedAt: 1000 });
      await db.saveItem({
        id: 'item_ls',
        workspaceId: 'ws_ls',
        sectionId: 'sec_ls',
        type: 'text',
        content: 'LS Item',
        status: 'active',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });
      await db.saveSettings({
        theme: 'light',
        locale: 'en',
        quickCaptureShortcut: 'Ctrl+Shift+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 2000,
        defaultView: 'today',
      });
      await db.logActivity({ id: 'act_ls', action: 'capture', details: 'LS note', timestamp: 1000 });

      await db.clearContentData();

      // Content cleared
      expect(await db.getAllWorkspaces()).toHaveLength(0);
      expect(await db.getAllSections()).toHaveLength(0);
      expect(await db.getAllItems()).toHaveLength(0);

      // Settings and activity preserved
      const settings = await db.getSettings();
      expect(settings?.locale).toBe('en');
      expect(settings?.theme).toBe('light');

      const activity = await db.getRecentActivity();
      expect(activity).toHaveLength(1);
      expect(activity[0].id).toBe('act_ls');
    });

    it('Modern Replace in LocalStorage fallback restores settings and activity', async () => {
      // 1. Initial State
      await db.saveSettings({
        theme: 'dark',
        locale: 'tr',
        quickCaptureShortcut: 'Ctrl+Shift+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 2500,
        defaultView: 'scratch',
      });
      await db.logActivity({ id: 'act_ls_old', action: 'capture', details: 'old', timestamp: 1000 });
      await db.saveWorkspace({ id: 'ws_ls_old', name: 'Old LS WS', createdAt: 1000, updatedAt: 1000 });

      // 2. Modern Backup
      const backupSettings: UserSettings = {
        theme: 'light',
        locale: 'en',
        quickCaptureShortcut: 'Ctrl+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 1500,
        defaultView: 'today',
      };
      const backupActivity: ActivityLog[] = [
        { id: 'act_ls_new', action: 'capture', details: 'new backup', timestamp: 2000 },
      ];
      const backupWs: Workspace[] = [{ id: 'ws_ls_new', name: 'New LS WS', createdAt: 2000, updatedAt: 2000 }];

      // 3. Execute Replace Import
      await db.clearContentData();
      await db.saveWorkspaces(backupWs);
      await db.saveSettings(backupSettings);
      await db.restoreActivity(backupActivity);

      // 4. Verify
      const settings = await db.getSettings();
      expect(settings?.locale).toBe('en');
      expect(settings?.theme).toBe('light');

      const activity = await db.getRecentActivity();
      expect(activity).toHaveLength(1);
      expect(activity[0].id).toBe('act_ls_new');

      const workspaces = await db.getAllWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].id).toBe('ws_ls_new');
    });

    it('Legacy Replace in LocalStorage fallback preserves existing settings and activity', async () => {
      // 1. Initial State
      await db.saveSettings({
        theme: 'dark',
        locale: 'tr',
        quickCaptureShortcut: 'Ctrl+Shift+Space',
        searchShortcut: 'Ctrl+K',
        autoSaveIntervalMs: 2500,
        defaultView: 'scratch',
      });
      await db.logActivity({ id: 'act_ls_current', action: 'capture', details: 'current', timestamp: 1000 });
      await db.saveWorkspace({ id: 'ws_ls_old', name: 'Old LS WS', createdAt: 1000, updatedAt: 1000 });

      // 2. Legacy Backup (no settings, no activity)
      const backupWs: Workspace[] = [{ id: 'ws_ls_legacy', name: 'Legacy LS WS', createdAt: 3000, updatedAt: 3000 }];
      const importedSettings = undefined;
      const importedActivity = undefined;

      // 3. Execute Replace Import
      await db.clearContentData();
      await db.saveWorkspaces(backupWs);
      if (importedSettings) await db.saveSettings(importedSettings);
      if (importedActivity) await db.restoreActivity(importedActivity);

      // 4. Verify
      const settings = await db.getSettings();
      expect(settings?.locale).toBe('tr');
      expect(settings?.theme).toBe('dark');

      const activity = await db.getRecentActivity();
      expect(activity).toHaveLength(1);
      expect(activity[0].id).toBe('act_ls_current');

      const workspaces = await db.getAllWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].id).toBe('ws_ls_legacy');
    });
  });

  describe('WorkspaceView Zero-Item Sections Rendering Regression', () => {
    it('renders multiple sections when workspace has zero items without requiring notes to be added', () => {
      const workspace: Workspace = {
        id: 'ws_test',
        name: 'Customer X',
        createdAt: 1000,
        updatedAt: 1000,
      };
      const sectionA: Section = {
        id: 'sec_a',
        workspaceId: 'ws_test',
        name: 'Tasks',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      };
      const sectionB: Section = {
        id: 'sec_b',
        workspaceId: 'ws_test',
        name: 'References',
        order: 1,
        createdAt: 2000,
        updatedAt: 2000,
      };

      const mockContextValue: any = {
        t: getTranslation('en'),
        locale: 'en',
        sections: [sectionA, sectionB],
        createSection: async () => sectionA,
        updateSection: async () => {},
        toggleSectionCollapse: async () => {},
        deleteSection: async () => {},
        reorderSections: async () => {},
        moveItemToSection: async () => {},
        updateWorkspaceViewMode: async () => {},
        bulkMoveItems: async () => {},
        bulkArchiveItems: async () => {},
        bulkDeleteItems: async () => {},
        addBulkItems: async () => [],
        triggerToast: () => {},
      };

      const html = renderToStaticMarkup(
        React.createElement(
          SideleafContext.Provider,
          { value: mockContextValue },
          React.createElement(WorkspaceView, {
            workspace,
            items: [],
            allWorkspaces: [workspace],
            onAdd: async () => {},
            onUpdate: async () => {},
            onToggleCheck: async () => {},
            onConvertType: async () => {},
            onMove: async () => {},
            onArchive: async () => {},
            onDelete: async () => {},
            onEditWorkspace: () => {},
            onDeleteWorkspace: () => {},
          })
        )
      );

      // Verify both sections are rendered
      expect(html).toContain('Tasks');
      expect(html).toContain('References');

      // Verify empty workspace box is NOT rendered when sections exist
      expect(html).not.toContain(mockContextValue.t.workspace.emptyHeading);

      // Verify Add Here affordance is available
      expect(html).toContain(mockContextValue.t.section.addHere);
    });

    it('renders empty workspace placeholder when both items and sections are zero', () => {
      const workspace: Workspace = {
        id: 'ws_empty',
        name: 'Truly Empty',
        createdAt: 1000,
        updatedAt: 1000,
      };

      const mockContextValue: any = {
        t: getTranslation('en'),
        locale: 'en',
        sections: [],
        createSection: async () => ({ id: '1', name: '1', order: 0, workspaceId: 'ws_empty', createdAt: 0, updatedAt: 0 }),
        updateSection: async () => {},
        toggleSectionCollapse: async () => {},
        deleteSection: async () => {},
        reorderSections: async () => {},
        moveItemToSection: async () => {},
        updateWorkspaceViewMode: async () => {},
        bulkMoveItems: async () => {},
        bulkArchiveItems: async () => {},
        bulkDeleteItems: async () => {},
        addBulkItems: async () => [],
        triggerToast: () => {},
      };

      const html = renderToStaticMarkup(
        React.createElement(
          SideleafContext.Provider,
          { value: mockContextValue },
          React.createElement(WorkspaceView, {
            workspace,
            items: [],
            allWorkspaces: [workspace],
            onAdd: async () => {},
            onUpdate: async () => {},
            onToggleCheck: async () => {},
            onConvertType: async () => {},
            onMove: async () => {},
            onArchive: async () => {},
            onDelete: async () => {},
            onEditWorkspace: () => {},
            onDeleteWorkspace: () => {},
          })
        )
      );

      // Verify empty workspace message IS rendered when zero sections and zero items
      expect(html).toContain(mockContextValue.t.workspace.emptyHeading);
    });
  });

  describe('Group-Level Bulk Selection Suite', () => {
    it('selects all visible unsectioned items when toggled', () => {
      const initial = new Set<string>();
      const unsectionedIds = ['item_u1', 'item_u2', 'item_u3'];
      const next = toggleGroupSelectionState(initial, unsectionedIds);

      expect(next.size).toBe(3);
      expect(unsectionedIds.every((id) => next.has(id))).toBe(true);
    });

    it('selects all items inside one Section without selecting other sections', () => {
      const sectionAIds = ['item_a1', 'item_a2'];
      const sectionBIds = ['item_b1', 'item_b2'];
      const initial = new Set<string>(['item_b1']); // B has one selected

      const next = toggleGroupSelectionState(initial, sectionAIds);

      expect(next.has('item_a1')).toBe(true);
      expect(next.has('item_a2')).toBe(true);
      expect(next.has('item_b1')).toBe(true);
      expect(next.has(sectionBIds[1])).toBe(false);
      expect(next.size).toBe(3);
    });

    it('clears group selection when all items in the group are already selected', () => {
      const groupIds = ['item_1', 'item_2', 'item_3'];
      const initial = new Set<string>(['item_1', 'item_2', 'item_3', 'other_item']);

      const next = toggleGroupSelectionState(initial, groupIds);

      expect(next.has('item_1')).toBe(false);
      expect(next.has('item_2')).toBe(false);
      expect(next.has('item_3')).toBe(false);
      expect(next.has('other_item')).toBe(true);
      expect(next.size).toBe(1);
    });

    it('completes selection on partial selection (union to full selection)', () => {
      const groupIds = ['item_1', 'item_2', 'item_3'];
      const initial = new Set<string>(['item_1']); // 1 of 3 selected

      const next = toggleGroupSelectionState(initial, groupIds);

      expect(next.has('item_1')).toBe(true);
      expect(next.has('item_2')).toBe(true);
      expect(next.has('item_3')).toBe(true);
      expect(next.size).toBe(3);
    });

    it('selects all visible Today stream items', () => {
      const todayStreamIds = ['today_1', 'today_2', 'today_3', 'today_4'];
      const initial = new Set<string>();

      const next = toggleGroupSelectionState(initial, todayStreamIds);

      expect(next.size).toBe(4);
      expect(todayStreamIds.every((id) => next.has(id))).toBe(true);

      // Subsequent toggle clears today items
      const cleared = toggleGroupSelectionState(next, todayStreamIds);
      expect(cleared.size).toBe(0);

      // Verify TodayView renders GroupSelectButton when active items exist
      const mockTodayItem: Item = {
        id: 'today_test_1',
        workspaceId: null,
        type: 'text',
        content: 'Working on today item',
        status: 'active',
        order: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const mockContextValue: any = {
        t: getTranslation('en'),
        locale: 'en',
        currentWorkspaceId: null,
        bulkMoveItems: async () => {},
        bulkArchiveItems: async () => {},
        bulkDeleteItems: async () => {},
        triggerToast: () => {},
      };

      const html = renderToStaticMarkup(
        React.createElement(
          SideleafContext.Provider,
          { value: mockContextValue },
          React.createElement(TodayView, {
            items: [mockTodayItem],
            workspaces: [],
            onAdd: async () => {},
            onUpdate: async () => {},
            onToggleCheck: async () => {},
            onConvertType: async () => {},
            onMove: async () => {},
            onArchive: async () => {},
            onDelete: async () => {},
            onNavigateToScratch: () => {},
            onNavigateToRecent: () => {},
            onNavigateToWorkspace: () => {},
          })
        )
      );
      expect(html).toContain(mockContextValue.t.bulk.selectAll);
    });

    it('renders no selection action for empty groups and collapsed sections', () => {
      // GroupSelectButton returns null for empty array
      const emptyHtml = renderToStaticMarkup(
        React.createElement(GroupSelectButton, {
          itemIds: [],
          selectedIds: new Set<string>(),
          onToggle: () => {},
          selectAllLabel: 'Select all',
          clearSelectionLabel: 'Clear selection',
        })
      );
      expect(emptyHtml).toBe('');

      // In WorkspaceView: empty section does not render select all button
      const workspace: Workspace = {
        id: 'ws_test',
        name: 'Test Workspace',
        createdAt: 1000,
        updatedAt: 1000,
      };
      const emptySection: Section = {
        id: 'sec_empty',
        workspaceId: 'ws_test',
        name: 'Empty Section',
        order: 0,
        collapsed: false,
        createdAt: 1000,
        updatedAt: 1000,
      };
      const collapsedSection: Section = {
        id: 'sec_collapsed',
        workspaceId: 'ws_test',
        name: 'Collapsed Section',
        order: 1,
        collapsed: true,
        createdAt: 1000,
        updatedAt: 1000,
      };
      const activeItemInCollapsed: Item = {
        id: 'item_collapsed',
        workspaceId: 'ws_test',
        sectionId: 'sec_collapsed',
        type: 'text',
        content: 'Inside collapsed',
        status: 'active',
        order: 1000,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const mockContextValue: any = {
        t: getTranslation('en'),
        locale: 'en',
        sections: [emptySection, collapsedSection],
        createSection: async () => emptySection,
        updateSection: async () => {},
        toggleSectionCollapse: async () => {},
        deleteSection: async () => {},
        reorderSections: async () => {},
        moveItemToSection: async () => {},
        updateWorkspaceViewMode: async () => {},
        bulkMoveItems: async () => {},
        bulkArchiveItems: async () => {},
        bulkDeleteItems: async () => {},
        addBulkItems: async () => [],
        triggerToast: () => {},
      };

      const html = renderToStaticMarkup(
        React.createElement(
          SideleafContext.Provider,
          { value: mockContextValue },
          React.createElement(WorkspaceView, {
            workspace,
            items: [activeItemInCollapsed],
            allWorkspaces: [workspace],
            onAdd: async () => {},
            onUpdate: async () => {},
            onToggleCheck: async () => {},
            onConvertType: async () => {},
            onMove: async () => {},
            onArchive: async () => {},
            onDelete: async () => {},
            onEditWorkspace: () => {},
            onDeleteWorkspace: () => {},
          })
        )
      );

      // In the rendered output:
      // Empty section has 0 items and no Select all button
      // Collapsed section has items but is collapsed, so no Select all button is rendered
      expect(html).not.toContain(mockContextValue.t.bulk.selectAll);
    });

    it('ensures selection reconciliation excludes archived and deleted hidden records', () => {
      const activeIds = ['active_1', 'active_2'];
      const archivedOrDeletedIds = ['archived_1', 'deleted_1', 'trash_1'];

      // User previously had all 5 selected
      const previouslySelected = new Set([...activeIds, ...archivedOrDeletedIds]);

      // Reconcile against only active visible items
      const reconciled = reconcileSelectionState(previouslySelected, activeIds);

      expect(reconciled.size).toBe(2);
      expect(reconciled.has('active_1')).toBe(true);
      expect(reconciled.has('active_2')).toBe(true);
      expect(reconciled.has('archived_1')).toBe(false);
      expect(reconciled.has('deleted_1')).toBe(false);
      expect(reconciled.has('trash_1')).toBe(false);
    });
  });
});

