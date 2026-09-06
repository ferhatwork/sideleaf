# Sideleaf

[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-success.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Local--First](https://img.shields.io/badge/Storage-Local--First%20(IndexedDB)-emerald.svg)](#architecture--data-safety)

> **Sideleaf — a tiny, local-first work surface for computer work.**  
> *Open it. Capture thoughts. Keep working. Organize later.*

Sideleaf is a lightweight local-first work surface for capturing thoughts, notes, links, and small tasks while working at a computer.

It is deliberately designed without the clutter and friction of complex tools, functioning like a quiet scratchpad sitting right beside your keyboard.

---

## Highlights
 
- **Work Surface, Not a Dashboard**: Designed like a digital sheet of paper beside your keyboard. No card-heavy clutter, no KPI counters, and no forced categories.
- **Instant Thought Capture**: Press `Ctrl+Space` (or `Cmd+Space`) anywhere to capture thoughts in under 1 second. Starts as clean text by default—no note type or folder decision required.
- **Capture First, Structure Later**: Keep notes as raw scratchpad lines, or transform them into checklist tasks (`Ctrl+Enter`), architectural decisions, or quotes when context demands it.
- **Working On Context**: Silently associates thoughts with your active workspace without prompting forms.
- **Sub-Millisecond External Memory**: Press `Ctrl+K` for an instant keyboard-driven search palette with multi-factor relevance ranking showing context snippets ("What was I doing?").
- **Local-First & Private**: 100% of your notes and workspaces stay in your browser's IndexedDB. Zero accounts, zero server dependencies, zero trackers, and zero telemetry.
- **Data Portability**: Export your entire work into versioned `.sideleaf` portable files (with seamless backwards compatibility for `.workpad` files) or clean Markdown (`.md`) at any moment.
- **Ultra Lightweight**: Static bundle is under 105 kB gzipped with sub-second startup and 0 bloat.
- **PWA & Offline Ready**: Works completely with Wi-Fi turned off or on airplane mode.

---

## Keyboard-First Interaction

| Shortcut | Action |
| --- | --- |
| `Ctrl + Space` / `Cmd + Space` | **Quick Capture** floating overlay |
| `Ctrl + Shift + Space` / `Cmd + Shift + Space` | Quick Capture (alternate fallback) |
| `Ctrl + K` / `Cmd + K` | **Search** / Command Palette |
| `Ctrl + Enter` / `Cmd + Enter` | Convert item to Checklist / Toggle Task |
| `Ctrl + Z` / `Cmd + Z` | **Undo** last action (delete, edit, archive) |
| `Ctrl + Shift + Z` / `Cmd + Shift + Z` | **Redo** undone action |
| `Ctrl + S` / `Cmd + S` | Download complete `.sideleaf` backup |
| `Esc` | Close any active modal or cancel |
| `?` | View keyboard shortcut reference |
| `Enter` | Save capture in quick input / overlay |
| `Shift + Enter` | Insert newline in capture textarea |

---

## Quick Start / Hızlı Başlangıç

### English
1. **Open Sideleaf** (double-click `Sideleaf.bat` on Windows or install as PWA).
2. **Start writing** — no setup, no accounts, no folder picking.
3. **Press `Ctrl + Space`** (or `Cmd + Space`) for quick capture from anywhere.
4. **Your data stays local** on your device unless you explicitly export it.

### Türkçe
1. **Sideleaf'i aç** (Windows'ta `Sideleaf.bat` dosyasına çift tıkla veya PWA olarak yükle).
2. **Yazmaya başla** — hesap gerekmez, kurulum yok, klasör seçme zorunluluğu yok.
3. **`Ctrl + Space`** (veya `Cmd + Space`) ile aklına geleni anında yakala.
4. **Dışa aktarmadığın sürece verilerin yerel kalır**, yalnızca cihazında saklanır.

---

## For Users (End-User Experience)

Sideleaf is designed so that **non-technical users do not need Node.js, npm, a terminal, or a dev server.**

### Launching on Windows (One-Click)
- Double-click **`Sideleaf.bat`** in the Sideleaf folder.
- Sideleaf will automatically start a minimal, secure local process on loopback `http://127.0.0.1:[port]/` using built-in Windows PowerShell and immediately open your default browser.
- *(Optional)* Double-click `scripts/create-desktop-shortcut.bat` to create a dedicated desktop shortcut with the Sideleaf icon.

### Launching on macOS & Linux
- Open a terminal in the Sideleaf folder and run:
  ```bash
  ./Sideleaf.sh
  ```
- Automatically detects Python 3 or Node.js on your system, binds strictly to `127.0.0.1`, and opens your default browser via `open` or `xdg-open`.

### Installing as a Desktop App (PWA)
Sideleaf is a full Progressive Web App:
- **Chrome / Edge**: Click the install icon in the address bar or choose **"Install Sideleaf"** in the top navigation or Settings.
- **Safari (macOS Sonoma+)**: Click **File → Add to Dock**.
- Once installed, Sideleaf opens in its own standalone, clean application window without browser toolbars.

### Offline Behavior
- Sideleaf works completely offline. Disconnect Wi-Fi, go on airplane mode, or use it anywhere.
- All notes, search indexing, and workspaces function locally with 0 internet dependency.

---

## For Developers

Developers can clone the repository and use standard npm development commands:

```bash
# 1. Install dependencies
npm install

# 2. Start local development server with Vite HMR
npm run dev

# 3. Run test suite with Vitest
npm test

# 4. Build production static bundle (dist/)
npm run build

# 5. Run zero-dependency local production launcher
npm run launch

# 6. Package standalone portable distribution bundle
npm run package
```

---

## Distribution Modes

Sideleaf supports three primary distribution modes:

| Mode | Target | Description |
| --- | --- | --- |
| **Mode A: Static Web Hosting** | Public Web / Teams | Run `npm run build` to output `dist/`. Deploy to GitHub Pages, Cloudflare Pages, Netlify, Vercel, or any static HTTP host. No backend required. |
| **Mode B: PWA (Progressive Web App)** | Desktop / Mobile Users | Standalone app window, offline service worker caching, application icons (`192x192`, `512x512`, SVG, ICO). |
| **Mode C: Local Launcher Package** | Local-First Desktops | Portable folder with `Sideleaf.bat` (Windows PowerShell `HttpListener`), `Sideleaf.sh` (macOS/Linux), and `scripts/launcher.mjs`. Binds only to `127.0.0.1` on an ephemeral port. |

### Creating a Distribution Package
Run:
```bash
npm run package
```
This builds production assets, creates a standalone directory `release/sideleaf/` and packages `release/Sideleaf-Portable.zip` ready for distribution to users.

### Launcher Security & Privacy
- **Strict Loopback Binding**: The launcher binds strictly to `http://127.0.0.1:$port/` and never listens on external network interfaces (`0.0.0.0`).
- **Path Traversal Prevention**: Only files inside `dist/` are served; attempts to traverse outside (`..`) are rejected with `403 Forbidden`.
- **Ephemeral Port Selection**: Ports are selected dynamically at startup to avoid conflicts with other applications.
- **Graceful Lifecycle**: Press `Ctrl+C` in the launcher window to terminate the local server cleanly. No background daemons or services remain.

---

## Data Model & Formats

### Portable `.sideleaf` File

Sideleaf exports standard, versioned JSON files containing your workspaces, items, and private activity timeline. `.sideleaf` is the native portable file format, while existing `.workpad` files can also be imported for seamless backwards compatibility:

```json
{
  "schema": "sideleaf-v1",
  "version": "1.0.0",
  "exportedAt": "2026-09-06T13:00:00.000Z",
  "workspaces": [ ... ],
  "items": [ ... ],
  "settings": { ... },
  "activity": [ ... ]
}
```

When importing a `.sideleaf` (or legacy `.workpad`) file, you can choose between:
1. **Merge**: Non-destructively merges notes with your existing local workspace.
2. **New Workspace**: Imports all notes safely into a new, isolated workspace.
3. **Replace**: Clean restore (with explicit safety confirmation).

### Markdown Export

Workspaces can be exported with one click into standard GitHub Flavored Markdown (`.md`) format, preserving checklists (`- [ ]` / `- [x]`), quotes, and source URLs.

---

## Architecture & Data Safety

```text
                ┌─────────────────────────┐
                │       Sideleaf UI       │
                │ React / TypeScript / UI │
                └────────────┬────────────┘
                             │
                ┌────────────▼────────────┐
                │    Local App State      │
                │  (useSideleaf Context)  │
                └────────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        IndexedDB Store    Search       Import/Export
      (IDB / LocalStorage) Engine     (.sideleaf / .md)
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
- **Zero Remote Storage**: 100% of your notes, workspaces, and settings remain in your browser's local IndexedDB storage (`sideleaf_db`, with `sideleaf_ls_*` fallback in localStorage).
- **No Third-Party Scripts**: No tracking pixels, Google Analytics, telemetry, remote CDN fonts, or external scripts.
- **Local Search**: Real-time multi-factor relevance ranking executes in memory directly inside your browser.

---

## Uninstallation & Data Ownership

You own your data completely:

1. **Backing Up Before Removal**:
   - Open **Settings & Data** (gear icon or `Ctrl + S`).
   - Click **Export Sideleaf (.sideleaf)** for a full JSON backup, or **Export Markdown (.md)** for human-readable notes.
2. **Uninstalling the App**:
   - **PWA**: Right-click the app icon or title bar menu and select **Uninstall Sideleaf**.
   - **Local Launcher**: Simply delete the `sideleaf/` folder.
3. **Clearing Browser Data**:
   - Deleting launcher files does **not** automatically delete browser IndexedDB data.
   - To completely wipe all local notes, click **"Clear All Data"** in Sideleaf's Settings modal, or clear site data for `localhost` / your hosted domain in your browser settings.

---

## Verified Compatibility Matrix

Tested across production builds (`npm run build` and `npm run package`) with the development server stopped:

| Scenario | Chrome (Desktop) | Microsoft Edge | Apple Safari | Mozilla Firefox | Windows Launcher |
|---|:---:|:---:|:---:|:---:|:---:|
| **Production Build (`dist/`)** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **One-Click Launch (`Sideleaf.bat`)** | ✓ | ✓ | — | — | ✓ |
| **Local IndexedDB Persistence** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Offline Startup (No Internet)** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Instant Memory Search (`Ctrl+K`)** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Import / Export (`.sideleaf`, `.md`)** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Turkish / English Localization** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **PWA Standalone App Mode** | ✓ | ✓ | ✓ | ✓ | — |

---

## License

Sideleaf is source-available under the PolyForm Noncommercial License 1.0.0.

### Plain-English Summary

This is an informal, plain-English summary of the key permissions and restrictions under the license. The legally binding and authoritative terms are set out in the [LICENSE](LICENSE) file:

- **Personal & Noncommercial Use Permitted**: You may freely use Sideleaf for personal study, private experimentation, hobby projects, research for public knowledge, amateur pursuits, or within eligible noncommercial organizations (such as schools, charities, and public institutions).
- **Source Code Inspection**: You are welcome to review, inspect, and read the source code.
- **Noncommercial Modifications**: You may modify the source code and create derivative works for noncommercial purposes.
- **Commercial Use Prohibited**: Commercial use, business operations intended for commercial advantage, or generating commercial revenue is strictly prohibited under this license.
- **Selling Prohibited**: You may not sell Sideleaf or charge fees for copies of the software.
- **Commercial Derivative Sales Prohibited**: You may not sell or monetize modified versions or works based on Sideleaf.
- **Commercial Integration Requires Separate Permission**: Incorporating Sideleaf into a commercial product, SaaS platform, or paid service requires explicit permission or a separate commercial agreement from the copyright holder.

> [!NOTE]
> This summary is provided for convenience and understanding only. It does not replace, expand, or limit the actual legal terms. For the authoritative legal terms and conditions, please consult the [LICENSE](LICENSE) file.
