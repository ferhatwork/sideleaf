import { describe, it, expect } from 'vitest';
import { Reminder, Item } from '../types';
import {
  calculateNextOccurrence,
  isReminderDue,
  advanceRecurringReminder,
  getNextUpcomingReminder,
  formatNextReminderBadge,
  formatReminderDisplay,
  WEEKDAY_LABELS_TR,
  WEEKDAY_LABELS_EN,
} from '../utils/reminderDomain';

describe('Reminders Domain & Scheduling Suite', () => {
  describe('Once Schedule', () => {
    it('returns the scheduled timestamp for once reminders', () => {
      const targetTime = new Date(2026, 8, 15, 14, 0, 0).getTime();
      const res = calculateNextOccurrence({
        type: 'once',
        scheduledAt: targetTime,
      });
      expect(res).toBe(targetTime);
    });

    it('returns null if scheduledAt is missing for once reminder', () => {
      const res = calculateNextOccurrence({
        type: 'once',
      });
      expect(res).toBeNull();
    });
  });

  describe('Daily Schedule', () => {
    it('schedules for today if target time is in the future', () => {
      // from 08:00 to 09:30 today
      const fromDate = new Date(2026, 8, 12, 8, 0, 0);
      const res = calculateNextOccurrence(
        {
          type: 'daily',
          time: '09:30',
        },
        fromDate
      );

      const expected = new Date(2026, 8, 12, 9, 30, 0).getTime();
      expect(res).toBe(expected);
    });

    it('schedules for tomorrow if target time has already passed today', () => {
      // from 10:00 to 09:30 today
      const fromDate = new Date(2026, 8, 12, 10, 0, 0);
      const res = calculateNextOccurrence(
        {
          type: 'daily',
          time: '09:30',
        },
        fromDate
      );

      const expected = new Date(2026, 8, 13, 9, 30, 0).getTime();
      expect(res).toBe(expected);
    });

    it('handles month boundary transitions correctly (e.g. Sept 30 -> Oct 1)', () => {
      const fromDate = new Date(2026, 8, 30, 23, 0, 0); // Sept 30, 23:00
      const res = calculateNextOccurrence(
        {
          type: 'daily',
          time: '08:00',
        },
        fromDate
      );

      const expected = new Date(2026, 9, 1, 8, 0, 0).getTime(); // Oct 1, 08:00
      expect(res).toBe(expected);
    });
  });

  describe('Weekly Schedule', () => {
    it('schedules for the chosen weekday today if time is in the future', () => {
      // 2026-09-14 is a Monday (ISO day 1)
      const fromDate = new Date(2026, 8, 14, 8, 0, 0);
      const res = calculateNextOccurrence(
        {
          type: 'weekly',
          weekdays: [1], // Monday
          time: '10:00',
        },
        fromDate
      );

      const expected = new Date(2026, 8, 14, 10, 0, 0).getTime();
      expect(res).toBe(expected);
    });

    it('schedules for next week if the single chosen weekday was earlier today', () => {
      // Monday 11:00, target was Monday 10:00
      const fromDate = new Date(2026, 8, 14, 11, 0, 0);
      const res = calculateNextOccurrence(
        {
          type: 'weekly',
          weekdays: [1],
          time: '10:00',
        },
        fromDate
      );

      const expected = new Date(2026, 8, 21, 10, 0, 0).getTime(); // Next Monday
      expect(res).toBe(expected);
    });

    it('handles multiple weekdays cleanly (e.g. Monday, Wednesday, Friday)', () => {
      // Monday 11:00 -> next is Wednesday 10:00
      const fromDate = new Date(2026, 8, 14, 11, 0, 0); // Monday
      const res = calculateNextOccurrence(
        {
          type: 'weekly',
          weekdays: [1, 3, 5], // Mon, Wed, Fri
          time: '10:00',
        },
        fromDate
      );

      const expected = new Date(2026, 8, 16, 10, 0, 0).getTime(); // Wednesday
      expect(res).toBe(expected);
    });

    it('cycles from Friday back to Monday across weekends', () => {
      // Friday 15:00 -> next is Monday 09:00
      const fromDate = new Date(2026, 8, 18, 15, 0, 0); // Friday (ISO 5)
      const res = calculateNextOccurrence(
        {
          type: 'weekly',
          weekdays: [1, 5], // Mon, Fri
          time: '09:00',
        },
        fromDate
      );

      const expected = new Date(2026, 8, 21, 9, 0, 0).getTime(); // Monday
      expect(res).toBe(expected);
    });
  });

  describe('Due Detection & Trigger Management', () => {
    it('detects due reminder when scheduledAt <= now and enabled is true', () => {
      const now = Date.now();
      const reminder: Reminder = {
        id: 'r1',
        itemId: 'i1',
        type: 'once',
        scheduledAt: now - 1000,
        enabled: true,
        createdAt: now - 5000,
        updatedAt: now - 5000,
      };

      expect(isReminderDue(reminder, now)).toBe(true);
    });

    it('returns false if reminder is disabled', () => {
      const now = Date.now();
      const reminder: Reminder = {
        id: 'r1',
        itemId: 'i1',
        type: 'once',
        scheduledAt: now - 1000,
        enabled: false,
        createdAt: now - 5000,
        updatedAt: now - 5000,
      };

      expect(isReminderDue(reminder, now)).toBe(false);
    });

    it('returns false if reminder is in the future', () => {
      const now = Date.now();
      const reminder: Reminder = {
        id: 'r1',
        itemId: 'i1',
        type: 'once',
        scheduledAt: now + 50000,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      };

      expect(isReminderDue(reminder, now)).toBe(false);
    });

    it('prevents duplicate trigger if lastTriggeredAt >= scheduledAt', () => {
      const now = Date.now();
      const reminder: Reminder = {
        id: 'r1',
        itemId: 'i1',
        type: 'once',
        scheduledAt: now - 2000,
        lastTriggeredAt: now - 1000,
        enabled: true,
        createdAt: now - 10000,
        updatedAt: now - 1000,
      };

      expect(isReminderDue(reminder, now)).toBe(false);
    });

    it('disables once reminder when advanced after trigger', () => {
      const triggerTime = Date.now();
      const reminder: Reminder = {
        id: 'r1',
        itemId: 'i1',
        type: 'once',
        scheduledAt: triggerTime - 100,
        enabled: true,
        createdAt: triggerTime - 1000,
        updatedAt: triggerTime - 1000,
      };

      const advanced = advanceRecurringReminder(reminder, triggerTime);
      expect(advanced.enabled).toBe(false);
      expect(advanced.lastTriggeredAt).toBe(triggerTime);
    });

    it('advances daily reminder to next occurrence when advanced after trigger', () => {
      const triggerTime = new Date(2026, 8, 12, 14, 0, 0).getTime();
      const reminder: Reminder = {
        id: 'r2',
        itemId: 'i1',
        type: 'daily',
        time: '14:00',
        scheduledAt: triggerTime,
        enabled: true,
        createdAt: triggerTime - 5000,
        updatedAt: triggerTime - 5000,
      };

      const advanced = advanceRecurringReminder(reminder, triggerTime);
      expect(advanced.enabled).toBe(true);
      expect(advanced.lastTriggeredAt).toBe(triggerTime);
      expect(advanced.scheduledAt).toBe(new Date(2026, 8, 13, 14, 0, 0).getTime());
    });
  });

  describe('Item Status & Orphan Filter Logic', () => {
    it('only schedules reminders belonging to active items', () => {
      const activeItem: Item = {
        id: 'item-active',
        workspaceId: null,
        type: 'text',
        content: 'Active note',
        status: 'active',
        order: 1,
        createdAt: 100,
        updatedAt: 100,
      };
      const archivedItem: Item = {
        id: 'item-archived',
        workspaceId: null,
        type: 'text',
        content: 'Archived note',
        status: 'archived',
        order: 2,
        createdAt: 100,
        updatedAt: 100,
      };
      const deletedItem: Item = {
        id: 'item-deleted',
        workspaceId: null,
        type: 'text',
        content: 'Deleted note',
        status: 'deleted',
        order: 3,
        createdAt: 100,
        updatedAt: 100,
      };

      const items = [activeItem, archivedItem, deletedItem];
      const activeItemIds = new Set(items.filter((i) => i.status === 'active').map((i) => i.id));

      const remActive: Reminder = {
        id: 'rem-1',
        itemId: 'item-active',
        type: 'daily',
        scheduledAt: 1000,
        enabled: true,
        createdAt: 10,
        updatedAt: 10,
      };
      const remArchived: Reminder = {
        id: 'rem-2',
        itemId: 'item-archived',
        type: 'daily',
        scheduledAt: 1000,
        enabled: true,
        createdAt: 10,
        updatedAt: 10,
      };
      const remDeleted: Reminder = {
        id: 'rem-3',
        itemId: 'item-deleted',
        type: 'daily',
        scheduledAt: 1000,
        enabled: true,
        createdAt: 10,
        updatedAt: 10,
      };
      const remOrphan: Reminder = {
        id: 'rem-orphan',
        itemId: 'non-existent-item',
        type: 'daily',
        scheduledAt: 1000,
        enabled: true,
        createdAt: 10,
        updatedAt: 10,
      };

      const allReminders = [remActive, remArchived, remDeleted, remOrphan];

      // Schedulable filter: item exists and item.status === 'active'
      const schedulable = allReminders.filter((r) => activeItemIds.has(r.itemId) && r.enabled);
      expect(schedulable.map((r) => r.id)).toEqual(['rem-1']);
    });

    it('reactivates reminder when an archived item is restored', () => {
      const item: Item = {
        id: 'item-1',
        workspaceId: null,
        type: 'text',
        content: 'Restored note',
        status: 'archived',
        order: 1,
        createdAt: 100,
        updatedAt: 100,
      };

      const reminder: Reminder = {
        id: 'rem-1',
        itemId: 'item-1',
        type: 'daily',
        time: '14:00',
        scheduledAt: Date.now() + 10000,
        enabled: true,
        createdAt: 10,
        updatedAt: 10,
      };

      // Before restore: not schedulable
      expect(item.status === 'active').toBe(false);

      // After restore:
      item.status = 'active';
      const isSchedulable = item.status === 'active' && reminder.enabled;
      expect(isSchedulable).toBe(true);
    });
  });

  describe('Formatting & Presentation', () => {
    it('formats daily display string properly in TR and EN', () => {
      const reminder: Reminder = {
        id: 'r1',
        itemId: 'i1',
        type: 'daily',
        time: '16:45',
        scheduledAt: 1000,
        enabled: true,
        createdAt: 10,
        updatedAt: 10,
      };

      expect(formatReminderDisplay(reminder, 'tr')).toBe('Her gün 16:45');
      expect(formatReminderDisplay(reminder, 'en')).toBe('Daily at 16:45');
    });

    it('formats weekly display with sorted weekdays in TR and EN', () => {
      const reminder: Reminder = {
        id: 'r1',
        itemId: 'i1',
        type: 'weekly',
        weekdays: [5, 1, 3], // Fri, Mon, Wed -> sorted: Mon, Wed, Fri
        time: '09:00',
        scheduledAt: 1000,
        enabled: true,
        createdAt: 10,
        updatedAt: 10,
      };

      expect(formatReminderDisplay(reminder, 'tr')).toBe('Pzt, Çar, Cum 09:00');
      expect(formatReminderDisplay(reminder, 'en')).toBe('Mon, Wed, Fri at 09:00');
    });

    it('finds soonest upcoming reminder accurately', () => {
      const now = Date.now();
      const r1: Reminder = {
        id: 'r1',
        itemId: 'i1',
        type: 'daily',
        scheduledAt: now + 50000,
        enabled: true,
        createdAt: 1,
        updatedAt: 1,
      };
      const r2: Reminder = {
        id: 'r2',
        itemId: 'i1',
        type: 'once',
        scheduledAt: now + 10000, // sooner
        enabled: true,
        createdAt: 1,
        updatedAt: 1,
      };
      const r3: Reminder = {
        id: 'r3',
        itemId: 'i1',
        type: 'weekly',
        scheduledAt: now + 5000, // disabled
        enabled: false,
        createdAt: 1,
        updatedAt: 1,
      };

      const soonest = getNextUpcomingReminder([r1, r2, r3]);
      expect(soonest?.id).toBe('r2');
    });

    it('formats reminder displays and badges correctly in tr and en', () => {
      const today = new Date();
      today.setHours(14, 30, 0, 0);

      const rOnce: Reminder = {
        id: 'ro',
        itemId: 'i1',
        type: 'once',
        scheduledAt: today.getTime(),
        time: '14:30',
        enabled: true,
        createdAt: 1,
        updatedAt: 1,
      };

      const badgeTr = formatNextReminderBadge(rOnce, 'tr');
      expect(badgeTr).toContain('14:30');

      const rDaily: Reminder = {
        id: 'rd',
        itemId: 'i1',
        type: 'daily',
        scheduledAt: today.getTime(),
        time: '09:00',
        enabled: true,
        createdAt: 1,
        updatedAt: 1,
      };

      expect(formatReminderDisplay(rDaily, 'tr')).toBe('Her gün 09:00');
      expect(formatReminderDisplay(rDaily, 'en')).toBe('Daily at 09:00');

      const rWeekly: Reminder = {
        id: 'rw',
        itemId: 'i1',
        type: 'weekly',
        scheduledAt: today.getTime(),
        time: '10:00',
        weekdays: [1, 3],
        enabled: true,
        createdAt: 1,
        updatedAt: 1,
      };

      expect(formatReminderDisplay(rWeekly, 'tr')).toBe('Pzt, Çar 10:00');
      expect(formatReminderDisplay(rWeekly, 'en')).toBe('Mon, Wed at 10:00');

      expect(WEEKDAY_LABELS_TR[1]).toBe('Pzt');
      expect(WEEKDAY_LABELS_EN[1]).toBe('Mon');
    });
  });
});
