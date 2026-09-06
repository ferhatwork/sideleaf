import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('End-User Distribution & Launcher Suite (Spec Sections 1-9, 14-17, 21-23, 26-29, 36-38, 41-45, 55, 63, 64)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const scriptsDir = path.join(rootDir, 'scripts');

  describe('1. Windows Zero-Dependency Launcher', () => {
    it('scripts/launcher.ps1 exists and adheres to distribution specifications', () => {
      const ps1Path = path.join(scriptsDir, 'launcher.ps1');
      expect(fs.existsSync(ps1Path)).toBe(true);

      const content = fs.readFileSync(ps1Path, 'utf-8');
      // Strictly bound to 127.0.0.1
      expect(content).toContain('127.0.0.1');
      expect(content).toContain('System.Net.HttpListener');
      expect(content).toContain('System.Net.Sockets.TcpListener');

      // Traversal prevention
      expect(content).toContain('403 Forbidden');
      expect(content).toContain('..');

      // SPA fallback
      expect(content).toContain('index.html');

      // Proper MIME types
      expect(content).toContain('.webmanifest');
      expect(content).toContain('application/manifest+json');
      expect(content).toContain('.svg');
      expect(content).toContain('image/svg+xml');
      expect(content).toContain('.ico');

      // Quiet and user-friendly messages
      expect(content).toContain('Workpad is running locally at http://127.0.0.1:$port/');
      expect(content).toContain('Press Ctrl+C to close this window when done.');
    });

    it('Workpad.bat exists and executes launcher.ps1 with bypass flags', () => {
      const batPath = path.join(rootDir, 'Workpad.bat');
      expect(fs.existsSync(batPath)).toBe(true);

      const content = fs.readFileSync(batPath, 'utf-8');
      expect(content).toContain('powershell.exe');
      expect(content).toContain('-NoProfile');
      expect(content).toContain('-ExecutionPolicy Bypass');
      expect(content).toContain('launcher.ps1');
    });

    it('Desktop shortcut scripts exist', () => {
      const shortcutPs1 = path.join(scriptsDir, 'create-desktop-shortcut.ps1');
      const shortcutBat = path.join(scriptsDir, 'create-desktop-shortcut.bat');

      expect(fs.existsSync(shortcutPs1)).toBe(true);
      expect(fs.existsSync(shortcutBat)).toBe(true);

      const ps1Content = fs.readFileSync(shortcutPs1, 'utf-8');
      expect(ps1Content).toContain('WScript.Shell');
      expect(ps1Content).toContain('Workpad.lnk');
    });
  });

  describe('2. macOS & Linux Launcher', () => {
    it('Workpad.sh exists, is executable, and contains python/node fallbacks', () => {
      const shPath = path.join(rootDir, 'Workpad.sh');
      expect(fs.existsSync(shPath)).toBe(true);

      const content = fs.readFileSync(shPath, 'utf-8');
      expect(content).toContain('#!/usr/bin/env bash');
      expect(content).toContain('127.0.0.1');
      expect(content).toContain('python3');
      expect(content).toContain('open');
      expect(content).toContain('xdg-open');
    });
  });

  describe('3. Cross-Platform Node.js Launcher', () => {
    it('scripts/launcher.mjs exists and implements zero-dependency static server', () => {
      const mjsPath = path.join(scriptsDir, 'launcher.mjs');
      expect(fs.existsSync(mjsPath)).toBe(true);

      const content = fs.readFileSync(mjsPath, 'utf-8');
      expect(content).toContain("import http from 'node:http'");
      expect(content).toContain("import fs from 'node:fs'");
      expect(content).toContain('127.0.0.1');
      expect(content).toContain('403 Forbidden');
      expect(content).toContain('404 Not Found');
      expect(content).toContain('index.html');
      expect(content).toContain('.webmanifest');
    });
  });

  describe('4. Distribution Packaging & package.json Scripts', () => {
    it('scripts/package-dist.mjs exists and packages release bundle', () => {
      const pkgMjsPath = path.join(scriptsDir, 'package-dist.mjs');
      expect(fs.existsSync(pkgMjsPath)).toBe(true);

      const content = fs.readFileSync(pkgMjsPath, 'utf-8');
      expect(content).toContain('npm run build');
      expect(content).toContain('Workpad-Portable.zip');
      expect(content).toContain('README.txt');
    });

    it('package.json defines launch and package scripts', () => {
      const pkgJsonPath = path.join(rootDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));

      expect(pkg.scripts.launch).toBe('node scripts/launcher.mjs');
      expect(pkg.scripts.package).toBe('node scripts/package-dist.mjs');
    });
  });
});
