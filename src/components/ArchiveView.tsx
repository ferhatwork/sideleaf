import React, { useMemo } from 'react';
import { Item, Workspace, ItemType } from '../types';
import { ItemCard } from './ItemCard';
import { Archive } from 'lucide-react';
import { useWorkpad } from '../hooks/useWorkpad';

interface ArchiveViewProps {
  items: Item[];
  workspaces: Workspace[];
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onToggleCheck: (id: string) => Promise<void>;
  onConvertType: (id: string, targetType: ItemType) => Promise<void>;
  onMove: (id: string, workspaceId: string | null) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  items,
  workspaces,
  onUpdate,
  onToggleCheck,
  onConvertType,
  onMove,
  onArchive,
  onRestore,
  onDelete,
}) => {
  const { t, locale } = useWorkpad();

  const archivedItems = useMemo(
    () =>
      items
        .filter((i) => i.status === 'archived')
        .sort((a, b) => (b.archivedAt || b.updatedAt) - (a.archivedAt || a.updatedAt)),
    [items]
  );

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Archive className="w-4 h-4 text-neutral-500" />
            {t.archive.title}
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {t.archive.subtitle}
          </p>
        </div>
        <span className="text-xs font-mono text-neutral-400">
          {archivedItems.length} {locale === 'tr' ? 'öğe' : 'items'}
        </span>
      </div>

      {archivedItems.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {t.archive.emptyHeading}
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {t.archive.emptySubheading}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {archivedItems.map((item) => (
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
              onRestore={onRestore}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

