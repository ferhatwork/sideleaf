# WORKPAD — FINAL REVISION & IMPLEMENTATION SPEC
## One-Shot Prompt for an AI Coding Agent / Multi-Agent Coding Team

> This is the **final revision specification** for the current Workpad prototype.
>
> The repository already exists and currently runs through **npm**. Do NOT replace the project with a file-open-only architecture. The correct goal is:
>
> **A lightweight npm-based static web application that runs locally, can be built into static assets, works in Chrome and Safari, remains local-first/offline-capable, and preserves the “single-click / no deployment required” spirit.**
>
> The visual direction shown in the latest prototype is substantially correct. This task is a refinement and hardening pass, not a complete rewrite.
>
> The final product should feel like:
>
> **“a digital sheet of paper beside your keyboard that quietly understands the work you are doing.”**

---

# 1. EXECUTIVE SUMMARY

The current Workpad prototype has moved in the correct direction:

- the dashboard feeling has been reduced,
- the main surface is calmer,
- Quick Capture is smaller,
- cards have been reduced,
- Continue is compact,
- Local branding is visible,
- the general visual direction is suitable.

However, the product still needs a final refinement pass.

The main remaining risk is that Workpad becomes:

> “a minimalist notes list”

instead of:

> **“a lightweight work surface / external working memory.”**

The revision must therefore prioritize:

1. work-surface feel,
2. instant capture,
3. document-like content flow,
4. current work context,
5. minimal cognitive load,
6. excellent typography,
7. proper Turkish localization,
8. low runtime overhead,
9. strong Chrome/Safari behavior,
10. robust local persistence,
11. npm-based developer experience,
12. static distribution with no backend.

---

# 2. PRODUCT DEFINITION

## Workpad

**A tiny, local-first work surface for computer work.**

Primary promise:

> Open it. Capture the thought. Keep working. Organize later.

The user should not feel that they are opening a productivity management system.

They should feel that they are opening:

- a digital piece of paper,
- a scratch surface,
- an external memory,
- a lightweight workbench.

---

# 3. CORE PRODUCT PRINCIPLE

The single most important sentence in this specification:

> **Workpad is not where you manage your work. It is where you keep your mind while you do your work.**

Therefore:

### Optimize for:
- thought capture
- context continuity
- retrieval
- lightweight action
- low friction

### Do not optimize for:
- dashboards
- project administration
- metrics
- task management
- complex organization
- feature count

---

# 4. EXISTING PROJECT MUST BE INSPECTED FIRST

Before modifying code, inspect the actual repository.

Do NOT assume the previous implementation matches this document exactly.

Required first actions:

1. inspect `package.json`
2. inspect npm scripts
3. inspect source tree
4. inspect current application entry point
5. inspect persistence implementation
6. inspect current data model
7. inspect router/navigation if any
8. inspect styles/design tokens
9. inspect tests
10. run the current app
11. run current test suite
12. inspect the current UI in Chrome
13. inspect it in Safari if available

Then create an internal gap analysis:

| Area | Current | Desired | Action |
|---|---|---|---|
| Home | ... | Work Surface | Modify |
| Capture | ... | Capture-first | Modify |
| Typography | ... | Turkish-safe system | Modify |
| Persistence | ... | Local-first | Verify |
| Build | npm | npm/static | Preserve |
| etc. | ... | ... | ... |

Do not rewrite healthy parts merely to satisfy an imagined architecture.

---

# 5. IMPORTANT ARCHITECTURE DECISION

## KEEP THE NPM PROJECT

The current project already runs with npm.

That is acceptable and preferred.

Do NOT convert the project into:

- a standalone raw `index.html` with no build system,
- Electron,
- a native app,
- a backend application,
- a server-dependent SaaS.

Instead:

### Development:
```text
npm install
npm run dev
```

### Build:
```text
npm run build
```

### Preview:
```text
npm run preview
```

Use the project's existing equivalent scripts if their names differ.

The final build should produce ordinary static assets that can be hosted anywhere later.

---

# 6. “NO DEPLOYMENT” INTERPRETATION

The product requirement is:

> The user should not need to deploy or configure a server just to use Workpad.

This does NOT require unsafe assumptions about browser `file://` storage.

The architecture should support:

### A. Normal npm local development

### B. Static production build

### C. Static hosting anywhere

### D. PWA installation where supported

### E. Local-first storage

### F. Portable import/export

If directly opening a local HTML file has browser-specific storage limitations, do not hack around browser security.

Use graceful fallbacks.

The application remains a static web application.

---

# 7. TECHNOLOGY PRINCIPLES

The final architecture should be:

- browser-native
- npm-managed
- TypeScript preferred
- static-build friendly
- minimal dependencies
- local-first
- offline-capable
- no backend

Avoid introducing:

- Electron
- server-side runtime
- API service
- remote database
- authentication
- telemetry SDK
- heavy UI framework just for one feature
- unnecessary editor package
- unnecessary state-management library

---

# 8. PERFORMANCE IS A PRODUCT REQUIREMENT

The user explicitly wants Workpad to consume as little RAM and runtime resources as reasonably possible.

Do not make impossible claims such as:

> “0 MB RAM.”

Instead target:

> **minimal unnecessary overhead.**

## Performance rules

Avoid:

- persistent polling
- unnecessary timers
- large observers
- repeated full-tree rerenders
- rendering all historical items at once
- duplicated large strings
- giant editor abstractions
- remote assets
- heavy animation
- large unused dependencies

Prefer:

- small dependency graph
- incremental state updates
- lazy rendering
- virtualization for large histories
- IndexedDB for durable local data
- efficient DOM updates
- CSS over JS for simple visual behavior
- native browser APIs where reliable

---

# 9. NPM / BUNDLE AUDIT

Before finishing, inspect:

- dependency count
- dependency sizes
- bundle size
- CSS size
- unused dependencies
- duplicate packages

Remove dependencies that are not justified.

Document major dependencies.

Do not add a package for functionality that can be implemented simply and safely in a few lines.

---

# 10. TYPOGRAPHY — IMPORTANT NEW REQUIREMENT

Typography is currently one of the weakest visual areas and must be deliberately improved.

The product should have:

- professional typography
- strong Turkish character support
- good Latin Extended support
- clean punctuation
- correct diacritics
- clear numbers
- readable metadata
- strong hierarchy

The typography must look equally natural in:

### English
and
### Turkish.

Examples that must render beautifully:

```text
Çalışma alanı
Görüşme notları
İş akışı
Şimdi
Son kullanılanlar
Ara
Kaydet
Düzenle
Öğeleri arşivle
```

---

# 11. FONT STRATEGY

## Do not depend on a remote font service by default.

The app must work offline.

Prefer a well-supported system-font stack, for example a carefully selected stack using:

- system UI fonts
- Apple system fonts on macOS
- Segoe UI on Windows
- fallback sans-serif fonts with strong Turkish glyph coverage

If a bundled font is introduced, verify:

- license
- file size
- Turkish / Latin Extended coverage
- loading performance

Do NOT add a large font merely for visual fashion.

---

# 12. TYPOGRAPHY HIERARCHY

Use a deliberately small typographic scale.

Example conceptual hierarchy:

### Page title
Distinct, confident, slightly editorial.

### Body
Highly readable and neutral.

### Secondary metadata
Quiet and low contrast.

### Shortcut labels
Compact monospace or compact UI font style if appropriate.

The existing serif “Today” direction may be retained if it creates the intended notebook/editorial character.

However:

- body must remain highly legible,
- serif must never reduce readability,
- Turkish glyphs must look natural,
- headings must not look ornamental.

---

# 13. TYPOGRAPHY VISUAL GOAL

The UI should feel:

- intelligent
- calm
- mature
- slightly editorial
- software-native

Avoid:

- generic startup dashboard typography
- oversized marketing typography
- novelty fonts
- extremely thin text
- tiny unreadable metadata

---

# 14. TURKISH LANGUAGE SUPPORT

Turkish localization is a **first-class requirement**, not a later add-on.

The interface must support at least:

- English
- Turkish

Default language should follow system/browser language where reasonable.

If Turkish is detected, default to Turkish.

The user must also be able to manually choose:

```text
English
Türkçe
```

---

# 15. INTERNATIONALIZATION ARCHITECTURE

Do NOT scatter user-facing strings across components.

Create a localization layer such as:

```text
i18n/
  en.ts
  tr.ts
  index.ts
```

or equivalent.

All user-facing UI strings should come from translation resources.

Do not use machine-generated dynamic string concatenation in ways that break Turkish grammar.

Prefer complete localized phrases.

---

# 16. TURKISH UI COPY

Use natural Turkish rather than literal translations.

Suggested dictionary:

| English | Turkish |
|---|---|
| Today | Bugün |
| Scratch | Karalama |
| Recent | Son Kullanılanlar |
| Workspaces | Çalışma Alanları |
| Archive | Arşiv |
| Trash | Çöp Kutusu |
| Settings & Data | Ayarlar ve Veri |
| Capture | Yakala |
| Search your work... | Çalışmalarında ara... |
| Capture something... | Bir şey yakala... |
| Working on | Üzerinde çalışılıyor |
| Continue | Devam et |
| Last active | Son etkinlik |
| Convert to task | Göreve dönüştür |
| Move to workspace | Çalışma alanına taşı |
| Copy | Kopyala |
| Delete | Sil |
| Restore | Geri yükle |
| Save | Kaydet |
| Export | Dışa aktar |
| Import | İçe aktar |
| Nothing here yet. | Burada henüz bir şey yok. |
| Capture anything. Organize later. | Her şeyi yakala. Sonra düzenle. |

Translations should be reviewed for natural Turkish.

---

# 17. TURKISH DATE/TIME FORMATTING

When Turkish is active:

- use Turkish weekday/month conventions,
- use locale-aware date formatting,
- use locale-aware numbers,
- use correct relative-time wording.

Use `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` where appropriate.

Do not hardcode:

`5m ago`

when Turkish locale is active.

Use:

`5 dk önce`

or a naturally localized equivalent.

---

# 18. TURKISH KEYBOARD SUPPORT

The product must work correctly with Turkish keyboards.

Test:

- `ç`
- `ğ`
- `ı`
- `İ`
- `ö`
- `ş`
- `ü`

and uppercase variants.

Do not break keyboard shortcuts because of locale handling.

Shortcut labels may render differently on macOS/Windows where appropriate.

---

# 19. KEYBOARD-FIRST DESIGN

Required core shortcuts:

```text
Ctrl/Cmd + Space
Quick Capture

Ctrl/Cmd + K
Search

Esc
Close transient UI

Ctrl/Cmd + Enter
Convert current item to task

Ctrl/Cmd + Z
Undo

Ctrl/Cmd + Shift + Z
Redo
```

Do not introduce dozens of shortcuts.

Avoid conflicts where possible.

If a shortcut is intercepted by the browser/OS, provide a configurable fallback.

---

# 20. MAIN HOME SCREEN — FINAL DIRECTION

The main screen should no longer look like a productivity dashboard.

The visual model is:

> **Today = work surface**

not:

> Today = analytics page

Recommended composition:

```text
┌──────────────────────────────────────────────────────────────┐
│ Workpad                          Search     Local     +       │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│ Today        │ Today                                         │
│ Scratch      │ Sunday, 6 September                           │
│ Recent       │                                               │
│              │ ● Website Redesign                            │
│ Workspaces   │                                               │
│  • Website   │ Capture something...                          │
│  • Research  │                                               │
│              │ Check Stripe webhook limits.                  │
│              │                                               │
│              │ Ask client about billing.                     │
│              │                                               │
│              │ Try Safari responsive behavior.               │
│              │                                               │
│ Archive      │ The pricing section feels too dense.          │
│ Recently     │                                               │
│ deleted      │ docs.stripe.com                               │
│              │                                               │
│              │ Continue                                      │
│              │ Website Redesign · Last active 20m ago        │
└──────────────┴───────────────────────────────────────────────┘
```

Do NOT reproduce this literally.

Preserve the underlying principles:

- calm
- content-first
- document-like
- no dashboard widgets
- no dense cards
- easy capture
- visible current context

---

# 21. TODAY MUST FEEL LIKE A DOCUMENT

The content should flow vertically.

Use:

- text
- subtle separators
- compact metadata
- inline interactions

Avoid making every item into a card.

The user should be able to look at the screen and think:

> “This is my page for today.”

---

# 22. ITEM PRESENTATION

## Default note

```text
Check Safari responsive behavior

8 min ago · Website Redesign
```

## Task

```text
☐ Ask client about billing

8 min ago · Scratch
```

## Source

```text
docs.stripe.com
“Webhook limits…”

5 min ago · Website Redesign
```

Metadata should be quiet.

---

# 23. CARD USAGE

Cards are allowed only when they represent meaningful groups.

Good card use:

- Continue state
- contextual workspace preview
- modal/dialog

Bad card use:

- every note
- every task
- every source

The main work surface should not become a wall of rectangles.

---

# 24. QUICK CAPTURE — FINAL DESIGN

## Idle

```text
┌──────────────────────────────────────────┐
│ +  Capture something…             ⌘↵     │
└──────────────────────────────────────────┘
```

## Focused

```text
┌──────────────────────────────────────────┐
│ What’s on your mind?                    │
│                                          │
│ check Safari responsive issue            │
│                                          │
│                              Enter ↵     │
└──────────────────────────────────────────┘
```

The capture control should not look like a configuration form.

---

# 25. CAPTURE-FIRST RULE

The user MUST NOT choose a type before writing.

Default type:

```text
text
```

After writing, optional actions:

- Convert to task
- Add source
- Move to workspace
- Archive

This must be progressive.

---

# 26. NO PERMANENT TYPE TOOLBAR

Do not permanently show:

```text
Text
Task
Quote
Link
Divider
```

at the top of the capture experience.

If these options exist, expose them contextually.

---

# 27. TASKS

Tasks are transformations of notes.

Example:

```text
Ask client about billing
```

becomes:

```text
☐ Ask client about billing
```

Do not turn tasks into:

- priority management
- due dates
- recurring work
- project boards
- subtasks
- task analytics

in this revision.

---

# 28. CURRENT WORK / WORKING ON

Introduce a lightweight context indicator.

Possible UI:

```text
● Website Redesign
```

or:

```text
WORKING ON
● Website Redesign
```

Keep it visually quiet.

Its purpose is:

> tell the user what mental context is currently open.

---

# 29. CURRENT WORK BEHAVIOR

If a workspace is active:

- new captures may inherit it,
- search can rank it higher,
- Continue can reference it,
- Recent can emphasize it.

But:

> capture must always work without an active workspace.

No workspace is mandatory.

---

# 30. CONTINUE

Keep Continue.

Make it small.

Example:

```text
Continue
Website Redesign
Last active 20 min ago
```

Do not make it a large dashboard module.

Only show it when there is meaningful context.

---

# 31. WORK SESSION

Introduce the concept internally:

```text
Work Session
```

It represents the context in which the user was actively working.

Potential data:

```text
workspaceId
startedAt
lastActiveAt
```

It may later contain:

- notes
- tasks
- sources
- decisions

Do not expose a complicated session management UI.

---

# 32. SCRATCH

Scratch is explicitly allowed to remain messy.

It may contain:

- fragments
- thoughts
- URLs
- incomplete tasks
- reminders to self
- half-finished sentences

This is intentional.

Never communicate that Scratch is “bad organization.”

---

# 33. PROGRESSIVE STRUCTURE

The correct flow:

```text
Thought
↓
Capture
↓
Continue work
↓
Revisit
↓
Optionally structure
```

Never:

```text
Create workspace
↓
Choose type
↓
Choose tag
↓
Write
```

---

# 34. REMOVE DEMO CONTENT

Fresh production state must NOT contain fake/demo items such as:

- “Try converting any note into a task with one click”
- “Welcome to Workpad. Press Ctrl+Space...”

Development demo fixtures may exist separately.

Fresh user state should be clean.

---

# 35. FIRST-RUN UX

Keep onboarding extremely short.

Preferred:

```text
Workpad

A quiet place for thoughts while you work.

No account.
No setup.

[ Start writing ]
```

Then immediately focus the writing/capture area.

No carousel.

No multi-step tour.

---

# 36. SIDEBAR

Recommended:

```text
TODAY

SCRATCH

RECENT

WORKSPACES
  • Website Redesign
  • Research

────────────

ARCHIVE
RECENTLY DELETED

────────────

Settings & Data
```

The exact labels follow locale.

---

# 37. SIDEBAR COUNTERS

Minimize counters.

Rules:

- hide zero counters
- do not show badges everywhere
- show counts only if they genuinely improve navigation

The sidebar must not look like a notification center.

---

# 38. RECENT

Recent answers:

> “What was I touching lately?”

Use compact chronology.

Do not build another dashboard.

---

# 39. ARCHIVE

Archive means:

> “Keep this, but remove it from my active working space.”

It must be reversible.

---

# 40. TRASH / RECOVERY

Prefer soft deletion.

Flow:

```text
Delete
→ Trash
→ Undo affordance
→ Permanent deletion only when explicitly requested
```

Protect against accidental loss.

---

# 41. SEARCH

Keep the global search.

Shortcut:

`Ctrl/Cmd + K`

Search must feel like:

> external memory.

Not:

> database query interface.

---

# 42. SEARCH RESULTS

Include context.

Example:

```text
Review Stripe webhook documentation

Website Redesign · Today · 5 min ago
“…API rate limits…”
```

Context is valuable because the user may remember:

> “I wrote something about this during the website project.”

---

# 43. SEARCH PERFORMANCE

Do not scan thousands of records through the entire UI tree for every keystroke.

Use:

- normalized local index
- incremental indexing
- debounced input where appropriate
- deterministic ranking
- lazy loading

---

# 44. SOURCE CAPTURE

Keep source handling.

When user pastes a URL or quoted web content, the app may create a source-aware record.

Example:

```text
“quoted content…”

Source
docs.stripe.com
Captured 14:32
```

No automatic scraping in MVP.

---

# 45. CLIPBOARD SAFETY

Treat pasted content as untrusted.

- sanitize
- normalize
- do not execute HTML/scripts
- avoid unsafe `innerHTML`
- preserve useful text
- avoid importing enormous hidden formatting payloads

---

# 46. DATA MODEL

Minimum conceptual model:

```text
Workspace
  id
  name
  createdAt
  updatedAt

Item
  id
  type
  content
  workspaceId
  status
  createdAt
  updatedAt
  archivedAt

Source
  id
  itemId
  url
  title
  capturedText
  capturedAt

Settings
  locale
  theme
  shortcuts
  preferences
```

Potential future types:

```text
text
task
quote
link
divider
decision
```

Do not expose all future types in MVP.

---

# 47. PERSISTENCE

Preferred:

- IndexedDB for structured persistent state
- local in-memory state for active UI state
- versioned schema
- migrations
- safe export/import

The browser itself owns the local database.

No backend.

---

# 48. DATA VERSIONING

Every persisted schema should have a version.

Example:

```text
schemaVersion: 1
```

Future migrations must be explicit.

Never silently destroy incompatible data.

---

# 49. IMPORT / EXPORT

Provide:

```text
Export Workspace
Import Workspace
```

The portable file should be:

```text
something.workpad
```

Recommended underlying structure:

- versioned JSON
- documented schema
- validation before import

Import must not silently overwrite active user data.

---

# 50. USER DATA SAFETY

Before release, test:

- reload during editing
- rapid edits
- closing immediately after typing
- multiple quick captures
- deleting/restoring
- import/export
- browser restart
- offline use

Lost data is a release-blocking defect.

---

# 51. OFFLINE

Core functions must work without internet:

- create note
- edit note
- search local data
- workspace switching
- archive
- trash
- restore
- import/export
- theme
- language

Do not make the app request a remote server during startup.

---

# 52. PWA

PWA is desirable but optional to the core workflow.

Where supported:

- install
- standalone mode
- offline caching
- app icon
- manifest
- service worker

Do not make PWA a hard dependency for basic browser usage.

---

# 53. STATIC BUILD

The production build must be distributable as static assets.

No:

- API key
- server URL
- database credentials
- secret
- backend configuration

should be needed for the core product.

---

# 54. REMOTE ASSETS

Avoid making core UI dependent on:

- remote fonts
- remote icon servers
- external CSS
- remote configuration

This improves:

- offline behavior
- startup
- privacy
- reproducibility

---

# 55. PRIVACY

Default product behavior:

- no account
- no backend
- no telemetry
- no ads
- no server-side storage
- no cloud dependency

Product copy may say:

> Your notes stay on your device unless you explicitly export or share them.

Only use this claim if implementation actually satisfies it.

---

# 56. AI

Do NOT introduce AI merely because modern productivity products contain AI.

If AI already exists in the current prototype, keep it optional and unobtrusive.

Future AI may help with:

- grouping scratch notes
- summarizing local notes
- identifying unfinished work
- extracting next actions
- reconstructing context

Do not build an AI chatbot as the center of the app.

---

# 57. VISUAL DESIGN

Target:

- calm
- editorial
- software-native
- understated
- high legibility
- light and dark themes

Avoid:

- excessive gradients
- giant widgets
- glossy dashboard effects
- excessive rounded cards
- excessive shadows
- gamification

---

# 58. COLOR

Use a restrained accent.

Color should support hierarchy.

Do not use color as the only indicator of status.

The visual system must remain accessible.

---

# 59. DARK / LIGHT / SYSTEM

Required:

- Light
- Dark
- System

Store the preference locally.

---

# 60. ICONOGRAPHY

Use one consistent icon system.

Icons should:

- improve scanning
- remain subtle
- have accessible labels/tooltips where needed

Do not mix random emoji with professional interface icons.

---

# 61. MICROINTERACTIONS

Allowed:

- subtle focus states
- subtle hover states
- quick modal appearance
- compact expansion

Avoid:

- continuous animations
- attention-grabbing movement
- delayed transitions
- animated backgrounds

Respect reduced motion.

---

# 62. RESPONSIVE

Desktop is primary.

At narrower widths:

- sidebar collapses
- search remains accessible
- capture remains prominent
- content remains readable
- touch targets increase

Do not redesign into a mobile-first task app.

---

# 63. ULTRAWIDE

On very wide screens:

- content width should not become enormous
- writing remains within a comfortable maximum width
- the interface should still feel like a work surface

Avoid giant empty center gaps caused by an overly narrow content column.

---

# 64. MAIN CONTENT WIDTH

Use a comfortable content width that can grow modestly on larger monitors.

A reasonable target range is approximately:

```text
700px – 900px
```

for the primary writing/content surface, adjusted by visual testing.

Do not treat these numbers as rigid.

---

# 65. INLINE EDITING

Prefer inline editing.

A user should not be routed through multiple pages to edit a simple note.

Click → type → continue.

---

# 66. ITEM CONTEXT MENU

Hover/focus should expose a subtle action menu:

```text
Convert to task
Move to workspace
Copy
Archive
Delete
```

Optional future:

```text
Add tag
Save as source
```

Do not show all actions permanently.

---

# 67. “NO MORE CARDS” RULE

When adding a feature, the agent must first ask:

> Can this be solved by a simple line, inline control, menu, or existing surface?

Do not add another card unless it represents a genuinely meaningful object.

---

# 68. REMOVE BEFORE ADDING

Before adding a new UI element:

1. inspect whether an existing element can be simplified
2. remove redundant information
3. compress the interface
4. only then add something if still necessary

---

# 69. PRODUCT LANGUAGE

English should remain natural.

Turkish should be natural.

Do not use literal machine translations.

The product voice should be:

- calm
- concise
- intelligent
- understated

Avoid:

- hustle language
- “10x productivity”
- gamified motivation
- corporate jargon

---

# 70. SUGGESTED TURKISH EMPTY STATES

### Today

> Henüz burada bir şey yok.  
> Yazmaya başla, gerisini sonra düzenlersin.

### Scratch

> Aklına geleni yakala. Şimdilik dağınık kalabilir.

### Workspaces

> Bir proje gerçekten ihtiyaç duyduğunda çalışma alanı oluştur.

### Search

> Aradığın şeyi bulamadık.

---

# 71. ACCESSIBILITY

Required:

- semantic HTML
- keyboard navigation
- visible focus
- logical tab order
- accessible dialogs
- accessible buttons
- reduced motion
- sufficient contrast
- screen-reader labels

Hover cannot be the only way to access important actions.

---

# 72. ACCESSIBILITY + TURKISH

Test:

- Turkish text with diacritics
- long translated labels
- buttons that grow in width
- sidebar labels
- dialogs
- keyboard navigation

Do not design for English strings only.

Turkish can be longer than English.

The UI must accommodate this without clipping.

---

# 73. SECURITY

Treat all pasted/imported content as untrusted.

Must:

- sanitize HTML
- escape text
- validate URLs
- validate imported JSON/schema
- prevent script execution
- prevent dangerous DOM injection

Do not automatically fetch arbitrary web pages.

---

# 74. SOURCE URL SAFETY

Display:

- hostname
- optional title
- safe link

Do not silently send source URLs to an external enrichment service.

---

# 75. BROWSER COMPATIBILITY

Primary:

- Chrome
- Safari

Secondary:

- Firefox
- Chromium-based browsers

Use feature detection for browser-specific APIs.

Do not assume identical support for local file APIs.

---

# 76. SAFARI-SPECIFIC QA

Explicitly test:

- local persistence
- keyboard shortcuts
- clipboard behavior
- PWA behavior where supported
- file import/export
- CSS rendering
- viewport behavior

Do not declare Safari support based on Chrome-only testing.

---

# 77. CHROME-SPECIFIC QA

Explicitly test:

- keyboard shortcuts
- clipboard
- IndexedDB
- PWA
- file import/export
- long sessions
- large data

---

# 78. PERFORMANCE TEST DATA

Create a synthetic dataset with:

- 1,000 items
- 5,000 items
- 10,000 items

Test:

- search
- scrolling
- capture
- editing
- workspace switching
- reload
- archive
- import/export

The UI must remain usable.

---

# 79. PERFORMANCE METRICS

Measure where practical:

- bundle size
- initial load
- first usable interaction
- search latency
- long-list rendering
- memory behavior
- persistence time

Do not invent benchmark numbers.

Report measured observations.

---

# 80. STARTUP OPTIMIZATION

The initial user-visible UI should NOT wait for:

- full search indexing
- old history rendering
- optional UI
- nonessential metadata
- remote requests

Load the minimum needed to become interactive.

---

# 81. SEARCH INDEXING

If a large dataset exists:

1. load essential records
2. build/update search index incrementally
3. avoid blocking typing
4. update index on mutation
5. keep search deterministic

---

# 82. STATE ARCHITECTURE

Prefer a clean separation:

```text
UI
↓
Application Actions
↓
Domain State
↓
Persistence / Search / Import-Export
```

Avoid direct storage mutation scattered across UI components.

---

# 83. COMMAND-STYLE APPLICATION ACTIONS

Prefer explicit operations such as:

```text
createItem
updateItem
convertToTask
moveItem
archiveItem
restoreItem
deleteItem
setCurrentWorkspace
exportWorkspace
importWorkspace
setLocale
setTheme
```

This improves testing and maintainability.

---

# 84. TESTING REQUIREMENTS

## Unit

Test:

- item creation
- item update
- task conversion
- archive
- restore
- delete
- schema validation
- serialization
- import
- export
- locale selection
- date/time formatting
- search ranking

## Integration

Test:

- quick capture
- reload persistence
- search
- workspace assignment
- conversion
- archive/restore
- language switch
- import/export

---

# 85. LOCALIZATION TESTS

Automated tests should verify that:

- every required key exists in EN and TR
- no undefined translation keys render
- Turkish strings can fit normal controls
- dates localize correctly
- relative times localize correctly

---

# 86. VISUAL QA TEST

Ask:

### Does it look like a dashboard?
If yes:
reduce widgets/cards.

### Does it look like a task manager?
If yes:
reduce task prominence.

### Does it look like a generic notes list?
If yes:
strengthen work-surface/document flow.

### Does it look like a digital desk/workpad?
That is the target.

---

# 87. PRODUCT DIFFERENTIATOR

Workpad should occupy a distinct position:

| Product | Mental model |
|---|---|
| Notepad | Text |
| Google Keep | Quick note |
| Notion | Workspace/database |
| OneNote | Notebook |
| Obsidian | Knowledge graph |
| Todoist | Tasks |
| Goodnotes | Digital paper |
| **Workpad** | **Work surface / external working memory** |

This differentiation should remain intact.

---

# 88. WHAT WORKPAD IS NOT

Do NOT optimize for:

- database features
- project administration
- enterprise controls
- social collaboration
- productivity scoring
- AI chat
- task dashboards
- excessive organization

---

# 89. CURRENT PROTOTYPE — KEEP

Keep where implementation is sound:

- sidebar
- Today
- Scratch
- Recent
- Workspace concept
- Search
- Local indicator
- Settings & Data
- theme system
- persistence architecture
- basic quick capture
- archive/trash

---

# 90. CURRENT PROTOTYPE — MODIFY

Modify:

- dashboard-like hierarchy
- excessive item counters
- card-heavy presentation
- task prominence
- permanent type toolbar
- overly form-like capture UI
- demo/test data
- content density on ultrawide displays
- typography
- English-only UI

---

# 91. CURRENT PROTOTYPE — ADD

Add/refine:

- Working On/current context
- Work Session internal concept
- document-like Today surface
- better inline interaction
- contextual item menu
- true scratch-first behavior
- Turkish localization
- locale-aware dates/times
- typography system
- localization architecture
- performance audit
- Chrome/Safari compatibility audit

---

# 92. FIRST-CLASS “WORKING ON” CONCEPT

The current workspace should feel like:

> “The thing currently occupying my mind.”

Not:

> “Project selected in a project-management system.”

This distinction should influence visual treatment.

---

# 93. TODAY CONTENT ORDER

A good default order is:

1. title/date
2. current work context
3. capture
4. active working notes
5. continuation context
6. recent sources if meaningful

Do not force:

- task section
- scratch section
- analytics

into the main screen.

---

# 94. TASK VISUAL PRIORITY

Tasks should not visually dominate notes.

A note and task can look similar, with the checkbox being the main distinction.

---

# 95. METADATA

Keep metadata compact.

Examples:

```text
Website Redesign · 5 min ago
Scratch · bugün
Research · dün
```

Use locale-aware rendering.

---

# 96. NO FAKE NUMBERS

Do not display:

- fake counts
- fake activity
- fake recent times

unless in a clearly isolated development/demo mode.

---

# 97. DEMO MODE

If developers need seeded data, create an explicit development/demo mechanism.

Production/fresh user state must be empty.

---

# 98. PRODUCT ONBOARDING

The UI should teach by doing.

Avoid tutorial overload.

A first-time user should understand:

> “I can write here.”

without documentation.

---

# 99. ERROR MESSAGES

Human-readable.

Example:

Bad:

```text
IndexedDB error 22
```

Better:

```text
Workpad couldn't save this change locally.
Your current note is still open.
Export a backup before closing.
```

Errors should never falsely claim success.

---

# 100. DATA CLEARING

Settings → Data → Clear local data.

This must:

- clearly warn
- require explicit confirmation
- explain that local data will be removed
- suggest export first where appropriate

---

# 101. IMPORT CONFLICTS

Import behavior must be explicit.

Do not silently overwrite.

Possible strategies:

- create imported workspace
- merge with clear preview
- rename conflict

Choose the safest simple behavior.

---

# 102. OPEN SOURCE

Repository should include:

```text
README.md
LICENSE
CONTRIBUTING.md
SECURITY.md
CHANGELOG.md
architecture.md
```

README should explain:

- product philosophy
- local-first behavior
- npm development
- production build
- browser support
- data persistence
- import/export
- language support
- contribution process

---

# 103. DEVELOPMENT EXPERIENCE

A contributor should be able to understand:

```text
npm install
npm run dev
```

and immediately start.

Do not require:

- database setup
- environment secrets
- API credentials
- backend boot
- Docker

for basic development.

---

# 104. PRODUCTION BUILD

The build should create deployable static assets.

Ensure:

- hashed assets if existing toolchain supports them
- correct asset paths
- no dev-only dependencies in runtime
- no secret values embedded
- offline-critical assets are available locally

---

# 105. PWA MANIFEST / INSTALLATION

Where applicable:

- name
- short name
- theme color
- icons
- display mode
- start URL

Use the existing build tooling.

Do not add a complex native packaging system.

---

# 106. NO ELECTRON

This is an explicit requirement.

Do NOT introduce Electron or a Chromium desktop wrapper.

The browser runtime is the product.

---

# 107. NO BACKGROUND SERVICE

Do not add:

- resident process
- local daemon
- system tray service
- background server

for MVP.

---

# 108. OPTIONAL FUTURE BROWSER EXTENSION

Keep architecture extensible for:

- Save current page
- Save selected text
- Open Workpad
- Capture URL + text

But the MVP must not depend on the extension.

---

# 109. OPTIONAL FUTURE LOCAL AI

Future local intelligence could:

- group scratch notes
- suggest a workspace
- reconstruct context
- surface unfinished work
- identify decisions
- create summaries

But keep AI out of the critical path.

---

# 110. IMPORTANT “REMOVE BEFORE ADDING” RULE

Every time you consider adding a new component:

Ask:

> Can this be achieved more elegantly by simplifying something already visible?

Prefer subtraction.

---

# 111. IMPORTANT “NO MORE PRODUCTIVITY THEATER” RULE

Do not add:

- streaks
- scores
- gamification
- inspirational quotes
- fake metrics
- productivity charts
- “focus scores”

The product is for work, not performance theater.

---

# 112. CORE PRODUCT LOOP

The loop must remain:

```text
WORK
↓
THOUGHT
↓
QUICK CAPTURE
↓
CONTINUE WORKING
↓
REVISIT
↓
OPTIONAL STRUCTURE
↓
ACT
↓
WORK
```

This is more important than feature count.

---

# 113. PRODUCT NORTH STAR

Conceptual:

# Thought → Capture Time

Secondary:

# Capture → Revisit Rate

Reliability:

# Lost Data Incidents = 0

Do not add invasive analytics to measure these.

---

# 114. FINAL UX ACCEPTANCE TEST

The app passes only if:

### Test 1
I open Workpad and can start writing immediately.

### Test 2
I can capture something without choosing a project/type first.

### Test 3
I can leave it messy.

### Test 4
I can continue my actual work.

### Test 5
I can later find what I wrote.

### Test 6
I understand the context in which I wrote it.

### Test 7
I can turn it into a simple task afterward.

### Test 8
I can export the workspace.

### Test 9
I can import it again.

### Test 10
Core behavior works offline.

### Test 11
The UI does not feel like a dashboard.

### Test 12
The UI works naturally in Turkish.

### Test 13
Turkish characters look professional and never break layout.

### Test 14
Search remains usable with thousands of records.

### Test 15
The app feels lightweight.

---

# 115. FINAL VISUAL ACCEPTANCE

The user should see:

### “Write here.”

not:

### “Manage your productivity here.”

The user should feel:

### “I can leave this open while I work.”

not:

### “I need to maintain this system.”

The user should feel:

### “This remembers things for me.”

not:

### “I need to organize everything.”

---

# 116. AGENT EXECUTION PLAN

## Phase 0 — Inspect

- inspect repo
- run app
- run tests
- inspect npm
- inspect current storage
- inspect UI
- gap analysis

## Phase 1 — Stabilize

- fix existing errors
- protect persistence
- isolate demo fixtures
- verify build

## Phase 2 — UX

- revise Today
- refine capture
- reduce cards
- reduce counters
- add Working On
- refine Continue
- improve inline interactions

## Phase 3 — Typography

- create typography tokens
- verify Turkish glyph coverage
- improve body/headings/metadata
- remove weak font choices

## Phase 4 — Localization

- add i18n layer
- English
- Turkish
- locale-aware dates/times
- language selector
- browser/system detection

## Phase 5 — Persistence

- validate IndexedDB behavior
- migrations
- recovery
- import/export
- upgrade safety

## Phase 6 — Search

- local index
- contextual ranking
- large dataset test

## Phase 7 — Performance

- bundle analysis
- memory inspection
- render profiling
- large dataset behavior

## Phase 8 — Browser QA

- Chrome
- Safari
- keyboard
- clipboard
- offline
- import/export
- responsive layout

## Phase 9 — Accessibility

- keyboard
- focus
- semantic structure
- contrast
- reduced motion
- localization layout

## Phase 10 — Open Source / Docs

- README
- architecture
- contribution guide
- security
- changelog

---

# 117. MULTI-AGENT WORK SPLIT

If multiple agents are available:

## Agent A — UX/UI
Own:

- Today
- Scratch
- Continue
- Working On
- navigation
- visual hierarchy
- responsive behavior

## Agent B — Typography/i18n
Own:

- typography system
- English copy
- Turkish copy
- locale handling
- date/time formatting

## Agent C — Persistence/data
Own:

- domain model
- IndexedDB
- migrations
- recovery
- import/export

## Agent D — Search/performance
Own:

- indexing
- ranking
- performance
- large data

## Agent E — QA
Own:

- browser testing
- accessibility
- regression
- integration tests

Agents must respect existing architecture and communicate shared changes.

---

# 118. AGENT DECISION PRIORITY

When trade-offs occur, prioritize:

1. data safety
2. capture speed
3. usability
4. browser compatibility
5. performance
6. accessibility
7. simplicity
8. maintainability
9. visual polish
10. optional features

---

# 119. WHAT NOT TO DO DURING THIS TASK

Do NOT:

- rewrite the entire project without justification
- convert it to Electron
- create a backend
- add login
- add cloud sync
- add analytics
- add a task-management system
- add AI as a central feature
- add a browser extension as a dependency
- add a huge editor framework
- add remote font dependencies by default
- fill the dashboard with widgets
- introduce fake data into fresh production state
- optimize solely for English
- sacrifice Turkish support for fixed-width UI
- sacrifice persistence for visual changes

---

# 120. FINAL CODE QUALITY CHECK

Before completion:

```text
npm install
npm run build
npm test
```

Use the actual project commands if names differ.

Then:

- verify build output
- verify no console errors
- verify no obvious memory leak
- verify storage
- verify language switching
- verify Chrome
- verify Safari
- verify keyboard flow
- verify import/export
- verify offline

---

# 121. FINAL REPORT REQUIRED FROM AGENT

At completion, report:

## Changed
What was revised.

## Removed
What was intentionally removed.

## Added
What was introduced.

## Preserved
What was kept from the existing implementation.

## Tests
What was run and results.

## Performance
Observed bundle/runtime/search behavior.

## Browser
Chrome/Safari observations.

## Localization
English/Turkish status.

## Known limitations
Be honest.

Do not claim unsupported compatibility or performance.

---

# 122. FINAL PRODUCT TEST

Ask this exact question:

> I am already doing something important on my computer. I suddenly think of something. Can I put it into Workpad in one or two seconds without breaking my flow?

If not:

**not finished.**

Then:

> I wrote something three days ago. Can I find it and understand why I wrote it?

If not:

**not finished.**

Then:

> I switch the language to Turkish. Does the entire UI still feel designed rather than translated?

If not:

**not finished.**

Then:

> I have thousands of notes. Does the product still feel calm?

If not:

**not finished.**

---

# 123. FINAL PRODUCT STATEMENT

# Workpad

**A tiny, local-first work surface for computer work.**

> Open it.  
> Capture thoughts.  
> Keep working.  
> Organize later.

No account.
No server.
No setup burden.
No forced AI.
No productivity theater.

Just a fast place to keep your mind while you work.

---

# 124. FINAL AGENT INSTRUCTION

Do not interpret this document as an invitation to add more features.

Interpret it as a mandate to:

> **make the existing Workpad feel inevitable.**

The correct result is not the most feature-rich product.

It is the product that becomes the natural place to put:

> “I need to remember this.”

while the user keeps doing the real work.

The ideal result should feel:

- instant
- quiet
- local
- trustworthy
- typographically excellent
- Turkish-ready
- keyboard-friendly
- browser-native
- lightweight
- open-source
- portable

And above all:

# It should feel like a work surface, not a productivity system.

---

# END OF FINAL REVISION SPEC
