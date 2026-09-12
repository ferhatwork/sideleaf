import React, { useMemo, useState } from 'react';
import { Item, Workspace } from '../types';
import { Trash2, Undo2, AlertTriangle } from 'lucide-react';
import { formatTimeAgo } from '../utils/format';
import { useSideleaf } from '../hooks/useSideleaf';

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
  const { t, locale } = useSideleaf();
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);
  const wsMap = useMemo(() => new Map(workspaces.map((w) => [w.id, w])), [workspaces]);

  const deletedItems = useMemo(
    () =>
      items
        .filter((i) => i.status === 'deleted')
        .sort((a, b) => (b.deletedAt || b.updatedAt) - (a.deletedAt || a.updatedAt)),
    [items]
  );

  const handleConfirmEmpty = async () => {
    setShowConfirmEmpty(false);
    await onEmptyTrash();
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-500" />
            {t.trash.title}
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {t.trash.subtitle}
          </p>
        </div>

        {deletedItems.length > 0 && (
          <button
            onClick={() => setShowConfirmEmpty(true)}
            className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium transition-colors focus-ring"
          >
            {t.trash.emptyTrash}
          </button>
        )}
      </div>

      {/* Confirmation Dialog before Emptying Trash (Spec Section 27) */}
      {showConfirmEmpty && (
        <div className="p-4 rounded-xl border border-red-300 dark:border-red-900/80 bg-red-50/50 dark:bg-red-950/30 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-700 dark:text-red-400">
                {t.trash.emptyConfirmPrompt}
              </div>
              <div className="text-neutral-600 dark:text-neutral-400 mt-0.5">
                {t.trash.emptyWarning}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setShowConfirmEmpty(false)}
                  className="px-3 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus-ring"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleConfirmEmpty}
                  className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium focus-ring"
                >
                  {t.trash.yesDelete}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletedItems.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {t.trash.emptyHeading}
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {t.trash.emptySubheading}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {deletedItems.map((item) => {
            const originWs = item.workspaceId ? wsMap.get(item.workspaceId) : null;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-neutral-200 dark:border-sideleaf-dark-border bg-white dark:bg-sideleaf-dark-surface flex items-center justify-between gap-4 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate">
                    {item.content}
                  </p>
                  <div className="mt-1 text-neutral-400 flex items-center gap-2 text-[11px]">
                    <span>
                      {t.trash.deletedTimeAgo(formatTimeAgo(item.deletedAt || item.updatedAt, locale))}
                    </span>
                    {originWs && (
                      <span>
                        · {t.workspace.fromWorkspace(originWs.name)}
                      </span>
                    )}
                    <span>· {t.types[item.type as keyof typeof t.types] || item.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onRestore(item.id)}
                    className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium flex items-center gap-1 transition-colors focus-ring"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    {t.trash.restore}
                  </button>
                  <button
                    onClick={() => onPermanentDelete(item.id)}
                    className="p-1 text-neutral-400 hover:text-red-500 rounded focus-ring"
                    title={t.trash.permanentDelete}
                    aria-label={t.trash.permanentDelete}
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
