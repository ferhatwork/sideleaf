import React, { useMemo, useState } from 'react';
import { Item, Workspace, ItemType } from '../types';
import { ItemCard } from './ItemCard';
import { QuickInput } from './QuickInput';
import { FileEdit, Filter } from 'lucide-react';

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

  // Scratch items: unassigned (workspaceId === null) and active
  const scratchItems = useMemo(
    () =>
      items
        .filter((i) => !i.workspaceId && i.status === 'active')
        .filter((i) => (filterType === 'all' ? true : i.type === filterType))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [items, filterType]
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
            Quick notes, ambiguous thoughts, temporary links. Organize when ready or keep here.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-neutral-400 mr-1" />
          {['all', 'text', 'checklist', 'quote', 'link'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2 py-0.5 rounded capitalize transition-colors ${
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
        placeholder="Capture to scratch... (Enter to save)"
      />

      {/* Items list */}
      {scratchItems.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Scratch is empty.
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Capture anything. Sort it later.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {scratchItems.map((item) => (
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
        </div>
      )}
    </div>
  );
};
