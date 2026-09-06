import { describe, it, expect } from 'vitest';
import {
  validateWorkpadData,
  generateExportData,
  exportWorkspaceToMarkdown,
} from '../services/exportImport';
import { Item, Workspace } from '../types';

describe('Export and Import Engine', () => {
  const mockWorkspaces: Workspace[] = [
    {
      id: 'ws-1',
      name: 'Product Spec',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
  ];

  const mockItems: Item[] = [
    {
      id: 'it-1',
      workspaceId: 'ws-1',
      type: 'text',
      content: 'Core insight: Capture first, organize later.',
      status: 'active',
      order: 1,
      createdAt: 1700000001000,
      updatedAt: 1700000001000,
    },
    {
      id: 'it-2',
      workspaceId: 'ws-1',
      type: 'checklist',
      content: 'Write comprehensive tests',
      checked: true,
      status: 'active',
      order: 2,
      createdAt: 1700000002000,
      updatedAt: 1700000002000,
    },
    {
      id: 'it-3',
      workspaceId: 'ws-1',
      type: 'quote',
      content: 'Open it. Capture the thought. Keep working.',
      status: 'active',
      order: 3,
      source: {
        domain: 'workpad.local',
        capturedAt: 1700000003000,
      },
      createdAt: 1700000003000,
      updatedAt: 1700000003000,
    },
  ];

  it('generates valid export structure', () => {
    const exported = generateExportData(mockWorkspaces, mockItems);
    expect(exported.schema).toBe('workpad-v1');
    expect(exported.version).toBe('1.0.0');
    expect(exported.workspaces).toHaveLength(1);
    expect(exported.items).toHaveLength(3);
    expect(exported.exportedAt).toBeDefined();
  });

  it('validates a valid workpad payload', () => {
    const exported = generateExportData(mockWorkspaces, mockItems);
    const result = validateWorkpadData(exported);
    expect(result.valid).toBe(true);
    expect(result.stats?.itemsCount).toBe(3);
    expect(result.stats?.workspacesCount).toBe(1);
  });

  it('rejects corrupt or unsupported payloads', () => {
    expect(validateWorkpadData(null).valid).toBe(false);
    expect(validateWorkpadData({ schema: 'wrong-schema' }).valid).toBe(false);
    expect(validateWorkpadData({ schema: 'workpad-v1', workspaces: 'not-array' }).valid).toBe(false);
    expect(
      validateWorkpadData({
        schema: 'workpad-v1',
        workspaces: [],
        items: [{ id: '1', content: 123, type: 'invalid' }],
      }).valid
    ).toBe(false);
  });

  it('exports workspace to clean markdown format', () => {
    const md = exportWorkspaceToMarkdown('Product Spec', mockItems);
    expect(md).toContain('# Product Spec');
    expect(md).toContain('Core insight: Capture first, organize later.');
    expect(md).toContain('- [x] Write comprehensive tests');
    expect(md).toContain('> Open it. Capture the thought. Keep working.');
  });
});
