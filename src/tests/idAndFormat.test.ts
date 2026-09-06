import { describe, it, expect } from 'vitest';
import { generateId } from '../utils/id';
import { formatTimeAgo, extractDomain, extractUrls, truncate } from '../utils/format';

describe('Utility Helpers', () => {
  it('generates unique ids with optional prefix', () => {
    const id1 = generateId('item');
    const id2 = generateId('item');
    expect(id1.startsWith('item_')).toBe(true);
    expect(id2.startsWith('item_')).toBe(true);
    expect(id1).not.toBe(id2);
  });

  it('formats time ago correctly', () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 10000)).toBe('just now');
    expect(formatTimeAgo(now - 1000 * 60 * 5)).toBe('5m ago');
    expect(formatTimeAgo(now - 1000 * 60 * 60 * 3)).toBe('3h ago');
    expect(formatTimeAgo(now - 1000 * 60 * 60 * 25)).toBe('yesterday');
    expect(formatTimeAgo(now - 1000 * 60 * 60 * 24 * 3)).toBe('3d ago');
  });

  it('extracts clean domains from URLs', () => {
    expect(extractDomain('https://www.github.com/facebook/react')).toBe('github.com');
    expect(extractDomain('http://docs.stripe.com/api')).toBe('docs.stripe.com');
    expect(extractDomain('invalid-url')).toBe('invalid-url');
  });

  it('extracts URLs from arbitrary text', () => {
    const text = 'Check out https://vitejs.dev and also https://react.dev for docs.';
    const urls = extractUrls(text);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe('https://vitejs.dev');
    expect(urls[1]).toBe('https://react.dev');
  });

  it('truncates long text properly', () => {
    const short = 'Short string';
    expect(truncate(short, 50)).toBe('Short string');

    const long = 'This is a very long string that should be truncated to fifty chars maximum length';
    const truncated = truncate(long, 30);
    expect(truncated.endsWith('...')).toBe(true);
    expect(truncated.length).toBeLessThanOrEqual(33);
  });
});
