import React, { useState, useRef, useEffect } from 'react';
import { ItemType } from '../types';
import { Type, CheckSquare, Quote, Link2, Minus, ArrowRight } from 'lucide-react';
import { extractUrls } from '../utils/format';

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

export const QuickInput: React.FC<QuickInputProps> = ({
  onAdd,
  defaultWorkspaceId = null,
  placeholder = 'Write it down... (Enter to save, Ctrl+Enter for task)',
  autoFocus = false,
}) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<ItemType>('text');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
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
        textareaRef.current.focus();
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

  return (
    <div className="rounded-xl border border-neutral-300/80 dark:border-workpad-dark-border bg-white dark:bg-workpad-dark-surface shadow-xs focus-within:border-blue-500/70 dark:focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all p-3">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        rows={1}
        aria-label="Quick capture input"
        className="w-full bg-transparent resize-none text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
      />

      <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
        {/* Type selector pills */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setType('text')}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors focus-ring ${
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
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors focus-ring ${
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
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors focus-ring ${
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
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors focus-ring ${
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
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors focus-ring ${
              type === 'divider'
                ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
            }`}
          >
            <Minus className="w-3 h-3" /> Divider
          </button>
        </div>

        {/* Action submit button */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] text-neutral-400 font-mono">
            Enter to save
          </span>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!content.trim() || isSubmitting}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-colors focus-ring"
            title="Save capture"
            aria-label="Save capture"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
