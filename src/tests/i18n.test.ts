import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { en, tr, getTranslation, formatLocalizedDate } from '../i18n';
import { formatTimeAgo, formatLocalizedDateTime } from '../utils/format';

describe('i18n & Localization Suite', () => {
  describe('Key parity between English and Turkish', () => {
    it('has zero missing sections between EN and TR', () => {
      const enSections = Object.keys(en).sort();
      const trSections = Object.keys(tr).sort();
      expect(trSections).toEqual(enSections);
    });

    it('has complete key parity with 0 missing keys across all sections', () => {
      const missingInTr: string[] = [];
      const missingInEn: string[] = [];
      const emptyKeys: string[] = [];

      const sections = Object.keys(en) as (keyof typeof en)[];

      for (const section of sections) {
        const enObj = en[section] as unknown as Record<string, string>;
        const trObj = tr[section] as unknown as Record<string, string>;

        const enKeys = Object.keys(enObj);
        const trKeys = Object.keys(trObj);

        for (const key of enKeys) {
          if (!(key in trObj)) {
            missingInTr.push(`${section}.${key}`);
          } else if (!trObj[key] || trObj[key].trim() === '') {
            emptyKeys.push(`tr:${section}.${key}`);
          }
          if (!enObj[key] || enObj[key].trim() === '') {
            emptyKeys.push(`en:${section}.${key}`);
          }
        }

        for (const key of trKeys) {
          if (!(key in enObj)) {
            missingInEn.push(`${section}.${key}`);
          }
        }
      }

      expect(missingInTr).toEqual([]);
      expect(missingInEn).toEqual([]);
      expect(emptyKeys).toEqual([]);
    });

    it('returns appropriate translation dictionary with getTranslation', () => {
      expect(getTranslation('en').navigation.today).toBe('Today');
      expect(getTranslation('tr').navigation.today).toBe('Bugün');
      // @ts-expect-error test fallback
      expect(getTranslation('unknown').navigation.today).toBe('Today');
    });
  });

  describe('Date formatting in English and Turkish', () => {
    // Fixed reference date: September 6, 2026 (Sunday) at 14:30:00 UTC
    const fixedDate = new Date('2026-09-06T14:30:00Z');

    it('formats localized date correctly in English', () => {
      const formatted = formatLocalizedDate(fixedDate, 'en');
      expect(formatted).toContain('Sunday');
      expect(formatted).toContain('September');
      expect(formatted).toContain('6');
    });

    it('formats localized date correctly in Turkish', () => {
      const formatted = formatLocalizedDate(fixedDate, 'tr');
      expect(formatted).toContain('Pazar');
      expect(formatted).toContain('Eylül');
      expect(formatted).toContain('6');
    });

    it('formats localized date and time in English and Turkish', () => {
      const enDateTime = formatLocalizedDateTime(fixedDate.getTime(), 'en');
      const trDateTime = formatLocalizedDateTime(fixedDate.getTime(), 'tr');

      expect(enDateTime).toContain('Sep');
      expect(trDateTime).toContain('Eyl');
    });
  });

  describe('Relative time formatting (formatTimeAgo) in EN and TR', () => {
    const now = 1700000000000;
    const originalDateNow = Date.now;

    beforeAll(() => {
      Date.now = () => now;
    });

    afterAll(() => {
      Date.now = originalDateNow;
    });

    it('formats "just now" vs "az önce" (< 45s)', () => {
      const recentTimestamp = now - 20 * 1000;
      expect(formatTimeAgo(recentTimestamp, 'en')).toBe('just now');
      expect(formatTimeAgo(recentTimestamp, 'tr')).toBe('az önce');
    });

    it('formats minutes ago: "Xm ago" vs "X dk önce"', () => {
      const minsTimestamp = now - 15 * 60 * 1000;
      expect(formatTimeAgo(minsTimestamp, 'en')).toBe('15m ago');
      expect(formatTimeAgo(minsTimestamp, 'tr')).toBe('15 dk önce');
    });

    it('formats hours ago: "Xh ago" vs "X sa önce"', () => {
      const hoursTimestamp = now - 4 * 3600 * 1000;
      expect(formatTimeAgo(hoursTimestamp, 'en')).toBe('4h ago');
      expect(formatTimeAgo(hoursTimestamp, 'tr')).toBe('4 sa önce');
    });

    it('formats "yesterday" vs "dün" (1 day ago)', () => {
      const yesterdayTimestamp = now - 25 * 3600 * 1000;
      expect(formatTimeAgo(yesterdayTimestamp, 'en')).toBe('yesterday');
      expect(formatTimeAgo(yesterdayTimestamp, 'tr')).toBe('dün');
    });

    it('formats days ago: "Xd ago" vs "X gün önce"', () => {
      const daysTimestamp = now - 5 * 24 * 3600 * 1000;
      expect(formatTimeAgo(daysTimestamp, 'en')).toBe('5d ago');
      expect(formatTimeAgo(daysTimestamp, 'tr')).toBe('5 gün önce');
    });

    it('formats dates older than 7 days in locale-aware format', () => {
      const pastTimestamp = now - 14 * 24 * 3600 * 1000;
      const enFormatted = formatTimeAgo(pastTimestamp, 'en');
      const trFormatted = formatTimeAgo(pastTimestamp, 'tr');

      expect(enFormatted).toBeDefined();
      expect(trFormatted).toBeDefined();
      expect(enFormatted).not.toBe(trFormatted);
    });
  });
});
