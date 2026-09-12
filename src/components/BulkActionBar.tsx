import React, { useState, useRef, useEffect } from 'react';
import { Section, Workspace } from '../types';
import { useSideleaf } from '../hooks/useSideleaf';
import {
  Copy,
  FolderInput,
  ChevronUp,
  Archive,
  Trash2,
  X,
} from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onCopyLinks: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  sections?: Section[];
  onMoveToSection?: (sectionId: string | null) => void;
  workspaces?: Workspace[];
  onMoveToWorkspace?: (workspaceId: string | null) => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onCopyLinks,
  onArchive,
  onDelete,
  onClearSelection,
  sections,
  onMoveToSection,
  workspaces,
  onMoveToWorkspace,
}) => {
  const { t } = useSideleaf();
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCount > 0) {
        onClearSelection();
        setShowMoveMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCount, onClearSelection]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
    };
    if (showMoveMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoveMenu]);

  if (selectedCount === 0) return null;

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label={t.bulk.selected}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-sideleaf-dark-elevated text-neutral-800 dark:text-neutral-200 rounded-lg shadow-xl px-3.5 py-2 flex items-center gap-2.5 border border-neutral-200 dark:border-neutral-700 text-xs animate-in fade-in slide-in-from-bottom-3 duration-150"
    >
      <span className="font-semibold text-xs whitespace-nowrap text-neutral-900 dark:text-neutral-100">
        {selectedCount} {t.bulk.selected}
      </span>

      <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700" />

      {/* Copy Links Action */}
      <button
        type="button"
        onClick={onCopyLinks}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors focus-ring font-medium"
        title={t.bulk.copyLinks}
        aria-label={t.bulk.copyLinks}
      >
        <Copy className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
        <span>{t.bulk.copyLinks}</span>
      </button>

      {/* Move Action (Section or Workspace) */}
      {sections && onMoveToSection && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors focus-ring font-medium"
            title={t.bulk.moveToSection}
            aria-label={t.bulk.moveToSection}
            aria-expanded={showMoveMenu}
          >
            <FolderInput className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>{t.bulk.moveToSection}</span>
            <ChevronUp className="w-3 h-3 text-neutral-400" />
          </button>

          {showMoveMenu && (
            <div className="absolute bottom-full mb-2 left-0 w-48 py-1 rounded-lg bg-white dark:bg-sideleaf-dark-elevated shadow-xl border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 z-50">
              <div className="px-3 py-1 font-semibold text-[10px] text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                {t.bulk.moveToSection}
              </div>
              <button
                type="button"
                onClick={() => {
                  onMoveToSection(null);
                  setShowMoveMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"
              >
                <span>{t.section.unsectioned}</span>
              </button>
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onMoveToSection(s.id);
                    setShowMoveMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 truncate"
                >
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!sections && workspaces && onMoveToWorkspace && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors focus-ring font-medium"
            title={t.item.moveToWorkspace}
            aria-label={t.item.moveToWorkspace}
            aria-expanded={showMoveMenu}
          >
            <FolderInput className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>{t.item.moveToWorkspace}</span>
            <ChevronUp className="w-3 h-3 text-neutral-400" />
          </button>

          {showMoveMenu && (
            <div className="absolute bottom-full mb-2 left-0 w-48 py-1 rounded-lg bg-white dark:bg-sideleaf-dark-elevated shadow-xl border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 z-50">
              <div className="px-3 py-1 font-semibold text-[10px] text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                {t.item.moveToWorkspace}
              </div>
              <button
                type="button"
                onClick={() => {
                  onMoveToWorkspace(null);
                  setShowMoveMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"
              >
                <span>{t.item.scratchOption}</span>
              </button>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    onMoveToWorkspace(w.id);
                    setShowMoveMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 truncate flex items-center gap-1.5"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: w.color || '#3b82f6' }}
                  />
                  <span className="truncate">{w.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Archive Action */}
      <button
        type="button"
        onClick={onArchive}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors focus-ring font-medium"
        title={t.bulk.archiveSelected}
        aria-label={t.bulk.archiveSelected}
      >
        <Archive className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
        <span>{t.bulk.archiveSelected}</span>
      </button>

      {/* Delete Action */}
      <button
        type="button"
        onClick={onDelete}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors focus-ring font-medium"
        title={t.bulk.deleteSelected}
        aria-label={t.bulk.deleteSelected}
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>{t.bulk.deleteSelected}</span>
      </button>

      <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700" />

      {/* Deselect / Clear Selection */}
      <button
        type="button"
        onClick={() => {
          onClearSelection();
          setShowMoveMenu(false);
        }}
        className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
        title={t.bulk.clearSelection}
        aria-label={t.bulk.clearSelection}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
