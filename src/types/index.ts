export type ItemType = 'text' | 'checklist' | 'quote' | 'link' | 'divider' | 'decision';

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

export interface WorkSession {
  id: string;
  workspaceId: string | null;
  workspaceName?: string;
  startedAt: number;
  lastActiveAt: number;
  itemCount: number;
}

export interface CreateItemParams {
  content: string;
  type?: ItemType;
  workspaceId?: string | null;
  checked?: boolean;
  sourceUrl?: string;
}

export interface UpdateItemParams {
  content?: string;
  type?: ItemType;
  workspaceId?: string | null;
  checked?: boolean;
  status?: ItemStatus;
  tags?: string[];
  archivedAt?: number;
  deletedAt?: number;
  source?: ItemSource;
  order?: number;
}

export interface ApplicationCommands {
  createItem: (params: CreateItemParams) => Promise<Item>;
  addItem: (params: CreateItemParams) => Promise<Item>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  convertToTask: (id: string) => Promise<void>;
  moveItem: (id: string, targetWorkspaceId: string | null) => Promise<void>;
  archiveItem: (id: string) => Promise<void>;
  restoreItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  softDeleteItem: (id: string) => Promise<void>;
  setCurrentWorkspace: (workspaceId: string | null) => void;
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

export type Locale = 'en' | 'tr';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  locale: Locale;
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

export interface SideleafExportData {
  schema: 'sideleaf-v1' | 'workpad-v1';
  version: '1.0.0';
  exportedAt: string;
  workspaces: Workspace[];
  items: Item[];
  settings?: UserSettings;
  activity?: ActivityLog[];
}

export type WorkpadExportData = SideleafExportData;

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
