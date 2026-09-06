import React from 'react';
import { ActiveView, Workspace } from '../types';
import { Search, Plus, Settings, Menu, HelpCircle, HardDrive } from 'lucide-react';

interface HeaderProps {
  activeView: ActiveView;
  workspaces: Workspace[];
  onOpenSearch: () => void;
  onOpenQuickCapture: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  onToggleMobileSidebar: () => void;
  itemCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  workspaces,
  onOpenSearch,
  onOpenQuickCapture,
  onOpenSettings,
  onOpenShortcuts,
  onToggleMobileSidebar,
  itemCount,
}) => {
  const getViewTitle = () => {
    switch (activeView.type) {
      case 'today':
        return 'Today';
      case 'scratch':
        return 'Scratch';
      case 'workspace': {
        const ws = workspaces.find((w) => w.id === activeView.workspaceId);
        return ws ? ws.name : 'Workspace';
      }
      case 'recent':
        return 'Recent Activity';
      case 'archive':
        return 'Archive';
      case 'trash':
        return 'Trash';
      default:
        return 'Workpad';
    }
  };

  return (
    <header className="h-13 border-b border-neutral-200/80 dark:border-workpad-dark-border bg-white/70 dark:bg-workpad-dark-bg/80 backdrop-blur-md sticky top-0 z-20 px-4 flex items-center justify-between gap-3">
      {/* Left: Mobile toggle & view title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {getViewTitle()}
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800/80 text-neutral-500 font-mono">
            {itemCount}
          </span>
        </div>
      </div>

      {/* Middle: Quick Search Trigger */}
      <button
        onClick={onOpenSearch}
        aria-label="Search your work (Ctrl+K)"
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-workpad-dark-border bg-neutral-50/50 dark:bg-neutral-900/40 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs w-64 md:w-80 transition-colors focus-ring"
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left truncate">Search your work...</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-[10px]">
          Ctrl+K
        </kbd>
      </button>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-1.5">
        {/* Offline local indicator */}
        <div
          className="hidden lg:flex items-center gap-1 text-[11px] text-neutral-400 font-mono mr-2 px-2 py-1 rounded bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-neutral-800/50"
          title="All data stays on this device in IndexedDB"
        >
          <HardDrive className="w-3 h-3 text-emerald-500" />
          <span>Local-Only</span>
        </div>

        {/* Quick Capture Button */}
        <button
          onClick={onOpenQuickCapture}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs focus-ring"
          title="Quick Capture (Ctrl+Space)"
          aria-label="Quick Capture (Ctrl+Space)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Capture</span>
          <kbd className="hidden md:inline px-1 py-0.2 bg-blue-700/60 rounded text-[9px] font-mono">
            Ctrl+Space
          </kbd>
        </button>

        {/* Shortcuts help button */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-ring"
          title="Settings & Data"
          aria-label="Settings and Data"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
