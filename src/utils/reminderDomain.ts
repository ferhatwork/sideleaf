import { Reminder, ReminderType } from '../types';

export const WEEKDAYS_ISO = [1, 2, 3, 4, 5, 6, 7] as const;
export type WeekdayIso = (typeof WEEKDAYS_ISO)[number];

export const WEEKDAY_LABELS_TR: Record<number, string> = {
  1: 'Pzt',
  2: 'Sal',
  3: 'Çar',
  4: 'Per',
  5: 'Cum',
  6: 'Cmt',
  7: 'Paz',
};

export const WEEKDAY_LABELS_EN: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

/**
 * Calculates the next local timestamp (in ms) for a given reminder configuration.
 * Preserves local clock time (hours and minutes) regardless of month transitions or DST boundaries.
 */
export function calculateNextOccurrence(
  config: {
    type: ReminderType;
    scheduledAt?: number;
    time?: string;
    weekdays?: number[];
  },
  fromDate: Date = new Date()
): number | null {
  const fromMs = fromDate.getTime();

  if (config.type === 'once') {
    if (typeof config.scheduledAt === 'number') {
      return config.scheduledAt;
    }
    return null;
  }

  const timeStr = config.time || '09:00';
  const parts = timeStr.split(':');
  const targetHour = parseInt(parts[0], 10) || 0;
  const targetMinute = parseInt(parts[1], 10) || 0;

  if (config.type === 'daily') {
    const todayCandidate = new Date(
      fromDate.getFullYear(),
      fromDate.getMonth(),
      fromDate.getDate(),
      targetHour,
      targetMinute,
      0,
      0
    );

    if (todayCandidate.getTime() > fromMs) {
      return todayCandidate.getTime();
    }

    const tomorrowCandidate = new Date(
      fromDate.getFullYear(),
      fromDate.getMonth(),
      fromDate.getDate() + 1,
      targetHour,
      targetMinute,
      0,
      0
    );
    return tomorrowCandidate.getTime();
  }

  if (config.type === 'weekly') {
    const rawWeekdays = config.weekdays && config.weekdays.length > 0 ? config.weekdays : [1];
    const validWeekdays = new Set(rawWeekdays);

    for (let offset = 0; offset <= 7; offset++) {
      const candidate = new Date(
        fromDate.getFullYear(),
        fromDate.getMonth(),
        fromDate.getDate() + offset,
        targetHour,
        targetMinute,
        0,
        0
      );

      // JS getDay(): 0 is Sunday, 1..6 is Mon..Sat
      const isoDay = candidate.getDay() === 0 ? 7 : candidate.getDay();
      if (validWeekdays.has(isoDay)) {
        if (candidate.getTime() > fromMs) {
          return candidate.getTime();
        }
      }
    }

    // Fallback: full week ahead
    const fallback = new Date(
      fromDate.getFullYear(),
      fromDate.getMonth(),
      fromDate.getDate() + 7,
      targetHour,
      targetMinute,
      0,
      0
    );
    return fallback.getTime();
  }

  return null;
}

/**
 * Checks if a reminder is currently due to be triggered.
 */
export function isReminderDue(reminder: Reminder, nowMs: number = Date.now()): boolean {
  if (!reminder.enabled) return false;
  if (reminder.scheduledAt > nowMs) return false;
  if (reminder.lastTriggeredAt && reminder.lastTriggeredAt >= reminder.scheduledAt) {
    return false;
  }
  return true;
}

/**
 * Advances recurring reminders to their next occurrence, or disables one-shot reminders.
 */
export function advanceRecurringReminder(reminder: Reminder, triggerTime: number = Date.now()): Reminder {
  if (reminder.type === 'once') {
    return {
      ...reminder,
      enabled: false,
      lastTriggeredAt: triggerTime,
      updatedAt: triggerTime,
    };
  }

  const nextOccurrence = calculateNextOccurrence(reminder, new Date(triggerTime + 1000));
  return {
    ...reminder,
    scheduledAt: nextOccurrence ?? reminder.scheduledAt,
    lastTriggeredAt: triggerTime,
    updatedAt: triggerTime,
  };
}

/**
 * Finds the soonest upcoming active reminder among a list.
 */
export function getNextUpcomingReminder(reminders: Reminder[]): Reminder | null {
  const active = reminders.filter((r) => r.enabled);
  if (active.length === 0) return null;

  let soonest: Reminder | null = null;
  for (const r of active) {
    if (!soonest || r.scheduledAt < soonest.scheduledAt) {
      soonest = r;
    }
  }
  return soonest;
}

/**
 * Formats a short badge label for an item card (e.g. "Bugün 14:00", "Yarın 09:30").
 */
export function formatNextReminderBadge(reminder: Reminder, locale: 'en' | 'tr'): string {
  const scheduled = new Date(reminder.scheduledAt);
  const now = new Date();

  const isToday =
    scheduled.getFullYear() === now.getFullYear() &&
    scheduled.getMonth() === now.getMonth() &&
    scheduled.getDate() === now.getDate();

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isTomorrow =
    scheduled.getFullYear() === tomorrow.getFullYear() &&
    scheduled.getMonth() === tomorrow.getMonth() &&
    scheduled.getDate() === tomorrow.getDate();

  const hours = String(scheduled.getHours()).padStart(2, '0');
  const minutes = String(scheduled.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) {
    return locale === 'tr' ? `Bugün ${timeStr}` : `Today ${timeStr}`;
  }
  if (isTomorrow) {
    return locale === 'tr' ? `Yarın ${timeStr}` : `Tomorrow ${timeStr}`;
  }

  // Future date
  const monthNamesTr = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStr = locale === 'tr' ? monthNamesTr[scheduled.getMonth()] : monthNamesEn[scheduled.getMonth()];

  return `${scheduled.getDate()} ${monthStr} ${timeStr}`;
}

/**
 * Formats full descriptive string of a reminder rule for UI display.
 */
export function formatReminderDisplay(reminder: Reminder, locale: 'en' | 'tr'): string {
  const timeStr = reminder.time || '09:00';

  if (reminder.type === 'once') {
    return formatNextReminderBadge(reminder, locale);
  }

  if (reminder.type === 'daily') {
    return locale === 'tr' ? `Her gün ${timeStr}` : `Daily at ${timeStr}`;
  }

  if (reminder.type === 'weekly') {
    const labels = locale === 'tr' ? WEEKDAY_LABELS_TR : WEEKDAY_LABELS_EN;
    const weekdays = (reminder.weekdays || [1]).slice().sort((a, b) => a - b);
    const dayNames = weekdays.map((w) => labels[w] || String(w)).join(', ');
    return locale === 'tr' ? `${dayNames} ${timeStr}` : `${dayNames} at ${timeStr}`;
  }

  return '';
}
