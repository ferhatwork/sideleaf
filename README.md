# Workpad

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-success.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Local--First](https://img.shields.io/badge/Storage-Local--First%20(IndexedDB)-emerald.svg)](#architecture--data-safety)

> **A tiny, local-first work surface for computer work.**  
> *Open it. Capture the thought. Keep working. Organize later.*

Workpad is an open-source, local-first, browser-native work surface designed to minimize cognitive friction and context switching while working at a computer.

It is deliberately **not** a generic notes app, Notion clone, project management suite, or complex knowledge graph. It feels like a quiet scratchpad sitting right beside your keyboard.

---

## Highlights
 
- **Work Surface, Not a Dashboard**: Designed like a digital sheet of paper beside your keyboard. No card-heavy clutter, no KPI counters, and no forced categories.
- **Instant Thought Capture**: Press `Ctrl+Space` (or `Cmd+Space`) anywhere to capture thoughts in under 1 second. Starts as clean text by default—no note type or folder decision required.
- **Capture First, Structure Later**: Keep notes as raw scratchpad lines, or transform them into checklist tasks (`Ctrl+Enter`), architectural decisions, or quotes when context demands it.
- **Working On Context**: Silently associates thoughts with your active workspace without prompting forms.
- **Sub-Millisecond External Memory**: Press `Ctrl+K` for an instant keyboard-driven search palette with multi-factor relevance ranking showing context snippets ("What was I doing?").
- **Local-First & Private**: 100% of your notes and workspaces stay in your browser's IndexedDB. Zero accounts, zero server dependencies, zero trackers, and zero telemetry.
- **Data Portability**: Export your entire work into versioned `.workpad` portable files or clean Markdown (`.md`) at any moment.
- **Ultra Lightweight**: Static bundle is under 88 kB gzipped with sub-second startup and 0 bloat.
- **PWA & Offline Ready**: Works completely with Wi-Fi turned off or on airplane mode.

---

## Keyboard-First Interaction

| Shortcut | Action |
| --- | --- |
| `Ctrl + Space` / `Cmd + Space` | **Quick Capture** floating overlay |
| `Ctrl + K` / `Cmd + K` | **Search** / Command Palette |
| `Ctrl + Enter` / `Cmd + Enter` | Convert item to Checklist / Toggle Task |
| `Ctrl + S` / `Cmd + S` | Download complete `.workpad` backup |
| `Esc` | Close any active modal or cancel |
| `?` | View keyboard shortcut reference |
| `Enter` | Save capture in quick input / overlay |
| `Shift + Enter` | Insert newline in capture textarea |

---

## Quick Start / Hızlı Başlangıç

### English
1. **Open Workpad** (double-click `Workpad.bat` on Windows or install as PWA).
2. **Start writing** — no setup, no accounts, no folder picking.
3. **Press `Ctrl + Space`** (or `Cmd + Space`) for quick capture from anywhere.
4. **Your data stays local** on your device unless you explicitly export it.

### Türkçe
1. **Workpad'i aç** (Windows'ta `Workpad.bat` dosyasına çift tıkla veya PWA olarak yükle).
2. **Yazmaya başla** — hesap gerekmez, kurulum yok, klasör seçme zorunluluğu yok.
3. **`Ctrl + Space`** (veya `Cmd + Space`) ile aklına geleni anında yakala.
4. **Dışa aktarmadığın sürece verilerin yerel kalır**, yalnızca cihazında saklanır.

---

## For Users (End-User Experience)

Workpad is designed so that **non-technical users do not need Node.js, npm, a terminal, or a dev server.**

### Launching on Windows (One-Click)
- Double-click **`Workpad.bat`** in the Workpad folder.
- Workpad will automatically start a minimal, secure local process on loopback `http://127.0.0.1:[port]/` using built-in Windows PowerShell and immediately open your default browser.
- *(Optional)* Double-click `scripts/create-desktop-shortcut.bat` to create a dedicated desktop shortcut with the Workpad icon.

### Launching on macOS & Linux
- Open a terminal in the Workpad folder and run:
  ```bash
  ./Workpad.sh
  ```
- Automatically detects Python 3 or Node.js on your system, binds strictly to `127.0.0.1`, and opens your default browser via `open` or `xdg-open`.

### Installing as a Desktop App (PWA)
Workpad is a full Progressive Web App:
- **Chrome / Edge**: Click the install icon in the address bar or choose **"Install Workpad"** in the top navigation or Settings.
- **Safari (macOS Sonoma+)**: Click **File → Add to Dock**.
- Once installed, Workpad opens in its own standalone, clean application window without browser toolbars.

### Offline Behavior
- Workpad works completely offline. Disconnect Wi-Fi, go on airplane mode, or use it anywhere.
- All notes, search indexing, and workspaces function locally with 0 internet dependency.

---

## For Developers

Developers can clone the repository and use standard npm development commands:

```bash
# 1. Install dependencies
npm install

# 2. Start local development server with Vite HMR
npm run dev

# 3. Build production static bundle (dist/)
npm run build

# 4. Run zero-dependency local production launcher
npm run launch

# 5. Package standalone portable distribution bundle
npm run package
```

---

## Distribution Modes

Workpad supports three primary distribution modes:

| Mode | Target | Description |
| --- | --- | --- |
| **Mode A: Static Web Hosting** | Public Web / Teams | Run `npm run build` to output `dist/`. Deploy to GitHub Pages, Cloudflare Pages, Netlify, Vercel, or any static HTTP host. No backend required. |
| **Mode B: PWA (Progressive Web App)** | Desktop / Mobile Users | Standalone app window, offline service worker caching, application icons (`192x192`, `512x512`, SVG, ICO). |
| **Mode C: Local Launcher Package** | Local-First Desktops | Portable folder with `Workpad.bat` (Windows PowerShell `HttpListener`), `Workpad.sh` (macOS/Linux), and `scripts/launcher.mjs`. Binds only to `127.0.0.1` on an ephemeral port. |

### Creating a Distribution Package
Run:
```bash
npm run package
```
This builds production assets, creates a standalone directory `release/workpad/` and packages `release/Workpad-Portable.zip` ready for distribution to users.

### Launcher Security & Privacy
- **Strict Loopback Binding**: The launcher binds strictly to `http://127.0.0.1:$port/` and never listens on external network interfaces (`0.0.0.0`).
- **Path Traversal Prevention**: Only files inside `dist/` are served; attempts to traverse outside (`..`) are rejected with `403 Forbidden`.
- **Ephemeral Port Selection**: Ports are selected dynamically at startup to avoid conflicts with other applications.
- **Graceful Lifecycle**: Press `Ctrl+C` in the launcher window to terminate the local server cleanly. No background daemons or services remain.

---

## Data Model & Formats

### Portable `.workpad` File

Workpad exports standard, versioned JSON files containing your workspaces, items, and private activity timeline:

```json
{
  "schema": "workpad-v1",
  "version": "1.0.0",
  "exportedAt": "2026-09-06T13:00:00.000Z",
  "workspaces": [ ... ],
  "items": [ ... ],
  "settings": { ... },
  "activity": [ ... ]
}
```

When importing a `.workpad` file, you can choose between:
1. **Merge**: Non-destructively merges notes with your existing local workspace.
2. **New Workspace**: Imports all notes safely into a new, isolated workspace.
3. **Replace**: Clean restore (with explicit safety confirmation).

### Markdown Export

Workspaces can be exported with one click into standard GitHub Flavored Markdown (`.md`) format, preserving checklists (`- [ ]` / `- [x]`), quotes, and source URLs.

---

## Architecture & Data Safety

```text
                ┌─────────────────────────┐
                │       Workpad UI        │
                │ React / TypeScript / UI │
                └────────────┬────────────┘
                             │
                ┌────────────▼────────────┐
                │    Local App State      │
                │   (useWorkpad Context)  │
                └────────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        IndexedDB Store    Search       Import/Export
      (IDB / LocalStorage) Engine     (.workpad / .md)
              │
              ▼
       Local User Device

Distribution:
      ┌────────┬──────────┬─────────────┐
      ▼        ▼          ▼
     PWA     Static      Portable
             Build       Launcher
```

### Local Storage Guarantee
- **Zero Remote Storage**: 100% of your notes, workspaces, and settings remain in your browser's local IndexedDB storage (`workpad-db`).
- **No Third-Party Scripts**: No tracking pixels, Google Analytics, telemetry, remote CDN fonts, or external scripts.
- **Local Search**: Real-time multi-factor relevance ranking executes in memory directly inside your browser.

---

## Uninstallation & Data Ownership

You own your data completely:

1. **Backing Up Before Removal**:
   - Open **Settings & Data** (gear icon or `Ctrl + S`).
   - Click **Export Workpad (.workpad)** for a full JSON backup, or **Export Markdown (.md)** for human-readable notes.
2. **Uninstalling the App**:
   - **PWA**: Right-click the app icon or title bar menu and select **Uninstall Workpad**.
   - **Local Launcher**: Simply delete the `workpad/` folder.
3. **Clearing Browser Data**:
   - Deleting launcher files does **not** automatically delete browser IndexedDB data.
   - To completely wipe all local notes, click **"Clear All Data"** in Workpad's Settings modal, or clear site data for `localhost` / your hosted domain in your browser settings.

---

## Verified Compatibility Matrix

Tested across production builds (`npm run build` and `npm run package`) with the development server stopped:

| Scenario | Chrome (Desktop) | Microsoft Edge | Apple Safari | Mozilla Firefox | Windows Launcher |
|---|:---:|:---:|:---:|:---:|:---:|
| **Production Build (`dist/`)** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **One-Click Launch (`Workpad.bat`)** | ✓ | ✓ | — | — | ✓ |
| **Local IndexedDB Persistence** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Offline Startup (No Internet)** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Instant Memory Search (`Ctrl+K`)** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Import / Export (`.workpad`, `.md`)** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Turkish / English Localization** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **PWA Standalone App Mode** | ✓ | ✓ | ✓ | ✓ | — |

---

## License

[MIT License](LICENSE) © 2026 Workpad Contributors.
