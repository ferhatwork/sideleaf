#!/usr/bin/env node
/**
 * Workpad Distribution Packaging Script
 * Builds production assets, creates self-contained release/workpad/,
 * and packages release/Workpad-Portable.zip
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const pkgDir = path.join(releaseDir, 'workpad');
const zipFile = path.join(releaseDir, 'Workpad-Portable.zip');

console.log('\n=== Workpad Distribution Packaging ===\n');

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

// Copy root launchers
const rootFiles = ['Workpad.bat', 'Workpad.sh', 'icon.ico'];
for (const file of rootFiles) {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(pkgDir, file));
  }
}

// Write README.txt
const readmeContent = `======================================================================
WORKPAD - LOCAL-FIRST WORK SURFACE
======================================================================

Workpad is a tiny, local-first work surface for computer work.
All your notes and workspaces stay completely local on your machine.
No accounts, no cloud dependencies, no tracking.

----------------------------------------------------------------------
HOW TO RUN WORKPAD
----------------------------------------------------------------------

Windows:
  1. Double-click "Workpad.bat" to start Workpad.
  2. A browser window will open automatically.
  3. (Optional) Run "scripts\\create-desktop-shortcut.bat" to place a
     Workpad icon on your Desktop.

macOS & Linux:
  1. Open a terminal in this folder.
  2. Make sure Workpad.sh is executable:
     chmod +x Workpad.sh
  3. Run:
     ./Workpad.sh
  4. A browser window will open automatically.
     (Requires Node.js or Python 3 installed on your machine)

Cross-Platform (Node.js):
  If Node.js is installed:
  node scripts/launcher.mjs

----------------------------------------------------------------------
HOW TO CLOSE WORKPAD
----------------------------------------------------------------------
Close your browser tab when finished.
In the launcher terminal window, press Ctrl+C to stop the local server.

----------------------------------------------------------------------
DATA PRIVACY & STORAGE
----------------------------------------------------------------------
Your notes are stored locally in your browser's IndexedDB database.
To back up your data or transfer it to another machine, use the
"Export Data" option in the Workpad Settings panel at any time.
======================================================================
`;

fs.writeFileSync(path.join(pkgDir, 'README.txt'), readmeContent, 'utf-8');

// 4. Create ZIP archive
console.log('\n[4/4] Creating Workpad-Portable.zip...');
let zipCreated = false;

// Attempt 1: bsdtar (built-in on Windows 10/11 and modern Unix)
try {
  execSync(`tar -a -c -f "${zipFile}" -C "${releaseDir}" workpad`, { stdio: 'ignore' });
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
    execSync(`zip -r "${zipFile}" workpad`, { cwd: releaseDir, stdio: 'ignore' });
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
