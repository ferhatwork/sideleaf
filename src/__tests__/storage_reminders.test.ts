import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, _resetDbForTests, _setIndexedDBSupportedForTests, LS_REMINDERS, safeLsGet } from '../services/db';
import { Reminder } from '../types';
import { validateSideleafData, generateExportData } from '../services/exportImport';

class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] || null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

describe('Reminders Storage & Migration Suite', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = new LocalStorageMock();
    _setIndexedDBSupportedForTests(true);
    _resetDbForTests();
  });

  describe('IndexedDB CRUD Operations', () => {
    it('creates, reads, updates, and deletes reminders in IndexedDB', async () => {
      const rem1: Reminder = {
        id: 'rem-1',
        itemId: 'item-1',
        type: 'once',
        scheduledAt: 1750000000000,
        enabled: true,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const rem2: Reminder = {
        id: 'rem-2',
        itemId: 'item-1',
        type: 'daily',
        time: '09:00',
        scheduledAt: 1750000500000,
        enabled: true,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const rem3: Reminder = {
        id: 'rem-3',
        itemId: 'item-2',
        type: 'weekly',
        weekdays: [1, 3, 5],
        time: '14:30',
        scheduledAt: 1750001000000,
        enabled: false,
        createdAt: 1000,
        updatedAt: 1000,
      };

      // Bulk save
      await db.saveReminders([rem1, rem2, rem3]);

      // Read all
      const all = await db.getAllReminders();
      expect(all).toHaveLength(3);

      // Query by itemId
      const item1Reminders = await db.getRemindersByItem('item-1');
      expect(item1Reminders).toHaveLength(2);
      expect(item1Reminders.map((r) => r.id).sort()).toEqual(['rem-1', 'rem-2']);

      // Update single reminder
      const updatedRem1: Reminder = { ...rem1, enabled: false, updatedAt: 2000 };
      await db.saveReminder(updatedRem1);
      const fetched = await db.getRemindersByItem('item-1');
      const found = fetched.find((r) => r.id === 'rem-1');
      expect(found?.enabled).toBe(false);
      expect(found?.updatedAt).toBe(2000);

      // Delete by ID
      await db.deleteReminder('rem-1');
      expect(await db.getAllReminders()).toHaveLength(2);

      // Delete all reminders for item-1
      await db.deleteRemindersByItem('item-1');
      const remaining = await db.getAllReminders();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('rem-3');

      // Clear all
      await db.clearAllReminders();
      expect(await db.getAllReminders()).toHaveLength(0);
    });

    it('clears reminders when clearContentData or clearAllData is called', async () => {
      const rem: Reminder = {
        id: 'r-clear',
        itemId: 'i-clear',
        type: 'daily',
        scheduledAt: 5000,
        enabled: true,
        createdAt: 1,
        updatedAt: 1,
      };
      await db.saveReminder(rem);
      expect(await db.getAllReminders()).toHaveLength(1);

      await db.clearContentData();
      expect(await db.getAllReminders()).toHaveLength(0);

      await db.saveReminder(rem);
      expect(await db.getAllReminders()).toHaveLength(1);

      await db.clearAllData();
      expect(await db.getAllReminders()).toHaveLength(0);
    });
  });

  describe('LocalStorage Fallback', () => {
    it('handles reminder CRUD gracefully when IndexedDB is unavailable', async () => {
      _setIndexedDBSupportedForTests(false);

      const rem1: Reminder = {
        id: 'ls-rem-1',
        itemId: 'item-ls',
        type: 'once',
        scheduledAt: 1000,
        enabled: true,
        createdAt: 1,
        updatedAt: 1,
      };

      await db.saveReminder(rem1);
      const all = await db.getAllReminders();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('ls-rem-1');

      // Check LocalStorage directly
      const raw = safeLsGet<Reminder[]>(LS_REMINDERS, []);
      expect(raw).toHaveLength(1);
      expect(raw[0].id).toBe('ls-rem-1');

      // By item
      const itemRem = await db.getRemindersByItem('item-ls');
      expect(itemRem).toHaveLength(1);

      // Delete
      await db.deleteReminder('ls-rem-1');
      expect(await db.getAllReminders()).toHaveLength(0);
    });
  });

  describe('Export / Import Validation', () => {
    it('exports and validates reminders in Sideleaf backup format', () => {
      const rem: Reminder = {
        id: 'exp-rem-1',
        itemId: 'exp-item-1',
        type: 'daily',
        time: '12:00',
        scheduledAt: 1750000000000,
        enabled: true,
        createdAt: 100,
        updatedAt: 100,
      };

      const backup = generateExportData(
        [{ id: 'ws1', name: 'Work', createdAt: 1, updatedAt: 1 }],
        [{ id: 'exp-item-1', workspaceId: 'ws1', content: 'Note', type: 'text', status: 'active', order: 1, createdAt: 1, updatedAt: 1 }],
        undefined,
        undefined,
        undefined,
        [rem]
      );

      const validation = validateSideleafData(backup);
      expect(validation.valid).toBe(true);
      expect(validation.stats?.remindersCount).toBe(1);
      expect(validation.data?.reminders).toHaveLength(1);
      expect(validation.data?.reminders?.[0].id).toBe('exp-rem-1');
    });

    it('remains completely backwards compatible with legacy backups missing reminders', () => {
      const legacyBackup = {
        schema: 'sideleaf-v1',
        version: '1.0.0',
        exportedAt: '2026-09-12T00:00:00.000Z',
        workspaces: [{ id: 'ws1', name: 'Work', createdAt: 1, updatedAt: 1 }],
        items: [{ id: 'it1', workspaceId: 'ws1', content: 'Note', type: 'text', status: 'active', order: 1, createdAt: 1, updatedAt: 1 }],
      };

      const validation = validateSideleafData(legacyBackup);
      expect(validation.valid).toBe(true);
      expect(validation.stats?.remindersCount).toBeUndefined();
      expect(validation.data?.reminders).toBeUndefined();
    });

    it('rejects corrupted reminders array or invalid reminder objects', () => {
      const invalidReminders1 = {
        schema: 'sideleaf-v1',
        version: '1.0.0',
        exportedAt: '2026-09-12T00:00:00.000Z',
        workspaces: [{ id: 'ws1', name: 'Work', createdAt: 1, updatedAt: 1 }],
        items: [{ id: 'it1', workspaceId: 'ws1', content: 'Note', type: 'text', status: 'active', order: 1, createdAt: 1, updatedAt: 1 }],
        reminders: 'not an array',
      };
      expect(validateSideleafData(invalidReminders1).valid).toBe(false);

      const invalidReminders2 = {
        schema: 'sideleaf-v1',
        version: '1.0.0',
        exportedAt: '2026-09-12T00:00:00.000Z',
        workspaces: [{ id: 'ws1', name: 'Work', createdAt: 1, updatedAt: 1 }],
        items: [{ id: 'it1', workspaceId: 'ws1', content: 'Note', type: 'text', status: 'active', order: 1, createdAt: 1, updatedAt: 1 }],
        reminders: [{ id: 'r1', itemId: 'it1', type: 'invalid_type', scheduledAt: 123, enabled: true }],
      };
      expect(validateSideleafData(invalidReminders2).valid).toBe(false);
    });
  });
});
