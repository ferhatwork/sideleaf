import React, { useMemo, useState } from 'react';
import { Item, Workspace, ItemType } from '../types';
import { ItemCard } from './ItemCard';
import { QuickInput } from './QuickInput';
import { FileEdit, Filter, ChevronDown } from 'lucide-react';
import { useSideleaf } from '../hooks/useSideleaf';

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
  const { t, locale } = useSideleaf();
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

  const getFilterLabel = (filterKey: string) => {
    switch (filterKey) {
      case 'all':
        return t.types.all;
      case 'text':
        return t.types.text;
      case 'checklist':
        return t.types.tasks;
      case 'quote':
        return t.types.quote;
      case 'link':
        return t.types.link;
      case 'decision':
        return t.types.decision;
      default:
        return filterKey;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Header description */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-amber-500" />
            {t.scratch.title}
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {t.scratch.subtitle}
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-neutral-400 mr-1" />
          {['all', 'text', 'checklist', 'quote', 'link', 'decision'].map((tKey) => (
            <button
              key={tKey}
              onClick={() => {
                setFilterType(tKey);
                setVisibleCount(50);
              }}
              className={`px-2 py-0.5 rounded capitalize transition-colors focus-ring ${
                filterType === tKey
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
              }`}
            >
              {getFilterLabel(tKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Capture Input */}
      <QuickInput
        onAdd={onAdd}
        defaultWorkspaceId={null}
        placeholder={t.scratch.capturePlaceholder}
      />

      {/* Items list */}
      {scratchItems.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {t.scratch.emptyHeading}
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {t.scratch.emptySubheading}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              workspaces={workspaces}
              locale={locale}
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
                <span>
                  {t.common.showMoreRemaining(scratchItems.length - visibleCount)}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
