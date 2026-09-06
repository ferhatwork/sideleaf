import { describe, it, expect } from 'vitest';
import { Item, Workspace } from '../types';
import {
  createItemRecord,
  resolveWorkspaceId,
  convertToTaskMutation,
  revertTaskConversion,
  updateWorkSession,
} from '../utils/domain';

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

  describe('Decision Item Type (Spec Section 17, 82)', () => {
    it('creates a decision item with clean domain fields', () => {
      const decision = createItemRecord({
        content: 'Chose SQLite/IndexedDB over remote database for zero-latency local-first work',
        type: 'decision',
        workspaceId: 'ws-arch',
      });

      expect(decision.type).toBe('decision');
      expect(decision.workspaceId).toBe('ws-arch');
      expect(decision.content).toContain('Chose SQLite/IndexedDB');
      expect(decision.status).toBe('active');
      expect(decision.checked).toBeUndefined();
    });

    it('mutates a decision item correctly', () => {
      const decision: Item = {
        id: 'dec-1',
        workspaceId: 'ws-1',
        type: 'decision',
        content: 'Initial architecture decision: use React 19',
        status: 'active',
        order: 100,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const mutatedDecision: Item = {
        ...decision,
        content: 'Revised architecture decision: stick to React 19 with lightweight hooks',
        tags: ['architecture', 'frontend'],
        updatedAt: 2000,
      };

      expect(mutatedDecision.type).toBe('decision');
      expect(mutatedDecision.content).toContain('Revised architecture');
      expect(mutatedDecision.tags).toEqual(['architecture', 'frontend']);
      expect(mutatedDecision.updatedAt).toBe(2000);
    });
  });

  describe('Silent Workspace Inheritance (Spec Section 15, 58, 101)', () => {
    it('silently inherits active workspace when no workspaceId is specified', () => {
      const activeWorkspaceId = 'ws-website-redesign';
      const item = createItemRecord(
        { content: 'Verify Safari responsive typography' },
        activeWorkspaceId
      );

      expect(item.workspaceId).toBe('ws-website-redesign');
    });

    it('defaults to scratch (null) when no workspace is active', () => {
      const item = createItemRecord(
        { content: 'Quick fleeting observation' },
        null
      );

      expect(item.workspaceId).toBeNull();
    });

    it('respects explicit workspaceId override even if another workspace is active', () => {
      const activeWorkspaceId = 'ws-website-redesign';
      const item = createItemRecord(
        { content: 'Capture specifically to Scratch', workspaceId: null },
        activeWorkspaceId
      );

      expect(item.workspaceId).toBeNull();

      const specificWsItem = createItemRecord(
        { content: 'Assigned to different workspace', workspaceId: 'ws-other' },
        activeWorkspaceId
      );
      expect(specificWsItem.workspaceId).toBe('ws-other');
    });

    it('resolveWorkspaceId helper adheres to Section 101 contract', () => {
      expect(resolveWorkspaceId(undefined, 'ws-active')).toBe('ws-active');
      expect(resolveWorkspaceId(undefined, null)).toBeNull();
      expect(resolveWorkspaceId('ws-explicit', 'ws-active')).toBe('ws-explicit');
      expect(resolveWorkspaceId(null, 'ws-active')).toBeNull();
    });
  });

  describe('Task Conversion and Undo (Spec Section 12, 53, 81)', () => {
    it('converts a note to a task and reliably undoes conversion', () => {
      const note: Item = {
        id: 'note-task-test',
        workspaceId: 'ws-1',
        type: 'text',
        content: 'Review API performance metrics',
        status: 'active',
        order: 10,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const now = 2000;
      const { updatedItem, previousType, previousChecked } = convertToTaskMutation(note, now);

      expect(updatedItem.type).toBe('checklist');
      expect(updatedItem.checked).toBe(false);
      expect(updatedItem.updatedAt).toBe(now);
      expect(previousType).toBe('text');
      expect(previousChecked).toBeUndefined();

      // Undo conversion
      const restored = revertTaskConversion(updatedItem, previousType, previousChecked, 3000);
      expect(restored.type).toBe('text');
      expect(restored.checked).toBeUndefined();
      expect(restored.content).toBe(note.content);
      expect(restored.updatedAt).toBe(3000);
    });

    it('converts a decision note to a task and reliably undoes conversion preserving decision type', () => {
      const decisionItem: Item = {
        id: 'dec-conv',
        workspaceId: null,
        type: 'decision',
        content: 'Approved new onboarding flow',
        status: 'active',
        order: 15,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const { updatedItem, previousType } = convertToTaskMutation(decisionItem, 2500);
      expect(updatedItem.type).toBe('checklist');
      expect(previousType).toBe('decision');

      const restored = revertTaskConversion(updatedItem, previousType, undefined, 3500);
      expect(restored.type).toBe('decision');
      expect(restored.content).toBe('Approved new onboarding flow');
    });

    it('supports redo by re-applying task conversion on restored item', () => {
      const note: Item = {
        id: 'redo-test',
        workspaceId: null,
        type: 'text',
        content: 'Refactor database queries',
        status: 'active',
        order: 20,
        createdAt: 1000,
        updatedAt: 1000,
      };

      // 1. Initial conversion
      const { updatedItem } = convertToTaskMutation(note, 2000);
      expect(updatedItem.type).toBe('checklist');

      // 2. Undo
      const reverted = revertTaskConversion(updatedItem, 'text', undefined, 3000);
      expect(reverted.type).toBe('text');

      // 3. Redo (re-apply)
      const { updatedItem: redoneItem } = convertToTaskMutation(reverted, 4000);
      expect(redoneItem.type).toBe('checklist');
      expect(redoneItem.content).toBe(note.content);
    });
  });

  describe('Work Session Activity Tracking (Spec Section 16)', () => {
    it('initializes a work session when activating a workspace', () => {
      const session = updateWorkSession(null, 'ws-dev', 'Core Development', 1000, false);

      expect(session.workspaceId).toBe('ws-dev');
      expect(session.workspaceName).toBe('Core Development');
      expect(session.startedAt).toBe(1000);
      expect(session.lastActiveAt).toBe(1000);
      expect(session.itemCount).toBe(0);
    });

    it('updates lastActiveAt and increments itemCount when items are touched', () => {
      const session1 = updateWorkSession(null, 'ws-dev', 'Core Development', 1000, false);
      expect(session1.itemCount).toBe(0);

      // User captures item
      const session2 = updateWorkSession(session1, 'ws-dev', 'Core Development', 2000, true);
      expect(session2.startedAt).toBe(1000);
      expect(session2.lastActiveAt).toBe(2000);
      expect(session2.itemCount).toBe(1);

      // User modifies another item
      const session3 = updateWorkSession(session2, 'ws-dev', 'Core Development', 3000, true);
      expect(session3.startedAt).toBe(1000);
      expect(session3.lastActiveAt).toBe(3000);
      expect(session3.itemCount).toBe(2);
    });

    it('starts a new session when switching to a different workspace context', () => {
      const sessionA = updateWorkSession(null, 'ws-a', 'Project A', 1000, true);
      expect(sessionA.workspaceId).toBe('ws-a');
      expect(sessionA.itemCount).toBe(1);

      // Switch context to Project B
      const sessionB = updateWorkSession(sessionA, 'ws-b', 'Project B', 5000, false);
      expect(sessionB.workspaceId).toBe('ws-b');
      expect(sessionB.workspaceName).toBe('Project B');
      expect(sessionB.startedAt).toBe(5000);
      expect(sessionB.lastActiveAt).toBe(5000);
      expect(sessionB.itemCount).toBe(0);
      expect(sessionB.id).not.toBe(sessionA.id);
    });
  });
});
