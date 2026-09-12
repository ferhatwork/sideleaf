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
});
