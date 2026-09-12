# Sideleaf

> A tiny, local-first work surface for computer work.

<p align="center">
  <img src="assets/social-preview.png" alt="Sideleaf — A tiny, local-first work surface for computer work." width="720" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-blue.svg" alt="License: PolyForm Noncommercial 1.0.0" /></a>
  <a href="https://github.com/ferhatwork/sideleaf/actions/workflows/build.yml"><img src="https://github.com/ferhatwork/sideleaf/actions/workflows/build.yml/badge.svg" alt="CI" /></a>
  <a href="#development"><img src="https://img.shields.io/badge/Tests-158%20passed-success.svg" alt="Tests" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-3178c6.svg" alt="TypeScript" /></a>
</p>

Sideleaf is a lightweight, local-first work surface for capturing thoughts, notes, links, and daily tasks while working at a computer.

Designed as a digital replacement for scratch paper beside your keyboard, Sideleaf eliminates friction and clutter. No accounts, no cloud dependencies, and zero telemetry—just clean, instant capture with complete local data ownership.

---

## Why Sideleaf?

- **Digital Paper, Not a Dashboard**: Designed like a sheet of paper beside your keyboard. No card clutter, no complex Kanban boards, no KPI counters, and no forced hierarchies.
- **Capture First, Structure Later**: Jot thoughts as raw scratch lines in seconds, or convert them into checklist tasks, decisions, or quotes when context demands it.
- **Instant Quick Capture (`Ctrl+Space`)**: Open the capture overlay from anywhere in under a second without losing focus or context.
- **Keyboard-First Ergonomics**: Every primary interaction—from capturing thoughts to searching memory, toggling tasks, and navigating sections—is accessible via keyboard shortcuts.
- **Local-First & Private**: Notes, workspaces, and reminders reside locally on your device in your browser's IndexedDB. Zero accounts, zero server dependencies, and zero trackers.
- **Sub-Millisecond Search (`Ctrl+K`)**: Multi-factor relevance ranking across titles, content, tags, and source links with context snippets.
- **Lightweight Production Bundle**: Static build is under 115 kB gzipped with sub-second launch.
- **PWA & Offline Ready**: Fully functional offline with zero network connectivity.

---

## Core Features

- **Scratch Surface**: An unorganized capture stream for spontaneous thoughts that don't need a dedicated home yet.
- **Today View**: A dedicated daily focus view gathering active tasks and reminders scheduled for today.
- **Contextual Workspaces & Sections**: Group notes by initiative or project, organized into collapsible, reorderable sections.
- **Versatile Item Types**: Plain text, checklist tasks (`Ctrl+Enter`), architectural decisions, quotes, source links, and visual dividers.
- **Quick Capture Overlay (`Ctrl+Space`)**: Floating quick-entry bar with direct Workspace and Section destination selection.
- **Sub-Millisecond Search (`Ctrl+K`)**: Instant keyboard-driven command palette searching content, tags, and links.
- **Compact Mode**: High-density view toggle for maximizing visible notes on screen.
- **Link Capture & Multi-Link Paste**: Automatic URL detection, title parsing, and batch import when pasting multiple links simultaneously.
- **Bulk Selection & Actions**: Group-level and section-level multi-select to move, archive, or delete multiple items at once.
- **Archive & Trash**: Safely store completed work in the Archive or move items to Trash with full recovery support.
- **Undo / Redo (`Ctrl+Z` / `Ctrl+Shift+Z`)**: Multi-step history for text edits, deletions, and structural reorganizations.
- **Bilingual Support**: Instant switching between Turkish and English localization.
- **Light & Dark Themes**: Thoughtfully calibrated high-contrast light and dark modes.

---

## Reminders

Sideleaf includes a lightweight, local reminder system designed around daily computer work—not a calendar or project management suite, but simple reminders attached directly to your notes.

### Capabilities

- **Multiple Reminders per Item**: Attach one or more scheduled alerts to any note or checklist item.
- **Flexible Recurrence**: Support for **Once** (single alert), **Daily** (repeats every day at a set time), and **Weekly** (repeats on selected weekdays).
- **Weekday Scheduling**: Select specific days of the week (e.g., Monday through Friday) for recurring reminders.
- **Background Runtime Execution**: Reminders are monitored by the local runtime process, firing reliably even when the browser window or PWA is closed.
- **Persistent Windows Notifications**: Uses Windows 10/11 WinRT `scenario="reminder"` toast notifications that stay visible in the Windows Action Center rather than vanishing as transient banners.
- **Native Windows Audio**: Plays the native Windows reminder chime (`ms-winsoundevent:Notification.Reminder`) without bundling custom audio files.
- **Interactive Notification Actions**:
  - **Open in Sideleaf** (`Sideleaf'te Aç`): Launches Sideleaf and deep-links directly to the focused note (`/?item=<id>`).
  - **Snooze 10 min** (`10 dk Ertele`): Postpones the notification by 10 minutes without duplicate triggers, persisting across server restarts.
  - **Dismiss** (`Kapat`): Silences the notification, marks one-time alerts as completed, and advances recurring schedules to the next occurrence.

> [!NOTE]
> Reliable background notifications while the application window is closed are currently Windows-focused, powered by the local PowerShell runtime. On macOS and Linux, reminders operate via standard browser notification APIs when the tab or PWA window is active.

---

## Local Runtime & Desktop Launchers

Sideleaf runs locally as a secure, loopback-only service:

```text
http://127.0.0.1:47321
```

### Windows Runtime (`Sideleaf.bat`)

The Windows launcher provides zero-dependency single-instance process management:

```cmd
.\Sideleaf.bat start      # Start local server and open default browser
.\Sideleaf.bat stop       # Stop running Sideleaf background process
.\Sideleaf.bat restart    # Restart local runtime and reload build
.\Sideleaf.bat status     # Display process PID, URL, version, and build info
.\Sideleaf.bat doctor     # Run 8-point diagnostic integrity checks
```

- **Single-Instance Enforcement**: Verifies port ownership and process identity before binding, preventing duplicate server instances or port conflicts.
- **Zero External Dependencies**: Powered entirely by native Windows PowerShell (`HttpListener`). No Node.js or Python required on end-user machines.

### macOS & Linux (`Sideleaf.sh`)

```bash
./Sideleaf.sh
```

Automatically detects Python 3 or Node.js, binds strictly to `127.0.0.1`, and opens Sideleaf in your default browser.

### Progressive Web App (PWA)

- **Chrome / Edge**: Click the install icon in the address bar or choose **"Install Sideleaf"** in the top navigation or Settings.
- **Safari (macOS Sonoma+)**: Click **File → Add to Dock**.
- Runs in a clean, standalone desktop window without browser chrome.

---

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + Space` / `Cmd + Space` | **Quick Capture** floating overlay |
| `Ctrl + Shift + Space` / `Cmd + Shift + Space` | Quick Capture (alternate fallback) |
| `Ctrl + K` / `Cmd + K` | **Search** / Command Palette |
| `Ctrl + Enter` / `Cmd + Enter` | Convert item to Checklist / Toggle Task |
| `Ctrl + Z` / `Cmd + Z` | **Undo** last action (edit, delete, archive) |
| `Ctrl + Shift + Z` / `Cmd + Shift + Z` | **Redo** undone action |
| `Ctrl + S` / `Cmd + S` | Download complete `.sideleaf` backup |
| `Esc` | Close active modal or cancel selection |
| `?` | View keyboard shortcut reference |
| `Enter` | Save capture in quick input / overlay |
| `Shift + Enter` | Insert newline in capture textarea |

---

## Privacy & Local-First Storage

- **IndexedDB Storage**: 100% of notes, workspaces, sections, and settings remain in your browser's local IndexedDB database (`sideleaf_db`), with an automatic `localStorage` fallback.
- **Local Runtime Files**: Background reminder states are stored locally in `%LOCALAPPDATA%\Sideleaf` (`reminders.json`, `runtime.json`).
- **No Cloud Backend**: Zero external server dependencies, no remote accounts, and no data leaves your computer.
- **Zero Telemetry**: No tracking scripts, analytics, cookies, remote CDN fonts, or third-party requests.

---

## Backup & Data Portability

- **Portable `.sideleaf` Backups**: Export your complete state into versioned JSON backup files (`Ctrl+S`).
- **Includes Reminders**: Active reminders and recurrence schedules are fully preserved in exports.
- **Flexible Import Strategies**:
  - **Merge**: Safely merges incoming items and workspaces with existing notes.
  - **New Workspace**: Isolates imported content into a newly created workspace.
  - **Replace**: Complete database restore from backup file.
- **Legacy Compatibility**: Full backwards compatibility with `.workpad` backup files.
- **Markdown Export**: Export individual workspaces to standard GitHub Flavored Markdown (`.md`) with task checkboxes (`- [ ]` / `- [x]`), quotes, and source links.

---

## Development

Sideleaf is built with a modern, lightweight web stack:

- **React 19**
- **TypeScript 5.7**
- **Vite 6**
- **Tailwind CSS 3**
- **Lucide Icons**
- **Vitest 5**

### Development Commands

```bash
# 1. Install dependencies
npm install

# 2. Start local development server with Vite HMR
npm run dev

# 3. Run test suite with Vitest
npm test

# 4. Build production static bundle (dist/)
npm run build

# 5. Run local production launcher
npm run launch

# 6. Package standalone portable distribution bundle
npm run package
```

---

## License

Sideleaf is source-available under the **PolyForm Noncommercial License 1.0.0**.

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

---

## Contributing & Security

- **Contributing**: Please review [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines, testing standards, and pull request expectations.
- **Security & Privacy**: Review [SECURITY.md](SECURITY.md) for responsible disclosure procedures and vulnerability reporting.
- **Issues**: Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) or [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) templates to report issues or suggest ideas.
