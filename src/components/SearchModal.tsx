import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Item, Workspace } from '../types';
import { searchItems } from '../services/search';
import { formatTimeAgo } from '../utils/format';
import { Search, X, ArrowUpDown, CornerDownLeft, ExternalLink, CheckSquare, FileText, Quote, Sparkles } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  workspaces: Workspace[];
  onSelectItem: (item: Item) => void;
  activeWorkspaceId?: string | null;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  items,
  workspaces,
  onSelectItem,
  activeWorkspaceId = null,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return items
        .filter((i) => i.status === 'active')
        .slice(0, 10)
        .map((item) => ({
          item,
          score: 1,
          matchedFields: ['recent'],
          matchedSnippet: item.content.slice(0, 120),
        }));
    }
    return searchItems({
      query,
      items,
      workspaces,
      activeWorkspaceId,
      statusFilter: 'all',
      limit: 20,
    });
  }, [query, items, workspaces, activeWorkspaceId]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Focus trapping
    if (e.key === 'Tab') {
      if (!modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, searchResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        onSelectItem(searchResults[selectedIndex].item);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const getWorkspaceName = (wsId: string | null) => {
    if (!wsId) return 'Scratch';
    return workspaces.find((w) => w.id === wsId)?.name || 'Workspace';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-dialog-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl rounded-xl border border-neutral-200 dark:border-workpad-dark-border bg-white dark:bg-workpad-dark-surface shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <span id="search-dialog-title" className="sr-only">
          Search your work
        </span>

        {/* Search header */}
        <div className="flex items-center px-4 py-3 border-b border-neutral-200/80 dark:border-neutral-800 gap-3">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your work... (Ctrl+K)"
            aria-label="Search your work"
            className="flex-1 bg-transparent text-sm md:text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search query"
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded focus-ring"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-neutral-100 dark:divide-neutral-800/40">
          {searchResults.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-400 dark:text-neutral-500 space-y-1">
              <p className="font-medium text-neutral-700 dark:text-neutral-300">Nothing found.</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Try a different word or search source/title.
              </p>
            </div>
          ) : (
            searchResults.map((res, idx) => {
              const item = res.item;
              const isSelected = idx === selectedIndex;
              const firstLine = item.content.split('\n')[0] || item.content;
              const excerpt = res.matchedSnippet && res.matchedSnippet !== firstLine ? res.matchedSnippet : null;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectItem(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-950 dark:text-neutral-100'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="mt-0.5 text-neutral-400 flex-shrink-0">
                      {item.type === 'checklist' ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : item.type === 'quote' ? (
                        <Quote className="w-4 h-4" />
                      ) : item.type === 'link' ? (
                        <ExternalLink className="w-4 h-4" />
                      ) : item.type === 'decision' ? (
                        <Sparkles className="w-4 h-4 text-purple-500" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      {/* Item main line */}
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1">
                        {firstLine}
                      </p>

                      {/* Context line: Workspace · Recency */}
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                        <span className="font-medium text-neutral-600 dark:text-neutral-400">
                          {getWorkspaceName(item.workspaceId)}
                        </span>
                        <span>·</span>
                        <span>{formatTimeAgo(item.updatedAt)}</span>
                        {item.status === 'archived' && (
                          <>
                            <span>·</span>
                            <span className="px-1 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 text-[10px]">
                              Archived
                            </span>
                          </>
                        )}
                        {item.source?.domain && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[150px] font-mono">
                              {item.source.domain}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Excerpt line */}
                      {excerpt && (
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 font-mono italic line-clamp-1">
                          “{excerpt}”
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex-shrink-0 text-xs text-neutral-400 flex items-center gap-1 font-mono">
                      Jump <CornerDownLeft className="w-3 h-3" />
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> select
            </span>
          </div>
          <span>[Esc] to close</span>
        </div>
      </div>
    </div>
  );
};
