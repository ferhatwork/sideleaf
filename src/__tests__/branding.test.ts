import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { en } from '../i18n/en';
import { tr } from '../i18n/tr';

describe('Brand Identity & Verification Suite (Sideleaf)', () => {
  // Helper to recursively collect all translation strings and their paths
  function getAllStringValues(obj: Record<string, any>, prefix = ''): Array<{ path: string; value: string }> {
    const results: Array<{ path: string; value: string }> = [];
    for (const [key, val] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'string') {
        results.push({ path: currentPath, value: val });
      } else if (typeof val === 'object' && val !== null) {
        results.push(...getAllStringValues(val, currentPath));
      }
    }
    return results;
  }

  describe('i18n English Copy Branding', () => {
    it('sets primary brand title to Sideleaf', () => {
      expect(en.today.emptyHeading).toBe('Sideleaf');
      expect(en.settings.aboutTitle).toBe('Sideleaf');
      expect(en.settings.installApp).toBe('Install Sideleaf');
      expect(en.settings.installAppDesc).toContain('Sideleaf');
      expect(en.settings.exportSideleaf).toBe('Export .sideleaf Backup');
      expect(en.settings.themeDescription).toContain('Sideleaf');
    });

    it('contains no accidental Workpad branding in user-facing copy', () => {
      const strings = getAllStringValues(en);
      for (const { path: keyPath, value } of strings) {
        // Legacy file format reference .workpad is permitted ONLY in chooseFile/import
        if (value.toLowerCase().includes('workpad')) {
          const isAllowedLegacyFileReference =
            keyPath.includes('chooseFile') && value.includes('.workpad');
          const isAllowedKeyFallbackCopy =
            keyPath.includes('exportWorkpad') && value.includes('.sideleaf');

          expect(
            isAllowedLegacyFileReference || isAllowedKeyFallbackCopy,
            `Unexpected Workpad brand mention in English copy at "${keyPath}": "${value}"`
          ).toBe(true);

          // Must never be used as a standalone product name
          expect(value).not.toMatch(/\bWorkpad\b(?!\s*file)/);
        }
      }
    });
  });

  describe('i18n Turkish Copy Branding', () => {
    it('sets primary brand title to Sideleaf', () => {
      expect(en.settings.aboutTitle).toBe('Sideleaf');
      expect(tr.settings.aboutTitle).toBe('Sideleaf');
      expect(tr.settings.installApp).toBe("Sideleaf'i Yükle");
      expect(tr.settings.installAppDesc).toContain("Sideleaf'i");
      expect(tr.settings.exportSideleaf).toBe('.sideleaf Yedeği Dışa Aktar');
      expect(tr.settings.themeDescription).toContain('Sideleaf');
    });

    it('contains no accidental Workpad branding in user-facing copy', () => {
      const strings = getAllStringValues(tr);
      for (const { path: keyPath, value } of strings) {
        // Legacy file format reference .workpad is permitted ONLY in chooseFile/import
        if (value.toLowerCase().includes('workpad')) {
          const isAllowedLegacyFileReference =
            keyPath.includes('chooseFile') && value.includes('.workpad');
          const isAllowedKeyFallbackCopy =
            keyPath.includes('exportWorkpad') && value.includes('.sideleaf');

          expect(
            isAllowedLegacyFileReference || isAllowedKeyFallbackCopy,
            `Unexpected Workpad brand mention in Turkish copy at "${keyPath}": "${value}"`
          ).toBe(true);

          // Must never be used as a standalone product name
          expect(value).not.toMatch(/\bWorkpad\b(?!\s*dosya)/);
        }
      }
    });
  });

  describe('PWA Manifest Metadata', () => {
    it('declares name and short_name as Sideleaf in manifest.webmanifest', () => {
      const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const raw = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);

      expect(manifest.name).toBe('Sideleaf');
      expect(manifest.short_name).toBe('Sideleaf');
      expect(manifest.description.toLowerCase()).not.toContain('workpad');
      expect(manifest.description).toContain('Sideleaf');
    });
  });

  describe('Package & HTML Metadata', () => {
    it('has package.json name set to sideleaf', () => {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      expect(pkg.name).toBe('sideleaf');
      expect(pkg.description).toContain('Sideleaf');
    });

    it('has index.html title and meta tags branded as Sideleaf', () => {
      const htmlPath = path.resolve(process.cwd(), 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf8');

      expect(html).toContain('<title>Sideleaf</title>');
      expect(html).toContain('<meta name="application-name" content="Sideleaf" />');
      expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Sideleaf" />');
      expect(html).toContain('<meta property="og:title" content="Sideleaf" />');
      expect(html).toContain('<meta name="twitter:title" content="Sideleaf" />');
    });
  });
});
