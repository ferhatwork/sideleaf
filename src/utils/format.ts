import { Locale } from '../types';
export { formatLocalizedDate } from '../i18n';

export function formatTimeAgo(timestamp: number, locale: Locale = 'en'): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (locale === 'tr') {
    if (diffSec < 45) return 'az önce';
    if (diffMin < 60) return `${diffMin} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays === 1) return 'dün';
    if (diffDays < 7) return `${diffDays} gün önce`;

    const date = new Date(timestamp);
    return date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
  }

  if (diffSec < 45) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLocalizedDateTime(timestamp: number, locale: Locale = 'en'): string {
  const date = new Date(timestamp);
  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US';
  return date.toLocaleString(localeTag, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function extractDomain(urlStr: string): string | null {
  try {
    const url = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

export function truncate(text: string, maxLength: number = 80): string {
  if (!text) return '';
  const clean = text.replace(/[\n\r]+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trimEnd() + '...';
}
