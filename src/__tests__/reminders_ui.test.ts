import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReminderModal } from '../components/ReminderModal';
import { ItemCard } from '../components/ItemCard';
import { SideleafContext } from '../hooks/useSideleaf';
import { getTranslation } from '../i18n';
import { Item, Reminder } from '../types';

describe('Reminders UI & Deep Linking Suite', () => {
  const tEn = getTranslation('en');
  const tTr = getTranslation('tr');

  const testItem: Item = {
    id: 'item_test_1',
    workspaceId: 'ws_1',
    sectionId: null,
    type: 'text',
    content: 'Dentist appointment tomorrow',
    status: 'active',
    order: 100,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const testReminder: Reminder = {
    id: 'rem_1',
    itemId: testItem.id,
    type: 'daily',
    scheduledAt: new Date(2026, 8, 15, 9, 30).getTime(),
    time: '09:30',
    enabled: true,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const createMockContext = (locale: 'en' | 'tr' = 'en', customReminders: Reminder[] = [testReminder]) => ({
    t: locale === 'tr' ? tTr : tEn,
    locale,
    items: [testItem],
    workspaces: [{ id: 'ws_1', name: 'Personal', createdAt: 1, updatedAt: 1 }],
    sections: [],
    reminders: customReminders,
    settings: { theme: 'dark', locale },
    activity: [],
    activeView: { type: 'today' },
    isLoading: false,
    currentWorkspaceId: 'ws_1',
    currentSession: null,
    isQuickCaptureOpen: false,
    isSearchOpen: false,
    isSettingsOpen: false,
    isShortcutsOpen: false,
    isWorkspaceModalOpen: false,
    reminderModalItem: null,
    openReminderModal: () => {},
    closeReminderModal: () => {},
    addItem: async () => testItem,
    createItem: async () => testItem,
    updateItem: async () => {},
    toggleItemCheck: async () => {},
    convertToTask: async () => {},
    convertItemType: async () => {},
    moveItem: async () => {},
    archiveItem: async () => {},
    restoreItem: async () => {},
    deleteItem: async () => {},
    softDeleteItem: async () => {},
    permanentlyDeleteItem: async () => {},
    permanentlyDeleteItems: async () => {},
    addReminder: async () => testReminder,
    updateReminder: async () => {},
    deleteReminder: async () => {},
    toggleReminderEnabled: async () => {},
    createSection: async () => ({ id: 's1', workspaceId: 'ws_1', name: 'S1', order: 0, collapsed: false, createdAt: 0, updatedAt: 0 }),
    updateSection: async () => {},
    toggleSectionCollapse: async () => {},
    deleteSection: async () => {},
    reorderSections: async () => {},
    moveItemToSection: async () => {},
    updateWorkspaceViewMode: async () => {},
    addBulkItems: async () => [],
    bulkMoveItems: async () => {},
    bulkArchiveItems: async () => {},
    bulkDeleteItems: async () => {},
    createWorkspace: async () => ({ id: 'w1', name: 'W1', createdAt: 0, updatedAt: 0 }),
    updateWorkspace: async () => {},
    deleteWorkspace: async () => {},
    updateSettings: async () => {},
    importSideleafData: async () => {},
    importWorkpadData: async () => {},
    resetAllData: async () => {},
    triggerToast: () => {},
    toast: null,
    performUndo: () => {},
    performRedo: () => {},
    dismissToast: () => {},
    canInstallPwa: false,
    installPwa: async () => {},
  });

  describe('ReminderModal Component', () => {
    it('renders modal with item preview and existing reminder badge', () => {
      const mockContext = createMockContext('en', [testReminder]);

      const html = renderToStaticMarkup(
        React.createElement(
          SideleafContext.Provider,
          { value: mockContext as any },
          React.createElement(ReminderModal, {
            isOpen: true,
            onClose: () => {},
            item: testItem,
          })
        )
      );

      // Verify item text is shown
      expect(html).toContain('Dentist appointment tomorrow');
      // Verify reminders title
      expect(html).toContain(mockContext.t.reminder.reminders);
      // Verify daily recurrence string
      expect(html).toContain('Daily at 09:30');
      // Verify type selection tabs exist
      expect(html).toContain(mockContext.t.reminder.once);
      expect(html).toContain(mockContext.t.reminder.daily);
      expect(html).toContain(mockContext.t.reminder.weekly);
    });

    it('renders empty state when no reminders exist for the item', () => {
      const mockContext = createMockContext('tr', []);

      const html = renderToStaticMarkup(
        React.createElement(
          SideleafContext.Provider,
          { value: mockContext as any },
          React.createElement(ReminderModal, {
            isOpen: true,
            onClose: () => {},
            item: testItem,
          })
        )
      );

      expect(html).toContain(mockContext.t.reminder.noReminders);
      expect(html).toContain(mockContext.t.reminder.addReminder);
    });

    it('does not render when isOpen is false', () => {
      const mockContext = createMockContext('en', [testReminder]);

      const html = renderToStaticMarkup(
        React.createElement(
          SideleafContext.Provider,
          { value: mockContext as any },
          React.createElement(ReminderModal, {
            isOpen: false,
            onClose: () => {},
            item: testItem,
          })
        )
      );

      expect(html).toBe('');
    });
  });

  describe('ItemCard Reminder Integration', () => {
    it('renders the subtle reminder badge on ItemCard when an active reminder exists', () => {
      const mockContext = createMockContext('en', [testReminder]);

      const html = renderToStaticMarkup(
        React.createElement(
          SideleafContext.Provider,
          { value: mockContext as any },
          React.createElement(ItemCard, {
            item: testItem,
            workspaces: [{ id: 'ws_1', name: 'Personal', createdAt: 1, updatedAt: 1 }],
            onUpdate: async () => {},
            onToggleCheck: async () => {},
            onConvertType: async () => {},
            onMove: async () => {},
            onArchive: async () => {},
            onDelete: async () => {},
          })
        )
      );

      // Verify root container has deep linking id
      expect(html).toContain('id="item-item_test_1"');
      // Verify reminder badge is rendered
      expect(html).toContain('09:30');
    });

    it('does not render the reminder badge when reminders are disabled', () => {
      const disabledReminder: Reminder = { ...testReminder, enabled: false };
      const mockContext = createMockContext('en', [disabledReminder]);

      const html = renderToStaticMarkup(
        React.createElement(
          SideleafContext.Provider,
          { value: mockContext as any },
          React.createElement(ItemCard, {
            item: testItem,
            workspaces: [{ id: 'ws_1', name: 'Personal', createdAt: 1, updatedAt: 1 }],
            onUpdate: async () => {},
            onToggleCheck: async () => {},
            onConvertType: async () => {},
            onMove: async () => {},
            onArchive: async () => {},
            onDelete: async () => {},
          })
        )
      );

      // Root id is still present for deep linking
      expect(html).toContain('id="item-item_test_1"');
      // But no active reminder badge should be shown
      expect(html).not.toContain('09:30');
    });

    it('renders the bell icon in compact mode when reminder is active', () => {
      const mockContext = createMockContext('tr', [testReminder]);

      const html = renderToStaticMarkup(
        React.createElement(
          SideleafContext.Provider,
          { value: mockContext as any },
          React.createElement(ItemCard, {
            item: testItem,
            workspaces: [{ id: 'ws_1', name: 'Personal', createdAt: 1, updatedAt: 1 }],
            compact: true,
            onUpdate: async () => {},
            onToggleCheck: async () => {},
            onConvertType: async () => {},
            onMove: async () => {},
            onArchive: async () => {},
            onDelete: async () => {},
          })
        )
      );

      expect(html).toContain('id="item-item_test_1"');
      // In compact mode, the bell button title contains the localized next reminder label
      expect(html).toContain(mockContext.t.reminder.nextReminder);
    });
  });
});
