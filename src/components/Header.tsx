import React from 'react';
import { ActiveView, Workspace } from '../types';
import { Search, Plus, Settings, Menu, HelpCircle } from 'lucide-react';
import { useWorkpad } from '../hooks/useWorkpad';

interface HeaderProps {
  activeView: ActiveView;
  workspaces: Workspace[];
  onOpenSearch: () => void;
  onOpenQuickCapture: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  onToggleMobileSidebar: () => void;
  itemCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  workspaces,
  onOpenSearch,
  onOpenQuickCapture,
  onOpenSettings,
  onOpenShortcuts,
  onToggleMobileSidebar,
}) => {
  const { t, locale, setLocale } = useWorkpad();

  const currentWorkspace =
    activeView.type === 'workspace'
      ? workspaces.find((w) => w.id === activeView.workspaceId)
      : null;

  const getViewTitle = () => {
    switch (activeView.type) {
      case 'today':
        return t.navigation.today;
      case 'scratch':
        return t.navigation.scratch;
      case 'workspace':
        return currentWorkspace ? currentWorkspace.name : t.navigation.workspaces;
      case 'recent':
        return t.recent.title;
      case 'archive':
        return t.navigation.archive;
      case 'trash':
        return t.navigation.trash;
      default:
        return 'Workpad';
    }
  };

  return (
    <header className="h-12 border-b border-neutral-200/70 dark:border-workpad-dark-border/80 bg-white/70 dark:bg-workpad-dark-bg/80 backdrop-blur-md sticky top-0 z-20 px-4 flex items-center justify-between gap-3">
      {/* Left: Mobile toggle & view title or Working on context */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          {currentWorkspace ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:inline flex-shrink-0">
                {t.common.workingOn}:
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentWorkspace.color || '#3b82f6' }}
                  aria-hidden="true"
                />
                <h1 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
                  {currentWorkspace.name}
                </h1>
              </div>
            </div>
          ) : (
            <h1 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 tracking-tight">
              {getViewTitle()}
            </h1>
          )}
        </div>
      </div>

      {/* Middle: Quick Search Trigger */}
      <button
        onClick={onOpenSearch}
        aria-label={`${t.search.dialogTitle} (Ctrl+K)`}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200/80 dark:border-workpad-dark-border bg-neutral-50/50 dark:bg-neutral-900/40 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs w-64 md:w-80 transition-colors focus-ring"
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{t.common.searchPlaceholder}</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-[10px]">
          Ctrl+K
        </kbd>
      </button>

      {/* Right: Quick actions, Language Switcher & Local indicator */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Subtle "● Local" branding indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 select-none px-2 py-1 mr-1"
          title={t.settings.localGuarantee}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />
          <span className="font-mono text-[11px]">{locale === 'tr' ? 'Yerel' : 'Local'}</span>
        </div>

        {/* Quick Language Switcher (TR / EN pill) */}
        <button
          type="button"
          onClick={() => setLocale(locale === 'tr' ? 'en' : 'tr')}
          className="px-2 py-1 rounded-md text-xs font-mono font-medium border border-neutral-200/80 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors focus-ring flex items-center gap-1"
          aria-label={`Dil değiştir / Switch language. Mevcut / Current: ${locale.toUpperCase()}`}
          title={locale === 'tr' ? 'Switch to English' : "Türkçe'ye geç"}
        >
          <span className={locale === 'tr' ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-neutral-400 dark:text-neutral-500'}>
            TR
          </span>
          <span className="text-neutral-300 dark:text-neutral-600 text-[10px]">/</span>
          <span className={locale === 'en' ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-neutral-400 dark:text-neutral-500'}>
            EN
          </span>
        </button>

        {/* Quick Capture Button */}
        <button
          onClick={onOpenQuickCapture}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-medium transition-colors shadow-xs focus-ring"
          title={`${locale === 'tr' ? 'Hızlı Yakala' : 'Quick Capture'} (Ctrl+Space)`}
          aria-label={`${locale === 'tr' ? 'Hızlı Yakala' : 'Quick Capture'} (Ctrl+Space)`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{locale === 'tr' ? 'Yakala' : 'Capture'}</span>
          <kbd className="hidden md:inline px-1 py-0.2 bg-neutral-700 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded text-[9px] font-mono">
            Ctrl+Space
          </kbd>
        </button>

        {/* Shortcuts help button */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
          title={`${t.settings.keyboardTitle} (?)`}
          aria-label={t.settings.keyboardTitle}
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
          title={t.navigation.settingsAndData}
          aria-label={t.navigation.settingsAndData}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
