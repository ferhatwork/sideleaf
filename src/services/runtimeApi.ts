import { Item, Reminder, RuntimeReminder, RuntimeRemindersPayload } from '../types';

const RUNTIME_REMINDERS_ENDPOINT = '/__sideleaf/reminders';

let cachedRuntimeAvailable: boolean | null = null;
let lastCheckTime = 0;

/**
 * Checks if the local Sideleaf runtime server is reachable.
 */
export async function isLocalRuntimeAvailable(): Promise<boolean> {
  const now = Date.now();
  if (cachedRuntimeAvailable !== null && now - lastCheckTime < 10000) {
    return cachedRuntimeAvailable;
  }

  try {
    const res = await fetch(RUNTIME_REMINDERS_ENDPOINT, {
      method: 'GET',
      headers: {
        'X-Sideleaf-Client': '1',
      },
      cache: 'no-store',
    });
    cachedRuntimeAvailable = res.status === 200;
  } catch {
    cachedRuntimeAvailable = false;
  }

  lastCheckTime = now;
  return cachedRuntimeAvailable;
}

/**
 * Synchronizes the current active, schedulable reminders to the local runtime mirror.
 * Archived and deleted items are excluded so they are never triggered by the background scheduler.
 */
export async function syncRemindersToRuntime(
  items: Item[],
  reminders: Reminder[]
): Promise<boolean> {
  try {
    const activeItemMap = new Map(
      items.filter((i) => i.status === 'active').map((i) => [i.id, i])
    );

    // Only active items with enabled reminders are schedulable
    const schedulableReminders: RuntimeReminder[] = reminders
      .filter((r) => r.enabled && activeItemMap.has(r.itemId))
      .map((r) => {
        const it = activeItemMap.get(r.itemId)!;
        const plainSnippet = it.content.trim().slice(0, 160);
        return {
          id: r.id,
          itemId: r.itemId,
          itemContent: plainSnippet || 'Sideleaf Note',
          type: r.type,
          scheduledAt: r.scheduledAt,
          time: r.time,
          weekdays: r.weekdays,
          enabled: r.enabled,
          lastTriggeredAt: r.lastTriggeredAt,
        };
      });

    const payload: RuntimeRemindersPayload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      reminders: schedulableReminders,
    };

    const res = await fetch(RUNTIME_REMINDERS_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Sideleaf-Client': '1',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      cachedRuntimeAvailable = true;
      return true;
    }
    return false;
  } catch {
    // If runtime server is not running (e.g. dev mode), fail gracefully without throwing
    cachedRuntimeAvailable = false;
    return false;
  }
}
