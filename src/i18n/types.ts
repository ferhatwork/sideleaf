export interface NavigationTranslations {
  today: string;
  scratch: string;
  recent: string;
  workspaces: string;
  archive: string;
  trash: string;
  settingsAndData: string;
}

export interface CommonTranslations {
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  create: string;
  copy: string;
  copied: string;
  close: string;
  confirm: string;
  execute: string;
  search: string;
  searchPlaceholder: string;
  localOnly: string;
  workingOn: string;
  empty: string;
  all: string;
}

export interface TodayTranslations {
  title: string;
  emptyHeading: string;
  emptySubheading: string;
  emptyNoSetup: string;
  startWriting: string;
  continueSection: string;
  lastActive: string;
}

export interface ScratchTranslations {
  title: string;
  subtitle: string;
  emptyHeading: string;
  emptySubheading: string;
  capturePlaceholder: string;
}

export interface WorkspaceTranslations {
  activeNotes: string;
  exportMarkdown: string;
  editWorkspace: string;
  deleteWorkspace: string;
  deleteConfirmPrompt: string;
  capturePlaceholder: string;
  emptyHeading: string;
  emptySubheading: string;
}

export interface RecentTranslations {
  title: string;
  subtitle: string;
  emptyHeading: string;
  emptySubheading: string;
}

export interface ArchiveTranslations {
  title: string;
  subtitle: string;
  emptyHeading: string;
  emptySubheading: string;
  itemCount: string;
}

export interface TrashTranslations {
  title: string;
  subtitle: string;
  emptyHeading: string;
  emptySubheading: string;
  emptyTrash: string;
  emptyConfirmPrompt: string;
  yesDelete: string;
  restore: string;
  permanentDelete: string;
}

export interface CaptureTranslations {
  idlePlaceholder: string;
  focusedPlaceholder: string;
  taskHint: string;
  saveHint: string;
  cancelHint: string;
  quickCaptureTitle: string;
}

export interface ItemTranslations {
  editNote: string;
  markComplete: string;
  markIncomplete: string;
  convertToTask: string;
  convertToNote: string;
  convertToQuote: string;
  convertToDecision: string;
  copyText: string;
  moveToWorkspace: string;
  scratchOption: string;
  archiveAction: string;
  restoreAction: string;
  deleteAction: string;
  decisionBadge: string;
  sourceLabel: string;
  openSource: string;
}

export interface SearchTranslations {
  dialogTitle: string;
  inputPlaceholder: string;
  noResultsHeading: string;
  noResultsSubheading: string;
  selectHint: string;
  closeHint: string;
  recentHint: string;
}

export interface SettingsTranslations {
  title: string;
  appearanceTab: string;
  dataTab: string;
  keyboardTab: string;
  aboutTab: string;
  themeTitle: string;
  darkMode: string;
  lightMode: string;
  systemAuto: string;
  themeDescription: string;
  backupSection: string;
  backupDescription: string;
  exportWorkpad: string;
  exportWorkpadDesc: string;
  exportMarkdown: string;
  exportMarkdownDesc: string;
  importSection: string;
  chooseFile: string;
  validBackup: string;
  contentsSummary: string;
  exportedAtLabel: string;
  conflictsWarning: string;
  importStrategy: string;
  mergeOption: string;
  newWorkspaceOption: string;
  replaceOption: string;
  executeImport: string;
  storageStatus: string;
  healthyBadge: string;
  activeNotesLabel: string;
  clearDataSection: string;
  clearDataWarning: string;
  clearDataButton: string;
  clearDataConfirmTitle: string;
  clearDataConfirmDesc: string;
  yesErase: string;
  keyboardTitle: string;
  aboutTitle: string;
  corePhilosophy: string;
  localGuarantee: string;
  licenseNotice: string;
  languageTitle: string;
  english: string;
  turkish: string;
  installApp: string;
  installAppDesc: string;
}

export interface ShortcutsTranslations {
  quickCapture: string;
  quickCaptureAlt: string;
  search: string;
  convertTask: string;
  undo: string;
  redo: string;
  saveBackup: string;
  closeDialog: string;
  showHelp: string;
}

export interface TypesTranslations {
  all: string;
  text: string;
  checklist: string;
  tasks: string;
  quote: string;
  link: string;
  divider: string;
  decision: string;
}

export interface TranslationSchema {
  navigation: NavigationTranslations;
  common: CommonTranslations;
  today: TodayTranslations;
  scratch: ScratchTranslations;
  workspace: WorkspaceTranslations;
  recent: RecentTranslations;
  archive: ArchiveTranslations;
  trash: TrashTranslations;
  capture: CaptureTranslations;
  item: ItemTranslations;
  search: SearchTranslations;
  settings: SettingsTranslations;
  shortcuts: ShortcutsTranslations;
  types: TypesTranslations;
}
