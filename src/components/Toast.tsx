import React, { useEffect } from 'react';
import { Undo2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  undoable?: boolean;
  onUndo?: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  undoable,
  onUndo,
  onDismiss,
  durationMs = 5000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-sideleaf-dark-elevated shadow-xl text-xs text-neutral-800 dark:text-neutral-200 animate-in slide-in-from-bottom-3 duration-150"
    >
      <span>{message}</span>

      {undoable && onUndo && (
        <button
          onClick={onUndo}
          className="ml-1 inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline focus-ring rounded"
        >
          <Undo2 className="w-3.5 h-3.5" />
          Undo
        </button>
      )}

      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 rounded focus-ring"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
