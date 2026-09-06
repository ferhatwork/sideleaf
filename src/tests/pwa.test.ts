import { describe, it, expect } from 'vitest';
import { en, tr } from '../i18n';

// Ambient declarations for Node builtins in Vitest test environment
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding?: string): any;
}

declare module 'node:path' {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
}

import fs from 'node:fs';
import path from 'node:path';

describe('PWA & Offline Integration Suite', () => {
  const publicDir = path.resolve(process.cwd(), 'public');
  const manifestPath = path.join(publicDir, 'manifest.webmanifest');
  const swPath = path.join(publicDir, 'sw.js');
  const icon192Path = path.join(publicDir, 'icon-192.png');
  const icon512Path = path.join(publicDir, 'icon-512.png');
  const iconSvgPath = path.join(publicDir, 'icon.svg');

  describe('1. manifest.webmanifest compliance (Spec Section 11, 39, 40)', () => {
    it('exists and is valid JSON', () => {
      expect(fs.existsSync(manifestPath)).toBe(true);
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('matches exact PWA specification properties', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.name).toBe('Workpad');
      expect(manifest.short_name).toBe('Workpad');
      expect(manifest.description).toBe('Tiny, local-first work surface for computer work');
      expect(manifest.start_url).toBe('/');
      expect(manifest.scope).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.background_color).toBe('#0f1117');
      expect(manifest.theme_color).toBe('#0f1117');
      expect(manifest.orientation).toBe('any');
      expect(manifest.categories).toEqual(expect.arrayContaining(['productivity', 'utilities']));
    });

    it('contains svg, 192x192 and 512x512 icons', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(Array.isArray(manifest.icons)).toBe(true);

      const svgIcon = manifest.icons.find((i: { src: string }) => i.src === '/icon.svg');
      expect(svgIcon).toBeDefined();
      expect(svgIcon.type).toBe('image/svg+xml');

      const icon192 = manifest.icons.find((i: { src: string }) => i.src === '/icon-192.png');
      expect(icon192).toBeDefined();
      expect(icon192.sizes).toBe('192x192');
      expect(icon192.type).toBe('image/png');

      const icon512 = manifest.icons.find((i: { src: string }) => i.src === '/icon-512.png');
      expect(icon512).toBeDefined();
      expect(icon512.sizes).toBe('512x512');
      expect(icon512.type).toBe('image/png');
    });
  });

  describe('2. Service Worker sw.js (Spec Sections 11, 12, 23, 32, 33)', () => {
    it('exists and targets cache version workpad-v1.0.0', () => {
      expect(fs.existsSync(swPath)).toBe(true);
      const swCode = fs.readFileSync(swPath, 'utf-8');
      expect(swCode).toContain("'workpad-v1.0.0'");
    });

    it('pre-caches core app shell assets', () => {
      const swCode = fs.readFileSync(swPath, 'utf-8');
      expect(swCode).toContain("'/'");
      expect(swCode).toContain("'/index.html'");
      expect(swCode).toContain("'/manifest.webmanifest'");
      expect(swCode).toContain("'/icon.svg'");
    });

    it('strictly checks GET method and ignores non-same-origin requests', () => {
      const swCode = fs.readFileSync(swPath, 'utf-8');
      expect(swCode).toContain("event.request.method !== 'GET'");
      expect(swCode).toContain("url.origin !== self.location.origin");
    });

    it('implements activate cache cleanup and SKIP_WAITING message listener', () => {
      const swCode = fs.readFileSync(swPath, 'utf-8');
      expect(swCode).toContain("caches.delete");
      expect(swCode).toContain("SKIP_WAITING");
      expect(swCode).toContain("self.skipWaiting()");
    });
  });

  describe('3. PNG and SVG icon assets (Spec Section 39)', () => {
    it('contains valid icon.svg', () => {
      expect(fs.existsSync(iconSvgPath)).toBe(true);
      const svg = fs.readFileSync(iconSvgPath, 'utf-8');
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 32 32"');
    });

    it('contains valid 192x192 PNG with correct magic header', () => {
      expect(fs.existsSync(icon192Path)).toBe(true);
      const buf = fs.readFileSync(icon192Path);
      expect(buf.length).toBeGreaterThan(500);
      expect(buf.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(buf.readUInt32BE(16)).toBe(192);
      expect(buf.readUInt32BE(20)).toBe(192);
    });

    it('contains valid 512x512 PNG with correct magic header', () => {
      expect(fs.existsSync(icon512Path)).toBe(true);
      const buf = fs.readFileSync(icon512Path);
      expect(buf.length).toBeGreaterThan(1000);
      expect(buf.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(buf.readUInt32BE(16)).toBe(512);
      expect(buf.readUInt32BE(20)).toBe(512);
    });
  });

  describe('4. PWA localization & copy strings (Spec Section 13)', () => {
    it('provides clear non-nagging copy in English', () => {
      expect(en.settings.installApp).toBe('Install Workpad');
      expect(en.settings.installAppDesc).toBe('Use Workpad as a standalone desktop app');
    });

    it('provides accurate localized copy in Turkish', () => {
      expect(tr.settings.installApp).toBe("Workpad'i Yükle");
      expect(tr.settings.installAppDesc).toBe("Workpad'i masaüstü uygulaması olarak kullan");
    });
  });
});
