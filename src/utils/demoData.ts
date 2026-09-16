import { Item, Section, UserSettings, Workspace, WorkspaceGroup } from '../types';

export interface DemoData {
  items: Item[];
  workspaces: Workspace[];
  workspaceGroups: WorkspaceGroup[];
  sections: Section[];
  settings: UserSettings & { hasInitialized?: boolean };
  activeWorkspaceId: string;
}

/** Fictional, read-only preview data used only by the ?demo=1 screenshot route. */
export function createDemoData(): DemoData {
  const base = Date.UTC(2026, 8, 16, 9, 0, 0);
  const groups: WorkspaceGroup[] = [
    { id: 'demo-group-northstar', name: 'Northstar Studio', color: '#0f766e', order: 0, collapsed: false, createdAt: base, updatedAt: base },
    { id: 'demo-group-acme', name: 'Acme Retail', color: '#2563eb', order: 1, collapsed: false, createdAt: base + 1, updatedAt: base + 1 },
  ];
  const workspaces: Workspace[] = [
    { id: 'demo-ws-website', name: 'Website Refresh', description: 'Q3 marketing site and launch prep', color: '#0f766e', groupId: groups[0].id, order: 0, createdAt: base, updatedAt: base },
    { id: 'demo-ws-launch', name: 'Launch Campaign', description: 'Launch messaging and partner kit', color: '#14b8a6', groupId: groups[0].id, order: 1, createdAt: base + 1, updatedAt: base + 1 },
    { id: 'demo-ws-catalog', name: 'Product Catalog', description: 'Seasonal product list and approvals', color: '#2563eb', groupId: groups[1].id, order: 0, createdAt: base + 2, updatedAt: base + 2 },
    { id: 'demo-ws-planning', name: 'Quarterly Planning', description: 'Planning notes and decisions', color: '#60a5fa', groupId: groups[1].id, order: 1, createdAt: base + 3, updatedAt: base + 3 },
    { id: 'demo-ws-inbox', name: 'Personal Inbox', description: 'Unsorted ideas and follow-ups', color: '#6b7280', groupId: null, order: 0, createdAt: base + 4, updatedAt: base + 4 },
  ];
  const sections: Section[] = [
    { id: 'demo-section-week', workspaceId: 'demo-ws-website', name: 'This week', order: 0, collapsed: false, createdAt: base, updatedAt: base },
    { id: 'demo-section-reference', workspaceId: 'demo-ws-website', name: 'Reference', order: 1, collapsed: false, createdAt: base + 1, updatedAt: base + 1 },
  ];
  const items: Item[] = [
    { id: 'demo-item-brief', workspaceId: 'demo-ws-website', sectionId: 'demo-section-week', type: 'text', content: 'Homepage direction\nKeep the first screen calm, focused, and easy to scan.', richContent: '<p><strong>Homepage direction</strong></p><p>Keep the first screen calm, focused, and easy to scan.</p>', status: 'active', order: 3, createdAt: base, updatedAt: base },
    { id: 'demo-item-tasks', workspaceId: 'demo-ws-website', sectionId: 'demo-section-week', type: 'checklist', content: 'Confirm final copy\nShare preview with the client\nPrepare launch checklist', formatting: { listStyle: 'bullet' }, checked: false, status: 'active', order: 2, createdAt: base + 1, updatedAt: base + 1 },
    { id: 'demo-item-decision', workspaceId: 'demo-ws-website', sectionId: 'demo-section-reference', type: 'decision', content: 'Use the sage accent for primary actions to keep the experience warm and recognisable.', status: 'active', order: 1, createdAt: base + 2, updatedAt: base + 2 },
    { id: 'demo-item-link', workspaceId: 'demo-ws-website', sectionId: 'demo-section-reference', type: 'link', content: 'Figma project board', source: { title: 'Figma project board', url: 'https://www.figma.com/', domain: 'figma.com', capturedAt: base + 3 }, status: 'active', order: 0, createdAt: base + 3, updatedAt: base + 3 },
  ];

  return {
    items,
    workspaces,
    workspaceGroups: groups,
    sections,
    settings: { theme: 'light', locale: 'en', quickCaptureShortcut: 'Ctrl+Space', searchShortcut: 'Ctrl+K', autoSaveIntervalMs: 200, defaultView: 'today', hasInitialized: true },
    activeWorkspaceId: 'demo-ws-website',
  };
}
