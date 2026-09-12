import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Deterministic Runtime & Single-Instance Verification', () => {
  const rootDir = path.resolve(process.cwd());

  describe('Launcher Configurations & Port Isolation', () => {
    it('scripts/launcher.ps1 enforces fixed port 47321 and loopback 127.0.0.1', () => {
      const launcherPs1Path = path.join(rootDir, 'scripts/launcher.ps1');
      expect(fs.existsSync(launcherPs1Path)).toBe(true);

      const content = fs.readFileSync(launcherPs1Path, 'utf8');
      expect(content).toMatch(/\$PORT\s*=\s*47321/);
      expect(content).toMatch(/\$HOST_IP\s*=\s*["']127\.0\.0\.1["']/);
      expect(content).toContain('X-Sideleaf-Server');
      expect(content).toContain('X-Sideleaf-Build');
      expect(content).toContain('no-cache, no-store, must-revalidate');
      expect(content).toContain('runtime.json');
    });

    it('scripts/launcher.mjs enforces fixed port 47321 and loopback 127.0.0.1', () => {
      const launcherMjsPath = path.join(rootDir, 'scripts/launcher.mjs');
      expect(fs.existsSync(launcherMjsPath)).toBe(true);

      const content = fs.readFileSync(launcherMjsPath, 'utf8');
      expect(content).toMatch(/const\s+PORT\s*=\s*47321/);
      expect(content).toMatch(/const\s+HOST\s*=\s*['"]127\.0\.0\.1['"]/);
      expect(content).toContain('X-Sideleaf-Server');
      expect(content).toContain('X-Sideleaf-Build');
      expect(content).toContain('no-cache, no-store, must-revalidate');
      expect(content).toContain('runtime.json');
    });

    it('Sideleaf.sh enforces fixed port 47321 and forwards arguments', () => {
      const launcherShPath = path.join(rootDir, 'Sideleaf.sh');
      expect(fs.existsSync(launcherShPath)).toBe(true);

      const content = fs.readFileSync(launcherShPath, 'utf8');
      expect(content).toContain('launcher.mjs" "$@"');
      expect(content).toMatch(/port\s*=\s*47321/);
      expect(content).toContain('X-Sideleaf-Server');
    });

    it('Sideleaf.bat forwards all arguments to launcher.ps1', () => {
      const launcherBatPath = path.join(rootDir, 'Sideleaf.bat');
      expect(fs.existsSync(launcherBatPath)).toBe(true);

      const content = fs.readFileSync(launcherBatPath, 'utf8');
      expect(content).toContain('launcher.ps1" %*');
      expect(content).toContain('exit /b');
    });

    it('Vite development server uses distinct port 5173', () => {
      const viteConfigPath = path.join(rootDir, 'vite.config.ts');
      const content = fs.readFileSync(viteConfigPath, 'utf8');
      expect(content).toContain('port: 5173');
      expect(content).not.toContain('47321');
    });
  });

  describe('Service Worker Cache Versioning & Update Strategy', () => {
    it('public/sw.js defines skipWaiting, safe cache cleanup and network bypass', () => {
      const swPath = path.join(rootDir, 'public/sw.js');
      expect(fs.existsSync(swPath)).toBe(true);

      const content = fs.readFileSync(swPath, 'utf8');
      // Must call skipWaiting on install
      expect(content).toContain('self.skipWaiting()');
      // Must clean up old Sideleaf caches only
      expect(content).toContain("key.startsWith('sideleaf-')");
      // Must bypass network for build-info.json and sw.js
      expect(content).toContain('/build-info.json');
      expect(content).toContain('/sw.js');
    });

    it('generate-build-info.mjs updates CACHE_NAME in dist/sw.js with version and timestamp', () => {
      const scriptPath = path.join(rootDir, 'scripts/generate-build-info.mjs');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toContain('sideleaf-static-');
      expect(content).toContain('build-info.json');
    });
  });

  describe('Build Metadata Schema', () => {
    it('dist/build-info.json conforms to build metadata schema and generator script is valid', () => {
      const distInfoPath = path.join(rootDir, 'dist/build-info.json');
      if (fs.existsSync(distInfoPath)) {
        const data = JSON.parse(fs.readFileSync(distInfoPath, 'utf8'));
        expect(data.name).toBe('Sideleaf');
        expect(typeof data.version).toBe('string');
        expect(typeof data.builtAt).toBe('string');
        expect(new Date(data.builtAt).toISOString()).toBe(data.builtAt);
        expect('commit' in data).toBe(true);
      }

      // generate-build-info script targets dist/build-info.json and uses git rev-parse HEAD
      const genScriptPath = path.join(rootDir, 'scripts/generate-build-info.mjs');
      expect(fs.existsSync(genScriptPath)).toBe(true);
      const genScript = fs.readFileSync(genScriptPath, 'utf8');
      expect(genScript).toContain('git rev-parse HEAD');
      expect(genScript).toContain("path.join(distDir, 'build-info.json')");
    });
  });
});
