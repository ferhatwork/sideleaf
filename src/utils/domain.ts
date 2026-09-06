import { Item, ItemType, WorkSession, CreateItemParams } from '../types';
import { generateId } from './id';
import { extractDomain, extractUrls } from './format';

/**
 * Resolves workspace inheritance silently (Spec Section 101, 15, 58).
 * If explicit workspaceId is provided (including null for Scratch), use it.
 * If undefined, inherit the current active workspace.
 */
export function resolveWorkspaceId(
  explicitWorkspaceId: string | null | undefined,
  currentWorkspaceId: string | null
): string | null {
  return explicitWorkspaceId !== undefined ? explicitWorkspaceId : currentWorkspaceId;
}

/**
 * Creates an Item domain model with silent workspace inheritance and auto-type detection.
 */
export function createItemRecord(
  params: CreateItemParams,
  currentWorkspaceId: string | null = null,
  now: number = Date.now()
): Item {
  const content = params.content.trim();
  let determinedType: ItemType = params.type || 'text';

  // Auto-detect divider if content is "---" or "***"
  if (content === '---' || content === '***') {
    determinedType = 'divider';
  }

  // Auto-detect quote if starts with > or surrounded by quotes
  if (!params.type && (content.startsWith('>') || /^["“].*["”]$/.test(content))) {
    determinedType = 'quote';
  }

  // Auto-detect URLs if present
  const urls = extractUrls(content);
  let source = undefined;
  if (params.sourceUrl || urls.length > 0) {
    const targetUrl = params.sourceUrl || urls[0];
    source = {
      url: targetUrl,
      domain: extractDomain(targetUrl) || undefined,
      capturedAt: now,
    };

    // If content is just the URL and type was not explicitly overridden
    if ((!params.type || params.type === 'text') && urls.length === 1 && content === urls[0]) {
      determinedType = 'link';
    }
  }

  const workspaceId = resolveWorkspaceId(params.workspaceId, currentWorkspaceId);

  return {
    id: generateId('item'),
    workspaceId,
    type: determinedType,
    content,
    checked: params.checked ?? (determinedType === 'checklist' ? false : undefined),
    status: 'active',
    order: now,
    createdAt: now,
    updatedAt: now,
    source,
  };
}

/**
 * Domain mutation: converts an item into a task (checklist item).
 * Preserves previous state for non-destructive undo.
 */
export function convertToTaskMutation(
  item: Item,
  now: number = Date.now()
): {
  updatedItem: Item;
  previousType: ItemType;
  previousChecked?: boolean;
} {
  return {
    updatedItem: {
      ...item,
      type: 'checklist',
      checked: item.checked ?? false,
      updatedAt: now,
    },
    previousType: item.type,
    previousChecked: item.checked,
  };
}

/**
 * Domain mutation: reverts a task conversion to its previous type/state.
 */
export function revertTaskConversion(
  item: Item,
  previousType: ItemType,
  previousChecked?: boolean,
  now: number = Date.now()
): Item {
  return {
    ...item,
    type: previousType,
    checked: previousChecked,
    updatedAt: now,
  };
}

/**
 * Work session tracking helper (Spec Section 16).
 * Creates or updates an active WorkSession based on the context and item touches.
 */
export function updateWorkSession(
  currentSession: WorkSession | null,
  targetWorkspaceId: string | null,
  workspaceName?: string,
  now: number = Date.now(),
  isItemTouch: boolean = false
): WorkSession {
  if (!currentSession || currentSession.workspaceId !== targetWorkspaceId) {
    return {
      id: generateId('session'),
      workspaceId: targetWorkspaceId,
      workspaceName,
      startedAt: now,
      lastActiveAt: now,
      itemCount: isItemTouch ? 1 : 0,
    };
  }

  return {
    ...currentSession,
    workspaceName: workspaceName ?? currentSession.workspaceName,
    lastActiveAt: now,
    itemCount: isItemTouch ? currentSession.itemCount + 1 : currentSession.itemCount,
  };
}
