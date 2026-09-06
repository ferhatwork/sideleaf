export type ItemType = 'text' | 'checklist' | 'quote' | 'link' | 'divider';

export type ItemStatus = 'active' | 'archived' | 'deleted';

export interface ItemSource {
  url?: string;
  title?: string;
  domain?: string;
  capturedText?: string;
  capturedAt: number;
}

export interface Item {
  id: string;
  workspaceId: string | null; // null means scratch / unassigned
  type: ItemType;
  content: string;
  checked?: boolean; // For checklist items
  status: ItemStatus;
  order: number;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
  deletedAt?: number;
  source?: ItemSource;
  tags?: string[];
}

export interface Workspace {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  quickCaptureShortcut: string;
  searchShortcut: string;
  autoSaveIntervalMs: number;
  defaultView: 'today' | 'scratch';
}

export type ActivityAction =
  | 'capture'
  | 'edit'
  | 'convert_task'
  | 'toggle_task'
  | 'move_workspace'
  | 'archive'
  | 'restore'
  | 'delete';

export interface ActivityLog {
  id: string;
  itemId?: string;
  itemTextPreview?: string;
  action: ActivityAction;
  details: string;
  timestamp: number;
}

export interface WorkpadExportData {
  schema: 'workpad-v1';
  version: '1.0.0';
  exportedAt: string;
  workspaces: Workspace[];
  items: Item[];
  settings?: UserSettings;
  activity?: ActivityLog[];
}

export type ActiveView = 
  | { type: 'today' }
  | { type: 'scratch' }
  | { type: 'workspace'; workspaceId: string }
  | { type: 'recent' }
  | { type: 'archive' }
  | { type: 'trash' };

export interface SearchResult {
  item: Item;
  score: number;
  matchedFields: string[];
  matchedSnippet: string;
}
