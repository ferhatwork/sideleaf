import React, { useMemo, useState } from 'react';
import { Item, Workspace, ItemType } from '../types';
import { ItemCard } from './ItemCard';
import { QuickInput } from './QuickInput';
import { exportWorkspaceToMarkdown, downloadMarkdownFile } from '../services/exportImport';
import { Download, Edit2, Filter, Trash2, ChevronDown } from 'lucide-react';

interface WorkspaceViewProps {
  workspace: Workspace;
  items: Item[];
  allWorkspaces: Workspace[];
  onAdd: (params: { content: string; type: ItemType; workspaceId?: string | null }) => Promise<unknown>;
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onToggleCheck: (id: string) => Promise<void>;
  onConvertType: (id: string, targetType: ItemType) => Promise<void>;
  onMove: (id: string, workspaceId: string | null) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEditWorkspace: (ws: Workspace) => void;
  onDeleteWorkspace: (id: string) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  workspace,
  items,
  allWorkspaces,
  onAdd,
  onUpdate,
  onToggleCheck,
  onConvertType,
  onMove,
  onArchive,
  onDelete,
  onEditWorkspace,
  onDeleteWorkspace,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(50);

  const workspaceItems = useMemo(
    () =>
      items
        .filter((i) => i.workspaceId === workspace.id && i.status === 'active')
        .filter((i) => (filterType === 'all' ? true : i.type === filterType))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [items, workspace.id, filterType]
  );

  const displayedItems = useMemo(
    () => workspaceItems.slice(0, visibleCount),
    [workspaceItems, visibleCount]
  );

  const handleExportMarkdown = () => {
    const md = exportWorkspaceToMarkdown(workspace.name, workspaceItems);
    const slug = workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadMarkdownFile(`${slug}.md`, md);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Workspace Header */}
      <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-workpad-dark-border bg-white dark:bg-workpad-dark-surface shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: workspace.color || '#3b82f6' }}
            />
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {workspace.name}
              </h2>
              {workspace.description ? (
                <p className="text-xs text-neutral-500 mt-0.5">{workspace.description}</p>
              ) : (
                <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                  {workspaceItems.length} active notes
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleExportMarkdown}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs flex items-center gap-1.5 focus-ring"
              title="Export workspace to Markdown (.md)"
              aria-label="Export workspace to Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export .md</span>
            </button>
            <button
              onClick={() => onEditWorkspace(workspace)}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
              title="Edit workspace"
              aria-label="Edit workspace"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
              title="Delete workspace"
              aria-label="Delete workspace"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
            <span>Delete workspace? Notes will be safely kept in Scratch.</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteWorkspace(workspace.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-2.5 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-500 focus-ring"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Input */}
      <QuickInput
        onAdd={onAdd}
        defaultWorkspaceId={workspace.id}
        placeholder={`Add note to ${workspace.name}... (Enter to save, Ctrl+Enter for task)`}
      />

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/80 pb-2">
        <div className="flex items-center gap-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-neutral-400 mr-1" />
          {['all', 'text', 'checklist', 'quote', 'link'].map((t) => (
            <button
              key={t}
              onClick={() => {
                setFilterType(t);
                setVisibleCount(50);
              }}
              className={`px-2 py-0.5 rounded capitalize transition-colors focus-ring ${
                filterType === t
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
              }`}
            >
              {t === 'checklist' ? 'Tasks' : t}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono text-neutral-400">
          {workspaceItems.length} items
        </span>
      </div>

      {/* Items list */}
      {workspaceItems.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            This workspace is empty.
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Capture thoughts into this workspace above, or move existing notes here from Scratch.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              workspaces={allWorkspaces}
              onUpdate={onUpdate}
              onToggleCheck={onToggleCheck}
              onConvertType={onConvertType}
              onMove={onMove}
              onArchive={onArchive}
              onDelete={onDelete}
              showWorkspaceBadge={false}
            />
          ))}

          {/* Large dataset pagination (Spec Section 61) */}
          {workspaceItems.length > visibleCount && (
            <div className="pt-4 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 50)}
                className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-400 inline-flex items-center gap-1.5 focus-ring"
              >
                <span>Show more ({workspaceItems.length - visibleCount} remaining)</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
