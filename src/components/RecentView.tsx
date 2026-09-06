import React from 'react';
import { ActivityLog, Item, Workspace } from '../types';
import { formatTimeAgo, formatDateTime } from '../utils/format';
import { Clock, CheckCircle2, FileEdit, FolderInput, Archive, Trash2, PlusCircle } from 'lucide-react';
import { useWorkpad } from '../hooks/useWorkpad';

interface RecentViewProps {
  activity: ActivityLog[];
  items: Item[];
  workspaces: Workspace[];
  onSelectItem: (item: Item) => void;
}

export const RecentView: React.FC<RecentViewProps> = ({
  activity,
  items,
  workspaces,
  onSelectItem,
}) => {
  const { t, locale } = useWorkpad();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'capture':
        return <PlusCircle className="w-3.5 h-3.5 text-blue-500" />;
      case 'toggle_task':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'convert_task':
        return <FileEdit className="w-3.5 h-3.5 text-amber-500" />;
      case 'move_workspace':
        return <FolderInput className="w-3.5 h-3.5 text-purple-500" />;
      case 'archive':
        return <Archive className="w-3.5 h-3.5 text-neutral-400" />;
      case 'delete':
        return <Trash2 className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const wsMap = new Map(workspaces.map((w) => [w.id, w]));

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-500" />
          {t.recent.title}
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          {t.recent.subtitle}
        </p>
      </div>

      {activity.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {t.recent.emptyHeading}
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {t.recent.emptySubheading}
          </p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
          {activity.map((act) => {
            const linkedItem = act.itemId ? itemMap.get(act.itemId) : null;
            const linkedWs = linkedItem?.workspaceId ? wsMap.get(linkedItem.workspaceId) : null;

            return (
              <div
                key={act.id}
                className="relative flex items-start gap-3 group"
              >
                {/* Timeline node */}
                <div className="absolute -left-6 mt-1 p-1 rounded-full bg-white dark:bg-workpad-dark-surface border border-neutral-200 dark:border-neutral-700 shadow-2xs">
                  {getActionIcon(act.action)}
                </div>

                <div
                  onClick={() => linkedItem && onSelectItem(linkedItem)}
                  className={`flex-1 p-3 rounded-lg border border-neutral-200/70 dark:border-workpad-dark-border bg-white dark:bg-workpad-dark-surface text-xs transition-colors ${
                    linkedItem ? 'cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {act.details}
                    </span>
                    <div className="flex items-center gap-2">
                      {linkedWs && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${linkedWs.color || '#3b82f6'}15`,
                            color: linkedWs.color || '#3b82f6',
                          }}
                        >
                          {linkedWs.name}
                        </span>
                      )}
                      <span
                        className="text-[11px] text-neutral-400 font-mono flex-shrink-0"
                        title={formatDateTime(act.timestamp)}
                      >
                        {formatTimeAgo(act.timestamp, locale)}
                      </span>
                    </div>
                  </div>

                  {act.itemTextPreview && (
                    <div className="mt-1 text-neutral-500 dark:text-neutral-400 truncate">
                      "{act.itemTextPreview}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
