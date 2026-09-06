import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Item, Workspace } from '../types';
import { searchItems } from '../services/search';
import { Search, X, ArrowUpDown, CornerDownLeft, ExternalLink, CheckSquare, FileText } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      // Return 8 most recent active items when query is empty
      return items
        .filter((i) => i.status === 'active')
        .slice(0, 8)
        .map((item) => ({
          item,
          score: 1,
          matchedFields: ['recent'],
          matchedSnippet: item.content.slice(0, 100),
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-100">
      <div
        className="w-full max-w-2xl rounded-xl border border-neutral-200 dark:border-workpad-dark-border bg-white dark:bg-workpad-dark-surface shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 gap-3">
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes, tasks, workspaces, links... (Ctrl+K)"
            className="flex-1 bg-transparent text-sm md:text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-neutral-100 dark:divide-neutral-800/40">
          {searchResults.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              No matching notes found for "{query}".
            </div>
          ) : (
            searchResults.map((res, idx) => {
              const item = res.item;
              const isSelected = idx === selectedIndex;
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
                      ? 'bg-blue-50 dark:bg-neutral-800/80 text-blue-950 dark:text-blue-200'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="mt-0.5 text-neutral-400 flex-shrink-0">
                      {item.type === 'checklist' ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : item.type === 'link' ? (
                        <ExternalLink className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1">
                        {res.matchedSnippet}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                        <span className="font-medium text-neutral-500 dark:text-neutral-400">
                          {getWorkspaceName(item.workspaceId)}
                        </span>
                        {item.status === 'archived' && (
                          <span className="px-1 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 text-[10px]">
                            Archived
                          </span>
                        )}
                        {item.source?.domain && (
                          <span className="truncate max-w-[150px] font-mono">
                            {item.source.domain}
                          </span>
                        )}
                      </div>
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
