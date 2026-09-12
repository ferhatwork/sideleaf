import { BulkParseResult, ParsedLinkItem, Item } from '../types';

/**
 * Extracts domain from a URL (e.g. "https://site.com/design1" -> "site.com").
 * Strips leading "www." and ignores port numbers.
 */
export function extractDomain(urlStr: string): string | null {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const trimmed = urlStr.trim();
  if (!trimmed) return null;

  try {
    const candidate =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (!parsed.hostname) return null;
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return null;
    }
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

/**
 * Validates whether a string is a well-formed http or https URL.
 */
export function isValidUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed) return false;
  // A raw URL candidate must not contain unencoded whitespace
  if (/\s/.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (!parsed.hostname) return false;
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Strips wrapping quotes, angle brackets, or trailing punctuation from a URL candidate.
 * Preserves balanced parentheses (e.g. Wikipedia links) while stripping unbalanced trailing ones.
 */
function cleanUrl(raw: string): string {
  let u = raw.trim();
  if ((u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'"))) {
    u = u.slice(1, -1).trim();
  }
  if (
    (u.startsWith('<') && u.endsWith('>')) ||
    (u.startsWith('(') && u.endsWith(')')) ||
    (u.startsWith('[') && u.endsWith(']'))
  ) {
    u = u.slice(1, -1).trim();
  }

  // Strip trailing commas, semicolons, colons
  u = u.replace(/[,;:]+$/, '');

  // Strip unbalanced trailing closing parentheses (e.g. from "(https://site.com)")
  while (u.endsWith(')')) {
    const openCount = (u.match(/\(/g) || []).length;
    const closeCount = (u.match(/\)/g) || []).length;
    if (closeCount > openCount) {
      u = u.slice(0, -1).trim();
    } else {
      break;
    }
  }

  // Strip trailing periods (common when URLs end sentences)
  u = u.replace(/\.+$/, '');

  return u;
}

/**
 * Checks if a string looks like an attempted/broken URL to avoid mistaking it for a title.
 */
function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('ftp://') ||
    trimmed.startsWith('www.') ||
    /^https?:/i.test(trimmed) ||
    /^[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(trimmed)
  );
}

/**
 * Pure parsing helper for bulk link input.
 * Supports:
 * - Pattern A: Newline-separated URLs
 * - Pattern B: Title | URL per line (or URL | Title)
 * - Pattern C: Mixed whitespace (Title    URL) or Title on one line followed by URL on next line
 * - Markdown links: [Title](URL)
 * - Blank lines and invalid URLs handled cleanly
 *
 * Sets `isMultiLink: true` when 2 or more valid links are detected.
 */
export function parseBulkInput(text: string): BulkParseResult {
  if (!text || typeof text !== 'string') {
    return {
      isMultiLink: false,
      links: [],
      originalText: text || '',
    };
  }

  const links: ParsedLinkItem[] = [];
  const lines = text.split(/\r?\n/);
  let pendingTitle: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    // Cleanly skip blank lines without resetting pendingTitle
    if (!trimmedLine) {
      continue;
    }

    // Check for Markdown link: [Title](URL)
    const mdMatch = trimmedLine.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (mdMatch) {
      const url = cleanUrl(mdMatch[2]);
      if (isValidUrl(url)) {
        links.push({
          url,
          title: mdMatch[1].trim() || undefined,
          domain: extractDomain(url) || undefined,
        });
        pendingTitle = null;
        continue;
      }
    }

    // If the entire line is a valid URL itself, do not treat as Pattern B even if it has pipes in query/hash
    const wholeLineUrl = cleanUrl(trimmedLine);
    if (isValidUrl(wholeLineUrl)) {
      links.push({
        url: wholeLineUrl,
        title: pendingTitle || undefined,
        domain: extractDomain(wholeLineUrl) || undefined,
      });
      pendingTitle = null;
      continue;
    }

    // Pattern B: Title | URL or URL | Title
    if (trimmedLine.includes('|')) {
      const firstPipe = trimmedLine.indexOf('|');
      const lastPipe = trimmedLine.lastIndexOf('|');

      // Check URL at the end: "Title | URL" or "Cat | Title | URL"
      const candidateUrlEnd = cleanUrl(trimmedLine.slice(lastPipe + 1));
      const candidateTitleBefore = trimmedLine.slice(0, lastPipe).trim();

      // Check URL at the beginning: "URL | Title"
      const candidateUrlStart = cleanUrl(trimmedLine.slice(0, firstPipe));
      const candidateTitleAfter = trimmedLine.slice(firstPipe + 1).trim();

      // Check if after first pipe is a URL containing a pipe in query: "Title | https://...?a|b"
      const candidateUrlAfterFirstPipe = cleanUrl(trimmedLine.slice(firstPipe + 1));
      const candidateTitleBeforeFirstPipe = trimmedLine.slice(0, firstPipe).trim();

      if (isValidUrl(candidateUrlEnd)) {
        links.push({
          url: candidateUrlEnd,
          title: candidateTitleBefore || undefined,
          domain: extractDomain(candidateUrlEnd) || undefined,
        });
        pendingTitle = null;
        continue;
      } else if (isValidUrl(candidateUrlAfterFirstPipe)) {
        links.push({
          url: candidateUrlAfterFirstPipe,
          title: candidateTitleBeforeFirstPipe || undefined,
          domain: extractDomain(candidateUrlAfterFirstPipe) || undefined,
        });
        pendingTitle = null;
        continue;
      } else if (isValidUrl(candidateUrlStart)) {
        links.push({
          url: candidateUrlStart,
          title: candidateTitleAfter || undefined,
          domain: extractDomain(candidateUrlStart) || undefined,
        });
        pendingTitle = null;
        continue;
      }

      // Line had pipe but no valid URL - treat as non-link / invalid line
      pendingTitle = null;
      continue;
    }

    // Look for URLs in the line
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = Array.from(trimmedLine.matchAll(urlRegex));

    if (matches.length === 0) {
      // No URL on this line
      if (looksLikeUrl(trimmedLine)) {
        // Invalid or malformed URL - discard
        pendingTitle = null;
      } else if (pendingTitle !== null) {
        // Two non-URL lines in a row: ambiguous, not a title for a single link
        pendingTitle = null;
      } else {
        // Candidate title for the subsequent URL line (Pattern C2)
        pendingTitle = trimmedLine;
      }
      continue;
    }

    if (matches.length === 1) {
      const match = matches[0];
      const rawUrl = match[0];
      const url = cleanUrl(rawUrl);

      if (!isValidUrl(url)) {
        pendingTitle = null;
        continue;
      }

      // Check for inline title before or after the URL (Pattern C1)
      const before = trimmedLine.slice(0, match.index).trim();
      const after = trimmedLine.slice((match.index ?? 0) + rawUrl.length).trim();

      let inlineTitle = '';
      if (before && after) {
        inlineTitle = `${before} ${after}`.trim();
      } else if (before) {
        inlineTitle = before.replace(/[:\-–—\t]+$/, '').trim();
      } else if (after) {
        inlineTitle = after.replace(/^[:\-–—\t]+/, '').trim();
      }

      if (inlineTitle) {
        links.push({
          url,
          title: inlineTitle,
          domain: extractDomain(url) || undefined,
        });
        pendingTitle = null;
      } else if (pendingTitle) {
        // Pattern C2: Title on previous line
        links.push({
          url,
          title: pendingTitle,
          domain: extractDomain(url) || undefined,
        });
        pendingTitle = null;
      } else {
        // Pattern A: Newline-separated URL
        links.push({
          url,
          title: undefined,
          domain: extractDomain(url) || undefined,
        });
        pendingTitle = null;
      }
      continue;
    }

    // Multiple URLs on a single line
    for (const m of matches) {
      const url = cleanUrl(m[0]);
      if (isValidUrl(url)) {
        links.push({
          url,
          title: undefined,
          domain: extractDomain(url) || undefined,
        });
      }
    }
    pendingTitle = null;
  }

  const isMultiLink = links.length >= 2;

  return {
    isMultiLink,
    links,
    originalText: text,
  };
}

/**
 * Extracts raw URLs from a list of Items (one URL per line).
 * Skips non-links, items whose content is not a URL and source.url is empty,
 * and deleted items.
 */
export function extractRawUrls(items: Item[]): string {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  const urls: string[] = [];

  for (const item of items) {
    if (!item || item.status === 'deleted') continue;

    const sourceUrl = item.source?.url?.trim();
    const contentTrimmed = item.content?.trim() || '';
    const contentIsUrl = isValidUrl(contentTrimmed);

    let resolvedUrl: string | null = null;

    if (sourceUrl && isValidUrl(sourceUrl)) {
      resolvedUrl = sourceUrl;
    } else if (contentIsUrl) {
      resolvedUrl = contentTrimmed;
    } else if (sourceUrl) {
      resolvedUrl = sourceUrl;
    }

    if (!resolvedUrl) {
      continue;
    }

    urls.push(resolvedUrl);
  }

  return urls.join('\n');
}
