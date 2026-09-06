import React, { useMemo, useRef } from 'react';
import { Item, Workspace, ItemType } from '../types';
import { ItemCard } from './ItemCard';
import { QuickInput, QuickInputHandle } from './QuickInput';
import { formatTimeAgo } from '../utils/format';

interface TodayViewProps {
  items: Item[];
  workspaces: Workspace[];
  onAdd: (params: { content: string; type: ItemType; workspaceId?: string | null }) => Promise<unknown>;
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onToggleCheck: (id: string) => Promise<void>;
  onConvertType: (id: string, targetType: ItemType) => Promise<void>;
  onMove: (id: string, workspaceId: string | null) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNavigateToScratch: () => void;
  onNavigateToRecent: () => void;
  onNavigateToWorkspace: (workspaceId: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  items,
  workspaces,
  onAdd,
  onUpdate,
  onToggleCheck,
  onConvertType,
  onMove,
  onArchive,
  onDelete,
  onNavigateToWorkspace,
}) => {
  const quickInputRef = useRef<QuickInputHandle>(null);
  const startOfToday = new Date().setHours(0, 0, 0, 0);

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }, []);

  // Active items
  const activeItems = useMemo(
    () => items.filter((i) => i.status === 'active'),
    [items]
  );

  // Clean stream of today's work surface items: items touched today, or active working thoughts
  const streamItems = useMemo(() => {
    const todayTouched = activeItems.filter((i) => i.updatedAt >= startOfToday);
    if (todayTouched.length > 0) {
      return todayTouched.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return [...activeItems].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 15);
  }, [activeItems, startOfToday]);

  // "Continue" workspace summary
  const resumeWorkspaces = useMemo(() => {
    return workspaces
      .map((ws) => {
        const wsActive = activeItems.filter((i) => i.workspaceId === ws.id);
        const lastUpdated = wsActive.reduce((max, i) => Math.max(max, i.updatedAt), ws.updatedAt);
        return {
          ws,
          itemCount: wsActive.length,
          lastUpdated,
        };
      })
      .filter((w) => w.itemCount > 0)
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
      .slice(0, 3);
  }, [workspaces, activeItems]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Page Title & Date Header */}
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-serif font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Today
        </h1>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
          {todayFormatted}
        </p>
      </div>

      {/* Quick Input Surface */}
      <div className="mb-6">
        <QuickInput
          ref={quickInputRef}
          onAdd={onAdd}
          placeholder="Capture something..."
        />
      </div>

      {/* Hairline Divider */}
      <div className="border-t border-neutral-200/70 dark:border-neutral-800/80 my-5" />

      {/* Clean stream of today's work surface items OR first-run empty state */}
      {activeItems.length === 0 ? (
        <div className="py-16 text-center max-w-sm mx-auto space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-serif font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
              Workpad
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              A quiet place for thoughts while you work.
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              No account. No setup.
            </p>
          </div>
          <div>
            <button
              onClick={() => quickInputRef.current?.focus()}
              className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-medium transition-colors shadow-xs focus-ring"
            >
              Start writing
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {streamItems.map((item) => (
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
              />
            ))}
          </div>

          {/* Hairline Divider & Continue Section */}
          {resumeWorkspaces.length > 0 && (
            <>
              <div className="border-t border-neutral-200/70 dark:border-neutral-800/80 my-6" />

              <div className="space-y-2 pt-1">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Continue
                </h2>
                <div className="space-y-0.5">
                  {resumeWorkspaces.map(({ ws, lastUpdated }) => (
                    <button
                      key={ws.id}
                      onClick={() => onNavigateToWorkspace(ws.id)}
                      className="w-full py-2 px-3 -mx-3 rounded-md text-left hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors flex items-center justify-between group focus-ring"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ws.color || '#3b82f6' }}
                        />
                        <span className="text-sm text-neutral-800 dark:text-neutral-200 font-medium truncate">
                          {ws.name}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono flex-shrink-0">
                        Last active {formatTimeAgo(lastUpdated)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

