import React, { useState, useRef, useEffect } from 'react';
import { Item, ItemType, Workspace, Locale } from '../types';
import { formatTimeAgo, extractDomain } from '../utils/format';
import { useSideleaf } from '../hooks/useSideleaf';
import {
  CheckSquare,
  Square,
  MoreHorizontal,
  ExternalLink,
  Archive,
  Trash2,
  FolderInput,
  Type,
  Copy,
  Check,
  Quote,
  Sparkles,
} from 'lucide-react';

interface ItemCardProps {
  item: Item;
  workspaces: Workspace[];
  locale?: Locale;
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onToggleCheck: (id: string) => Promise<void>;
  onConvertType: (id: string, targetType: ItemType) => Promise<void>;
  onMove: (id: string, workspaceId: string | null) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onRestore?: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showWorkspaceBadge?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  workspaces,
  locale,
  onUpdate,
  onToggleCheck,
  onConvertType,
  onMove,
  onArchive,
  onRestore,
  onDelete,
  showWorkspaceBadge = true,
}) => {
  const { t, locale: ctxLocale } = useSideleaf();
  const activeLocale = locale || ctxLocale || 'en';

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(item.content);
  const [showMenu, setShowMenu] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContent(item.content);
  }, [item.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowMoveSubmenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleSave = async () => {
    setIsEditing(false);
    const trimmed = content.trim();
    if (trimmed !== item.content) {
      await onUpdate(item.id, { content: trimmed });
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const trimmed = content.trim();
      setIsEditing(false);
      if (trimmed !== item.content) {
        await onUpdate(item.id, { content: trimmed });
      }
      if (item.type !== 'checklist') {
        await onConvertType(item.id, 'checklist');
      } else {
        await onToggleCheck(item.id);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Save on plain enter if single-line or normal submission
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setContent(item.content);
      setIsEditing(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 700);
    } catch {
      setShowMenu(false);
    }
  };

  // Safe external URL check (prevents javascript: XSS)
  const isSafeUrl = (url?: string): boolean => {
    if (!url) return false;
    return /^https?:\/\//i.test(url.trim());
  };

  const currentWorkspace = item.workspaceId
    ? workspaces.find((w) => w.id === item.workspaceId)
    : null;

  if (item.type === 'divider') {
    return (
      <div className="group relative py-3 my-1 flex items-center">
        <div className="flex-grow border-t border-neutral-200/80 dark:border-neutral-800" />
        <button
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 text-neutral-400 hover:text-red-500 px-2 text-xs rounded focus-ring transition-opacity"
          aria-label={t.item.deleteAction}
          title={t.item.deleteAction}
        >
          ✕
        </button>
      </div>
    );
  }

  // Render text with hashtags highlighted
  const renderFormattedText = (text: string) => {
    if (!text) return <span className="text-neutral-400 italic">{t.common.empty}...</span>;

    const parts = text.split(/(#[a-zA-Z0-9_-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span
            key={index}
            className="text-blue-600 dark:text-blue-400 font-mono text-[13px] hover:underline"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`group relative rounded-lg px-3 py-2 -mx-3 transition-colors ${
        isEditing
          ? 'bg-neutral-100/70 dark:bg-sideleaf-dark-elevated shadow-xs ring-1 ring-neutral-300 dark:ring-neutral-700'
          : 'hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Checkbox for tasks */}
        {item.type === 'checklist' && (
          <button
            onClick={() => onToggleCheck(item.id)}
            className="mt-0.5 text-neutral-400 hover:text-blue-500 transition-colors focus-ring rounded"
            aria-label={item.checked ? t.item.markIncomplete : t.item.markComplete}
          >
            {item.checked ? (
              <CheckSquare className="w-4 h-4 text-blue-500" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Content area: inline edit or formatted view */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent resize-none text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 focus:outline-none"
              rows={1}
            />
          ) : (
            <div
              tabIndex={0}
              role="button"
              aria-label={item.content ? `${t.item.editNote}: ${item.content.slice(0, 50)}` : t.item.editNote}
              onClick={() => setIsEditing(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsEditing(true);
                }
              }}
              className={`text-sm leading-relaxed cursor-text break-words select-text rounded focus-ring ${
                item.checked
                  ? 'line-through text-neutral-400 dark:text-neutral-500'
                  : item.type === 'quote'
                  ? 'border-l-2 border-neutral-300 dark:border-neutral-700 pl-3 italic font-serif text-neutral-700 dark:text-neutral-300'
                  : 'text-neutral-900 dark:text-neutral-100'
              }`}
            >
              {item.type === 'decision' && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50 mr-2 align-middle">
                  {t.item.decisionBadge}
                </span>
              )}
              {renderFormattedText(item.content)}
            </div>
          )}

          {/* Source badge if attached and safe */}
          {item.source?.url && isSafeUrl(item.source.url) && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100/80 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-mono text-[11px]">
                {item.source.domain || extractDomain(item.source.url) || t.item.sourceLabel}
              </span>
              <a
                href={item.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-500 inline-flex items-center gap-0.5 transition-colors focus-ring rounded"
                title={item.source.url}
                aria-label={t.item.openSource}
              >
                <span>{t.item.openSource}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {item.source.title && (
                <span className="truncate max-w-[200px] text-neutral-400">
                  · {item.source.title}
                </span>
              )}
            </div>
          )}

          {/* Low-contrast metadata: e.g. 8 min ago · Website Redesign */}
          <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
            <div className="flex items-center gap-1.5">
              <span>{formatTimeAgo(item.updatedAt, activeLocale)}</span>
              {showWorkspaceBadge && (
                <>
                  <span>·</span>
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                    {currentWorkspace ? currentWorkspace.name : t.item.scratchOption}
                  </span>
                </>
              )}
            </div>

            {/* Contextual menu button (⋯, visible on hover and keyboard focus) */}
            <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity flex items-center">
              <div className="relative" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                    setShowMoveSubmenu(false);
                  }}
                  className="p-1 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 focus-ring"
                  aria-label="Item options"
                  title="Item options"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>

                {showMenu && (
                  <div
                    className="absolute right-0 top-6 z-30 w-48 py-1 rounded-lg bg-white dark:bg-sideleaf-dark-elevated shadow-lg border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Convert to task / Convert to note */}
                    {item.type !== 'checklist' ? (
                      <button
                        onClick={() => {
                          onConvertType(item.id, 'checklist');
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                        <span>{t.item.convertToTask}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onConvertType(item.id, 'text');
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                      >
                        <Type className="w-3.5 h-3.5" />
                        <span>{t.item.convertToNote}</span>
                      </button>
                    )}

                    {/* Copy text */}
                    <button
                      onClick={handleCopyText}
                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">{t.common.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{t.item.copyText}</span>
                        </>
                      )}
                    </button>

                    {/* Move to workspace */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMoveSubmenu(!showMoveSubmenu)}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <FolderInput className="w-3.5 h-3.5" />
                          <span>{t.item.moveToWorkspace}</span>
                        </span>
                        <span className="text-[10px] text-neutral-400">›</span>
                      </button>

                      {showMoveSubmenu && (
                        <div className="pl-6 py-1 bg-neutral-50 dark:bg-neutral-900/50 border-y border-neutral-100 dark:border-neutral-800 space-y-0.5">
                          <button
                            onClick={() => {
                              onMove(item.id, null);
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-2 py-1 text-xs hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded"
                          >
                            {t.item.scratchOption}
                          </button>
                          {workspaces.map((w) => (
                            <button
                              key={w.id}
                              onClick={() => {
                                onMove(item.id, w.id);
                                setShowMenu(false);
                              }}
                              className="w-full text-left px-2 py-1 text-xs hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded truncate flex items-center gap-1.5"
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

                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                    {/* Secondary type conversions */}
                    {item.type !== 'quote' && (
                      <button
                        onClick={() => {
                          onConvertType(item.id, 'quote');
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-500"
                      >
                        <Quote className="w-3.5 h-3.5" />
                        <span>{t.item.convertToQuote}</span>
                      </button>
                    )}

                    {item.type !== 'decision' && (
                      <button
                        onClick={() => {
                          onConvertType(item.id, 'decision');
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-500"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        <span>{t.item.convertToDecision}</span>
                      </button>
                    )}

                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                    {/* Archive / Restore */}
                    {item.status === 'archived' && onRestore ? (
                      <button
                        onClick={() => {
                          onRestore(item.id);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-blue-600 dark:text-blue-400"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>{t.item.restoreAction}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onArchive(item.id);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-600 dark:text-neutral-300"
                        title={t.item.archiveAction}
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>{t.item.archiveAction}</span>
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => {
                        onDelete(item.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.item.deleteAction}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
