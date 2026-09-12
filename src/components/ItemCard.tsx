import React, { useState, useRef, useEffect } from 'react';
import { Item, ItemType, Workspace, Section, Locale } from '../types';
import { formatTimeAgo, extractDomain } from '../utils/format';
import { isValidUrl } from '../utils/linkParser';
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
  Layers,
  Link as LinkIcon,
} from 'lucide-react';

interface ItemCardProps {
  item: Item;
  workspaces: Workspace[];
  sections?: Section[];
  compact?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
  locale?: Locale;
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onToggleCheck: (id: string) => Promise<void>;
  onConvertType: (id: string, targetType: ItemType) => Promise<void>;
  onMove: (id: string, workspaceId: string | null) => Promise<void>;
  onMoveToSection?: (id: string, sectionId: string | null) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onRestore?: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showWorkspaceBadge?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  workspaces,
  sections = [],
  compact = false,
  isSelected = false,
  onToggleSelect,
  locale,
  onUpdate,
  onToggleCheck,
  onConvertType,
  onMove,
  onMoveToSection,
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
  const [showSectionSubmenu, setShowSectionSubmenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
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
        setShowSectionSubmenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Safe external URL check (prevents javascript: XSS)
  const isSafeUrl = (url?: string): boolean => {
    if (!url) return false;
    return /^https?:\/\//i.test(url.trim());
  };

  // Resolve link item URL and domain
  const rawUrl = item.source?.url || (isValidUrl(item.content) ? item.content.trim() : '');
  const domain = item.source?.domain || (rawUrl ? extractDomain(rawUrl) : null);
  const isLink = item.type === 'link' || Boolean(rawUrl && isSafeUrl(rawUrl));

  const saveItemContent = async (newContent: string) => {
    const trimmed = newContent.trim();
    if (trimmed !== item.content) {
      const updates: Partial<Item> = { content: trimmed };
      // If editing label of a link item whose URL was in content, migrate URL to source so it isn't lost
      if ((item.type === 'link' || isLink) && !item.source?.url && rawUrl) {
        updates.source = {
          ...item.source,
          url: rawUrl,
          domain: item.source?.domain || extractDomain(rawUrl) || undefined,
          capturedAt: item.source?.capturedAt || Date.now(),
        };
      }
      await onUpdate(item.id, updates);
    }
  };

  const handleSave = async () => {
    setIsEditing(false);
    await saveItemContent(content);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setIsEditing(false);
      await saveItemContent(content);
      if (item.type !== 'checklist') {
        await onConvertType(item.id, 'checklist');
      } else {
        await onToggleCheck(item.id);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
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

  const handleCopyRawUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rawUrl) return;
    try {
      await navigator.clipboard.writeText(rawUrl);
      setCopiedLink(true);
      setTimeout(() => {
        setCopiedLink(false);
      }, 900);
    } catch {
      // clipboard failure fallback
    }
  };

  const currentWorkspace = item.workspaceId
    ? workspaces.find((w) => w.id === item.workspaceId)
    : null;

  if (item.type === 'divider') {
    return (
      <div className={`group relative ${compact ? 'py-1.5 my-0.5' : 'py-3 my-1'} flex items-center`}>
        <div className="flex-grow border-t border-neutral-200/80 dark:border-neutral-800" />
        <div
          className={`${
            isSelected
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100'
          } transition-opacity flex items-center gap-1 pl-2`}
        >
          {onToggleSelect && (
            <button
              type="button"
              onClick={(e) => onToggleSelect(item.id, e)}
              className={`p-0.5 rounded transition-colors focus-ring ${
                isSelected
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
              title={isSelected ? t.bulk.clearSelection : t.bulk.selected}
              aria-label={isSelected ? t.bulk.clearSelection : t.bulk.selected}
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="text-neutral-400 hover:text-red-500 p-0.5 rounded focus-ring"
            aria-label={t.item.deleteAction}
            title={t.item.deleteAction}
          >
            ✕
          </button>
        </div>
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

  const renderActionMenu = () => (
    <div className="flex items-center gap-0.5">
      {onToggleSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(item.id, e);
          }}
          className={`p-1 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded focus-ring transition-colors ${
            isSelected
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
          }`}
          aria-label={isSelected ? t.bulk.clearSelection : t.bulk.selected}
          title={isSelected ? t.bulk.clearSelection : t.bulk.selected}
        >
          {isSelected ? (
            <CheckSquare className="w-3.5 h-3.5" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
            setShowMoveSubmenu(false);
            setShowSectionSubmenu(false);
          }}
          className="p-1 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 focus-ring"
          aria-label={t.common.itemOptions}
          title={t.common.itemOptions}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

      {showMenu && (
        <div
          className="absolute right-0 top-6 z-30 w-52 py-1 rounded-lg bg-white dark:bg-sideleaf-dark-elevated shadow-lg border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-200"
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

          {/* Copy Link if item has a URL */}
          {rawUrl && isSafeUrl(rawUrl) && (
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(rawUrl);
                setCopiedLink(true);
                setTimeout(() => {
                  setCopiedLink(false);
                  setShowMenu(false);
                }, 700);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
            >
              <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>{t.item.copyLink}</span>
            </button>
          )}

          {/* Move to Section (if sections exist and handler provided) */}
          {sections.length > 0 && onMoveToSection && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowSectionSubmenu(!showSectionSubmenu);
                  setShowMoveSubmenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t.bulk.moveToSection}</span>
                </span>
                <span className="text-[10px] text-neutral-400">›</span>
              </button>

              {showSectionSubmenu && (
                <div className="pl-6 py-1 bg-neutral-50 dark:bg-neutral-900/50 border-y border-neutral-100 dark:border-neutral-800 space-y-0.5">
                  <button
                    onClick={() => {
                      onMoveToSection(item.id, null);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded flex items-center justify-between"
                  >
                    <span>{t.section.unsectioned}</span>
                    {!item.sectionId && <Check className="w-3 h-3 text-blue-500" />}
                  </button>
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onMoveToSection(item.id, s.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-2 py-1 text-xs hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded truncate flex items-center justify-between"
                    >
                      <span className="truncate">{s.name}</span>
                      {item.sectionId === s.id && (
                        <Check className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Move to workspace */}
          <div className="relative">
            <button
              onClick={() => {
                setShowMoveSubmenu(!showMoveSubmenu);
                setShowSectionSubmenu(false);
              }}
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
  );

  return (
    <div
      className={`group relative rounded-lg px-3 ${
        compact ? 'py-1' : 'py-2'
      } -mx-3 transition-colors ${
        isSelected
          ? 'bg-blue-50/80 dark:bg-blue-950/30 ring-1 ring-blue-300 dark:ring-blue-800'
          : isEditing
          ? 'bg-neutral-100/70 dark:bg-sideleaf-dark-elevated shadow-xs ring-1 ring-neutral-300 dark:ring-neutral-700'
          : 'hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40'
      }`}
      onClick={(e) => {
        if ((e.ctrlKey || e.metaKey || e.shiftKey) && onToggleSelect) {
          e.preventDefault();
          e.stopPropagation();
          onToggleSelect(item.id, e);
        }
      }}
    >
      <div className={`flex items-start ${compact ? 'gap-2' : 'gap-2.5'}`}>
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
          ) : isLink && item.type === 'link' ? (
            /* Dedicated Link Item View (Spec Section 3 & 4) */
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div
                  tabIndex={0}
                  role="button"
                  aria-label={item.content ? `${t.item.editNote}: ${item.content}` : t.item.editNote}
                  onClick={() => setIsEditing(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsEditing(true);
                    }
                  }}
                  className="font-medium text-sm text-neutral-900 dark:text-neutral-100 hover:underline cursor-text select-text rounded focus-ring truncate max-w-full"
                >
                  {item.content || item.source?.title || rawUrl}
                </div>

                {domain && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-mono text-[11px] border border-neutral-200/60 dark:border-neutral-700/60">
                    {domain}
                  </span>
                )}

                {/* Fast copy link and open link buttons */}
                {rawUrl && isSafeUrl(rawUrl) && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={handleCopyRawUrl}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors focus-ring"
                      title={t.item.copyLink}
                      aria-label={t.item.copyLink}
                    >
                      {copiedLink ? (
                        <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
                          <Check className="w-3 h-3" />
                          <span>{t.common.copied}</span>
                        </span>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={rawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-neutral-400 hover:text-blue-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors focus-ring"
                      title={rawUrl}
                      aria-label={t.item.openSource}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Sub-line raw URL if different from label (omitted in compact mode to preserve compactness) */}
              {!compact && rawUrl && item.content !== rawUrl && (
                <div className="text-[11px] text-neutral-400 font-mono truncate max-w-xl">
                  {rawUrl}
                </div>
              )}
            </div>
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

          {/* Source badge if attached and not handled as full link item */}
          {item.type !== 'link' && item.source?.url && isSafeUrl(item.source.url) && (
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

          {/* Low-contrast metadata in normal mode; omitted in compact mode */}
          {!compact && (
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

              {/* Contextual menu button (⋯, visible on hover and keyboard focus; permanently visible when selected) */}
              <div
                className={`${
                  isSelected
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100'
                } transition-opacity flex items-center gap-1`}
              >
                {renderActionMenu()}
              </div>
            </div>
          )}
        </div>

        {/* Compact mode inline menu */}
        {compact && (
          <div
            className={`${
              isSelected
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100'
            } transition-opacity flex-shrink-0 self-start mt-0.5`}
          >
            {renderActionMenu()}
          </div>
        )}
      </div>
    </div>
  );
};
