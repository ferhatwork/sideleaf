# Workpad

> **A tiny, local-first work surface for computer work.**  
> *Open it. Capture the thought. Keep working. Organize later.*

Workpad is an open-source, local-first, browser-native work surface designed to minimize cognitive friction and context switching while working at a computer.

It is deliberately **not** a generic notes app, Notion clone, project management suite, or complex knowledge graph. It feels like a quiet scratchpad sitting right beside your keyboard.

---

## Highlights

- **Instant Capture**: Press `Ctrl+Space` (or `Cmd+Space`) anywhere to capture thoughts in 1–2 seconds. No title required, no project folder selection required.
- **Local-First & Private**: 100% of your notes and workspaces stay in your browser's IndexedDB. Zero accounts, zero server dependencies, zero trackers, and zero telemetry.
- **Progressive Structure**: Start in `Scratch`. Later, convert thoughts into actionable checklist tasks (`Ctrl+Enter`), group them into lightweight `Workspaces`, or `Archive` them.
- **Sub-Millisecond Search**: Press `Ctrl+K` for an instant keyboard-driven search palette with multi-factor relevance ranking.
- **Data Portability**: Export your entire work into versioned `.workpad` portable files or clean Markdown (`.md`) at any moment.
- **Ultra Lightweight**: Static build is under 85 kB gzipped with sub-second startup and 0 bloat.
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

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (tested on v22+)
- [npm](https://www.npmjs.com/)

### Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev
```

Open your browser at `http://localhost:5173`.

### Running Tests

```bash
npm test
```

### Building for Production (Static Assets)

```bash
npm run build
```

This generates production-ready, zero-dependency static files in the `dist/` directory that can be served from any static web server, GitHub Pages, or opened as a PWA.

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

## Privacy Policy & Philosophy

- **Zero Remote Storage**: Your data never leaves your computer unless you explicitly export a file.
- **No Third-Party Scripts**: No analytics, no marketing pixels, no remote font CDNs, no telemetry.
- **No Mandatory AI**: No unsolicited AI calls or automatic uploading of your private notes.

---

## Browser Support

- Google Chrome / Chromium (Desktop & Mobile)
- Apple Safari (macOS & iOS)
- Mozilla Firefox
- Microsoft Edge
- Opera / Brave / Vivaldi

---

## License

[MIT License](LICENSE) © 2026 Workpad Contributors.
