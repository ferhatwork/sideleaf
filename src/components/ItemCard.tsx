import React, { useState, useRef, useEffect } from 'react';
import { Item, ItemType, Workspace } from '../types';
import { formatTimeAgo, extractDomain } from '../utils/format';
import {
  CheckSquare,
  Square,
  MoreVertical,
  ExternalLink,
  Archive,
  Trash2,
  FolderInput,
  Type,
  ListTodo,
  Quote,
  Link2,
  Minus,
} from 'lucide-react';

interface ItemCardProps {
  item: Item;
  workspaces: Workspace[];
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
  onUpdate,
  onToggleCheck,
  onConvertType,
  onMove,
  onArchive,
  onRestore,
  onDelete,
  showWorkspaceBadge = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(item.content);
  const [showMenu, setShowMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContent(item.content);
  }, [item.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto adjust height
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowWorkspaceMenu(false);
      }
    };
    if (showMenu || showWorkspaceMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu, showWorkspaceMenu]);

  const handleSave = async () => {
    setIsEditing(false);
    if (content.trim() !== item.content) {
      await onUpdate(item.id, { content: content.trim() });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      // If ctrl+enter in item, toggle task or convert
      if (item.type !== 'checklist') {
        onConvertType(item.id, 'checklist');
      } else {
        onToggleCheck(item.id);
      }
      handleSave();
    } else if (e.key === 'Escape') {
      setContent(item.content);
      setIsEditing(false);
    }
  };

  const currentWorkspace = item.workspaceId
    ? workspaces.find((w) => w.id === item.workspaceId)
    : null;

  if (item.type === 'divider') {
    return (
      <div className="group relative py-2 flex items-center">
        <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800" />
        <button
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 px-2 text-xs"
          title="Remove divider"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group relative rounded-lg border transition-all duration-150 p-3.5 bg-white dark:bg-workpad-dark-surface hover:border-neutral-300 dark:hover:border-neutral-700 ${
        item.checked
          ? 'opacity-60 border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30'
          : 'border-neutral-200/80 dark:border-workpad-dark-border'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Checklist checkbox */}
        {item.type === 'checklist' && (
          <button
            onClick={() => onToggleCheck(item.id)}
            className="mt-0.5 text-neutral-400 hover:text-blue-500 dark:text-neutral-500 dark:hover:text-blue-400 focus-ring rounded"
            aria-label={item.checked ? 'Mark as incomplete' : 'Mark as completed'}
          >
            {item.checked ? (
              <CheckSquare className="w-4 h-4 text-blue-500" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Quote indicator */}
        {item.type === 'quote' && (
          <div className="w-1 self-stretch bg-neutral-300 dark:bg-neutral-700 rounded-full my-0.5" />
        )}

        {/* Content body */}
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
              onClick={() => setIsEditing(true)}
              className={`text-sm leading-relaxed cursor-text break-words select-text ${
                item.checked
                  ? 'line-through text-neutral-400 dark:text-neutral-500'
                  : item.type === 'quote'
                  ? 'italic text-neutral-700 dark:text-neutral-300 font-serif'
                  : 'text-neutral-900 dark:text-neutral-100'
              }`}
            >
              {item.content || <span className="text-neutral-400 italic">Empty item...</span>}
            </div>
          )}

          {/* Source badge if attached */}
          {item.source?.url && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-mono text-[11px]">
                <Link2 className="w-3 h-3" />
                {item.source.domain || extractDomain(item.source.url) || 'source'}
              </span>
              <a
                href={item.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-500 inline-flex items-center gap-0.5 transition-colors"
                title={item.source.url}
              >
                <span>Open</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {item.source.title && (
                <span className="truncate max-w-[200px] text-neutral-400">
                  · {item.source.title}
                </span>
              )}
            </div>
          )}

          {/* Metadata bar */}
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
            <div className="flex items-center gap-2">
              <span>{formatTimeAgo(item.updatedAt)}</span>

              {showWorkspaceBadge && currentWorkspace && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: `${currentWorkspace.color || '#3b82f6'}15`,
                    color: currentWorkspace.color || '#3b82f6',
                  }}
                >
                  {currentWorkspace.name}
                </span>
              )}

              {showWorkspaceBadge && !currentWorkspace && (
                <span className="text-neutral-400 dark:text-neutral-600 text-[10px]">
                  Scratch
                </span>
              )}
            </div>

            {/* Quick action buttons on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {item.type !== 'checklist' && (
                <button
                  onClick={() => onConvertType(item.id, 'checklist')}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  title="Turn into task"
                >
                  <ListTodo className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  aria-label="Item options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-6 z-30 w-48 py-1 rounded-md bg-white dark:bg-workpad-dark-elevated shadow-lg border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-200">
                    <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                      Convert Type
                    </div>
                    <button
                      onClick={() => {
                        onConvertType(item.id, 'text');
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                    >
                      <Type className="w-3.5 h-3.5" /> Plain Text
                    </button>
                    <button
                      onClick={() => {
                        onConvertType(item.id, 'checklist');
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Checklist Task
                    </button>
                    <button
                      onClick={() => {
                        onConvertType(item.id, 'quote');
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                    >
                      <Quote className="w-3.5 h-3.5" /> Quote / Reference
                    </button>
                    <button
                      onClick={() => {
                        onConvertType(item.id, 'divider');
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                    >
                      <Minus className="w-3.5 h-3.5" /> Divider
                    </button>

                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                    <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                      Move
                    </div>
                    <button
                      onClick={() => {
                        onMove(item.id, null);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                    >
                      <FolderInput className="w-3.5 h-3.5" /> Move to Scratch
                    </button>
                    {workspaces.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => {
                          onMove(item.id, w.id);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 truncate"
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: w.color || '#3b82f6' }}
                        />
                        <span className="truncate">{w.name}</span>
                      </button>
                    ))}

                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                    {item.status === 'archived' && onRestore ? (
                      <button
                        onClick={() => {
                          onRestore(item.id);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                      >
                        <Archive className="w-3.5 h-3.5 text-blue-500" /> Restore from Archive
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onArchive(item.id);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-600 dark:text-neutral-300"
                      >
                        <Archive className="w-3.5 h-3.5" /> Archive
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onDelete(item.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
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
