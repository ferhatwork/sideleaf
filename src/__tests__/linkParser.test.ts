import { describe, it, expect } from 'vitest';
import {
  parseBulkInput,
  extractRawUrls,
  extractDomain,
  isValidUrl,
} from '../utils/linkParser';
import { Item } from '../types';

describe('linkParser Utility Suite', () => {
  describe('extractDomain helper', () => {
    it('extracts domain from standard URLs', () => {
      expect(extractDomain('https://site.com/design1')).toBe('site.com');
      expect(extractDomain('http://site.com/design2')).toBe('site.com');
      expect(extractDomain('https://sub.site.com/path?query=1#hash')).toBe('sub.site.com');
    });

    it('removes leading www. from hostnames', () => {
      expect(extractDomain('https://www.example.com/test')).toBe('example.com');
      expect(extractDomain('http://www.google.com')).toBe('google.com');
    });

    it('extracts domain without protocol prefix', () => {
      expect(extractDomain('site.com/design1')).toBe('site.com');
      expect(extractDomain('www.site.com')).toBe('site.com');
    });

    it('supports localhost', () => {
      expect(extractDomain('http://localhost:3000/api')).toBe('localhost');
      expect(extractDomain('localhost:5173')).toBe('localhost');
    });

    it('returns null for invalid or empty inputs', () => {
      expect(extractDomain('')).toBeNull();
      expect(extractDomain('   ')).toBeNull();
      expect(extractDomain('not a url')).toBeNull();
      expect(extractDomain('xyz')).toBeNull();
    });
  });

  describe('isValidUrl helper', () => {
    it('validates well-formed http and https URLs', () => {
      expect(isValidUrl('https://site.com')).toBe(true);
      expect(isValidUrl('https://site.com/design1')).toBe(true);
      expect(isValidUrl('http://sub.domain.co.uk:8080/path?a=1&b=2#test')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('rejects unsupported protocols and non-URLs', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('javascript:void(0)')).toBe(false);
      expect(isValidUrl('mailto:test@example.com')).toBe(false);
      expect(isValidUrl('https://')).toBe(false);
      expect(isValidUrl('http:///broken')).toBe(false);
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('   ')).toBe(false);
      expect(isValidUrl('https://site.com/with space')).toBe(false);
      expect(isValidUrl('https://site.com/1 https://site.com/2')).toBe(false);
    });
  });

  describe('Pattern A: Newline-separated URLs', () => {
    it('parses multiple newline-separated URLs with isMultiLink=true', () => {
      const input = `https://site.com/design1
https://site.com/design2
https://site.com/design3`;

      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(3);
      expect(result.links[0]).toEqual({
        url: 'https://site.com/design1',
        title: undefined,
        domain: 'site.com',
      });
      expect(result.links[1]).toEqual({
        url: 'https://site.com/design2',
        title: undefined,
        domain: 'site.com',
      });
      expect(result.links[2]).toEqual({
        url: 'https://site.com/design3',
        title: undefined,
        domain: 'site.com',
      });
      expect(result.originalText).toBe(input);
    });

    it('handles Windows CRLF line endings and surrounding whitespace', () => {
      const input = '  https://a.com/1  \r\n  https://b.com/2  \r\n';
      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(2);
      expect(result.links[0].url).toBe('https://a.com/1');
      expect(result.links[0].domain).toBe('a.com');
      expect(result.links[1].url).toBe('https://b.com/2');
      expect(result.links[1].domain).toBe('b.com');
    });
  });

  describe('Pattern B: Title | URL per line', () => {
    it('parses Title | URL lines correctly', () => {
      const input = `Vintage Skull | https://site.com/design1
Route 66 | https://site.com/design2
American Eagle | https://site.com/design3`;

      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(3);
      expect(result.links[0]).toEqual({
        title: 'Vintage Skull',
        url: 'https://site.com/design1',
        domain: 'site.com',
      });
      expect(result.links[1]).toEqual({
        title: 'Route 66',
        url: 'https://site.com/design2',
        domain: 'site.com',
      });
      expect(result.links[2]).toEqual({
        title: 'American Eagle',
        url: 'https://site.com/design3',
        domain: 'site.com',
      });
    });

    it('handles inverted URL | Title pattern', () => {
      const input = `https://site.com/design1 | Vintage Skull
https://site.com/design2 | Route 66`;

      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(2);
      expect(result.links[0]).toEqual({
        title: 'Vintage Skull',
        url: 'https://site.com/design1',
        domain: 'site.com',
      });
      expect(result.links[1]).toEqual({
        title: 'Route 66',
        url: 'https://site.com/design2',
        domain: 'site.com',
      });
    });

    it('handles titles containing additional pipe characters', () => {
      const input = `Category | Vintage Skull | https://site.com/design1
Retro | Route 66 | https://site.com/design2`;

      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links[0].title).toBe('Category | Vintage Skull');
      expect(result.links[0].url).toBe('https://site.com/design1');
      expect(result.links[1].title).toBe('Retro | Route 66');
    });

    it('cleans wrapped brackets or quotes in pipe pattern', () => {
      const input = `Vintage Skull | <https://site.com/design1>
Route 66 | "https://site.com/design2"`;

      const result = parseBulkInput(input);
      expect(result.links[0].url).toBe('https://site.com/design1');
      expect(result.links[1].url).toBe('https://site.com/design2');
    });
  });

  describe('Pattern C: Mixed whitespace or Title followed by URL', () => {
    it('parses Title followed by URL with spaces/tabs on same line', () => {
      const input = `Vintage Skull    https://site.com/design1
Route 66\thttps://site.com/design2
American Eagle: https://site.com/design3
Retro Poster - https://site.com/design4`;

      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(4);
      expect(result.links[0]).toEqual({
        title: 'Vintage Skull',
        url: 'https://site.com/design1',
        domain: 'site.com',
      });
      expect(result.links[1]).toEqual({
        title: 'Route 66',
        url: 'https://site.com/design2',
        domain: 'site.com',
      });
      expect(result.links[2]).toEqual({
        title: 'American Eagle',
        url: 'https://site.com/design3',
        domain: 'site.com',
      });
      expect(result.links[3]).toEqual({
        title: 'Retro Poster',
        url: 'https://site.com/design4',
        domain: 'site.com',
      });
    });

    it('parses Title on one line followed by URL on next line', () => {
      const input = `Vintage Skull    https://site.com/design1

Route 66
https://site.com/design2`;

      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(2);
      expect(result.links[0]).toEqual({
        title: 'Vintage Skull',
        url: 'https://site.com/design1',
        domain: 'site.com',
      });
      expect(result.links[1]).toEqual({
        title: 'Route 66',
        url: 'https://site.com/design2',
        domain: 'site.com',
      });
    });

    it('parses consecutive Title and URL pairs across multiple lines', () => {
      const input = `First Design
https://site.com/1

Second Design
https://site.com/2

Third Design
https://site.com/3`;

      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(3);
      expect(result.links[0].title).toBe('First Design');
      expect(result.links[0].url).toBe('https://site.com/1');
      expect(result.links[1].title).toBe('Second Design');
      expect(result.links[1].url).toBe('https://site.com/2');
      expect(result.links[2].title).toBe('Third Design');
      expect(result.links[2].url).toBe('https://site.com/3');
    });

    it('handles multiple space-separated URLs on a single line', () => {
      const input = 'https://site.com/1 https://site.com/2 https://site.com/3';
      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(3);
      expect(result.links[0].url).toBe('https://site.com/1');
      expect(result.links[1].url).toBe('https://site.com/2');
      expect(result.links[2].url).toBe('https://site.com/3');
    });

    it('supports Markdown link syntax [Title](URL)', () => {
      const input = `[Vintage Skull](https://site.com/design1)
[Route 66](https://site.com/design2)`;

      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(2);
      expect(result.links[0]).toEqual({
        title: 'Vintage Skull',
        url: 'https://site.com/design1',
        domain: 'site.com',
      });
      expect(result.links[1]).toEqual({
        title: 'Route 66',
        url: 'https://site.com/design2',
        domain: 'site.com',
      });
    });
  });

  describe('Blank lines, invalid URLs, and error resilience', () => {
    it('handles blank lines gracefully without failing', () => {
      const input = `

https://site.com/1


https://site.com/2

`;
      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(2);
      expect(result.links[0].url).toBe('https://site.com/1');
      expect(result.links[1].url).toBe('https://site.com/2');
    });

    it('skips invalid URLs cleanly without crashing or treating them as titles', () => {
      const input = `https://site.com/1
not-a-valid-url
htp:/malformed
https://site.com/2
https://
https://site.com/3`;

      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(3);
      expect(result.links[0].url).toBe('https://site.com/1');
      expect(result.links[1].url).toBe('https://site.com/2');
      expect(result.links[2].url).toBe('https://site.com/3');
    });

    it('does not crash on malformed pipe lines', () => {
      const input = `Header 1 | Header 2
https://site.com/1
Invalid Title | not-a-valid-url
https://site.com/2`;

      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(2);
    });

    it('resets pendingTitle when multiple non-URL text lines appear (ambiguous text)', () => {
      const input = `Paragraph 1 of random article
Paragraph 2 of random article
https://site.com/1`;

      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(false); // only 1 link
      expect(result.links).toHaveLength(1);
      // Paragraph 2 should not become the title of https://site.com/1
      expect(result.links[0].title).toBeUndefined();
    });
  });

  describe('isMultiLink detection & Ambiguity', () => {
    it('returns isMultiLink=false for empty or whitespace text', () => {
      expect(parseBulkInput('').isMultiLink).toBe(false);
      expect(parseBulkInput('').links).toEqual([]);
      expect(parseBulkInput('   \n\n  ').isMultiLink).toBe(false);
      expect(parseBulkInput('   \n\n  ').links).toEqual([]);
    });

    it('returns isMultiLink=false when no links are present', () => {
      const text = 'Just some text\nWith a checklist\nAnd notes';
      const result = parseBulkInput(text);
      expect(result.isMultiLink).toBe(false);
      expect(result.links).toHaveLength(0);
      expect(result.originalText).toBe(text);
    });

    it('returns isMultiLink=false when only 1 link is present', () => {
      const singleA = parseBulkInput('https://site.com/design1');
      expect(singleA.isMultiLink).toBe(false);
      expect(singleA.links).toHaveLength(1);
      expect(singleA.links[0].url).toBe('https://site.com/design1');

      const singleB = parseBulkInput('Vintage Skull | https://site.com/design1');
      expect(singleB.isMultiLink).toBe(false);
      expect(singleB.links).toHaveLength(1);
      expect(singleB.links[0].title).toBe('Vintage Skull');

      const singleC = parseBulkInput('Route 66\nhttps://site.com/design2');
      expect(singleC.isMultiLink).toBe(false);
      expect(singleC.links).toHaveLength(1);
      expect(singleC.links[0].title).toBe('Route 66');
    });

    it('returns isMultiLink=true when 2 or more links are detected', () => {
      const result = parseBulkInput('https://site.com/1\nhttps://site.com/2');
      expect(result.isMultiLink).toBe(true);
      expect(result.links).toHaveLength(2);
    });
  });

  describe('extractRawUrls helper', () => {
    const mockItem = (overrides: Partial<Item>): Item => ({
      id: 'test-id',
      workspaceId: 'ws-1',
      type: 'text',
      content: '',
      status: 'active',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
      ...overrides,
    });

    it('extracts URLs from link items with URL in content', () => {
      const items: Item[] = [
        mockItem({ id: '1', type: 'link', content: 'https://site.com/design1' }),
        mockItem({ id: '2', type: 'link', content: 'https://site.com/design2' }),
      ];

      const rawUrls = extractRawUrls(items);
      expect(rawUrls).toBe('https://site.com/design1\nhttps://site.com/design2');
    });

    it('extracts URLs from items where source.url is populated', () => {
      const items: Item[] = [
        mockItem({
          id: '1',
          type: 'link',
          content: 'Vintage Skull',
          source: { url: 'https://site.com/design1', capturedAt: 1000 },
        }),
        mockItem({
          id: '2',
          type: 'link',
          content: 'Route 66',
          source: { url: 'https://site.com/design2', capturedAt: 1000 },
        }),
      ];

      const rawUrls = extractRawUrls(items);
      expect(rawUrls).toBe('https://site.com/design1\nhttps://site.com/design2');
    });

    it('skips non-link items without URLs', () => {
      const items: Item[] = [
        mockItem({ id: '1', type: 'text', content: 'Plain note' }),
        mockItem({ id: '2', type: 'checklist', content: 'Finish mockup', checked: false }),
        mockItem({ id: '3', type: 'divider', content: '---' }),
        mockItem({ id: '4', type: 'link', content: 'https://site.com/design1' }),
        mockItem({ id: '5', type: 'decision', content: 'Use Tailwind' }),
      ];

      const rawUrls = extractRawUrls(items);
      expect(rawUrls).toBe('https://site.com/design1');
    });

    it('skips link items whose content is not a URL and source.url is empty', () => {
      const items: Item[] = [
        mockItem({ id: '1', type: 'link', content: 'Broken link without URL', source: { url: '', capturedAt: 0 } }),
        mockItem({ id: '2', type: 'link', content: 'Not a URL either' }),
        mockItem({ id: '3', type: 'link', content: 'https://site.com/valid' }),
      ];

      const rawUrls = extractRawUrls(items);
      expect(rawUrls).toBe('https://site.com/valid');
    });

    it('skips deleted items', () => {
      const items: Item[] = [
        mockItem({ id: '1', type: 'link', content: 'https://site.com/active' }),
        mockItem({ id: '2', type: 'link', content: 'https://site.com/deleted', status: 'deleted' }),
      ];

      const rawUrls = extractRawUrls(items);
      expect(rawUrls).toBe('https://site.com/active');
    });

    it('handles empty list or invalid arguments', () => {
      expect(extractRawUrls([])).toBe('');
      expect(extractRawUrls(null as any)).toBe('');
      expect(extractRawUrls(undefined as any)).toBe('');
    });
  });

  describe('Adversarial Edge Cases & Punctuation Cleanup', () => {
    it('strips trailing periods from URLs without corrupting domain/path', () => {
      const input = `https://site.com/design1.
https://site.com/design2...`;
      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links[0].url).toBe('https://site.com/design1');
      expect(result.links[1].url).toBe('https://site.com/design2');
    });

    it('strips unbalanced trailing closing parentheses while preserving balanced Wikipedia URLs', () => {
      const input = `(see https://site.com/resource)
https://en.wikipedia.org/wiki/Design_(disambiguation)`;
      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links[0].url).toBe('https://site.com/resource');
      expect(result.links[1].url).toBe('https://en.wikipedia.org/wiki/Design_(disambiguation)');
    });

    it('does not misparse URLs with pipes in query strings as Pattern B', () => {
      const input = `https://site.com/search?q=foo|bar
https://site.com/api?filter=1|2`;
      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links[0].url).toBe('https://site.com/search?q=foo|bar');
      expect(result.links[0].title).toBeUndefined();
      expect(result.links[1].url).toBe('https://site.com/api?filter=1|2');
      expect(result.links[1].title).toBeUndefined();
    });

    it('correctly parses Pattern B when the URL contains a pipe character in query', () => {
      const input = `Search Page | https://site.com/search?q=foo|bar
Data Filter | https://site.com/api?filter=1|2`;
      const result = parseBulkInput(input);
      expect(result.isMultiLink).toBe(true);
      expect(result.links[0]).toEqual({
        title: 'Search Page',
        url: 'https://site.com/search?q=foo|bar',
        domain: 'site.com',
      });
      expect(result.links[1]).toEqual({
        title: 'Data Filter',
        url: 'https://site.com/api?filter=1|2',
        domain: 'site.com',
      });
    });
  });
});

