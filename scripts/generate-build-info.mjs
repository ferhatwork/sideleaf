#!/usr/bin/env node
/**
 * Sideleaf - Build Info Generator
 * Generates dist/build-info.json and updates cache version in dist/sw.js.
 * Zero external dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const publicDir = path.resolve(rootDir, 'public');

// Read package.json
let version = '1.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  if (pkg.version) version = pkg.version;
} catch {}

// Get git commit if available (full HEAD hash)
let commit = null;
try {
  commit = execSync('git rev-parse HEAD', {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
} catch {}

const builtAt = new Date().toISOString();
const buildInfo = {
  name: 'Sideleaf',
  version,
  builtAt,
  commit
};

const buildInfoJson = JSON.stringify(buildInfo, null, 2) + '\n';

// Write build identity exclusively to dist/
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, 'build-info.json'), buildInfoJson, 'utf8');

  // Update sw.js in dist/ with unique cache name derived from build
  const distSwPath = path.join(distDir, 'sw.js');
  if (fs.existsSync(distSwPath)) {
    let swContent = fs.readFileSync(distSwPath, 'utf8');
    const safeTag = commit ? commit.slice(0, 10) : builtAt.replace(/[:.]/g, '-');
    const cacheKey = `sideleaf-static-${version}-${safeTag}`;
    swContent = swContent.replace(
      /const CACHE_NAME = ['"][^'"]+['"];/,
      `const CACHE_NAME = '${cacheKey}';`
    );
    fs.writeFileSync(distSwPath, swContent, 'utf8');
  }
}

console.log(`[build-info] Generated build metadata: v${version} (${commit || 'no-git'}) builtAt: ${builtAt}`);
