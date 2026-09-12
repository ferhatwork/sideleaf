import { Item, Workspace, Section, SearchResult } from '../types';

export interface SearchOptions {
  query: string;
  items: Item[];
  workspaces: Workspace[];
  sections?: Section[];
  activeWorkspaceId?: string | null;
  statusFilter?: 'all' | 'active' | 'archived';
  limit?: number;
}

export function searchItems(options: SearchOptions): SearchResult[] {
  const {
    query,
    items,
    workspaces,
    sections = [],
    activeWorkspaceId,
    statusFilter = 'active',
    limit = 50,
  } = options;

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const now = Date.now();
  const workspaceMap = new Map<string, string>(
    workspaces.map((w) => [w.id, w.name.toLowerCase()])
  );
  const sectionMap = new Map<string, string>(
    sections.map((s) => [s.id, s.name.toLowerCase()])
  );

  const results: SearchResult[] = [];

  for (const item of items) {
    if (statusFilter === 'active' && item.status !== 'active') continue;
    if (statusFilter === 'archived' && item.status !== 'archived') continue;
    if (item.status === 'deleted') continue;

    let score = 0;
    const matchedFields: string[] = [];
    const contentLower = item.content.toLowerCase();
    const firstLine = (contentLower.split('\n')[0] || '').trim();

    // 1. Exact phrase match (+100) (Spec 44.1)
    if (contentLower.includes(trimmed)) {
      score += 100;
      matchedFields.push('content');
    }

    // 2. Title / first line match (+50) (Spec 44.2)
    if (firstLine.includes(trimmed)) {
      score += 50;
      matchedFields.push('title');
    }

    // Token / keyword matches (+10 per token)
    let tokensMatched = 0;
    for (const token of tokens) {
      if (contentLower.includes(token)) {
        tokensMatched++;
        score += 10;
      }
    }

    // Check workspace name match
    if (item.workspaceId) {
      const wsName = workspaceMap.get(item.workspaceId) || '';
      if (wsName.includes(trimmed)) {
        score += 25;
        matchedFields.push('workspace');
      }
    }

    // Check section name match (+25)
    if (item.sectionId) {
      const secName = sectionMap.get(item.sectionId) || '';
      if (secName.includes(trimmed)) {
        score += 25;
        matchedFields.push('section');
      }
    }

    // 3. Recency boost (Spec 44.3)
    // Within 1 hour: +35, within 24 hours: +25, within 7 days: +15
    const ageHours = (now - item.updatedAt) / (1000 * 60 * 60);
    if (ageHours < 1) {
      score += 35;
    } else if (ageHours < 24) {
      score += 25;
    } else if (ageHours < 24 * 7) {
      score += 15;
    }

    // 4. Active workspace match (+20) (Spec 44.4)
    if (activeWorkspaceId && item.workspaceId === activeWorkspaceId) {
      score += 20;
    }

    // 5. Source URL / domain match (+15) (Spec 44.5)
    if (item.source) {
      const domain = (item.source.domain || '').toLowerCase();
      const url = (item.source.url || '').toLowerCase();
      const title = (item.source.title || '').toLowerCase();
      const quote = (item.source.capturedText || '').toLowerCase();

      if (domain.includes(trimmed) || url.includes(trimmed)) {
        score += 15;
        matchedFields.push('source-url');
      }
      if (title.includes(trimmed)) {
        score += 12;
        matchedFields.push('source-title');
      }
      if (quote.includes(trimmed)) {
        score += 10;
        matchedFields.push('source-quote');
      }
    }

    // Require at least one matched field or token match
    if (tokens.length > 0 && tokensMatched === 0 && matchedFields.length === 0) {
      continue;
    }

    // Extract snippet around first occurrence
    const matchIndex = contentLower.indexOf(tokens[0] || trimmed);
    let snippet = item.content;
    if (matchIndex >= 0 && item.content.length > 120) {
      const start = Math.max(0, matchIndex - 30);
      const end = Math.min(item.content.length, matchIndex + 90);
      snippet =
        (start > 0 ? '...' : '') +
        item.content.slice(start, end).replace(/[\n\r]+/g, ' ') +
        (end < item.content.length ? '...' : '');
    } else if (item.content.length > 120) {
      snippet = item.content.slice(0, 120).replace(/[\n\r]+/g, ' ') + '...';
    }

    results.push({
      item,
      score,
      matchedFields: Array.from(new Set(matchedFields)),
      matchedSnippet: snippet,
    });
  }

  // Sort descending by score, then recency
  return results
    .sort((a, b) => b.score - a.score || b.item.updatedAt - a.item.updatedAt)
    .slice(0, limit);
}
