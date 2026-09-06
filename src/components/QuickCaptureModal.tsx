import React, { useState, useRef, useEffect } from 'react';
import { ItemType, Workspace } from '../types';
import { Type, CheckSquare, Quote, Link2, Minus, X } from 'lucide-react';
import { extractUrls } from '../utils/format';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (params: {
    content: string;
    type: ItemType;
    workspaceId: string | null;
  }) => Promise<unknown>;
  workspaces: Workspace[];
  activeWorkspaceId?: string | null;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  workspaces,
  activeWorkspaceId = null,
}) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<ItemType>('text');
  const [workspaceId, setWorkspaceId] = useState<string | null>(activeWorkspaceId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setContent('');
      setType('text');
      setWorkspaceId(activeWorkspaceId);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
    } else {
      // Restore focus on close
      previousFocusRef.current?.focus();
    }
  }, [isOpen, activeWorkspaceId]);

  if (!isOpen) return null;

  const handleSave = async (overrideType?: ItemType) => {
    const trimmed = content.trim();
    if (!trimmed) {
      onClose();
      return;
    }
    await onSave({
      content: trimmed,
      type: overrideType || type,
      workspaceId,
    });
    onClose();
  };

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

    // Ctrl+Enter converts/saves immediately as a checklist task!
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave('checklist');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    const trimmed = pasted.trim();
    const urls = extractUrls(trimmed);

    if (trimmed === '---' || trimmed === '***') {
      setType('divider');
    } else if (urls.length === 1 && trimmed === urls[0]) {
      setType('link');
    } else if (trimmed.startsWith('>') || /^["“].*["”]$/s.test(trimmed)) {
      setType('quote');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-capture-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl rounded-xl border border-neutral-200 dark:border-workpad-dark-border bg-white dark:bg-workpad-dark-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              id="quick-capture-title"
              className="text-xs font-semibold text-neutral-500 uppercase tracking-wider"
            >
              Quick Capture
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400 font-mono">
              Ctrl+Space
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close capture modal"
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            placeholder="What's on your mind? (Enter to save, Ctrl+Enter for task)"
            rows={3}
            aria-label="What's on your mind?"
            className="w-full bg-transparent resize-none text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
          />

          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setType('text')}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 focus-ring ${
                  type === 'text'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                }`}
              >
                <Type className="w-3 h-3" /> Text
              </button>
              <button
                type="button"
                onClick={() => setType('checklist')}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 focus-ring ${
                  type === 'checklist'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                }`}
              >
                <CheckSquare className="w-3 h-3" /> Task
              </button>
              <button
                type="button"
                onClick={() => setType('quote')}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 focus-ring ${
                  type === 'quote'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-medium'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                }`}
              >
                <Quote className="w-3 h-3" /> Quote
              </button>
              <button
                type="button"
                onClick={() => setType('link')}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 focus-ring ${
                  type === 'link'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                }`}
              >
                <Link2 className="w-3 h-3" /> Link
              </button>
              <button
                type="button"
                onClick={() => setType('divider')}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 focus-ring ${
                  type === 'divider'
                    ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-medium'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                }`}
              >
                <Minus className="w-3 h-3" /> Divider
              </button>

              <select
                value={workspaceId || ''}
                onChange={(e) => setWorkspaceId(e.target.value || null)}
                aria-label="Select target workspace"
                className="ml-2 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded px-2 py-1 border-none focus-ring"
              >
                <option value="">(Scratch)</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
              <span>[Enter] save</span>
              <span>[Esc] cancel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
