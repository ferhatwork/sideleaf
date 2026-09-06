import React, { useState, useRef, useEffect } from 'react';
import { UserSettings, Workspace, Item, ActivityLog } from '../types';
import {
  generateExportData,
  validateWorkpadData,
  downloadJsonFile,
  downloadMarkdownFile,
  exportWorkspaceToMarkdown,
} from '../services/exportImport';
import {
  X,
  Moon,
  Sun,
  Laptop,
  Download,
  Upload,
  ShieldCheck,
  HardDrive,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  workspaces: Workspace[];
  items: Item[];
  activity: ActivityLog[];
  onImportData: (
    importedItems: Item[],
    importedWorkspaces: Workspace[],
    mode: 'merge' | 'replace' | 'new_workspace',
    newWorkspaceName?: string
  ) => Promise<void>;
  onResetAllData: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  workspaces,
  items,
  activity,
  onImportData,
  onResetAllData,
}) => {
  const [importPreview, setImportPreview] = useState<{
    file: File;
    items: Item[];
    workspaces: Workspace[];
    stats: { workspacesCount: number; itemsCount: number; activityCount: number };
    conflictingCount: number;
    exportedAt: string;
  } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'new_workspace' | 'replace'>('merge');
  const [importError, setImportError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setImportPreview(null);
      setImportError(null);
      setShowResetConfirm(false);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const data = generateExportData(workspaces, items, settings, activity);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadJsonFile(`workpad-backup-${dateStr}.workpad`, data);
  };

  const handleExportMarkdown = () => {
    const md = exportWorkspaceToMarkdown('Workpad All Notes', items);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadMarkdownFile(`workpad-notes-${dateStr}.md`, md);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const result = validateWorkpadData(parsed);
        if (!result.valid || !result.data || !result.stats) {
          setImportError(result.error || 'Failed to validate .workpad file format.');
          setImportPreview(null);
          return;
        }

        const existingItemIds = new Set(items.map((i) => i.id));
        const conflictingCount = result.data.items.filter((i) => existingItemIds.has(i.id)).length;

        setImportPreview({
          file,
          items: result.data.items,
          workspaces: result.data.workspaces,
          stats: result.stats,
          conflictingCount,
          exportedAt: result.data.exportedAt || 'Unknown',
        });
      } catch (err) {
        setImportError('Invalid JSON file format.');
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const executeImport = async () => {
    if (!importPreview) return;
    await onImportData(importPreview.items, importPreview.workspaces, importMode);
    setImportPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

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
      aria-labelledby="settings-dialog-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl rounded-xl border border-neutral-200 dark:border-workpad-dark-border bg-white dark:bg-workpad-dark-surface shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h2
            id="settings-dialog-title"
            className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
          >
            Workpad Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings modal"
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
          {/* Appearance Section */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Appearance
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all focus-ring ${
                  settings.theme === 'dark'
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/40 text-blue-500'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs font-medium">Dark Mode</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all focus-ring ${
                  settings.theme === 'light'
                    ? 'border-blue-500 bg-blue-50/20 text-blue-600'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs font-medium">Light Mode</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'system' })}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all focus-ring ${
                  settings.theme === 'system'
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/40 text-blue-500'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <Laptop className="w-5 h-5" />
                <span className="text-xs font-medium">System Auto</span>
              </button>
            </div>
          </div>

          {/* Data Ownership & Export */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Data & Ownership
            </h3>
            <p className="text-xs text-neutral-500 mb-3">
              Your notes belong entirely to you. Everything is stored locally in your browser's IndexedDB. No servers, no accounts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportJson}
                className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 flex items-center gap-3 text-left transition-colors focus-ring"
              >
                <Download className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100 text-xs">
                    Export .workpad Backup
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Portable JSON with all workspaces & history
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportMarkdown}
                className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 flex items-center gap-3 text-left transition-colors focus-ring"
              >
                <FileText className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100 text-xs">
                    Export Markdown (.md)
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Standard plain markdown notes format
                  </div>
                </div>
              </button>
            </div>

            {/* Import file */}
            <div className="mt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".workpad,.json"
                onChange={handleFileChange}
                className="hidden"
                id="workpad-file-import"
              />
              <label
                htmlFor="workpad-file-import"
                className="p-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 flex items-center justify-center gap-2 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer transition-colors focus-ring"
              >
                <Upload className="w-4 h-4 text-neutral-400" />
                <span>Import from .workpad file</span>
              </label>
            </div>

            {importError && (
              <div className="mt-2 p-2.5 rounded bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Import Preview Box (Spec Section 54: Workspace name, item count, last updated, conflict preview) */}
            {importPreview && (
              <div className="mt-3 p-3.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Valid Backup File: {importPreview.file.name}</span>
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                  <div>
                    <strong>Contents:</strong> {importPreview.stats.itemsCount} items across {importPreview.stats.workspacesCount} workspaces.
                  </div>
                  <div>
                    <strong>Exported at:</strong> {new Date(importPreview.exportedAt).toLocaleString()}
                  </div>
                  {importPreview.workspaces.length > 0 && (
                    <div className="truncate">
                      <strong>Workspaces:</strong> {importPreview.workspaces.map((w) => w.name).join(', ')}
                    </div>
                  )}
                  {importPreview.conflictingCount > 0 && (
                    <div className="text-amber-600 dark:text-amber-400">
                      ⚠️ {importPreview.conflictingCount} notes already exist in your local storage.
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase">
                    Select Import Mode:
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                    />
                    <span>Merge with current data (Keeps newest records if duplicates exist)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="new_workspace"
                      checked={importMode === 'new_workspace'}
                      onChange={() => setImportMode('new_workspace')}
                    />
                    <span>Import into a new separate workspace</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer text-red-500 dark:text-red-400">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                    />
                    <span>Replace all current notes</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setImportPreview(null)}
                    className="px-3 py-1.5 rounded text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeImport}
                    className="px-3 py-1.5 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium focus-ring"
                  >
                    Confirm Import
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Local Storage Stats */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Storage Diagnostic
            </h3>
            <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-neutral-400" />
                <div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-200">
                    IndexedDB Local Storage
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    {items.filter((i) => i.status === 'active').length} active notes · {workspaces.length} workspaces · {items.filter((i) => i.status === 'archived').length} archived
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">
                Healthy
              </span>
            </div>
          </div>

          {/* Privacy statement */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Privacy Contract
            </h3>
            <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 flex items-start gap-3 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-[11px]">
                <strong className="text-neutral-800 dark:text-neutral-200">
                  Your notes never leave your computer.
                </strong>{' '}
                Workpad has zero tracking, zero cloud telemetry, no analytics beacons, and no mandatory login.
              </div>
            </div>
          </div>

          {/* Reset All Data (Danger zone) */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            {showResetConfirm ? (
              <div className="p-3 rounded-lg border border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30 text-xs">
                <div className="font-semibold text-red-600 dark:text-red-400">
                  Are you absolutely sure?
                </div>
                <div className="text-neutral-600 dark:text-neutral-400 mt-1">
                  This will permanently erase all local notes and workspaces from IndexedDB.
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2.5 py-1 rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onResetAllData();
                      setShowResetConfirm(false);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-medium focus-ring"
                  >
                    Yes, Delete Everything
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 flex items-center gap-1.5 focus-ring rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear all data and reset</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
