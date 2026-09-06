import React, { useMemo, useState } from 'react';
import { Item, Workspace, ItemType } from '../types';
import { ItemCard } from './ItemCard';
import { QuickInput } from './QuickInput';
import { FileEdit, Filter, ChevronDown } from 'lucide-react';

interface ScratchViewProps {
  items: Item[];
  workspaces: Workspace[];
  onAdd: (params: { content: string; type: ItemType; workspaceId?: string | null }) => Promise<unknown>;
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onToggleCheck: (id: string) => Promise<void>;
  onConvertType: (id: string, targetType: ItemType) => Promise<void>;
  onMove: (id: string, workspaceId: string | null) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ScratchView: React.FC<ScratchViewProps> = ({
  items,
  workspaces,
  onAdd,
  onUpdate,
  onToggleCheck,
  onConvertType,
  onMove,
  onArchive,
  onDelete,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(50);

  // Scratch items: unassigned (workspaceId === null) and active
  const scratchItems = useMemo(
    () =>
      items
        .filter((i) => !i.workspaceId && i.status === 'active')
        .filter((i) => (filterType === 'all' ? true : i.type === filterType))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [items, filterType]
  );

  const displayedItems = useMemo(
    () => scratchItems.slice(0, visibleCount),
    [scratchItems, visibleCount]
  );

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Header description */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-amber-500" />
            Scratch Surface
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Quick captures and unorganized thoughts. Organize when ready or keep here.
          </p>
        </div>

        {/* Filter */}
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
      </div>

      {/* Capture Input */}
      <QuickInput
        onAdd={onAdd}
        defaultWorkspaceId={null}
        placeholder="Capture to scratch... (Enter to save, Ctrl+Enter for task)"
      />

      {/* Items list */}
      {scratchItems.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Scratch is empty.
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Capture anything. Organize later.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              workspaces={workspaces}
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
          {scratchItems.length > visibleCount && (
            <div className="pt-4 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 50)}
                className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-400 inline-flex items-center gap-1.5 focus-ring"
              >
                <span>Show more ({scratchItems.length - visibleCount} remaining)</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
