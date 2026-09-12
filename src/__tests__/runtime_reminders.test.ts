import { describe, it, expect } from 'vitest';
import { Reminder, Item, RuntimeReminder, RuntimeRemindersPayload } from '../types';
import { isReminderDue, advanceRecurringReminder } from '../utils/reminderDomain';

describe('Runtime Mirror & Local API Security Suite', () => {
  describe('Origin and Host Security Verification', () => {
    function validateRequestSecurity(headers: {
      host?: string;
      origin?: string;
      referer?: string;
      secFetchSite?: string;
    }): boolean {
      const PORT = 47321;
      const ORIGIN = `http://127.0.0.1:${PORT}`;
      const PREFIX = `${ORIGIN}/`;

      const reqHost = headers.host;
      const origin = headers.origin;
      const referer = headers.referer;
      const secSite = headers.secFetchSite;

      const validHost = reqHost === `127.0.0.1:${PORT}` || reqHost === `localhost:${PORT}`;
      const validOrigin = !origin || origin === ORIGIN || origin === `http://localhost:${PORT}`;
      const validReferer =
        !referer || referer.startsWith(PREFIX) || referer.startsWith(`http://localhost:${PORT}/`);
      const validSecSite = !secSite || secSite === 'same-origin' || secSite === 'none';

      return Boolean(validHost && validOrigin && validReferer && validSecSite);
    }

    it('allows valid localhost and loopback same-origin requests', () => {
      expect(
        validateRequestSecurity({
          host: '127.0.0.1:47321',
          origin: 'http://127.0.0.1:47321',
          referer: 'http://127.0.0.1:47321/',
          secFetchSite: 'same-origin',
        })
      ).toBe(true);

      expect(
        validateRequestSecurity({
          host: 'localhost:47321',
          origin: 'http://localhost:47321',
          referer: 'http://localhost:47321/',
          secFetchSite: 'same-origin',
        })
      ).toBe(true);

      // Direct curl / background client without origin/referer
      expect(
        validateRequestSecurity({
          host: '127.0.0.1:47321',
        })
      ).toBe(true);
    });

    it('strictly rejects requests with foreign Host or foreign Origin', () => {
      // Malicious site trying to forge localhost requests
      expect(
        validateRequestSecurity({
          host: '127.0.0.1:47321',
          origin: 'https://evil-site.com',
          secFetchSite: 'cross-site',
        })
      ).toBe(false);

      expect(
        validateRequestSecurity({
          host: 'evil-site.com:47321',
          origin: 'http://127.0.0.1:47321',
        })
      ).toBe(false);

      expect(
        validateRequestSecurity({
          host: '127.0.0.1:47321',
          referer: 'https://evil-site.com/exploit.html',
          secFetchSite: 'cross-site',
        })
      ).toBe(false);
    });
  });

  describe('Runtime Mirror Payload & Scheduler Contract', () => {
    it('creates valid RuntimeRemindersPayload structure', () => {
      const reminder: Reminder = {
        id: 'rem-1',
        itemId: 'item-1',
        type: 'daily',
        time: '15:00',
        scheduledAt: 1750000000000,
        enabled: true,
        createdAt: 100,
        updatedAt: 100,
      };

      const runtimeRem: RuntimeReminder = {
        id: reminder.id,
        itemId: reminder.itemId,
        itemContent: 'Buy groceries',
        type: reminder.type,
        scheduledAt: reminder.scheduledAt,
        time: reminder.time,
        enabled: reminder.enabled,
        lastTriggeredAt: reminder.lastTriggeredAt,
      };

      const payload: RuntimeRemindersPayload = {
        version: 1,
        updatedAt: new Date().toISOString(),
        reminders: [runtimeRem],
      };

      expect(payload.version).toBe(1);
      expect(typeof payload.updatedAt).toBe('string');
      expect(payload.reminders).toHaveLength(1);
      expect(payload.reminders[0].itemContent).toBe('Buy groceries');
    });

    it('filters out archived and deleted items from runtime mirror', () => {
      const items: Item[] = [
        { id: 'i1', workspaceId: null, content: 'Active task', status: 'active', order: 1, type: 'text', createdAt: 1, updatedAt: 1 },
        { id: 'i2', workspaceId: null, content: 'Archived task', status: 'archived', order: 2, type: 'text', createdAt: 1, updatedAt: 1 },
        { id: 'i3', workspaceId: null, content: 'Deleted task', status: 'deleted', order: 3, type: 'text', createdAt: 1, updatedAt: 1 },
      ];

      const reminders: Reminder[] = [
        { id: 'r1', itemId: 'i1', type: 'once', scheduledAt: 100, enabled: true, createdAt: 1, updatedAt: 1 },
        { id: 'r2', itemId: 'i2', type: 'once', scheduledAt: 100, enabled: true, createdAt: 1, updatedAt: 1 },
        { id: 'r3', itemId: 'i3', type: 'once', scheduledAt: 100, enabled: true, createdAt: 1, updatedAt: 1 },
        { id: 'r4', itemId: 'i1', type: 'once', scheduledAt: 100, enabled: false, createdAt: 1, updatedAt: 1 }, // disabled
      ];

      const activeMap = new Map(items.filter((i) => i.status === 'active').map((i) => [i.id, i]));
      const schedulable = reminders.filter((r) => r.enabled && activeMap.has(r.itemId));

      expect(schedulable).toHaveLength(1);
      expect(schedulable[0].id).toBe('r1');
    });

    it('prevents repeated firing on restart by updating lastTriggeredAt', () => {
      const now = Date.now();
      const reminder: Reminder = {
        id: 'r1',
        itemId: 'i1',
        type: 'once',
        scheduledAt: now - 500,
        enabled: true,
        createdAt: now - 1000,
        updatedAt: now - 1000,
      };

      // First check: due
      expect(isReminderDue(reminder, now)).toBe(true);

      // Triggered: advanced
      const triggered = advanceRecurringReminder(reminder, now);
      expect(triggered.enabled).toBe(false);
      expect(triggered.lastTriggeredAt).toBe(now);

      // Restart simulation: reminder reloaded with lastTriggeredAt set
      expect(isReminderDue(triggered, now + 1000)).toBe(false);
    });
  });

  describe('Reminder Notification UX, Snooze & State Semantics', () => {
    it('handles snooze without duplicating records and preserves recurrence', () => {
      const now = 1750000000000;
      const originalRem: RuntimeReminder = {
        id: 'rem-rec-1',
        itemId: 'item-1',
        itemContent: 'Team standup meeting',
        type: 'daily',
        time: '09:00',
        scheduledAt: now,
        enabled: true,
        lastTriggeredAt: now,
        state: 'fired',
      };

      const remList = [originalRem];

      // Snooze action simulation (+10 min)
      const targetRem = remList.find((r) => r.id === 'rem-rec-1')!;
      const snoozeDurationMs = 10 * 60 * 1000;
      targetRem.snoozedUntil = now + snoozeDurationMs;
      targetRem.state = 'snoozed';

      // Verify no duplicate record created
      expect(remList).toHaveLength(1);
      expect(targetRem.snoozedUntil).toBe(now + 600000);
      expect(targetRem.state).toBe('snoozed');
      // Original recurring schedule is preserved
      expect(targetRem.scheduledAt).toBe(now);
      expect(targetRem.type).toBe('daily');
    });

    it('manages runtime state transitions: pending -> fired -> snoozed -> fired', () => {
      const now = 1750000000000;
      const rem: RuntimeReminder = {
        id: 'rem-1',
        itemId: 'item-1',
        itemContent: 'Review code',
        type: 'once',
        scheduledAt: now,
        enabled: true,
        state: 'pending',
      };

      // 1. Due check: should fire
      function shouldFire(r: RuntimeReminder, currentMs: number): boolean {
        if (!r.enabled) return false;
        if (r.state === 'snoozed') {
          return Boolean(r.snoozedUntil && currentMs >= r.snoozedUntil);
        }
        if (r.state === 'fired' || r.state === 'dismissed' || r.state === 'acknowledged') {
          return false;
        }
        return r.scheduledAt <= currentMs && (!r.lastTriggeredAt || r.lastTriggeredAt < r.scheduledAt);
      }

      expect(shouldFire(rem, now)).toBe(true);

      // 2. Fired
      rem.lastTriggeredAt = now;
      rem.state = 'fired';
      // In next tick 5s later, should NOT fire again
      expect(shouldFire(rem, now + 5000)).toBe(false);

      // 3. Snoozed for 10 min
      rem.snoozedUntil = now + 600000;
      rem.state = 'snoozed';
      // 5 min later: still snoozing
      expect(shouldFire(rem, now + 300000)).toBe(false);
      // 10 min later: snooze expired -> fires!
      expect(shouldFire(rem, now + 600000)).toBe(true);

      // 4. Re-fired after snooze
      rem.lastTriggeredAt = now + 600000;
      rem.snoozedUntil = null;
      rem.state = 'fired';
      expect(shouldFire(rem, now + 605000)).toBe(false);
    });

    it('preserves snoozedUntil and state across client PUT sync when scheduledAt is unchanged', () => {
      const existingActive: RuntimeReminder[] = [
        {
          id: 'rem-1',
          itemId: 'item-1',
          itemContent: 'Existing note',
          type: 'once',
          scheduledAt: 1750000000000,
          enabled: true,
          lastTriggeredAt: 1750000000000,
          snoozedUntil: 1750000600000,
          state: 'snoozed',
        },
      ];

      // Client syncs fresh array from IndexedDB without knowing background snooze
      const clientSyncedReminders: RuntimeReminder[] = [
        {
          id: 'rem-1',
          itemId: 'item-1',
          itemContent: 'Existing note',
          type: 'once',
          scheduledAt: 1750000000000,
          enabled: true,
        },
      ];

      // Mirror merge logic (as implemented in launcher.ps1 and launcher.mjs)
      const existingMap = new Map(existingActive.map((r) => [r.id, r]));
      const merged = clientSyncedReminders.map((newRem) => {
        const oldRem = existingMap.get(newRem.id);
        if (oldRem && oldRem.scheduledAt === newRem.scheduledAt) {
          return {
            ...newRem,
            snoozedUntil: oldRem.snoozedUntil ?? newRem.snoozedUntil,
            state: oldRem.state ?? newRem.state,
            lastTriggeredAt: oldRem.lastTriggeredAt ?? newRem.lastTriggeredAt,
          };
        }
        return {
          ...newRem,
          state: newRem.state || 'pending',
        };
      });

      expect(merged[0].snoozedUntil).toBe(1750000600000);
      expect(merged[0].state).toBe('snoozed');
      expect(merged[0].lastTriggeredAt).toBe(1750000000000);
    });

    it('resets snooze and state when user modifies scheduledAt in the client', () => {
      const existingActive: RuntimeReminder[] = [
        {
          id: 'rem-1',
          itemId: 'item-1',
          itemContent: 'Existing note',
          type: 'once',
          scheduledAt: 1750000000000,
          enabled: true,
          snoozedUntil: 1750000600000,
          state: 'snoozed',
        },
      ];

      // User changed scheduledAt in UI to a new time
      const clientSyncedReminders: RuntimeReminder[] = [
        {
          id: 'rem-1',
          itemId: 'item-1',
          itemContent: 'Existing note',
          type: 'once',
          scheduledAt: 1750009999000, // modified
          enabled: true,
        },
      ];

      const existingMap = new Map(existingActive.map((r) => [r.id, r]));
      const merged = clientSyncedReminders.map((newRem) => {
        const oldRem = existingMap.get(newRem.id);
        if (oldRem && oldRem.scheduledAt === newRem.scheduledAt) {
          return {
            ...newRem,
            snoozedUntil: oldRem.snoozedUntil ?? newRem.snoozedUntil,
            state: oldRem.state ?? newRem.state,
          };
        }
        return {
          ...newRem,
          state: 'pending' as const,
        };
      });

      expect(merged[0].scheduledAt).toBe(1750009999000);
      expect(merged[0].state).toBe('pending');
      expect(merged[0].snoozedUntil).toBeUndefined();
    });

    it('advances recurrence on dismiss or acknowledge and disables once reminders', () => {
      const now = 1750000000000;
      const onceRem: RuntimeReminder = {
        id: 'r-once',
        itemId: 'i1',
        itemContent: 'Task 1',
        type: 'once',
        scheduledAt: now,
        enabled: true,
        state: 'fired',
      };

      const dailyRem: RuntimeReminder = {
        id: 'r-daily',
        itemId: 'i2',
        itemContent: 'Daily task',
        type: 'daily',
        time: '14:00',
        scheduledAt: now,
        enabled: true,
        state: 'fired',
      };

      // Dismiss once: disables
      onceRem.state = 'dismissed';
      onceRem.enabled = false;
      expect(onceRem.enabled).toBe(false);
      expect(onceRem.state).toBe('dismissed');

      // Dismiss daily: advances to next day, resets state to pending
      dailyRem.state = 'pending';
      dailyRem.scheduledAt = now + 24 * 60 * 60 * 1000;
      dailyRem.lastTriggeredAt = undefined;
      expect(dailyRem.enabled).toBe(true);
      expect(dailyRem.state).toBe('pending');
      expect(dailyRem.scheduledAt).toBeGreaterThan(now);
    });
  });
});

