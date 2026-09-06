import React, { useEffect, useRef } from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { key: `${modKey} + Space`, description: 'Open Quick Capture from anywhere' },
    { key: `${modKey} + Shift + Space`, description: 'Quick Capture alternate fallback' },
    { key: `${modKey} + K`, description: 'Open Search / Command Palette' },
    { key: `${modKey} + Enter`, description: 'Convert item to task / Toggle task' },
    { key: `${modKey} + Z`, description: 'Undo last action (delete, archive, convert)' },
    { key: `${modKey} + S`, description: 'Export full .workpad backup snapshot' },
    { key: 'Esc', description: 'Close any active overlay / modal' },
    { key: 'Enter', description: 'Save capture in quick input / quick capture' },
    { key: 'Shift + Enter', description: 'Insert new line in capture input' },
    { key: '?', description: 'Show keyboard shortcuts guide' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && modalRef.current) {
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
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-workpad-dark-border bg-white dark:bg-workpad-dark-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-blue-500" />
            <h2 id="shortcuts-modal-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close shortcuts modal"
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 divide-y divide-neutral-100 dark:divide-neutral-800">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-neutral-600 dark:text-neutral-300">{s.description}</span>
              <kbd className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-[11px] text-neutral-700 dark:text-neutral-200 font-medium">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-900/40 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-400 text-center">
          Keyboard-first design: capture thoughts without reaching for a mouse.
        </div>
      </div>
    </div>
  );
};
