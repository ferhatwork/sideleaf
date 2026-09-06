import { Item, Workspace, SearchResult } from '../types';

export interface SearchOptions {
  query: string;
  items: Item[];
  workspaces: Workspace[];
  activeWorkspaceId?: string | null;
  statusFilter?: 'all' | 'active' | 'archived';
  limit?: number;
}

export function searchItems(options: SearchOptions): SearchResult[] {
  const {
    query,
    items,
    workspaces,
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

  const results: SearchResult[] = [];

  for (const item of items) {
    if (statusFilter === 'active' && item.status !== 'active') continue;
    if (statusFilter === 'archived' && item.status !== 'archived') continue;
    if (item.status === 'deleted') continue;

    let score = 0;
    const matchedFields: string[] = [];
    const contentLower = item.content.toLowerCase();
    const firstLine = (contentLower.split('\n')[0] || '').trim();

    // 1. Exact phrase match
    if (contentLower.includes(trimmed)) {
      score += 100;
      matchedFields.push('content');
    }

    // 2. First line / title match
    if (firstLine.includes(trimmed)) {
      score += 50;
      matchedFields.push('title');
    }

    // 3. Token match
    let tokensMatched = 0;
    for (const token of tokens) {
      if (contentLower.includes(token)) {
        tokensMatched++;
        score += 15;
      }
    }

    // Check workspace name match
    if (item.workspaceId) {
      const wsName = workspaceMap.get(item.workspaceId) || '';
      if (wsName.includes(trimmed)) {
        score += 35;
        matchedFields.push('workspace');
      }
    }

    // Check source matches
    if (item.source) {
      const domain = (item.source.domain || '').toLowerCase();
      const url = (item.source.url || '').toLowerCase();
      const title = (item.source.title || '').toLowerCase();
      const quote = (item.source.capturedText || '').toLowerCase();

      if (domain.includes(trimmed) || url.includes(trimmed)) {
        score += 40;
        matchedFields.push('source-url');
      }
      if (title.includes(trimmed)) {
        score += 30;
        matchedFields.push('source-title');
      }
      if (quote.includes(trimmed)) {
        score += 25;
        matchedFields.push('source-quote');
      }
    }

    // If query has multiple tokens, require at least one token match
    if (tokens.length > 0 && tokensMatched === 0 && matchedFields.length === 0) {
      continue;
    }

    // Active workspace bonus
    if (activeWorkspaceId && item.workspaceId === activeWorkspaceId) {
      score += 20;
    }

    // Recency bonus: within 24h = +15, within 7d = +8
    const ageHours = (now - item.updatedAt) / (1000 * 60 * 60);
    if (ageHours < 24) {
      score += 15;
    } else if (ageHours < 24 * 7) {
      score += 8;
    }

    // Extract snippet around first occurrence
    const matchIndex = contentLower.indexOf(tokens[0] || trimmed);
    let snippet = item.content;
    if (matchIndex >= 0 && item.content.length > 120) {
      const start = Math.max(0, matchIndex - 30);
      const end = Math.min(item.content.length, matchIndex + 90);
      snippet = (start > 0 ? '...' : '') + item.content.slice(start, end).replace(/[\n\r]+/g, ' ') + (end < item.content.length ? '...' : '');
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
