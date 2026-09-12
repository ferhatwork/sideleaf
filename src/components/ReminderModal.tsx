import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Item, ReminderType } from '../types';
import { useSideleaf } from '../hooks/useSideleaf';
import {
  calculateNextOccurrence,
  formatNextReminderBadge,
  formatReminderDisplay,
  WEEKDAYS_ISO,
  WEEKDAY_LABELS_EN,
  WEEKDAY_LABELS_TR,
} from '../utils/reminderDomain';
import {
  X,
  Bell,
  Calendar,
  Clock,
  Repeat,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const { t, locale, reminders, addReminder, deleteReminder, toggleReminderEnabled } = useSideleaf();

  const [reminderType, setReminderType] = useState<ReminderType>('once');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Check notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [isOpen]);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch {
        // Fall back gracefully
      }
    }
  };

  // Filter reminders for current item
  const itemReminders = useMemo(() => {
    if (!item) return [];
    return (reminders || [])
      .filter((r) => r.itemId === item.id)
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [reminders, item]);

  // Modal open / close focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Default to next rounded hour
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const hoursStr = String(now.getHours()).padStart(2, '0');
      const minStr = String(now.getMinutes()).padStart(2, '0');
      setSelectedTime(`${hoursStr}:${minStr}`);

      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${d}`);

      const isoDay = now.getDay() === 0 ? 7 : now.getDay();
      setSelectedWeekdays([isoDay]);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleWeekdayToggle = (day: number) => {
    setSelectedWeekdays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    if (notificationPermission === 'default' && typeof window !== 'undefined' && 'Notification' in window) {
      requestPermission().catch(() => {});
    }

    let scheduledAt: number | null = null;
    const now = new Date();

    if (reminderType === 'once') {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const [h, min] = selectedTime.split(':').map(Number);
      const dateObj = new Date(y, m - 1, d, h, min, 0, 0);
      scheduledAt = dateObj.getTime();
    } else if (reminderType === 'daily') {
      scheduledAt = calculateNextOccurrence({ type: 'daily', time: selectedTime }, now);
    } else if (reminderType === 'weekly') {
      scheduledAt = calculateNextOccurrence(
        { type: 'weekly', time: selectedTime, weekdays: selectedWeekdays },
        now
      );
    }

    if (!scheduledAt) return;

    await addReminder({
      itemId: item.id,
      type: reminderType,
      scheduledAt,
      time: selectedTime,
      weekdays: reminderType === 'weekly' ? selectedWeekdays : undefined,
      enabled: true,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const weekdayLabels = locale === 'tr' ? WEEKDAY_LABELS_TR : WEEKDAY_LABELS_EN;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-sideleaf-dark-border bg-white dark:bg-sideleaf-dark-surface shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-500" />
            <h2 id="reminder-modal-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {t.reminder.reminders}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-neutral-900 dark:text-neutral-100">
          {/* Note preview snippet */}
          <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900/60 p-3 border border-neutral-200/80 dark:border-neutral-800/80 text-xs text-neutral-600 dark:text-neutral-300 line-clamp-3">
            {item.content || '...'}
          </div>

          {/* Browser notification permission banner if blocked or default */}
          {notificationPermission === 'denied' && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>{t.reminder.permissionDenied}</div>
            </div>
          )}
          {notificationPermission === 'default' && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-800 dark:text-blue-300">
              <span>{t.reminder.permissionRequested}</span>
              <button
                type="button"
                onClick={requestPermission}
                className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium shrink-0 ml-2 focus-ring"
              >
                {t.reminder.enable}
              </button>
            </div>
          )}

          {/* Existing Reminders */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {t.reminder.reminders} ({itemReminders.length})
            </label>

            {itemReminders.length === 0 ? (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
                {t.reminder.noReminders}
              </p>
            ) : (
              <div className="space-y-2">
                {itemReminders.map((rem) => {
                  const displayStr = formatReminderDisplay(rem, locale);
                  const nextBadge = formatNextReminderBadge(rem, locale);
                  return (
                    <div
                      key={rem.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                        rem.enabled
                          ? 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30'
                          : 'border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-100/40 dark:bg-neutral-900/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {rem.type === 'once' && <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                        {rem.type === 'daily' && <Repeat className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {rem.type === 'weekly' && <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                        <div className="truncate">
                          <span className="font-medium text-neutral-800 dark:text-neutral-200 block truncate">
                            {displayStr}
                          </span>
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {rem.enabled ? `${t.reminder.nextReminder}: ${nextBadge}` : t.reminder.disabled}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleReminderEnabled(rem.id)}
                          aria-label={rem.enabled ? t.reminder.disable : t.reminder.enable}
                          title={rem.enabled ? t.reminder.disable : t.reminder.enable}
                          className={`p-1.5 rounded-md focus-ring ${
                            rem.enabled
                              ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                              : 'text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 ${rem.enabled ? 'opacity-100' : 'opacity-30'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteReminder(rem.id)}
                          aria-label={t.reminder.remove}
                          title={t.reminder.remove}
                          className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2.5">
              {t.reminder.addReminder}
            </label>

            {/* Recurrence Type Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/60 mb-3 text-xs">
              <button
                type="button"
                onClick={() => setReminderType('once')}
                className={`py-1.5 rounded-md font-medium transition-colors focus-ring ${
                  reminderType === 'once'
                    ? 'bg-white dark:bg-sideleaf-dark-surface text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {t.reminder.once}
              </button>
              <button
                type="button"
                onClick={() => setReminderType('daily')}
                className={`py-1.5 rounded-md font-medium transition-colors focus-ring ${
                  reminderType === 'daily'
                    ? 'bg-white dark:bg-sideleaf-dark-surface text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {t.reminder.daily}
              </button>
              <button
                type="button"
                onClick={() => setReminderType('weekly')}
                className={`py-1.5 rounded-md font-medium transition-colors focus-ring ${
                  reminderType === 'weekly'
                    ? 'bg-white dark:bg-sideleaf-dark-surface text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {t.reminder.weekly}
              </button>
            </div>

            <form onSubmit={handleAddReminder} className="space-y-3">
              {/* Once: Date picker */}
              {reminderType === 'once' && (
                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                    {t.reminder.date}
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus-ring"
                    required
                  />
                </div>
              )}

              {/* Time Picker */}
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                  {t.reminder.time}
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus-ring"
                  required
                />
              </div>

              {/* Weekly: Weekday buttons */}
              {reminderType === 'weekly' && (
                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                    {t.reminder.weekdays}
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {WEEKDAYS_ISO.map((day) => {
                      const isSelected = selectedWeekdays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleWeekdayToggle(day)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border focus-ring ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                        >
                          {weekdayLabels[day]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium focus-ring transition-colors flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{t.reminder.addReminder}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
