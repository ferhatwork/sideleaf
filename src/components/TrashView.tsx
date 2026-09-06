import React, { useMemo } from 'react';
import { Item, Workspace } from '../types';
import { Trash2, Undo2 } from 'lucide-react';
import { formatTimeAgo } from '../utils/format';

interface TrashViewProps {
  items: Item[];
  workspaces: Workspace[];
  onRestore: (id: string) => Promise<void>;
  onPermanentDelete: (id: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
}

export const TrashView: React.FC<TrashViewProps> = ({
  items,
  workspaces,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
}) => {
  const wsMap = useMemo(() => new Map(workspaces.map((w) => [w.id, w])), [workspaces]);

  const deletedItems = useMemo(
    () =>
      items
        .filter((i) => i.status === 'deleted')
        .sort((a, b) => (b.deletedAt || b.updatedAt) - (a.deletedAt || a.updatedAt)),
    [items]
  );

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-500" />
            Trash
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Deleted notes. You can restore them anytime or permanently erase them.
          </p>
        </div>

        {deletedItems.length > 0 && (
          <button
            onClick={onEmptyTrash}
            className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium transition-colors"
          >
            Empty Trash
          </button>
        )}
      </div>

      {deletedItems.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Trash is empty.
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Items you delete will be kept here safely before permanent removal.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {deletedItems.map((item) => {
            const originWs = item.workspaceId ? wsMap.get(item.workspaceId) : null;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-neutral-200 dark:border-workpad-dark-border bg-white dark:bg-workpad-dark-surface flex items-center justify-between gap-4 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate">
                    {item.content}
                  </p>
                  <div className="mt-1 text-neutral-400 flex items-center gap-2 text-[11px]">
                    <span>Deleted {formatTimeAgo(item.deletedAt || item.updatedAt)}</span>
                    {originWs && <span>· from {originWs.name}</span>}
                    <span>· {item.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onRestore(item.id)}
                    className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => onPermanentDelete(item.id)}
                    className="p-1 text-neutral-400 hover:text-red-500 rounded"
                    title="Permanently Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
