#!/usr/bin/env node
/**
 * Sideleaf Distribution Packaging Script
 * Builds production assets, creates self-contained release/sideleaf/,
 * and packages release/Sideleaf-Portable.zip
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const pkgDir = path.join(releaseDir, 'sideleaf');
const zipFile = path.join(releaseDir, 'Sideleaf-Portable.zip');

console.log('\n=== Sideleaf Distribution Packaging ===\n');

// 1. Build production assets
console.log('[1/4] Building production assets (npm run build)...');
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
  console.error('\x1b[31mBuild failed. Packaging aborted.\x1b[0m');
  process.exit(1);
}

// 2. Prepare release directory
console.log('\n[2/4] Preparing release directory...');
if (fs.existsSync(pkgDir)) {
  fs.rmSync(pkgDir, { recursive: true, force: true });
}
if (fs.existsSync(zipFile)) {
  fs.rmSync(zipFile, { force: true });
}
fs.mkdirSync(pkgDir, { recursive: true });

// 3. Assemble distribution payload
console.log('[3/4] Assembling portable distribution files...');

// Copy dist/
const distSrc = path.join(rootDir, 'dist');
const distDest = path.join(pkgDir, 'dist');
fs.cpSync(distSrc, distDest, { recursive: true });

// Copy scripts/ (launcher scripts and shortcut helpers)
const scriptsDest = path.join(pkgDir, 'scripts');
fs.mkdirSync(scriptsDest, { recursive: true });
const scriptFiles = [
  'launcher.ps1',
  'launcher.mjs',
  'create-desktop-shortcut.bat',
  'create-desktop-shortcut.ps1'
];
for (const file of scriptFiles) {
  const src = path.join(rootDir, 'scripts', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(scriptsDest, file));
  }
}

// Copy root launchers and license
const rootFiles = ['Sideleaf.bat', 'Sideleaf.sh', 'icon.ico', 'LICENSE'];
for (const file of rootFiles) {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(pkgDir, file));
  }
}

// Write README.txt
const readmeContent = `======================================================================
SIDELEAF - LOCAL-FIRST WORK SURFACE
======================================================================

Sideleaf is a tiny, local-first work surface for computer work.
All your notes and workspaces stay completely local on your machine.
No accounts, no cloud dependencies, no tracking.

----------------------------------------------------------------------
HOW TO RUN SIDELEAF
----------------------------------------------------------------------

Windows:
  1. Double-click "Sideleaf.bat" to start Sideleaf.
  2. A browser window will open automatically.
  3. (Optional) Run "scripts\\create-desktop-shortcut.bat" to place a
     Sideleaf icon on your Desktop.

macOS & Linux:
  1. Open a terminal in this folder.
  2. Make sure Sideleaf.sh is executable:
     chmod +x Sideleaf.sh
  3. Run:
     ./Sideleaf.sh
  4. A browser window will open automatically.
     (Requires Node.js or Python 3 installed on your machine)

Cross-Platform (Node.js):
  If Node.js is installed:
  node scripts/launcher.mjs

----------------------------------------------------------------------
HOW TO CLOSE SIDELEAF
----------------------------------------------------------------------
Close your browser tab when finished.
In the launcher terminal window, press Ctrl+C to stop the local server.

----------------------------------------------------------------------
DATA PRIVACY & STORAGE
----------------------------------------------------------------------
Your notes are stored locally in your browser's IndexedDB database.
To back up your data or transfer it to another machine, use the
"Export Backup" option in the Sideleaf Settings panel at any time.

----------------------------------------------------------------------
LICENSE
----------------------------------------------------------------------
Sideleaf is source-available under the PolyForm Noncommercial License 1.0.0.
Free for personal and noncommercial use. Commercial use and selling
are strictly prohibited. See LICENSE for full terms.
======================================================================
`;

fs.writeFileSync(path.join(pkgDir, 'README.txt'), readmeContent, 'utf-8');

// 4. Create ZIP archive
console.log('\n[4/4] Creating Sideleaf-Portable.zip...');
let zipCreated = false;

// Attempt 1: bsdtar (built-in on Windows 10/11 and modern Unix)
try {
  execSync(`tar -a -c -f "${zipFile}" -C "${releaseDir}" sideleaf`, { stdio: 'ignore' });
  if (fs.existsSync(zipFile) && fs.statSync(zipFile).size > 0) {
    zipCreated = true;
  }
} catch {}

// Attempt 2: PowerShell Compress-Archive on Windows
if (!zipCreated && process.platform === 'win32') {
  try {
    const psCmd = `Compress-Archive -Path "${pkgDir}\\*" -DestinationPath "${zipFile}" -Force`;
    execSync(`powershell.exe -NoProfile -Command "${psCmd}"`, { stdio: 'ignore' });
    if (fs.existsSync(zipFile) && fs.statSync(zipFile).size > 0) {
      zipCreated = true;
    }
  } catch {}
}

// Attempt 3: Unix zip command
if (!zipCreated) {
  try {
    execSync(`zip -r "${zipFile}" sideleaf`, { cwd: releaseDir, stdio: 'ignore' });
    if (fs.existsSync(zipFile) && fs.statSync(zipFile).size > 0) {
      zipCreated = true;
    }
  } catch {}
}

console.log('\n=== Packaging Complete ===\n');
console.log(`Directory package: ${pkgDir}`);
if (zipCreated) {
  const sizeMb = (fs.statSync(zipFile).size / (1024 * 1024)).toFixed(2);
  console.log(`Zip archive:       ${zipFile} (${sizeMb} MB)`);
} else {
  console.log('Zip archive could not be created automatically (archive utility not found).');
}
console.log('\nReady for end-user distribution!\n');
