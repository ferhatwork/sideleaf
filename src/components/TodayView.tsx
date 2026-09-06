import React, { useMemo } from 'react';
import { Item, Workspace, ItemType } from '../types';
import { ItemCard } from './ItemCard';
import { QuickInput } from './QuickInput';
import { Sparkles, CheckCircle2, ArrowRight, Compass, Clock } from 'lucide-react';
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
  onNavigateToScratch,
  onNavigateToRecent,
  onNavigateToWorkspace,
}) => {
  const startOfToday = new Date().setHours(0, 0, 0, 0);

  // Active items
  const activeItems = useMemo(
    () => items.filter((i) => i.status === 'active'),
    [items]
  );

  // 1. Now: items touched or created today
  const nowItems = useMemo(
    () =>
      activeItems
        .filter((i) => i.updatedAt >= startOfToday)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 8),
    [activeItems, startOfToday]
  );

  // 2. Scratch: unassigned active items
  const scratchItems = useMemo(
    () =>
      activeItems
        .filter((i) => !i.workspaceId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5),
    [activeItems]
  );

  // 3. Next: unfinished checklist items
  const nextTasks = useMemo(
    () =>
      activeItems
        .filter((i) => i.type === 'checklist' && !i.checked)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 6),
    [activeItems]
  );

  // 4. Recent: recently touched active items (Spec 8.1 Wireframe)
  const recentItems = useMemo(
    () =>
      activeItems
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5),
    [activeItems]
  );

  // "Continue where you left off" workspace summary (Spec Section 18)
  const resumeWorkspaces = useMemo(() => {
    return workspaces
      .map((ws) => {
        const wsActive = activeItems.filter((i) => i.workspaceId === ws.id);
        const unfinished = wsActive.filter((i) => i.type === 'checklist' && !i.checked).length;
        const lastUpdated = wsActive.reduce((max, i) => Math.max(max, i.updatedAt), ws.updatedAt);
        return {
          ws,
          itemCount: wsActive.length,
          unfinished,
          lastUpdated,
        };
      })
      .filter((w) => w.itemCount > 0)
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
      .slice(0, 3);
  }, [workspaces, activeItems]);

  const completedTodayCount = useMemo(
    () =>
      items.filter(
        (i) => i.type === 'checklist' && i.checked && i.updatedAt >= startOfToday
      ).length,
    [items, startOfToday]
  );

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
      {/* Top Capture Surface with autofocus for 1-2 second capture */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Quick Capture
          </span>
          {completedTodayCount > 0 && (
            <span className="text-xs text-neutral-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {completedTodayCount} tasks completed today
            </span>
          )}
        </div>
        <QuickInput
          onAdd={onAdd}
          autoFocus={true}
          placeholder="Capture a thought, observation, URL or task... (Enter to save)"
        />
      </div>

      {/* "Continue where you left off" Surface (Spec Section 18) */}
      {resumeWorkspaces.length > 0 && (
        <div className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-workpad-dark-border bg-neutral-50/50 dark:bg-neutral-900/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              Continue where you left off
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {resumeWorkspaces.map(({ ws, itemCount, unfinished, lastUpdated }) => (
              <button
                key={ws.id}
                onClick={() => onNavigateToWorkspace(ws.id)}
                className="p-2.5 rounded-lg border border-neutral-200/60 dark:border-neutral-800 bg-white dark:bg-workpad-dark-surface hover:border-blue-400 text-left transition-colors focus-ring"
              >
                <div className="flex items-center gap-1.5 min-w-0 mb-1">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ws.color || '#3b82f6' }}
                  />
                  <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {ws.name}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  {unfinished > 0 ? `${unfinished} unfinished` : `${itemCount} items`} Â· {formatTimeAgo(lastUpdated)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeItems.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Nothing here yet.
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Start typing above. Everything else can come later.
          </p>
        </div>
      ) : (
        <>
          {/* Section: Now (Active Today) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/80 pb-1.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Now Â· Active Today
              </h2>
              <span className="text-[11px] font-mono text-neutral-400">
                {nowItems.length} items
              </span>
            </div>

            {nowItems.length === 0 ? (
              <p className="text-xs text-neutral-400 italic py-2">
                No notes touched today yet.
              </p>
            ) : (
              <div className="space-y-2">
                {nowItems.map((item) => (
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
            )}
          </section>

          {/* Section: Next (Actionable Tasks) */}
          {nextTasks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/80 pb-1.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Next Â· Actionable Tasks
                </h2>
                <span className="text-[11px] font-mono text-neutral-400">
                  {nextTasks.length} pending
                </span>
              </div>

              <div className="space-y-2">
                {nextTasks.map((item) => (
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
            </section>
          )}

          {/* Section: Scratch captures */}
          {scratchItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/80 pb-1.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Scratch Â· Unorganized
                </h2>
                <button
                  onClick={onNavigateToScratch}
                  className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 focus-ring rounded"
                >
                  <span>View all scratch</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

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
            </section>
          )}

          {/* Section: Recent (Spec 8.1 Wireframe) */}
          {recentItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/80 pb-1.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-purple-500" />
                  Recent Â· Touched Items
                </h2>
                <button
                  onClick={onNavigateToRecent}
                  className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 focus-ring rounded"
                >
                  <span>Activity stream</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {recentItems.map((item) => (
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
            </section>
          )}
        </>
      )}
    </div>
  );
};

