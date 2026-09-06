#!/usr/bin/env node
/**
 * Workpad - Cross-Platform Node.js Launcher
 * Zero-dependency static server strictly bound to 127.0.0.1
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

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

if (!fs.existsSync(indexPath)) {
  console.error('\n  \x1b[31mWorkpad could not start.\x1b[0m');
  console.error(`  \x1b[33mProduction build not found in: ${distDir}\x1b[0m`);
  console.error('  Please run "npm run build" first before launching.\n');
  process.exit(1);
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
      'X-Content-Type-Options': 'nosniff'
    };

    if (ext === '.html' || ext === '.htm') {
      headers['Cache-Control'] = 'no-cache';
    } else {
      headers['Cache-Control'] = 'public, max-age=31536000';
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

server.listen(0, '127.0.0.1', () => {
  const addr = server.address();
  const port = addr.port;
  const url = `http://127.0.0.1:${port}/`;

  console.log(`Workpad is running locally at ${url}`);
  console.log('Press Ctrl+C to close this window when done.');

  openBrowser(url);
});

server.on('error', (err) => {
  console.error('\n  \x1b[31mWorkpad could not start.\x1b[0m');
  console.error(`  \x1b[33mError: ${err.message}\x1b[0m\n`);
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
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
