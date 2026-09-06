import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ItemType } from '../types';
import { ArrowRight } from 'lucide-react';
import { extractUrls } from '../utils/format';
import { useSideleaf } from '../hooks/useSideleaf';

export interface QuickInputHandle {
  focus: () => void;
}

interface QuickInputProps {
  onAdd: (params: {
    content: string;
    type: ItemType;
    workspaceId?: string | null;
    sourceUrl?: string;
  }) => Promise<unknown>;
  defaultWorkspaceId?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
}

export const QuickInput = forwardRef<QuickInputHandle, QuickInputProps>(({
  onAdd,
  defaultWorkspaceId = null,
  placeholder,
  autoFocus = false,
}, ref) => {
  const { t } = useSideleaf();
  const effectivePlaceholder = placeholder || t.capture.focusedPlaceholder;

  const [content, setContent] = useState('');
  const [type, setType] = useState<ItemType>('text');
  const [isFocused, setIsFocused] = useState(autoFocus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsFocused(true);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
    },
  }));

  useEffect(() => {
    if (autoFocus) {
      setIsFocused(true);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
    }
  }, [autoFocus]);

  const handleSubmit = async (overrideType?: ItemType) => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAdd({
        content: trimmed,
        type: overrideType || type,
        workspaceId: defaultWorkspaceId,
      });
      setContent('');
      setType('text');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter converts/saves immediately as a checklist task!
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit('checklist');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape' && !content.trim()) {
      e.preventDefault();
      setIsFocused(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    const trimmed = pasted.trim();
    const urls = extractUrls(trimmed);

    // Auto-detect divider
    if (trimmed === '---' || trimmed === '***') {
      setType('divider');
    }
    // Auto-detect full URL
    else if (urls.length === 1 && trimmed === urls[0]) {
      setType('link');
    }
    // Auto-detect quoted text
    else if (trimmed.startsWith('>') || /^["“].*["”]$/s.test(trimmed)) {
      setType('quote');
    }
  };

  const handleIdleClick = () => {
    setIsFocused(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 20);
  };

  if (!isFocused && !content) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleIdleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleIdleClick();
          }
        }}
        aria-label={`${t.capture.idlePlaceholder} (${t.capture.saveHint})`}
        className="group w-full py-2 px-3.5 rounded-lg border border-neutral-200/70 dark:border-sideleaf-dark-border/70 bg-white/60 dark:bg-sideleaf-dark-surface/40 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-text flex items-center justify-between text-neutral-400 dark:text-neutral-500 focus-ring"
      >
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 dark:text-neutral-500 text-sm font-light leading-none group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
            +
          </span>
          <span className="text-sm font-normal text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors">
            {t.capture.idlePlaceholder}
          </span>
        </div>
        <kbd className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60">
          ⌘↵
        </kbd>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-300/80 dark:border-neutral-700 bg-white dark:bg-sideleaf-dark-surface shadow-xs transition-all p-3">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (!content.trim() && !autoFocus) {
            setIsFocused(false);
          }
        }}
        placeholder={effectivePlaceholder}
        rows={2}
        aria-label={t.capture.focusedPlaceholder}
        className="w-full bg-transparent resize-none text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
      />

      <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type !== 'text' && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 capitalize">
              {t.types[type] || type}
            </span>
          )}
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono">
            {t.capture.saveHint} · {t.capture.taskHint}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {!content.trim() && (
            <button
              type="button"
              onClick={() => setIsFocused(false)}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 px-2 py-1 rounded focus-ring"
            >
              {t.common.cancel}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!content.trim() || isSubmitting}
            className="p-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring flex items-center gap-1 text-xs font-medium"
            title={`${t.common.save} (${t.capture.saveHint})`}
            aria-label={t.common.save}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});

QuickInput.displayName = 'QuickInput';
