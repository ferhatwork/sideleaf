import React, { useState, useRef, useEffect } from 'react';
import { ItemType, Workspace } from '../types';
import { X, ArrowRight } from 'lucide-react';
import { extractUrls } from '../utils/format';
import { useSideleaf } from '../hooks/useSideleaf';

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
  const { t } = useSideleaf();
  const [content, setContent] = useState('');
  const [type, setType] = useState<ItemType>('text');
  const [workspaceId, setWorkspaceId] = useState<string | null>(activeWorkspaceId);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (!trimmed || isSubmitting) {
      onClose();
      return;
    }
    try {
      setIsSubmitting(true);
      await onSave({
        content: trimmed,
        type: overrideType || type,
        workspaceId,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
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
        className="w-full max-w-xl rounded-xl border border-neutral-200 dark:border-sideleaf-dark-border bg-white dark:bg-sideleaf-dark-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              id="quick-capture-title"
              className="text-xs font-semibold text-neutral-500 uppercase tracking-wider"
            >
              {t.capture.quickCaptureTitle}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400 font-mono">
              Ctrl+Space
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
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
            placeholder={t.capture.focusedPlaceholder}
            rows={3}
            aria-label={t.capture.focusedPlaceholder}
            className="w-full bg-transparent resize-none text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
          />

          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {type !== 'text' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 capitalize">
                  {t.types[type] || type}
                </span>
              )}

              <select
                value={workspaceId || ''}
                onChange={(e) => setWorkspaceId(e.target.value || null)}
                aria-label={t.item.moveToWorkspace}
                className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded px-2 py-1 border-none focus-ring"
              >
                <option value="">{t.item.scratchOption}</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono hidden sm:inline">
                {t.capture.saveHint} · {t.capture.taskHint}
              </span>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={!content.trim() || isSubmitting}
                className="px-3 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring flex items-center gap-1.5"
                title={`${t.common.save} (${t.capture.saveHint})`}
                aria-label={t.common.save}
              >
                <span>{t.common.save}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
