import React, { useState, useRef, useEffect } from 'react';
import { ItemType, Workspace } from '../types';
import { Type, CheckSquare, Quote, Link2, X } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      setContent('');
      setType('text');
      setWorkspaceId(activeWorkspaceId);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen, activeWorkspaceId]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      onClose();
      return;
    }
    await onSave({
      content: trimmed,
      type,
      workspaceId,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-100">
      <div
        className="w-full max-w-xl rounded-xl border border-neutral-200 dark:border-workpad-dark-border bg-white dark:bg-workpad-dark-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Quick Capture
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400 font-mono">
              Ctrl+Space
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind? Capture it immediately..."
            rows={3}
            className="w-full bg-transparent resize-none text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
          />

          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setType('text')}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 ${
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
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 ${
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
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 ${
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
                className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 ${
                  type === 'link'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                }`}
              >
                <Link2 className="w-3 h-3" /> Link
              </button>

              <select
                value={workspaceId || ''}
                onChange={(e) => setWorkspaceId(e.target.value || null)}
                className="ml-2 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded px-2 py-1 border-none focus:ring-1 focus:ring-blue-500"
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
