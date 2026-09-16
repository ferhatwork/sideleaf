import React, { useEffect, useRef, useState } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { WorkspaceGroup } from '../types';
import { useSideleaf } from '../hooks/useSideleaf';

interface WorkspaceGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, color?: string) => Promise<WorkspaceGroup>;
  editingGroup?: WorkspaceGroup | null;
  onUpdateGroup?: (id: string, updates: Partial<WorkspaceGroup>) => Promise<void>;
}

const PRESET_COLORS = ['#0f766e', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#db2777', '#4b5563'];

export const WorkspaceGroupModal: React.FC<WorkspaceGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  editingGroup,
  onUpdateGroup,
}) => {
  const { t } = useSideleaf();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      previousFocusRef.current?.focus();
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement;
    setName(editingGroup?.name || '');
    setColor(editingGroup?.color || PRESET_COLORS[0]);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [isOpen, editingGroup]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (editingGroup && onUpdateGroup) {
      await onUpdateGroup(editingGroup.id, { name: trimmedName, color });
    } else {
      await onCreateGroup(trimmedName, color);
    }
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-group-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-sideleaf-dark-border bg-white dark:bg-sideleaf-dark-surface shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-teal-600" />
            <h2 id="workspace-group-modal-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {editingGroup ? t.workspace.editWorkspaceGroup : t.workspace.newWorkspaceGroup}
            </h2>
          </div>
          <button onClick={onClose} aria-label={t.common.close} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded focus-ring">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              {t.workspace.workspaceGroupName}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.workspace.workspaceGroupNamePlaceholder}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus-ring"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              {t.workspace.colorAccent}
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  aria-label={t.workspace.selectColor(preset)}
                  className={`w-6 h-6 rounded-full transition-transform focus-ring ${color === preset ? 'scale-125 ring-2 ring-offset-2 ring-neutral-400 dark:ring-offset-sideleaf-dark-surface' : 'hover:scale-110'}`}
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring">
              {t.common.cancel}
            </button>
            <button type="submit" disabled={!name.trim()} className="px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-medium focus-ring">
              {editingGroup ? t.workspace.saveWorkspaceGroup : t.workspace.createWorkspaceGroup}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
