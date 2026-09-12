import React, { useMemo, useState, useEffect } from 'react';
import { Item, Workspace, ItemType, BulkParseResult } from '../types';
import { ItemCard } from './ItemCard';
import { QuickInput } from './QuickInput';
import { exportWorkspaceToMarkdown, downloadMarkdownFile } from '../services/exportImport';
import { extractRawUrls } from '../utils/linkParser';
import { toggleGroupSelectionState, reconcileSelectionState } from '../utils/domain';
import { BulkActionBar } from './BulkActionBar';
import { GroupSelectButton } from './GroupSelectButton';
import {
  Download,
  Edit2,
  Filter,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  LayoutList,
  AlignJustify,
  Layers,
  Link as LinkIcon,
  ChevronUp,
} from 'lucide-react';
import { useSideleaf } from '../hooks/useSideleaf';

interface WorkspaceViewProps {
  workspace: Workspace;
  items: Item[];
  allWorkspaces: Workspace[];
  onAdd: (params: {
    content: string;
    type: ItemType;
    workspaceId?: string | null;
    sectionId?: string | null;
    sourceUrl?: string;
    sourceTitle?: string;
  }) => Promise<unknown>;
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onToggleCheck: (id: string) => Promise<void>;
  onConvertType: (id: string, targetType: ItemType) => Promise<void>;
  onMove: (id: string, workspaceId: string | null) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEditWorkspace: (ws: Workspace) => void;
  onDeleteWorkspace: (id: string) => void;
  ephemeralRevealedSectionId?: string | null;
  onClearEphemeralReveal?: () => void;
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
  ephemeralRevealedSectionId,
  onClearEphemeralReveal,
}) => {
  const {
    t,
    locale,
    sections,
    createSection,
    updateSection,
    toggleSectionCollapse,
    deleteSection,
    reorderSections,
    moveItemToSection,
    updateWorkspaceViewMode,
    bulkMoveItems,
    bulkArchiveItems,
    bulkDeleteItems,
    addBulkItems,
    triggerToast,
  } = useSideleaf();

  const [filterType, setFilterType] = useState<string>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(50);

  // Section states
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [deleteSectionConfirmId, setDeleteSectionConfirmId] = useState<string | null>(null);
  const [activeSectionAddId, setActiveSectionAddId] = useState<string | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Multi-link modal state
  const [multiLinkPrompt, setMultiLinkPrompt] = useState<{
    result: BulkParseResult;
    sectionId: string | null;
  } | null>(null);

  const isCompact = workspace.viewMode === 'compact';

  // Current workspace sections ordered by order
  const currentSections = useMemo(
    () =>
      sections
        .filter((s) => s.workspaceId === workspace.id)
        .sort((a, b) => a.order - b.order),
    [sections, workspace.id]
  );

  // All active items in this workspace matching current filter
  const workspaceItems = useMemo(
    () =>
      items
        .filter((i) => i.workspaceId === workspace.id && i.status === 'active')
        .filter((i) => (filterType === 'all' ? true : i.type === filterType))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [items, workspace.id, filterType]
  );

  // Clear selection and ephemeral search reveal if current workspace changes
  useEffect(() => {
    setSelectedIds(new Set());
    onClearEphemeralReveal?.();
  }, [workspace.id, onClearEphemeralReveal]);

  // Reconcile selection if items are archived/deleted/filtered out
  useEffect(() => {
    setSelectedIds((prev) => reconcileSelectionState(prev, workspaceItems.map((i) => i.id)));
  }, [workspaceItems]);

  // Group-level selection toggle
  const handleToggleGroup = (ids: string[]) => {
    setSelectedIds((prev) => toggleGroupSelectionState(prev, ids));
  };

  const handleToggleViewMode = async () => {
    const nextMode = isCompact ? 'normal' : 'compact';
    await updateWorkspaceViewMode(workspace.id, nextMode);
  };

  const handleExportMarkdown = () => {
    const md = exportWorkspaceToMarkdown(workspace.name, workspaceItems, currentSections);
    const slug = workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadMarkdownFile(`${slug}.md`, md);
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSectionName.trim();
    if (!trimmed) return;
    await createSection(workspace.id, trimmed);
    setNewSectionName('');
    setIsCreatingSection(false);
  };

  const handleSaveSectionRename = async (sectionId: string) => {
    const trimmed = editingSectionName.trim();
    if (trimmed) {
      await updateSection(sectionId, { name: trimmed });
    }
    setEditingSectionId(null);
  };

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSections.length) return;

    const ordered = [...currentSections];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(targetIndex, 0, moved);

    await reorderSections(
      workspace.id,
      ordered.map((s) => s.id)
    );
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Bulk actions
  const selectedItems = useMemo(
    () => workspaceItems.filter((it) => selectedIds.has(it.id)),
    [workspaceItems, selectedIds]
  );

  const handleBulkCopyLinks = async () => {
    const rawUrls = extractRawUrls(selectedItems);
    if (!rawUrls) {
      triggerToast(t.bulk.noLinksSelected);
      return;
    }
    await navigator.clipboard.writeText(rawUrls);
    const count = rawUrls.split('\n').filter(Boolean).length;
    triggerToast(`${count} ${t.bulk.copyLinksSuccess}`);
  };

  const handleBulkMove = async (targetSectionId: string | null) => {
    const ids = Array.from(selectedIds);
    await bulkMoveItems(ids, targetSectionId);
    setSelectedIds(new Set());
  };

  const handleBulkArchive = async () => {
    const ids = Array.from(selectedIds);
    await bulkArchiveItems(ids);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await bulkDeleteItems(ids);
    setSelectedIds(new Set());
  };

  const handleAddSeparateLinks = async () => {
    if (!multiLinkPrompt) return;
    const { result, sectionId } = multiLinkPrompt;
    await addBulkItems(
      result.links.map((link) => ({
        content: link.title || link.url,
        type: 'link',
        workspaceId: workspace.id,
        sectionId: sectionId || undefined,
        sourceUrl: link.url,
        sourceTitle: link.title,
      }))
    );
    setMultiLinkPrompt(null);
  };

  const handlePasteAsText = async () => {
    if (!multiLinkPrompt) return;
    const { result, sectionId } = multiLinkPrompt;
    await onAdd({
      content: result.originalText,
      type: 'text',
      workspaceId: workspace.id,
      sectionId: sectionId || undefined,
    });
    setMultiLinkPrompt(null);
  };

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

  // Group items by sections if sections exist
  const unsectionedItems = useMemo(() => {
    const validSectionIds = new Set(currentSections.map((s) => s.id));
    return workspaceItems.filter((i) => !i.sectionId || !validSectionIds.has(i.sectionId));
  }, [workspaceItems, currentSections]);

  const handleToggleSectionCollapse = (sectionId: string) => {
    if (sectionId === ephemeralRevealedSectionId) {
      onClearEphemeralReveal?.();
    }
    toggleSectionCollapse(sectionId);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Workspace Header */}
      <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-sideleaf-dark-border bg-white dark:bg-sideleaf-dark-surface shadow-xs">
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
                  {workspaceItems.length} {t.workspace.activeNotes}
                  {currentSections.length > 0 && ` · ${currentSections.length} ${t.section.itemCount}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* View Mode Toggle Button: Normal vs Compact */}
            <button
              onClick={handleToggleViewMode}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 focus-ring transition-colors ${
                isCompact
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title={isCompact ? t.bulk.viewModeNormal : t.bulk.viewModeCompact}
              aria-label={isCompact ? t.bulk.viewModeNormal : t.bulk.viewModeCompact}
            >
              {isCompact ? (
                <AlignJustify className="w-3.5 h-3.5" />
              ) : (
                <LayoutList className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isCompact ? t.bulk.viewModeCompact : t.bulk.viewModeNormal}
              </span>
            </button>

            {/* Export Markdown */}
            <button
              onClick={handleExportMarkdown}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs flex items-center gap-1.5 focus-ring"
              title={`${t.workspace.exportMarkdown} (.md)`}
              aria-label={t.workspace.exportMarkdown}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.workspace.exportMarkdown}</span>
            </button>

            {/* Edit Workspace */}
            <button
              onClick={() => onEditWorkspace(workspace)}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
              title={t.workspace.editWorkspace}
              aria-label={t.workspace.editWorkspace}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {/* Delete Workspace */}
            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
              title={t.workspace.deleteWorkspace}
              aria-label={t.workspace.deleteWorkspace}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
            <span>{t.workspace.deleteConfirmPrompt}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={() => {
                  onDeleteWorkspace(workspace.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-2.5 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-500 focus-ring"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Link Paste Confirmation Banner */}
      {multiLinkPrompt && (
        <div className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-sideleaf-dark-border bg-white dark:bg-sideleaf-dark-surface shadow-xs space-y-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-800 dark:text-neutral-200">
            <LinkIcon className="w-4 h-4 text-blue-500" />
            <span>
              {multiLinkPrompt.result.links.length} {t.bulk.linksDetected}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAddSeparateLinks}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium focus-ring shadow-xs"
            >
              {t.bulk.addAsSeparateLinks}
            </button>
            <button
              type="button"
              onClick={handlePasteAsText}
              className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 text-xs focus-ring"
            >
              {t.bulk.pasteAsText}
            </button>
            <button
              type="button"
              onClick={() => setMultiLinkPrompt(null)}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 px-2 py-1"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Primary Quick Input */}
      <QuickInput
        onAdd={onAdd}
        defaultWorkspaceId={workspace.id}
        placeholder={t.workspace.capturePlaceholder}
        onMultiLinkDetected={(res) => setMultiLinkPrompt({ result: res, sectionId: null })}
      />

      {/* Filter Tabs & Section Management Header */}
      <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/80 pb-2">
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreatingSection(true)}
            className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-ring"
            title={t.section.addSection}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.section.addSection}</span>
          </button>

          {currentSections.length === 0 && workspaceItems.length > 0 && (
            <GroupSelectButton
              itemIds={workspaceItems.map((i) => i.id)}
              selectedIds={selectedIds}
              onToggle={handleToggleGroup}
              selectAllLabel={t.bulk.selectAll}
              clearSelectionLabel={t.bulk.clearSelection}
            />
          )}

          <span className="text-[11px] font-mono text-neutral-400">
            {workspaceItems.length} {t.common.items}
          </span>
        </div>
      </div>

      {/* Create Section Inline Form */}
      {isCreatingSection && (
        <form
          onSubmit={handleCreateSection}
          className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-sideleaf-dark-elevated flex items-center gap-2"
        >
          <Layers className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder={t.section.section}
            className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newSectionName.trim()}
            className="px-2.5 py-1 rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-xs font-medium disabled:opacity-40"
          >
            {t.common.save}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreatingSection(false);
              setNewSectionName('');
            }}
            className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-600 rounded"
          >
            {t.common.cancel}
          </button>
        </form>
      )}

      {/* Workspace Content: Empty State vs Flat List vs Sectioned View */}
      {workspaceItems.length === 0 && currentSections.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {t.workspace.emptyHeading}
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {t.workspace.emptySubheading}
          </p>
        </div>
      ) : currentSections.length === 0 ? (
        /* Flat List (When no sections exist) */
        <div className={isCompact ? 'space-y-1' : 'space-y-2'}>
          {workspaceItems.slice(0, visibleCount).map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              workspaces={allWorkspaces}
              sections={currentSections}
              compact={isCompact}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={handleToggleSelect}
              locale={locale}
              onUpdate={onUpdate}
              onToggleCheck={onToggleCheck}
              onConvertType={onConvertType}
              onMove={onMove}
              onMoveToSection={(itemId, secId) => moveItemToSection(itemId, secId)}
              onArchive={onArchive}
              onDelete={onDelete}
              showWorkspaceBadge={false}
            />
          ))}
        </div>
      ) : (
        /* Sectioned View: Render sections even when workspace has zero items */
        <div className="space-y-6">
          {/* Unsectioned Items (rendered only if unsectioned items exist) */}
          {unsectionedItems.length > 0 && (
            <div className="group space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500 font-medium pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500">
                    {t.section.unsectioned}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                    ({unsectionedItems.length})
                  </span>
                </div>

                <GroupSelectButton
                  itemIds={unsectionedItems.map((i) => i.id)}
                  selectedIds={selectedIds}
                  onToggle={handleToggleGroup}
                  selectAllLabel={t.bulk.selectAll}
                  clearSelectionLabel={t.bulk.clearSelection}
                />
              </div>

              <div className={isCompact ? 'space-y-1' : 'space-y-2'}>
                {unsectionedItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    workspaces={allWorkspaces}
                    sections={currentSections}
                    compact={isCompact}
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={handleToggleSelect}
                    locale={locale}
                    onUpdate={onUpdate}
                    onToggleCheck={onToggleCheck}
                    onConvertType={onConvertType}
                    onMove={onMove}
                    onMoveToSection={(itemId, secId) => moveItemToSection(itemId, secId)}
                    onArchive={onArchive}
                    onDelete={onDelete}
                    showWorkspaceBadge={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sections List */}
          {currentSections.map((section, sIdx) => {
            const sectionItems = workspaceItems.filter((i) => i.sectionId === section.id);
            const isTemporarilyRevealed = section.id === ephemeralRevealedSectionId;
            const isCollapsed = isTemporarilyRevealed ? false : Boolean(section.collapsed);

            return (
              <div key={section.id} className="group/sec space-y-2">
                {/* Section Heading - clean paper-like typography without box borders */}
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800/60">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSectionCollapse(section.id)}
                      className="p-0.5 -ml-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded focus-ring"
                      aria-label={isCollapsed ? t.section.expandSection : t.section.collapseSection}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {editingSectionId === section.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        onBlur={() => handleSaveSectionRename(section.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSectionRename(section.id);
                          if (e.key === 'Escape') setEditingSectionId(null);
                        }}
                        className="bg-white dark:bg-sideleaf-dark-elevated text-xs font-semibold px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                      />
                    ) : (
                      <h3
                        onClick={() => handleToggleSectionCollapse(section.id)}
                        onDoubleClick={() => {
                          setEditingSectionId(section.id);
                          setEditingSectionName(section.name);
                        }}
                        className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer select-none truncate hover:text-neutral-950 dark:hover:text-white"
                        title={section.name}
                      >
                        {section.name}
                      </h3>
                    )}

                    <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                      {sectionItems.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isCollapsed && sectionItems.length > 0 && (
                      <GroupSelectButton
                        itemIds={sectionItems.map((i) => i.id)}
                        selectedIds={selectedIds}
                        onToggle={handleToggleGroup}
                        selectAllLabel={t.bulk.selectAll}
                        clearSelectionLabel={t.bulk.clearSelection}
                      />
                    )}

                    {/* Section actions: subtle, visible on hover or focus-within */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/sec:opacity-100 group-focus-within/sec:opacity-100 transition-opacity">
                    {/* Add Here */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSectionAddId(
                          activeSectionAddId === section.id ? null : section.id
                        )
                      }
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs flex items-center gap-1 focus-ring"
                      title={t.section.addHere}
                    >
                      <Plus className="w-3 h-3" />
                      <span className="text-[10px] hidden sm:inline">{t.section.addHere}</span>
                    </button>

                    {/* Move Up / Down */}
                    {sIdx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMoveSection(sIdx, 'up')}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
                        title={t.section.moveSectionUp}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                    )}
                    {sIdx < currentSections.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMoveSection(sIdx, 'down')}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
                        title={t.section.moveSectionDown}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    )}

                    {/* Rename button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSectionId(section.id);
                        setEditingSectionName(section.name);
                      }}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
                      title={t.section.renameSection}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setDeleteSectionConfirmId(section.id)}
                      className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
                      title={t.section.deleteSection}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

                {/* Section Delete Confirmation */}
                {deleteSectionConfirmId === section.id && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                    <span>{t.section.deleteConfirmPrompt}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeleteSectionConfirmId(null)}
                        className="px-2 py-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 focus-ring"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        onClick={async () => {
                          await deleteSection(section.id);
                          setDeleteSectionConfirmId(null);
                        }}
                        className="px-2 py-0.5 rounded bg-red-600 text-white font-medium hover:bg-red-500 focus-ring"
                      >
                        {t.common.delete}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Section Add Input */}
                {activeSectionAddId === section.id && (
                  <div className="py-1">
                    <QuickInput
                      autoFocus
                      defaultWorkspaceId={workspace.id}
                      defaultSectionId={section.id}
                      placeholder={`${t.section.addHere}: ${section.name}`}
                      onAdd={async (params) => {
                        await onAdd({ ...params, sectionId: section.id });
                        setActiveSectionAddId(null);
                      }}
                      onMultiLinkDetected={(res) =>
                        setMultiLinkPrompt({ result: res, sectionId: section.id })
                      }
                    />
                  </div>
                )}

                {/* Section Items (hidden if collapsed) */}
                {!isCollapsed && (
                  <div className={isCompact ? 'space-y-1' : 'space-y-2'}>
                    {sectionItems.length === 0 ? (
                      <div className="py-1.5 flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                        <span className="italic">{t.common.empty}...</span>
                        <button
                          type="button"
                          onClick={() => setActiveSectionAddId(section.id)}
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{t.section.addHere}</span>
                        </button>
                      </div>
                    ) : (
                      sectionItems.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          workspaces={allWorkspaces}
                          sections={currentSections}
                          compact={isCompact}
                          isSelected={selectedIds.has(item.id)}
                          onToggleSelect={handleToggleSelect}
                          locale={locale}
                          onUpdate={onUpdate}
                          onToggleCheck={onToggleCheck}
                          onConvertType={onConvertType}
                          onMove={onMove}
                          onMoveToSection={(itemId, secId) => moveItemToSection(itemId, secId)}
                          onArchive={onArchive}
                          onDelete={onDelete}
                          showWorkspaceBadge={false}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination (Spec Section 61) */}
      {workspaceItems.length > visibleCount && (
        <div className="pt-4 text-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 50)}
            className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-400 inline-flex items-center gap-1.5 focus-ring"
          >
            <span>
              {t.common.showMoreRemaining(workspaceItems.length - visibleCount)}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onCopyLinks={handleBulkCopyLinks}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        sections={currentSections}
        onMoveToSection={handleBulkMove}
      />
    </div>
  );
};
