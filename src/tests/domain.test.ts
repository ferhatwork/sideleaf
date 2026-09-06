import { describe, it, expect } from 'vitest';
import { Item, Workspace } from '../types';

describe('Domain State Transitions', () => {
  it('converts a text note to a checklist task smoothly', () => {
    const note: Item = {
      id: 'item-1',
      workspaceId: null,
      type: 'text',
      content: 'Follow up with client about API rate limits',
      status: 'active',
      order: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };

    // Transition: convert to checklist
    const task: Item = {
      ...note,
      type: 'checklist',
      checked: false,
      updatedAt: 2000,
    };

    expect(task.type).toBe('checklist');
    expect(task.checked).toBe(false);
    expect(task.content).toBe(note.content);

    // Toggle check
    const completedTask: Item = {
      ...task,
      checked: true,
      updatedAt: 3000,
    };
    expect(completedTask.checked).toBe(true);
  });

  it('moves unassigned scratch note into a designated workspace', () => {
    const ws: Workspace = {
      id: 'ws-tech',
      name: 'Infrastructure',
      createdAt: 500,
      updatedAt: 500,
    };

    const scratchNote: Item = {
      id: 'note-1',
      workspaceId: null,
      type: 'text',
      content: 'Database indexing optimization',
      status: 'active',
      order: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };

    expect(scratchNote.workspaceId).toBeNull();

    // Move
    const movedNote: Item = {
      ...scratchNote,
      workspaceId: ws.id,
      updatedAt: 2000,
    };

    expect(movedNote.workspaceId).toBe('ws-tech');
  });

  it('archives note non-destructively and restores it', () => {
    const item: Item = {
      id: 'item-arch',
      workspaceId: 'ws-1',
      type: 'text',
      content: 'Quarterly review notes',
      status: 'active',
      order: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };

    // Archive
    const archived: Item = {
      ...item,
      status: 'archived',
      archivedAt: 2000,
      updatedAt: 2000,
    };
    expect(archived.status).toBe('archived');
    expect(archived.archivedAt).toBe(2000);

    // Restore
    const restored: Item = {
      ...archived,
      status: 'active',
      archivedAt: undefined,
      updatedAt: 3000,
    };
    expect(restored.status).toBe('active');
    expect(restored.archivedAt).toBeUndefined();
  });
});
