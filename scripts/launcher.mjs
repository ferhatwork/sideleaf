#!/usr/bin/env node
/**
 * Sideleaf - Cross-Platform Node.js Launcher
 * Zero-dependency static server strictly bound to 127.0.0.1:47321
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const PORT = 47321;
const HOST = '127.0.0.1';
const ORIGIN = `http://${HOST}:${PORT}`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
let distDir = path.resolve(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  const localDist = path.resolve(__dirname, 'dist');
  if (fs.existsSync(localDist)) {
    distDir = localDist;
  }
}

const indexPath = path.join(distDir, 'index.html');
const buildInfoPath = path.join(distDir, 'build-info.json');

if (!fs.existsSync(indexPath)) {
  console.error('\n  \x1b[31mSideleaf could not start.\x1b[0m');
  console.error(`  \x1b[33mProduction build not found in: ${distDir}\x1b[0m`);
  console.error('  Please run "npm run build" first before launching.\n');
  process.exit(1);
}

// Read build metadata if available
let buildInfo = null;
if (fs.existsSync(buildInfoPath)) {
  try {
    buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
  } catch {}
}
const buildHeaderVal = (buildInfo && buildInfo.builtAt) ? buildInfo.builtAt : 'unknown';

// Runtime metadata path (%LOCALAPPDATA%\Sideleaf\runtime.json or ~/.sideleaf/runtime.json)
function getRuntimeDir() {
  if (process.platform === 'win32') {
    return process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Sideleaf')
      : path.join(process.env.USERPROFILE || '', '.sideleaf');
  }
  return path.join(process.env.HOME || '', '.sideleaf');
}

const runtimeDir = getRuntimeDir();
const runtimeJsonPath = path.join(runtimeDir, 'runtime.json');
const remindersJsonPath = path.join(runtimeDir, 'reminders.json');

let activeReminders = [];

function loadRuntimeReminders() {
  try {
    if (fs.existsSync(remindersJsonPath)) {
      const raw = fs.readFileSync(remindersJsonPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.reminders)) {
        activeReminders = parsed.reminders;
        return;
      }
    }
  } catch {}
  activeReminders = [];
}

function saveRuntimeReminders(remList) {
  try {
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true });
    }
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      reminders: remList,
    };
    fs.writeFileSync(remindersJsonPath, JSON.stringify(payload, null, 2), 'utf8');
  } catch {}
}

function calculateNextOccurrence(rem, fromMs) {
  const fromDate = new Date(fromMs);
  const timeStr = rem.time || '09:00';
  const parts = timeStr.split(':');
  const targetHour = parseInt(parts[0], 10) || 0;
  const targetMinute = parseInt(parts[1], 10) || 0;

  if (rem.type === 'daily') {
    const today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), targetHour, targetMinute, 0, 0);
    if (today.getTime() > fromMs) {
      return today.getTime();
    }
    const tomorrow = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + 1, targetHour, targetMinute, 0, 0);
    return tomorrow.getTime();
  }

  if (rem.type === 'weekly') {
    const rawWeekdays = rem.weekdays && rem.weekdays.length > 0 ? rem.weekdays : [1];
    const valid = new Set(rawWeekdays);
    for (let offset = 0; offset <= 7; offset++) {
      const candidate = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + offset, targetHour, targetMinute, 0, 0);
      const isoDay = candidate.getDay() === 0 ? 7 : candidate.getDay();
      if (valid.has(isoDay)) {
        if (candidate.getTime() > fromMs) {
          return candidate.getTime();
        }
      }
    }
    const fallback = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + 7, targetHour, targetMinute, 0, 0);
    return fallback.getTime();
  }
  return null;
}

function checkDueReminders() {
  if (!activeReminders || activeReminders.length === 0) {
    loadRuntimeReminders();
  }
  if (!activeReminders || activeReminders.length === 0) return;

  const nowMs = Date.now();
  let changed = false;

  for (const rem of activeReminders) {
    if (!rem.enabled) continue;
    if (rem.scheduledAt > nowMs) continue;
    if (rem.lastTriggeredAt && rem.lastTriggeredAt >= rem.scheduledAt) continue;

    // Fired
    rem.lastTriggeredAt = nowMs;
    changed = true;
    console.log(`[reminder] Due: "${rem.itemContent || 'Note'}" (type: ${rem.type})`);

    if (rem.type === 'once') {
      rem.enabled = false;
    } else if (rem.type === 'daily' || rem.type === 'weekly') {
      const nextMs = calculateNextOccurrence(rem, nowMs);
      if (nextMs) {
        rem.scheduledAt = nextMs;
      } else {
        rem.enabled = false;
      }
    }
  }

  if (changed) {
    saveRuntimeReminders(activeReminders);
  }
}

function saveRuntimeMetadata() {
  try {
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true });
    }
    const meta = {
      pid: process.pid,
      port: PORT,
      host: HOST,
      root: rootDir,
      startedAt: new Date().toISOString(),
      version: buildInfo?.version || '1.0.0',
      builtAt: buildInfo?.builtAt || null,
      commit: buildInfo?.commit || null
    };
    fs.writeFileSync(runtimeJsonPath, JSON.stringify(meta, null, 2), 'utf8');
  } catch {}
}

function removeRuntimeMetadata() {
  try {
    if (fs.existsSync(runtimeJsonPath)) {
      fs.unlinkSync(runtimeJsonPath);
    }
  } catch {}
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
};

const server = http.createServer((req, res) => {
  try {
    const rawUrl = req.url || '/';
    const parsedPath = decodeURIComponent(rawUrl.split('?')[0].split('#')[0]);

    // Internal local API: /__sideleaf/reminders
    if (parsedPath === '/__sideleaf/reminders') {
      const reqHost = req.headers.host;
      const origin = req.headers.origin;
      const referer = req.headers.referer;
      const secSite = req.headers['sec-fetch-site'];

      const validHost = reqHost === `127.0.0.1:${PORT}` || reqHost === `localhost:${PORT}`;
      const validOrigin = !origin || origin === ORIGIN || origin === `http://localhost:${PORT}`;
      const validReferer = !referer || referer.startsWith(ORIGIN + '/') || referer.startsWith(`http://localhost:${PORT}/`);
      const validSecSite = !secSite || secSite === 'same-origin' || secSite === 'none';

      if (!validHost || !validOrigin || !validReferer || !validSecSite) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
      }

      if (req.method === 'GET') {
        let content = '{"version":1,"updatedAt":null,"reminders":[]}';
        if (fs.existsSync(remindersJsonPath)) {
          try {
            content = fs.readFileSync(remindersJsonPath, 'utf8');
          } catch {}
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Sideleaf-Server': '1',
        });
        res.end(content);
        return;
      }

      if (req.method === 'PUT' || req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed && Array.isArray(parsed.reminders)) {
              if (!fs.existsSync(runtimeDir)) {
                fs.mkdirSync(runtimeDir, { recursive: true });
              }
              fs.writeFileSync(remindersJsonPath, body, 'utf8');
              activeReminders = parsed.reminders;
            }
          } catch {}
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Sideleaf-Server': '1',
          });
          res.end('{"ok":true}');
        });
        return;
      }
    }

    // Path traversal check
    if (parsedPath.includes('..') || rawUrl.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    const relPath = parsedPath.replace(/^\/+/, '');
    let targetPath = path.resolve(distDir, relPath);

    // Security check: must reside inside distDir
    if (!targetPath.startsWith(distDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    // Directory handling
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
    }

    // SPA fallback: if not existing and has no extension, serve index.html
    if (!fs.existsSync(targetPath)) {
      const ext = path.extname(targetPath);
      if (!ext) {
        targetPath = indexPath;
      }
    }

    if (!fs.existsSync(targetPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(targetPath);

    const headers = {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'X-Content-Type-Options': 'nosniff',
      'X-Sideleaf-Server': '1',
      'X-Sideleaf-Build': buildHeaderVal
    };

    const isDynamic =
      ext === '.html' ||
      ext === '.htm' ||
      targetPath.endsWith('sw.js') ||
      targetPath.endsWith('build-info.json');

    if (isDynamic) {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    } else {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    }

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }

    res.writeHead(200, headers);
    const stream = fs.createReadStream(targetPath);
    stream.pipe(res);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500);
      }
      res.end();
    });
  } catch {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    }
  }
});

const args = process.argv.slice(2);
const noBrowser = args.includes('--no-browser') || args.includes('-NoBrowser');

let reminderInterval = null;

server.listen(PORT, HOST, () => {
  saveRuntimeMetadata();
  loadRuntimeReminders();
  reminderInterval = setInterval(checkDueReminders, 5000);

  const url = `${ORIGIN}/`;

  console.log(`Sideleaf is running locally at ${url}`);
  if (buildInfo?.builtAt) {
    console.log(`Build: ${buildInfo.builtAt} (${buildInfo.commit || 'no-git'})`);
  }
  console.log('Press Ctrl+C to close this window when done.');

  if (!noBrowser) {
    openBrowser(url);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  \x1b[31mPort ${PORT} is already in use.\x1b[0m`);
    console.error(`  Sideleaf requires fixed loopback port ${PORT} to maintain a deterministic origin and data isolation.`);
    console.error(`  Please stop the running instance or free port ${PORT} before restarting.\n`);
  } else {
    console.error('\n  \x1b[31mSideleaf could not start.\x1b[0m');
    console.error(`  \x1b[33mError: ${err.message}\x1b[0m\n`);
  }
  process.exit(1);
});

function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      exec(`start "" "${url}"`);
    } else if (platform === 'darwin') {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }
  } catch {
    // If opening browser fails, URL is logged to console
  }
}

const shutdown = () => {
  if (reminderInterval) {
    clearInterval(reminderInterval);
  }
  removeRuntimeMetadata();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => {
  removeRuntimeMetadata();
});

