# WORKPAD — END-USER DISTRIBUTION & LAUNCH SPEC
## Convert the current npm/dev-server prototype into a normal end-user application

This document is a one-shot implementation prompt for an AI coding agent.

The current Workpad product is functionally mature enough for MVP use, but it is still being experienced primarily through a development server such as:

```text
npm run dev
```

That is acceptable for developers, but NOT acceptable as the final end-user experience.

The next task is to make Workpad feel like a normal application that a non-technical user can open and use immediately.

The key requirement is:

> **The end user must not need Node.js, npm, a terminal, a dev server, or deployment knowledge.**

---

# 1. OBJECTIVE

Transform the current Workpad project from:

```text
developer
→ terminal
→ npm run dev
→ localhost
→ browser
```

into:

```text
end user
→ open Workpad
→ browser window opens
→ Workpad is immediately usable
```

The existing npm/Vite/React/TypeScript project MUST remain the development/build source of truth.

Do not remove npm.

Do not remove the build system.

Instead, create a proper end-user distribution layer on top of the existing application.

---

# 2. IMPORTANT PRODUCT DECISION

Workpad is still fundamentally a:

> **browser-native local-first application**

It is NOT becoming a server application.

It should remain:

- local-first
- offline-capable
- static-build friendly
- lightweight
- open source
- no backend
- no account
- no cloud dependency
- no mandatory telemetry

The end-user distribution should make the browser invisible as much as practical.

The user should feel:

> “I opened Workpad.”

rather than:

> “I am running a website locally.”

---

# 3. DO NOT CONVERT TO ELECTRON

Explicitly prohibited unless a future separate decision is made.

Do NOT:

- embed Chromium through Electron
- package a second browser runtime
- run a background Node server
- ship an always-on localhost process
- create a system daemon

The current goal is:

> **Browser-based application + easy launcher/install experience.**

---

# 4. TARGET END-USER EXPERIENCE

The target experience depends on platform.

## 4.1 Easiest universal route

Provide a production build that users can install/launch without development tooling.

Desired flow:

```text
Download / obtain Workpad
↓
Open the provided launcher or installation entry
↓
Browser opens Workpad
↓
User starts writing
```

The user must NOT need:

```text
npm install
npm run dev
node ...
```

---

# 5. DISTRIBUTION MODES

Implement/document THREE supported modes.

## MODE A — Static web production build

The canonical build:

```text
npm run build
```

produces static assets.

This is the source of truth for publishing Workpad to any static host.

No backend is required.

---

## MODE B — PWA installation

This should be the preferred “app-like” experience where supported.

The production website/build should include:

- `manifest.webmanifest`
- service worker
- icons
- app name
- short name
- theme color
- background color
- standalone display mode
- appropriate start URL
- scope

When installed, Workpad should open in an application-like window instead of looking like an ordinary browser tab where supported.

The installed app should launch directly into Workpad.

---

## MODE C — Local launch package

Create a simple end-user distribution mechanism for people who want to keep Workpad completely local.

The goal is NOT to make a new server product.

Possible implementation:

```text
Workpad/
  dist/
  launch script
  README
```

The launcher may:

1. detect an available browser
2. start a temporary local static server only when needed for browser security/storage correctness
3. open the Workpad URL automatically
4. close cleanly when the user exits the launcher where practical

IMPORTANT:

If a local static server is used, it should be:

- minimal
- foreground or lifecycle-bound to Workpad
- automatically started by the launcher
- automatically opened in the browser
- not a long-lived system service
- clearly documented

The user must not manually type commands.

The launcher is a distribution convenience, not part of the product runtime.

---

# 6. CRITICAL BROWSER SECURITY REALITY

Do NOT assume this will work reliably:

```text
file:///path/to/index.html
```

for the complete app.

Direct `file://` pages can have browser-specific behavior around:

- IndexedDB
- localStorage
- service workers
- module loading
- fetch
- caching
- security isolation

Therefore:

> **Do not sacrifice data reliability just to force “double-click index.html.”**

If direct HTML opening is only partially reliable, provide a better launcher/PWA approach.

The product requirement is:

> **one-click for the user**

not:

> literally every internal URL must be `file://`.

---

# 7. RECOMMENDED LOCAL LAUNCHER STRATEGY

If technically feasible for the repository and target OS:

Create a small launcher that:

1. starts a local static-file server against the production `dist` directory
2. binds only to localhost
3. chooses an available port automatically
4. opens the correct browser URL
5. does NOT require Node.js if a standalone launcher can be produced
6. does not expose the application publicly on the network
7. exits cleanly

Security requirements:

- bind to `127.0.0.1`
- do not bind to `0.0.0.0` by default
- no external network interface exposure
- no arbitrary file browsing endpoint
- serve only the Workpad production directory
- reject path traversal
- use a random/free local port when practical

---

# 8. CROSS-PLATFORM GOAL

The distribution design should consider:

### Windows
Easy launch through a desktop shortcut / launcher executable or script.

### macOS
Easy launch through PWA or a local launcher/openable app bundle if practical.

### Linux
Easy launch through a desktop entry / launcher script if practical.

Do NOT pretend that one packaging format is identical across all operating systems.

Document platform-specific installation methods honestly.

---

# 9. USER-FACING INSTALLATION EXPERIENCE

Create a clear installation section in the project documentation.

Example:

## Windows

```text
Download Workpad
Double-click Workpad Launcher
→ Workpad opens in Chrome/Edge
```

## macOS

```text
Open Workpad
→ install as an app / launch through supported mechanism
```

## Browser

```text
Open Workpad online/static build
→ Install Workpad
```

The exact mechanism depends on what is technically implemented.

Do not document features that do not exist.

---

# 10. STARTUP BEHAVIOR

When launched, the application should:

1. open the production UI
2. restore the user's local workspace
3. preserve theme
4. preserve language
5. preserve current/last context where appropriate
6. become interactive quickly

Do NOT require:

- sign-in
- network
- API calls
- migrations that block the first paint unnecessarily

---

# 11. PWA REQUIREMENTS

Add or verify:

```text
manifest.webmanifest
```

with:

- name: Workpad
- short_name: Workpad
- description
- start_url
- scope
- display: standalone
- theme_color
- background_color
- icons

Use appropriate icon sizes.

Add a proper service worker.

The service worker must:

- cache the app shell safely
- support offline startup
- use an explicit cache version
- clean old caches
- avoid caching arbitrary sensitive external URLs

Do not aggressively cache user-generated content through the service worker if the actual data already lives in IndexedDB.

---

# 12. PWA UPDATE STRATEGY

The app must handle updates predictably.

Avoid surprising the user by replacing a live session instantly.

A reasonable strategy:

```text
new version detected
→ finish current session
→ update on reload
```

or another safe mechanism.

Do not risk losing local state because of a service-worker update.

---

# 13. PWA INSTALL UI

Do not create a giant installation banner.

Provide a subtle optional hint when installation is available.

For example:

```text
Install Workpad
Use it like an app.
```

This should be dismissible.

No repeated nagging.

---

# 14. BROWSER LAUNCHING

The launcher should open the user's preferred available browser where practical.

Do not force-install a browser.

Do not secretly change default browser settings.

If browser selection is unavailable, use the operating system default.

---

# 15. LOCAL SERVER LIFECYCLE

If a local launcher starts a static server:

The server must:

- serve only Workpad files
- bind to localhost
- use an automatically chosen free port
- open browser automatically
- avoid spawning duplicate servers
- shut down when the launcher exits where practical
- not run as a permanent service
- not expose a control panel
- not expose file-system directories beyond Workpad

---

# 16. ZERO-CONFIG END USER RULE

The final end-user workflow must NOT require:

- Node.js
- npm
- terminal
- Git
- VS Code
- environment variables
- API keys
- Docker
- backend setup

The developer workflow may still require all of these.

The two experiences must be separated.

---

# 17. DEVELOPER WORKFLOW MUST REMAIN

Keep:

```text
npm install
npm run dev
npm run build
```

or the repository's existing equivalent commands.

Do not make the developer experience worse to satisfy end users.

---

# 18. BUILD ARTIFACT

The repository should have an explicit production build output.

Example:

```text
dist/
```

The dist directory must contain everything required for the static app.

Do not leave development-only references in production.

---

# 19. BUILD VALIDATION

After implementation:

```text
npm install
npm run build
```

must complete successfully.

Then verify the generated production build, not the dev server.

This distinction is essential.

---

# 20. END-USER SMOKE TEST

After the build:

1. stop the dev server
2. use only the production artifacts / launcher / PWA
3. open Workpad
4. create a note
5. reload
6. verify persistence
7. search
8. change language
9. change theme
10. export
11. import
12. use offline mode
13. close
14. reopen

The application must work without the dev server.

---

# 21. NO DEV-SERVER DEPENDENCY

Search the source/build output for:

- localhost URLs
- dev-only websocket connections
- Vite dev client references where inappropriate
- development environment assumptions
- dev-only APIs
- hardcoded development ports

Production Workpad MUST NOT depend on:

```text
localhost:xxxx
```

for core functionality.

---

# 22. ENVIRONMENT VARIABLES

The production application should require no environment variables for normal local-first functionality.

If the existing build uses environment values:

- remove unnecessary ones
- provide safe defaults
- clearly document any unavoidable configuration

No secret keys should be needed.

---

# 23. SERVICE WORKER SECURITY

The service worker should only control the intended Workpad scope.

Do not accidentally intercept unrelated browser traffic.

Do not cache arbitrary external content.

---

# 24. LOCAL-FIRST DATA

Continue using the current persistence architecture.

The distribution change must NOT change the user's data model unnecessarily.

Keep:

- IndexedDB
- existing migrations
- export/import
- recovery
- local settings

where already correct.

---

# 25. FILE URL COMPATIBILITY

If direct opening of:

```text
index.html
```

is supported:

- test it explicitly in Chrome
- test it explicitly in Safari
- test module loading
- test IndexedDB
- test import/export
- test reload persistence

If it does not behave reliably:

> do not pretend it is supported.

Use the launcher/PWA/localhost-static approach instead.

---

# 26. “ONE CLICK” REQUIREMENT

The final end-user goal is:

```text
ONE CLICK
↓
WORKPAD OPENS
```

This can be implemented through:

- PWA app icon
- desktop shortcut
- launcher application
- platform-specific app entry

The implementation may vary by platform.

---

# 27. OPTIONAL DESKTOP SHORTCUT

Provide/document a way to create:

```text
Workpad
```

desktop shortcut.

Double-clicking it should launch Workpad.

Do not require users to manually edit commands.

---

# 28. OPEN SOURCE DISTRIBUTION

The repository should remain transparent.

A user/contributor should be able to understand:

- how the app is built
- what the launcher does
- whether anything runs locally
- what network access exists
- where data is stored
- how to remove the app

---

# 29. SECURITY DISCLOSURE

The README should explain:

### Core app
No account.
No backend.
No telemetry by default.

### Local launcher, if implemented
If a local server is used, explain:

- localhost-only
- temporary
- serves only Workpad files

Do not make vague “completely private” claims without explaining implementation details.

---

# 30. UNINSTALL / DATA OWNERSHIP

Document:

- how to remove the PWA/launcher
- where browser-local data lives conceptually
- that uninstalling an app and deleting browser storage may be different actions
- how to export before removing data

The goal is user control.

---

# 31. DATA BACKUP REMINDER

Do not nag users.

A subtle Settings & Data message is enough:

> Back up your workspace before removing browser data.

---

# 32. OFFLINE STARTUP

The installed/local Workpad should still start with no internet.

Test:

```text
disable network
→ launch Workpad
→ create note
→ search
→ reload
```

All core actions should continue to work.

---

# 33. EXTERNAL LINKS

External links may obviously require internet.

The application itself should not.

Do not interpret offline support as “all external websites work offline.”

---

# 34. STARTUP PERFORMANCE

The production app must:

- show UI quickly
- not block on full search indexing
- not block on remote resources
- not request remote fonts
- not wait for a backend
- not wait for external APIs

The app should become usable before noncritical work completes.

---

# 35. RAM / PROCESS REQUIREMENT

The distribution should not create:

- Electron + browser
- duplicate Chromium runtime
- unnecessary node background process

If a temporary launcher/server is used, it must be lightweight and lifecycle-bound.

The browser itself will naturally consume memory.

Do not claim otherwise.

---

# 36. WINDOWS-SPECIFIC POSSIBILITY

If the repository's toolchain can safely support it, provide a distributable Windows launcher.

Potential result:

```text
Workpad.exe
```

that:

1. starts the minimal local static server if required
2. opens the browser
3. terminates cleanly

Do not bundle an entire browser runtime.

If creating an executable introduces large dependencies or heavy runtime cost, prefer a simpler launcher script or documented PWA route.

---

# 37. MACOS-SPECIFIC POSSIBILITY

Prefer:

- PWA installation
- app shortcut
- Safari/Chrome installed web app

A native wrapper is NOT required.

Do not introduce unnecessary native complexity.

---

# 38. LINUX-SPECIFIC POSSIBILITY

A `.desktop` launcher may be documented/provided.

Again:

- no daemon
- no background service
- no backend

---

# 39. ICONS / BRANDING

Production install assets must include:

- Workpad icon
- favicon
- PWA icons
- appropriate platform launcher icon where supported

Keep the existing simple blue “W” identity if visually appropriate.

Do not redesign the entire brand during this task.

---

# 40. APP METADATA

Set:

- Workpad
- description
- author/license information
- version

Version should come from a reliable project source.

Avoid duplicate version constants where possible.

---

# 41. ERROR HANDLING FOR LAUNCHER

If the launcher cannot start:

Display a clear error such as:

> Workpad could not start.
> Another local port may be in use.

Do not show raw stack traces to end users.

Provide a useful next step.

---

# 42. DUPLICATE LAUNCH

If a user clicks Workpad twice:

Avoid creating unnecessary duplicate local servers/windows.

Where technically feasible:

- detect an existing instance
- reuse it
- or safely launch another isolated instance

Choose the simplest robust behavior.

---

# 43. PORT COLLISION

Do NOT hardcode a single port such as:

```text
3000
5173
```

for the final launcher.

Choose an available localhost port automatically.

---

# 44. NETWORK SECURITY

The local launcher/server must:

- bind to `127.0.0.1`
- never bind publicly by default
- not expose Workpad to LAN
- not accept arbitrary proxy requests
- not provide filesystem browsing
- serve only static files

---

# 45. DEVELOPER MODE VS PRODUCTION MODE

Make the distinction explicit:

### Development

```text
npm run dev
```

### Production

```text
npm run build
```

### End user

No terminal required.

---

# 46. DOCUMENTATION STRUCTURE

README should include:

```text
Workpad
What it is

For users
  Install / Launch
  Data
  Offline behavior

For developers
  npm install
  npm run dev
  npm run build

Distribution
  PWA
  Desktop launcher
  Static hosting

Privacy
  Local-first architecture

Troubleshooting
```

Keep it readable.

---

# 47. END-USER QUICK START

Add a very short section:

```text
1. Open Workpad.
2. Start writing.
3. Use Ctrl/Cmd+Space for quick capture.
4. Your data stays local unless you export it.
```

Turkish version:

```text
1. Workpad'i aç.
2. Yazmaya başla.
3. Hızlı yakalama için Ctrl/Cmd+Space kullan.
4. Dışa aktarmadığın sürece verilerin yerel kalır.
```

Only make the final privacy statement if technically true.

---

# 48. TEST THE REAL USER PATH

Do NOT only test:

```text
npm run dev
```

Test:

```text
npm run build
→ production artifact
→ launcher/PWA
→ browser
→ local persistence
```

The dev server must be stopped during this test.

---

# 49. ACCEPTANCE CRITERIA

The task is complete only when:

### A. No dev server needed
An ordinary user can use Workpad without `npm run dev`.

### B. Browser opens automatically
The user does not need to manually type a localhost URL.

### C. Production build works
The build artifact runs independently from development tooling.

### D. Local data persists
Notes survive reload/reopen through the supported distribution path.

### E. Offline works
Core functionality remains available without internet.

### F. No Electron
No embedded browser runtime.

### G. No backend
No API server required for core operation.

### H. Lightweight
The launcher/runtime adds as little overhead as practical.

### I. Chrome works
Production user path verified.

### J. Safari works where supported
Production user path verified.

### K. PWA works where supported
Install and launch verified.

### L. Documentation works
A nontechnical user can understand how to launch it.

---

# 50. IMPORTANT: HONEST COMPATIBILITY

Do not report:

> “Works everywhere.”

unless actually tested.

Report:

- tested platforms
- browser versions where relevant
- known limitations
- file:// limitations
- PWA limitations
- launcher limitations

---

# 51. FINAL TEST MATRIX

Create and execute a matrix similar to:

| Scenario | Chrome | Safari | Windows | macOS |
|---|---:|---:|---:|---:|
| Production build opens | ✓ | ✓ | ✓ | ✓ |
| Local persistence | ✓ | ✓ | ✓ | ✓ |
| Offline | ✓ | ✓ | ✓ | ✓ |
| Search | ✓ | ✓ | ✓ | ✓ |
| Import/export | ✓ | ✓ | ✓ | ✓ |
| Turkish | ✓ | ✓ | ✓ | ✓ |
| PWA install | ✓ | ✓ | — | ✓ |
| One-click launcher | ✓ | ✓ | ✓ | ✓ |

Only mark tested rows.

---

# 52. WHAT TO KEEP

Preserve:

- npm
- Vite
- React
- TypeScript
- existing UI
- local-first model
- IndexedDB
- import/export
- i18n
- Turkish support
- theme
- keyboard shortcuts
- search

unless an actual bug requires a change.

---

# 53. WHAT TO ADD

Add:

- production distribution workflow
- PWA correctness
- manifest
- service worker
- production startup validation
- launcher if practical
- desktop shortcut/documentation where practical
- end-user installation documentation
- distribution tests

---

# 54. WHAT NOT TO ADD

Do NOT add:

- Electron
- backend
- login
- cloud sync
- analytics
- telemetry
- account system
- AI
- collaboration
- native database
- permanent localhost service
- remote font dependency
- large packaging runtime

---

# 55. LAUNCHER TECHNOLOGY CHOICE

The agent may choose the most lightweight practical mechanism.

Potential choices:

### Option 1
Static/PWA only.

### Option 2
Tiny native launcher that starts a localhost static server.

### Option 3
Platform-specific shell launcher.

### Option 4
A combination.

Select based on:

- reliability
- file size
- maintenance
- browser compatibility
- security
- user simplicity

Do not create a large toolchain solely for packaging.

---

# 56. DISTRIBUTION PHILOSOPHY

The application has two layers:

```text
WORKPAD PRODUCT
    ↓
static browser app

DISTRIBUTION LAYER
    ↓
PWA / launcher / desktop shortcut
```

Keep these concerns separated.

The application itself should not know or care how it was launched.

---

# 57. NO LAUNCHER-SPECIFIC PRODUCT LOGIC

The React application must not depend on:

> “I was started by Workpad.exe.”

It should function identically as:

- browser URL
- PWA
- local static server
- static host

where capabilities permit.

---

# 58. PERSISTENCE TEST AFTER INSTALL

Install/launch Workpad.

Create:

```text
Test note
```

Close.

Reopen.

Verify:

```text
Test note
```

still exists.

Repeat with:

- English
- Turkish
- dark mode
- workspace context
- multiple notes

---

# 59. UPDATE TEST

Simulate a new production build.

Verify:

- old local data survives
- service worker updates safely
- schema migration works
- no data reset
- no duplicate data

---

# 60. UNINSTALL TEST

Where an installable app exists:

- uninstall
- determine what local data remains
- document behavior
- ensure the user can export before removal

Do not hide this behavior.

---

# 61. README USER SECTION MUST NOT ASSUME TECHNICAL KNOWLEDGE

Bad:

> Run `pnpm build` and serve `dist`.

Good:

> Download Workpad and open the application.

Developer instructions can be separate.

---

# 62. FINAL UX GOAL

The end user should not think about:

- npm
- Vite
- React
- localhost
- service workers
- IndexedDB
- deployment

They should think:

> **“I opened Workpad.”**

---

# 63. FINAL ARCHITECTURAL GOAL

The final architecture should look conceptually like:

```text
                ┌─────────────────────────┐
                │       Workpad UI        │
                │ React / TypeScript      │
                └────────────┬────────────┘
                             │
                ┌────────────▼────────────┐
                │    Local App State      │
                └────────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        IndexedDB         Search       Import/Export
              │
              ▼
         Local Device

Distribution:
      ┌────────┬──────────┬─────────────┐
      ▼        ▼          ▼
     PWA     Static      Launcher
             build       (optional)
```

---

# 64. FINAL AGENT INSTRUCTION

Do not interpret this task as:

> “package the dev server.”

Interpret it as:

> **“turn the existing browser-native Workpad into a real end-user product.”**

The developer experience should remain npm-based.

The user experience should not be.

At the end, a nontechnical user should be able to obtain Workpad, click it, see Workpad in the browser/app window, and begin writing.

The resulting experience should feel:

- normal
- instant
- trustworthy
- lightweight
- local
- offline-capable
- open-source
- installable
- portable

Most importantly:

# THE DEV SERVER MUST NO LONGER BE PART OF THE END-USER EXPERIENCE.

---

# END OF END-USER DISTRIBUTION SPEC
