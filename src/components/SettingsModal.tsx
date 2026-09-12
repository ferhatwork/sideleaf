import React, { useState, useRef, useEffect } from 'react';
import { UserSettings, Workspace, Item, ActivityLog, Section } from '../types';
import { useSideleaf } from '../hooks/useSideleaf';
import {
  generateExportData,
  getExportFilename,
  validateSideleafData,
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
  Keyboard,
  Info,
  Languages,
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
    newWorkspaceName?: string,
    importedSections?: Section[],
    importedSettings?: UserSettings,
    importedActivity?: ActivityLog[]
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
  const { t, locale, setLocale, canInstallPwa, installPwa, sections } = useSideleaf();
  const [activeTab, setActiveTab] = useState<'appearance' | 'data' | 'keyboard' | 'about'>('appearance');
  const [importPreview, setImportPreview] = useState<{
    file: File;
    items: Item[];
    workspaces: Workspace[];
    sections?: Section[];
    settings?: UserSettings;
    activity?: ActivityLog[];
    stats: { workspacesCount: number; itemsCount: number; sectionsCount?: number; activityCount: number };
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
    const data = generateExportData(workspaces, items, settings, activity, sections);
    downloadJsonFile(getExportFilename(), data);
  };

  const handleExportMarkdown = () => {
    const md = exportWorkspaceToMarkdown(t.settings.allNotesExportTitle, items);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadMarkdownFile(`sideleaf-notes-${dateStr}.md`, md);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const result = validateSideleafData(parsed);
        if (!result.valid || !result.data || !result.stats) {
          setImportError(result.error || t.settings.validationError);
          setImportPreview(null);
          return;
        }

        const existingItemIds = new Set(items.map((i) => i.id));
        const conflictingCount = result.data.items.filter((i) => existingItemIds.has(i.id)).length;

        setImportPreview({
          file,
          items: result.data.items,
          workspaces: result.data.workspaces,
          sections: result.data.sections,
          settings: result.data.settings,
          activity: result.data.activity,
          stats: result.stats,
          conflictingCount,
          exportedAt: result.data.exportedAt || 'Unknown',
        });
      } catch (err) {
        setImportError(t.settings.invalidJsonError);
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const executeImport = async () => {
    if (!importPreview) return;
    await onImportData(
      importPreview.items,
      importPreview.workspaces,
      importMode,
      undefined,
      importPreview.sections,
      importPreview.settings,
      importPreview.activity
    );
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
        className="w-full max-w-xl rounded-xl border border-neutral-200 dark:border-sideleaf-dark-border bg-white dark:bg-sideleaf-dark-surface shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h2
            id="settings-dialog-title"
            className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {t.settings.title}
          </h2>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation (Spec Section 75) */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-5 gap-6 text-xs font-medium bg-neutral-50/50 dark:bg-neutral-900/30">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`py-3 border-b-2 transition-colors focus-ring flex items-center gap-1.5 ${
              activeTab === 'appearance'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>{t.settings.appearanceTab}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`py-3 border-b-2 transition-colors focus-ring flex items-center gap-1.5 ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{t.settings.dataTab}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('keyboard')}
            className={`py-3 border-b-2 transition-colors focus-ring flex items-center gap-1.5 ${
              activeTab === 'keyboard'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{t.settings.keyboardTab}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`py-3 border-b-2 transition-colors focus-ring flex items-center gap-1.5 ${
              activeTab === 'about'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>{t.settings.aboutTab}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {/* 1. Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                  {t.settings.themeTitle}
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
                    <span className="text-xs font-medium">{t.settings.darkMode}</span>
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
                    <span className="text-xs font-medium">{t.settings.lightMode}</span>
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
                    <span className="text-xs font-medium">{t.settings.systemAuto}</span>
                  </button>
                </div>
              </div>

              {/* Language Section (Spec Section 70, 72, 86, 92) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Languages className="w-3.5 h-3.5 text-neutral-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    {t.settings.languageTitle}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLocale('en');
                      onUpdateSettings({ locale: 'en' });
                    }}
                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all focus-ring ${
                      locale === 'en'
                        ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/40 text-blue-500 font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                    }`}
                  >
                    <span className="text-xs">{t.settings.english}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocale('tr');
                      onUpdateSettings({ locale: 'tr' });
                    }}
                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all focus-ring ${
                      locale === 'tr'
                        ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/40 text-blue-500 font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                    }`}
                  >
                    <span className="text-xs">{t.settings.turkish}</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 text-xs text-neutral-500 leading-relaxed">
                {t.settings.themeDescription}
              </div>
            </div>
          )}

          {/* 2. Data Tab (Export, Import, Backup, Clear local data) */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  {t.settings.backupSection}
                </h3>
                <p className="text-xs text-neutral-500 mb-3">
                  {t.settings.backupDescription}
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
                        {t.settings.exportSideleaf}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {t.settings.exportSideleafDesc}
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
                        {t.settings.exportMarkdown}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {t.settings.exportMarkdownDesc}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Import Section */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  {t.settings.importSection}
                </h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".sideleaf,.workpad,.json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="sideleaf-file-import"
                />
                <label
                  htmlFor="sideleaf-file-import"
                  className="p-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 flex items-center justify-center gap-2 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer transition-colors focus-ring"
                >
                  <Upload className="w-4 h-4 text-neutral-400" />
                  <span>{t.settings.chooseFile}</span>
                </label>

                {importError && (
                  <div className="mt-2 p-2.5 rounded bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {importPreview && (
                  <div className="mt-3 p-3.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      <span>{t.settings.validBackup}: {importPreview.file.name}</span>
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                      <div>
                        <strong>{t.settings.contentsSummary}:</strong> {importPreview.stats.itemsCount} {t.common.items} ({importPreview.stats.workspacesCount} {t.common.workspaces})
                      </div>
                      <div>
                        <strong>{t.settings.exportedAtLabel}:</strong> {new Date(importPreview.exportedAt).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')}
                      </div>
                      {importPreview.conflictingCount > 0 && (
                        <div className="text-amber-600 dark:text-amber-400">
                          ⚠️ {importPreview.conflictingCount} {t.settings.conflictsWarning}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-neutral-500 uppercase">
                        {t.settings.importStrategy}:
                      </div>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                        />
                        <span>{t.settings.mergeOption}</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="new_workspace"
                          checked={importMode === 'new_workspace'}
                          onChange={() => setImportMode('new_workspace')}
                        />
                        <span>{t.settings.newWorkspaceOption}</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer text-red-500 dark:text-red-400">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                        />
                        <span>{t.settings.replaceOption}</span>
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setImportPreview(null)}
                        className="px-3 py-1.5 rounded text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={executeImport}
                        className="px-3 py-1.5 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium focus-ring"
                      >
                        {t.settings.executeImport}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Storage Diagnostic */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  {t.settings.storageStatus}
                </h3>
                <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-5 h-5 text-neutral-400" />
                    <div>
                      <div className="font-medium text-neutral-800 dark:text-neutral-200">
                        {t.settings.activeNotesLabel}
                      </div>
                      <div className="text-neutral-500 text-[11px]">
                        {items.filter((i) => i.status === 'active').length} {t.common.activeNotes} · {workspaces.length} {t.common.workspaces} · {items.filter((i) => i.status === 'archived').length} {t.common.archived}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">
                    {t.settings.healthyBadge}
                  </span>
                </div>
              </div>

              {/* Clear Local Data (Destructive) */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                {showResetConfirm ? (
                  <div className="p-3.5 rounded-lg border border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30 text-xs space-y-2">
                    <div className="font-semibold text-red-600 dark:text-red-400">
                      {t.settings.clearDataConfirmTitle}
                    </div>
                    <div className="text-neutral-600 dark:text-neutral-400 text-xs">
                      {t.settings.clearDataConfirmDesc}
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="px-2.5 py-1.5 rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onResetAllData();
                          setShowResetConfirm(false);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-medium focus-ring"
                      >
                        {t.settings.yesErase}
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
                    <span>{t.settings.clearDataButton}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. Keyboard Tab */}
          {activeTab === 'keyboard' && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                {t.settings.keyboardTitle}
              </h3>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                {[
                  { key: 'Ctrl + Space', mac: '⌘ + Space', desc: t.shortcuts.quickCapture },
                  { key: 'Ctrl + K', mac: '⌘ + K', desc: t.shortcuts.search },
                  { key: 'Ctrl + Enter', mac: '⌘ + Enter', desc: t.shortcuts.convertTask },
                  { key: 'Ctrl + Z', mac: '⌘ + Z', desc: t.shortcuts.undo },
                  { key: 'Ctrl + Shift + Z', mac: '⌘ + Shift + Z', desc: t.shortcuts.redo },
                  { key: 'Ctrl + S', mac: '⌘ + S', desc: t.shortcuts.saveBackup },
                  { key: 'Esc', mac: 'Esc', desc: t.shortcuts.closeDialog },
                  { key: '?', mac: '?', desc: t.shortcuts.showHelp },
                ].map((s, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-300">{s.desc}</span>
                    <kbd className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-[11px] text-neutral-700 dark:text-neutral-200">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {t.settings.aboutTitle}
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                    v1.0.0
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t.settings.appDescription}
                </p>
              </div>

              {canInstallPwa && (
                <div className="p-3 rounded-lg border border-blue-200/80 dark:border-blue-950 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                      {t.settings.installApp}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {t.settings.installAppDesc}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await installPwa();
                    }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors focus-ring"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.settings.installApp}</span>
                  </button>
                </div>
              )}

              <div className="p-3.5 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                <div className="flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>{t.settings.privacyGuarantee}</span>
                </div>
                <p>
                  <strong>{t.settings.corePhilosophyLabel}</strong> {t.settings.corePhilosophy}
                </p>
                <p>
                  {t.settings.localGuarantee}
                </p>
              </div>

              <div className="pt-2 text-xs text-neutral-400 space-y-1">
                <div>{t.settings.licenseNotice}</div>
                <div>
                  {t.settings.focusTagline}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
