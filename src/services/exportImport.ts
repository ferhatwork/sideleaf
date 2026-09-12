import { SideleafExportData, Workspace, Item, Section, UserSettings, ActivityLog } from '../types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: SideleafExportData;
  stats?: {
    workspacesCount: number;
    itemsCount: number;
    sectionsCount?: number;
    activityCount: number;
  };
}

export function validateSideleafData(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Invalid file format: content must be a JSON object.' };
  }

  const candidate = raw as Partial<SideleafExportData>;

  // Allow both modern 'sideleaf-v1' and legacy 'workpad-v1' schemas for seamless upgrade
  if (candidate.schema !== 'sideleaf-v1' && candidate.schema !== 'workpad-v1') {
    return {
      valid: false,
      error: `Unsupported schema "${candidate.schema || 'unknown'}". Expected "sideleaf-v1" or "workpad-v1".`,
    };
  }

  if (!Array.isArray(candidate.workspaces)) {
    return { valid: false, error: 'Invalid format: "workspaces" array is missing.' };
  }

  if (!Array.isArray(candidate.items)) {
    return { valid: false, error: 'Invalid format: "items" array is missing.' };
  }

  // Validate items structure
  for (let i = 0; i < candidate.items.length; i++) {
    const item = candidate.items[i];
    if (!item.id || typeof item.id !== 'string') {
      return { valid: false, error: `Item at index ${i} is missing a valid "id".` };
    }
    if (typeof item.content !== 'string') {
      return { valid: false, error: `Item "${item.id}" is missing valid string "content".` };
    }
    if (!item.type || !['text', 'checklist', 'quote', 'link', 'divider', 'decision'].includes(item.type)) {
      return { valid: false, error: `Item "${item.id}" has invalid type "${item.type}".` };
    }
  }

  // Validate workspaces structure
  for (let i = 0; i < candidate.workspaces.length; i++) {
    const ws = candidate.workspaces[i];
    if (!ws.id || typeof ws.id !== 'string' || !ws.name || typeof ws.name !== 'string') {
      return { valid: false, error: `Workspace at index ${i} is missing "id" or "name".` };
    }
  }

  // Validate sections structure if present (backward compatibility: optional)
  if (candidate.sections !== undefined) {
    if (!Array.isArray(candidate.sections)) {
      return { valid: false, error: 'Invalid format: "sections" must be an array.' };
    }
    for (let i = 0; i < candidate.sections.length; i++) {
      const sec = candidate.sections[i];
      if (!sec.id || typeof sec.id !== 'string' || !sec.workspaceId || typeof sec.workspaceId !== 'string' || !sec.name || typeof sec.name !== 'string') {
        return { valid: false, error: `Section at index ${i} is missing required fields (id, workspaceId, name).` };
      }
    }
  }

  const stats: {
    workspacesCount: number;
    itemsCount: number;
    sectionsCount?: number;
    activityCount: number;
  } = {
    workspacesCount: candidate.workspaces.length,
    itemsCount: candidate.items.length,
    activityCount: Array.isArray(candidate.activity) ? candidate.activity.length : 0,
  };

  if (candidate.sections !== undefined) {
    stats.sectionsCount = candidate.sections.length;
  }

  return {
    valid: true,
    data: candidate as SideleafExportData,
    stats,
  };
}

// Backward compatibility export alias
export const validateWorkpadData = validateSideleafData;

export function generateExportData(
  workspaces: Workspace[],
  items: Item[],
  settings?: UserSettings,
  activity?: ActivityLog[],
  sections?: Section[]
): SideleafExportData {
  return {
    schema: 'sideleaf-v1',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    workspaces: [...workspaces],
    items: [...items],
    sections: sections ? [...sections] : undefined,
    settings: settings ? { ...settings } : undefined,
    activity: activity ? [...activity] : undefined,
  };
}

export function getExportFilename(date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0];
  return `sideleaf-backup-${dateStr}.sideleaf`;
}

export function downloadJsonFile(filename: string, data: object): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function renderMarkdownItems(items: Item[]): string[] {
  const lines: string[] = [];
  for (const item of items) {
    if (item.status === 'deleted') continue;

    switch (item.type) {
      case 'checklist':
        lines.push(`- [${item.checked ? 'x' : ' '}] ${item.content}`);
        break;
      case 'quote':
        lines.push(`> ${item.content.replace(/\n/g, '\n> ')}`);
        if (item.source?.domain) {
          lines.push(`> — *Source: ${item.source.url || item.source.domain}*`);
        }
        lines.push('');
        break;
      case 'link':
        lines.push(`- [${item.source?.title || item.content}](${item.source?.url || item.content})`);
        break;
      case 'divider':
        lines.push('\n---\n');
        break;
      case 'decision':
        lines.push(`- **[Decision]** ${item.content}`);
        break;
      case 'text':
      default:
        lines.push(item.content);
        lines.push('');
        break;
    }
  }
  return lines;
}

export function exportWorkspaceToMarkdown(
  workspaceName: string,
  items: Item[],
  sections?: Section[]
): string {
  const lines: string[] = [];
  lines.push(`# ${workspaceName}`);
  lines.push(`Exported on ${new Date().toLocaleDateString()}\n`);

  if (!sections || sections.length === 0) {
    lines.push(...renderMarkdownItems(items));
    return lines.join('\n');
  }

  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  // First unsectioned items
  const unsectioned = items.filter((i) => !i.sectionId);
  if (unsectioned.length > 0) {
    lines.push(...renderMarkdownItems(unsectioned));
  }

  // Then sectioned items
  for (const sec of sortedSections) {
    const secItems = items.filter((i) => i.sectionId === sec.id);
    lines.push(`\n## ${sec.name}\n`);
    lines.push(...renderMarkdownItems(secItems));
  }

  return lines.join('\n');
}

export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
