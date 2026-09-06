import { describe, it, expect } from 'vitest';
import {
  generateExportData,
  getExportFilename,
  validateSideleafData,
  validateWorkpadData,
  exportWorkspaceToMarkdown,
} from '../services/exportImport';
import { Item, Workspace, UserSettings, ActivityLog } from '../types';

describe('Export and Import Test Suite', () => {
  const sampleWorkspaces: Workspace[] = [
    {
      id: 'ws_test_1',
      name: 'Engineering',
      color: '#3b82f6',
      createdAt: 1700000000000,
      updatedAt: 1700000001000,
    },
    {
      id: 'ws_test_2',
      name: 'Design System',
      color: '#ec4899',
      createdAt: 1700000002000,
      updatedAt: 1700000003000,
    },
  ];

  const sampleItems: Item[] = [
    {
      id: 'item_1',
      workspaceId: 'ws_test_1',
      type: 'text',
      content: 'Core architecture overview note',
      status: 'active',
      order: 0,
      createdAt: 1700000010000,
      updatedAt: 1700000011000,
    },
    {
      id: 'item_2',
      workspaceId: 'ws_test_1',
      type: 'checklist',
      content: 'Refactor database migration hooks',
      checked: true,
      status: 'active',
      order: 1,
      createdAt: 1700000020000,
      updatedAt: 1700000021000,
    },
    {
      id: 'item_3',
      workspaceId: 'ws_test_2',
      type: 'quote',
      content: 'Design is how it works.',
      source: {
        title: 'Steve Jobs Quote',
        url: 'https://example.com/steve-jobs',
        domain: 'example.com',
        capturedAt: 1700000030000,
      },
      status: 'active',
      order: 2,
      createdAt: 1700000030000,
      updatedAt: 1700000031000,
    },
    {
      id: 'item_4',
      workspaceId: 'ws_test_2',
      type: 'decision',
      content: 'Approved new sage accent color token for Sideleaf rebranding',
      status: 'active',
      order: 3,
      createdAt: 1700000040000,
      updatedAt: 1700000041000,
    },
    {
      id: 'item_5',
      workspaceId: 'ws_test_1',
      type: 'link',
      content: 'https://github.com/sideleaf/app',
      source: {
        title: 'Sideleaf Repository',
        url: 'https://github.com/sideleaf/app',
        domain: 'github.com',
        capturedAt: 1700000050000,
      },
      status: 'active',
      order: 4,
      createdAt: 1700000050000,
      updatedAt: 1700000051000,
    },
  ];

  const sampleSettings: UserSettings = {
    theme: 'dark',
    locale: 'en',
    quickCaptureShortcut: 'Ctrl+Shift+Space',
    searchShortcut: 'Ctrl+K',
    autoSaveIntervalMs: 2000,
    defaultView: 'today',
  };

  const sampleActivity: ActivityLog[] = [
    {
      id: 'act_1',
      action: 'capture',
      details: 'Captured architecture note',
      timestamp: 1700000010000,
      itemId: 'item_1',
    },
  ];

  describe('Export Data Generation', () => {
    it('creates sideleaf-v1 schema with all metadata, items, workspaces, and settings', () => {
      const exportData = generateExportData(
        sampleWorkspaces,
        sampleItems,
        sampleSettings,
        sampleActivity
      );

      // Schema verification
      expect(exportData.schema).toBe('sideleaf-v1');
      expect(exportData.version).toBe('1.0.0');
      expect(typeof exportData.exportedAt).toBe('string');
      expect(new Date(exportData.exportedAt).getTime()).not.toBeNaN();

      // Content verification
      expect(exportData.workspaces).toHaveLength(2);
      expect(exportData.workspaces).toEqual(sampleWorkspaces);
      expect(exportData.items).toHaveLength(5);
      expect(exportData.items).toEqual(sampleItems);
      expect(exportData.settings).toEqual(sampleSettings);
      expect(exportData.activity).toEqual(sampleActivity);
    });

    it('generates filename containing .sideleaf extension and sideleaf-backup prefix', () => {
      const filename = getExportFilename();
      expect(filename).toMatch(/^sideleaf-backup-\d{4}-\d{2}-\d{2}\.sideleaf$/);
      expect(filename).toContain('.sideleaf');

      const customDate = new Date('2026-09-06T12:00:00Z');
      const customFilename = getExportFilename(customDate);
      expect(customFilename).toBe('sideleaf-backup-2026-09-06.sideleaf');
    });
  });

  describe('Importing .sideleaf Data', () => {
    it('successfully validates modern sideleaf-v1 export files', () => {
      const validExport = generateExportData(
        sampleWorkspaces,
        sampleItems,
        sampleSettings,
        sampleActivity
      );

      const result = validateSideleafData(validExport);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.schema).toBe('sideleaf-v1');
      expect(result.stats).toEqual({
        workspacesCount: 2,
        itemsCount: 5,
        activityCount: 1,
      });
    });
  });

  describe('Backwards Compatibility (legacy .workpad schema workpad-v1)', () => {
    it('seamlessly imports legacy .workpad export with workpad-v1 schema', () => {
      const legacyWorkpadData = {
        schema: 'workpad-v1',
        version: '1.0.0',
        exportedAt: '2024-05-10T14:22:00.000Z',
        workspaces: sampleWorkspaces,
        items: sampleItems,
        settings: sampleSettings,
        activity: sampleActivity,
      };

      const result = validateSideleafData(legacyWorkpadData);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.schema).toBe('workpad-v1');
      expect(result.stats?.workspacesCount).toBe(2);
      expect(result.stats?.itemsCount).toBe(5);
      expect(result.stats?.activityCount).toBe(1);
    });

    it('validateWorkpadData alias behaves identically to validateSideleafData', () => {
      const legacyWorkpadData = {
        schema: 'workpad-v1',
        version: '1.0.0',
        exportedAt: '2024-05-10T14:22:00.000Z',
        workspaces: sampleWorkspaces,
        items: sampleItems,
      };

      const resultSideleaf = validateSideleafData(legacyWorkpadData);
      const resultWorkpad = validateWorkpadData(legacyWorkpadData);

      expect(resultWorkpad).toEqual(resultSideleaf);
      expect(resultWorkpad.valid).toBe(true);
    });
  });

  describe('Validation Robustness & Error Handling', () => {
    it('rejects unsupported schemas with informative error message', () => {
      const invalid = {
        schema: 'unsupported-schema-v99',
        workspaces: [],
        items: [],
      };
      const result = validateSideleafData(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported schema "unsupported-schema-v99"');
      expect(result.error).toContain('Expected "sideleaf-v1" or "workpad-v1"');
    });

    it('rejects null, primitive, or non-object payloads', () => {
      expect(validateSideleafData(null).valid).toBe(false);
      expect(validateSideleafData('not json object').valid).toBe(false);
      expect(validateSideleafData(12345).valid).toBe(false);
      expect(validateSideleafData([]).valid).toBe(false);
    });

    it('rejects payloads missing items or workspaces arrays', () => {
      const missingItems = {
        schema: 'sideleaf-v1',
        workspaces: sampleWorkspaces,
      };
      const result1 = validateSideleafData(missingItems);
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('"items" array is missing');

      const missingWorkspaces = {
        schema: 'sideleaf-v1',
        items: sampleItems,
      };
      const result2 = validateSideleafData(missingWorkspaces);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('"workspaces" array is missing');
    });

    it('rejects items missing id or string content', () => {
      const corruptedItem = {
        schema: 'sideleaf-v1',
        workspaces: sampleWorkspaces,
        items: [{ id: '', content: 'no id', type: 'text' }],
      };
      const result1 = validateSideleafData(corruptedItem);
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('missing a valid "id"');

      const nonStringContent = {
        schema: 'sideleaf-v1',
        workspaces: sampleWorkspaces,
        items: [{ id: 'it_1', content: 1234, type: 'text' }],
      };
      const result2 = validateSideleafData(nonStringContent);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('missing valid string "content"');
    });

    it('rejects items with unknown types', () => {
      const invalidTypeItem = {
        schema: 'sideleaf-v1',
        workspaces: sampleWorkspaces,
        items: [{ id: 'it_1', content: 'hello', type: 'invalid_audio_type' }],
      };
      const result = validateSideleafData(invalidTypeItem);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid type "invalid_audio_type"');
    });

    it('rejects workspaces missing id or name', () => {
      const corruptedWorkspace = {
        schema: 'sideleaf-v1',
        workspaces: [{ id: 'ws_1' }],
        items: sampleItems,
      };
      const result = validateSideleafData(corruptedWorkspace);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('missing "id" or "name"');
    });
  });

  describe('Markdown Export', () => {
    it('formats workspace items into clean Markdown with tasks, quotes, decisions, and links', () => {
      const md = exportWorkspaceToMarkdown('Engineering Notes', sampleItems);

      expect(md).toContain('# Engineering Notes');
      expect(md).toContain('- [x] Refactor database migration hooks');
      expect(md).toContain('> Design is how it works.');
      expect(md).toContain('> — *Source: https://example.com/steve-jobs*');
      expect(md).toContain('- **[Decision]** Approved new sage accent color token for Sideleaf rebranding');
      expect(md).toContain('- [Sideleaf Repository](https://github.com/sideleaf/app)');
    });
  });
});
