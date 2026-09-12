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
  undo: string;
  loadingSideleaf: string;
  activeStatus: string;
  openNavigationMenu: string;
  itemOptions: string;
  local: string;
  capture: string;
  showMoreRemaining: (remaining: number) => string;
  items: string;
  workspaces: string;
  archived: string;
  activeNotes: string;
  switchLanguage: (targetLocale: string) => string;
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
  newWorkspace: string;
  workspaceName: string;
  workspaceNamePlaceholder: string;
  colorAccent: string;
  descriptionOptional: string;
  descriptionPlaceholder: string;
  saveChanges: string;
  createWorkspace: string;
  closeModal: string;
  selectColor: (color: string) => string;
  workspaceOptions: (name: string) => string;
  fromWorkspace: (name: string) => string;
}

export interface RecentTranslations {
  title: string;
  subtitle: string;
  emptyHeading: string;
  emptySubheading: string;
  actionCapture: string;
  actionToggleTask: string;
  actionCompleted: string;
  actionIncomplete: string;
  actionConvertTask: string;
  actionMoveWorkspace: string;
  actionArchive: string;
  actionDelete: string;
  actionEdit: string;
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
  deletedTimeAgo: (timeAgo: string) => string;
  emptyWarning: string;
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
  copyLink: string;
  moveToWorkspace: string;
  scratchOption: string;
  archiveAction: string;
  restoreAction: string;
  deleteAction: string;
  decisionBadge: string;
  sourceLabel: string;
  openSource: string;
}

export interface SectionTranslations {
  section: string;
  addSection: string;
  renameSection: string;
  deleteSection: string;
  deleteConfirmPrompt: string;
  collapseSection: string;
  expandSection: string;
  unsectioned: string;
  itemCount: string;
  addHere: string;
  moveSectionUp: string;
  moveSectionDown: string;
}

export interface BulkTranslations {
  selected: string;
  copyLinks: string;
  copyLinksSuccess: string;
  moveToSection: string;
  moveToUnsectioned: string;
  archiveSelected: string;
  deleteSelected: string;
  linksDetected: string;
  addAsSeparateLinks: string;
  pasteAsText: string;
  viewModeNormal: string;
  viewModeCompact: string;
  selectAll: string;
  clearSelection: string;
  noLinksSelected: string;
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
  exportSideleaf: string;
  exportSideleafDesc: string;
  exportWorkpad?: string;
  exportWorkpadDesc?: string;
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
  privacyGuarantee: string;
  corePhilosophyLabel: string;
  appDescription: string;
  focusTagline: string;
  invalidJsonError: string;
  validationError: string;
  allNotesExportTitle: string;
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
  shortcutsFooter: string;
}

export interface TypesTranslations {
  all: string;
  text: string;
  note: string;
  checklist: string;
  tasks: string;
  quote: string;
  link: string;
  divider: string;
  decision: string;
}

export interface ToastTranslations {
  undo: string;
  dismiss: string;
  convertedToTask: string;
  convertedToType: (type: string) => string;
  undoConversion: (type: string) => string;
  movedToWorkspace: (name: string) => string;
  undoMove: string;
  itemArchived: string;
  undoArchive: string;
  itemRestored: string;
  undoRestore: string;
  itemMovedToTrash: string;
  undoDelete: string;
  itemPermanentlyDeleted: string;
  itemsPermanentlyDeleted: (count: number) => string;
  sectionCreated: (name: string) => string;
  undoCreateSection: string;
  sectionDeleted: (name: string) => string;
  undoDeleteSection: string;
  movedToSection: (name: string) => string;
  undoMoveToSection: string;
  itemsAdded: (count: number) => string;
  undoAddItems: (count: number) => string;
  itemsBulkMoved: (count: number, target: string) => string;
  itemsBulkArchived: (count: number) => string;
  itemsBulkDeleted: (count: number) => string;
  workspaceCreated: (name: string) => string;
  workspaceDeleted: (name: string) => string;
  itemsImported: (count: number) => string;
  allDataCleared: string;
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
  section: SectionTranslations;
  bulk: BulkTranslations;
  search: SearchTranslations;
  settings: SettingsTranslations;
  shortcuts: ShortcutsTranslations;
  types: TypesTranslations;
  toast: ToastTranslations;
}
