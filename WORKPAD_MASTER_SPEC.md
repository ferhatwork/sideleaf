# WORKPAD — One-Shot Product & Engineering Specification

## 0. Document Purpose

This document is a self-contained master specification for building **Workpad**, an open-source, local-first, browser-native “work surface” for people who work at a computer.

This document is intended to be passed directly to an AI coding agent or a group of cooperating agents. The agents should use it as the source of truth and begin implementation without requiring a separate product-definition phase.

The product is deliberately NOT a generic notes app, Notion clone, task manager, or knowledge-management system.

### Core idea

> Open it. Capture the thought. Keep working. Organize later.

Workpad exists to reduce **context switching and cognitive friction** while a person is actively working at a computer.

The target behavior is:

- user is already doing work in a browser or desktop environment
- a thought, observation, URL, next step, or temporary detail appears
- user needs a place to put it immediately
- opening a heavy app, creating a page, choosing a folder, logging in, or configuring a database is too much friction
- Workpad should provide an instant, calm, lightweight work surface

---

# 1. Product Vision

## 1.1 Product statement

**Workpad is a tiny, local-first work surface for computer work.**

It should feel closer to:

- a sheet of paper beside your keyboard
- a scratchpad on your desk
- a tiny command-oriented productivity tool

than to:

- Notion
- OneNote
- Evernote
- a project-management suite
- a full knowledge graph

## 1.2 Product promise

The user should be able to:

1. open Workpad almost instantly
2. start typing immediately
3. capture temporary information without deciding where it belongs
4. continue working
5. find the captured information later
6. optionally organize it after the fact
7. own the resulting data as local files / exports
8. use the product without account, backend, deployment, or cloud dependency

## 1.3 Product philosophy

### Instant
No setup before first useful action.

### Quiet
The UI must not constantly compete for attention.

### Local
The user's information belongs to the user.

### Forgiving
The product should not require organization at capture time.

### Portable
Data should be exportable and importable without relying on a service.

### Lightweight
Avoid unnecessary runtime, libraries, background processes, network activity, and visual complexity.

### Keyboard-first
Power users should be able to operate the core experience without constantly reaching for a mouse.

### Progressive structure
Capture first. Structure later.

---

# 2. Core Product Insight

Traditional productivity software often asks the user to structure information before using it:

- choose a workspace
- choose a folder
- choose a database
- choose a page
- choose a project
- choose a tag

Workpad reverses this:

> **Capture first → structure emerges later.**

The product should therefore avoid asking the user “Where does this belong?” at the exact moment they are trying to preserve a thought.

---

# 3. Target Users

## Primary

### A. Knowledge workers
People doing research, writing, coding, analysis, browsing, planning, or administrative work.

### B. Developers
People constantly switching between:

- browser
- documentation
- terminal
- IDE
- GitHub
- APIs
- issue trackers
- architecture notes

### C. Researchers
People collecting:

- observations
- links
- quotes
- questions
- hypotheses
- next steps

### D. Students
Especially users doing computer-heavy study, research, assignments, and exam preparation.

### E. Solo builders / founders
People who need a temporary working memory while moving among tools.

---

# 4. Non-Goals

Workpad MUST NOT become any of the following in the initial product:

- a full Notion replacement
- a complex database system
- a CRM
- a project management system
- a calendar
- a chat application
- a collaboration suite
- a social network
- an enterprise document management platform
- a mandatory AI assistant
- an always-online cloud product
- a desktop app requiring Electron
- a system tray daemon
- a service that requires an account

Do not add functionality merely because another productivity app has it.

The default question for every feature is:

> “Does this reduce the friction of capturing, revisiting, or acting on information while doing computer work?”

If the answer is no, defer it.

---

# 5. Core Use Cases

## 5.1 Quick thought capture

User thinks:

> “Check Stripe webhook limits later.”

They should be able to open the scratch surface, type it, and return to work.

No title required.
No project required.
No tag required.

## 5.2 Temporary scratch

User records incomplete thoughts:

- “This section feels too dense.”
- “Compare these two APIs.”
- “Ask client about billing.”
- “Try a different layout.”
- “Remember to test Safari.”

These are not necessarily tasks or permanent notes.

The product must allow them to remain ambiguous until the user decides otherwise.

## 5.3 Research capture

User copies text from a webpage.

The product should support storing:

- copied text
- source URL when available
- timestamp
- optional title

This should later become a “source” or “reference” item.

## 5.4 Task conversion

Any note can later become a lightweight actionable item.

Example:

`Ask client about billing`

→

`☐ Ask client about billing`

No separate task-management mental model is required.

## 5.5 Project/context grouping

Users may optionally group information into contexts such as:

- Website
- Research
- Client A
- Thesis
- Personal

The system should not force projects during capture.

## 5.6 Revisit previous work

The user should be able to answer:

> “What was I doing?”

Workpad should surface:

- unfinished items
- recently edited items
- recent sources
- current context
- notes from today

## 5.7 Search

The user can quickly find something they captured previously.

Search should be extremely fast and local.

---

# 6. Core Information Architecture

The primary navigation should be intentionally tiny.

## 6.1 Primary sections

### TODAY
What is relevant now.

### SCRATCH
Temporary captured information.

### WORKSPACES
Optional persistent contexts/projects.

### RECENT
Recently opened or changed material.

### ARCHIVE
Items explicitly kept out of the active workspace.

Search is global.

## 6.2 Suggested mental model

```text
TODAY
  ├─ Now
  ├─ Scratch
  ├─ Next
  └─ Recent

WORKSPACES
  ├─ Website
  ├─ Research
  └─ Client A

ARCHIVE
```

The UI must not expose a huge folder tree by default.

---

# 7. Core UX Principle: Scratch → Keep

This is one of the central product mechanics.

Every new capture starts as **Scratch**.

Example:

```text
Scratch

→ check API pricing
→ ask client for access
→ this layout breaks at 1024px
→ compare option A/B
```

The user can later:

- convert to task
- move to workspace
- archive
- delete
- leave it as scratch

The system must never treat unorganized information as a failure state.

---

# 8. Home Screen

The default screen is TODAY.

## 8.1 Layout

Desktop:

```text
┌──────────────────────────────────────────────────────────────┐
│ Workpad                    Search      +       Settings      │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│ TODAY      │ Today                                           │
│ Scratch    │                                                 │
│ Workspaces │  Now                                            │
│ Recent     │  ────────────────────────────────────────────   │
│ Archive    │  [active / recent items]                        │
│            │                                                 │
│            │  Scratch                                        │
│            │  ────────────────────────────────────────────   │
│            │  quick captures                                 │
│            │                                                 │
│            │  Next                                           │
│            │  ────────────────────────────────────────────   │
│            │  lightweight actionable items                   │
│            │                                                 │
│            │  Recent                                         │
│            │  recently touched items                         │
│            │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

The layout must be clean, dense, and calm.

Do NOT make it look like a dashboard full of cards.

---

# 9. Quick Capture

## 9.1 Primary shortcut

Default:

`Ctrl + Space`

Mac equivalent:

`Cmd + Space`

IMPORTANT:
If the browser/OS intercepts the shortcut in a given environment, provide a configurable fallback shortcut.

## 9.2 Behavior

Quick Capture should open a small overlay / compact work surface.

The sequence is:

1. shortcut
2. overlay opens
3. cursor is already focused
4. user types
5. Enter/close commits
6. overlay disappears
7. user remains in control

Do not make the user confirm a save operation.

## 9.3 Capture overlay

Example:

```text
┌─────────────────────────────────────────────┐
│ Quick Capture                               │
│                                             │
│ > ask client about API rate limits          │
│                                             │
│ [Enter] save     [Esc] close                │
└─────────────────────────────────────────────┘
```

It should feel instant and almost frictionless.

---

# 10. Editor Model

Do NOT make the first release a heavyweight rich-text editor.

Use a constrained set of lightweight content types.

## MVP content blocks

1. Text
2. Checklist
3. Link / source
4. Quote
5. Divider

Optional block types may be introduced later.

## 10.1 Text

Plain text should be the most reliable and fastest mode.

## 10.2 Checklist

A line can become:

`☐ Fix responsive layout`

Completion toggles the item without opening a separate task system.

## 10.3 Link/source

A pasted URL should remain a URL and may later be enhanced with optional metadata.

## 10.4 Quote

A block can visually distinguish captured source text.

## 10.5 Divider

Simple visual separation.

---

# 11. No “Notion Clone” Editor

Avoid:

- dozens of block types
- slash-command systems
- complex nested pages
- database properties
- kanban boards
- properties panels
- formula engines
- complex drag/drop editing

The editor must prioritize:

**typing > formatting.**

---

# 12. Structured Canvas

The UI should visually feel more flexible than a textarea but more structured than an infinite whiteboard.

Concept:

> semi-infinite vertical work surface.

Items flow vertically.

Users can:

- write
- insert lightweight blocks
- reorder items
- convert types
- separate sections

Do not create spatial complexity in MVP.

---

# 13. Keyboard-first Interaction

## Required shortcuts

At minimum:

- `Ctrl/Cmd + Space` → Quick Capture
- `Ctrl/Cmd + K` → Search
- `Esc` → close overlay / cancel
- `Ctrl/Cmd + Enter` → convert current item to checklist/task
- `Ctrl/Cmd + S` → explicit export/save where meaningful
- `Ctrl/Cmd + Z` → undo
- `Ctrl/Cmd + Shift + Z` → redo

Avoid dozens of shortcuts.

Power should come from a few memorable commands.

---

# 14. Search

Search must be global, fast, and local.

## Search targets

- item text
- workspace name
- tags if introduced later
- source URL
- source title
- timestamps
- completed status

## Search UX

`Ctrl/Cmd + K`

opens a focused search palette.

Example:

```text
┌──────────────────────────────────────────────┐
│ Search                                       │
│ > stripe webhook                             │
├──────────────────────────────────────────────┤
│ Today                                        │
│   Ask client about Stripe webhooks           │
│                                              │
│ Research                                     │
│   Stripe webhook notes                       │
└──────────────────────────────────────────────┘
```

No server search.
No remote indexing.

---

# 15. Source Capture

Source capture is a key differentiator.

## 15.1 Clipboard-first MVP

When user pastes content that appears to contain:

- a URL
- quoted text
- copied content

Workpad may detect it and create a lightweight source object.

Example:

```text
Research note

“quoted content…”

Source
example.com

Captured
14:32
```

## 15.2 No extension required initially

The MVP must not depend on a browser extension.

Everything must work using:

- normal paste
- manual URL entry
- browser clipboard behavior

A browser extension can be added later as an optional companion.

---

# 16. Future Browser Integration

Potential future extension capabilities:

- “Send selected text to Workpad”
- “Save current page to Workpad”
- “Open Workpad”
- “Capture current URL”
- “Capture selected text + URL”

But these are explicitly Phase 2+.

The core app must remain fully useful without the extension.

---

# 17. Workspaces

A Workspace represents a context, not a rigid folder hierarchy.

Examples:

- Website redesign
- Client A
- Research
- Thesis
- Side project

Each workspace may contain:

- notes
- tasks
- sources
- scratch-derived items
- recent activity

## Workspace creation

It should be easy but never mandatory.

Suggested behavior:

`Move to Workspace → New Workspace`

Not:

`New Workspace → required before capture`

---

# 18. “What Was I Doing?” Surface

A key future experience.

When reopening Workpad, optionally show:

```text
Continue where you left off

Website
  4 unfinished items
  2 sources
  last activity 18 min ago

Research
  7 scratch notes
  last activity yesterday
```

This turns Workpad into an external working memory.

---

# 19. Activity / Timeline Model

Items should retain useful lightweight metadata:

- createdAt
- updatedAt
- workspaceId
- status
- item type
- optional source
- optional tags

An activity stream may show:

```text
10:04  Captured “check competitor pricing”
10:12  Added source example.com
10:25  Converted “ask client” to task
11:03  Moved item to Website
```

Do not build this as a social feed.

It is a private activity/history aid.

---

# 20. Data Model Philosophy

The user's data should be:

- local
- portable
- inspectable
- exportable
- recoverable

Do not depend on a hosted backend.

## 20.1 Preferred data model

Use a small local document model.

Conceptually:

```text
Workspace
  id
  name
  createdAt
  updatedAt

Item
  id
  workspaceId
  type
  content
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
  theme
  shortcuts
  preferences
```

Implementation details may vary, but the conceptual model must remain simple.

---

# 21. Persistence Strategy

Primary goal:

> no server.

Use browser-local persistence for the active session and normal app operation.

Recommended technology direction:

- IndexedDB for durable structured local storage
- local in-memory state for active UI state
- explicit import/export files
- optional File System Access integration where supported

Do NOT assume `file://` URL behavior is identical across browsers.

The product must gracefully handle the fact that direct-opening of local HTML files has browser-specific storage/security limitations.

---

# 22. Portable Workspace Files

A central feature should be an explicit workspace export/import mechanism.

Concept:

```text
my-work.workpad
```

The file may internally contain a versioned portable representation.

Minimum requirements:

- human-recoverable data format
- schema version
- deterministic export
- import validation
- corruption-safe behavior
- backward compatibility strategy

Avoid binary formats that make migration difficult unless there is a compelling reason.

A JSON-based internal representation is acceptable.

---

# 23. Local-first

The product must remain useful with:

- Wi-Fi off
- airplane mode
- no account
- no server
- no third-party service

External resources can be linked, but core note-taking must remain fully functional offline.

---

# 24. Privacy Model

Default:

- no account
- no backend
- no analytics
- no advertising
- no telemetry
- no server-side storage
- no external AI calls

A privacy explanation should be visible in Settings/About.

Suggested product statement:

> Your notes stay on your device unless you explicitly export or share them.

IMPORTANT:
Do not make unverified legal/privacy claims. The implementation must actually reflect the statement.

---

# 25. AI Policy

AI is NOT required in MVP.

The product must be fully useful without AI.

Future AI must be:

- local where feasible
- optional
- transparent
- user-triggered by default
- context-aware
- not allowed to degrade the core note experience

Good AI examples:

- “Group these scratch notes”
- “Summarize this research”
- “Find repeated tasks”
- “Turn these notes into a checklist”
- “What was I working on?”
- “Which items look unfinished?”

Bad AI examples:

- generic chatbot replacing the editor
- unsolicited summaries
- always-on assistant
- cloud upload of private notes without explicit action
- decorative AI features

Core principle:

> AI should understand the user's existing context, not create another generic chatbot tab.

---

# 26. Performance Requirements

Performance is a core product feature.

## 26.1 Startup

The initial interface should appear as quickly as practical on ordinary modern hardware.

Avoid expensive blocking startup work.

## 26.2 Runtime

Do not ship:

- Electron
- background services
- heavy polling
- unnecessary animation
- large UI component libraries
- large editor frameworks without a clear need
- heavy runtime dependencies

## 26.3 Memory

Memory usage should remain reasonable for a browser app.

Avoid:

- keeping entire large documents duplicated in memory
- unnecessary copies of large strings
- rendering thousands of DOM nodes at once
- large images embedded in notes by default
- continuously running observers/timers without need

## 26.4 Rendering

Prefer:

- incremental rendering
- virtualization when needed
- lazy loading for large history
- efficient state updates
- minimal DOM

Do not prematurely optimize blindly. Measure first.

---

# 27. Reliability Requirements

This product handles potentially important thoughts and work data.

Therefore reliability has priority over visual novelty.

Requirements:

- no accidental data loss
- autosave to local persistence
- safe state transitions
- undo for destructive changes
- confirmation before irreversible bulk deletion
- crash recovery
- import validation
- export validation

Important principle:

> A bug that loses a note is a severe product bug.

---

# 28. Undo / Recovery

At minimum:

- undo text editing
- undo item deletion when practical
- recently deleted items may have a recovery period
- safe import behavior
- automatic local snapshots where feasible

Do not sacrifice reliability for architectural purity.

---

# 29. Visual Language

The visual personality should combine:

- calmness of a notebook
- clarity of a modern developer tool
- compactness of a command launcher
- subtle polish of a consumer productivity app

Reference *principles*, not copied UI:

- Linear → density and clarity
- Raycast → speed and command orientation
- Apple Notes → familiarity
- Goodnotes → personal workspace feel
- Obsidian → local ownership

Do not clone any proprietary visual design.

---

# 30. UI Principles

## 30.1 No dashboard bloat

Avoid excessive cards.

## 30.2 Low visual noise

Use whitespace strategically.

## 30.3 Strong typography

Typography must create hierarchy without excessive color.

## 30.4 Neutral palette

The interface should work in light and dark mode.

## 30.5 Minimal chrome

Toolbars should only expose high-value actions.

## 30.6 Stable layout

Do not constantly rearrange controls.

---

# 31. Dark / Light Mode

Required:

- dark mode
- light mode
- system preference

Do not rely solely on color to communicate status.

Respect contrast and reduced motion preferences.

---

# 32. Responsive Behavior

The product must work on:

- desktop
- laptop
- tablet
- narrower browser windows

On narrow widths:

- sidebar may collapse
- content remains readable
- quick capture remains fast
- search remains accessible
- touch targets become larger

Mobile phone is not the primary target, but the product should not catastrophically break there.

---

# 33. Accessibility

Must include:

- semantic HTML
- keyboard navigation
- visible focus states
- ARIA only when semantically necessary
- sufficient text contrast
- reduced-motion support
- usable dialogs
- screen-reader-friendly labels
- no information communicated by color alone

All primary workflows must be possible without a mouse.

---

# 34. Browser Support

Primary:

- Google Chrome
- Apple Safari

Also desirable:

- Chromium-based browsers
- Firefox

Important differences between browsers must be handled gracefully.

Do not assume browser APIs have identical behavior.

If a capability is unavailable:

- provide graceful fallback
- do not break core note-taking
- communicate limitations only when necessary

---

# 35. Deployment Philosophy

The core project must require no hosted backend.

The ideal distribution model should support:

### Option A
Open `index.html`.

### Option B
Serve the static files from any local static server.

### Option C
Install as a PWA where supported.

### Option D
Host the static site anywhere later without changing the product architecture.

No server-side product logic should be required for MVP.

---

# 36. Open Source Requirements

Repository should contain:

```text
README
LICENSE
CONTRIBUTING
CODE_OF_CONDUCT
SECURITY
CHANGELOG
```

Recommended:

- issue templates
- pull request template
- architecture documentation
- developer setup
- browser support matrix

The project must be understandable to contributors.

---

# 37. Suggested Technical Direction

The exact stack is an implementation decision, but the architectural requirements are:

- static web application
- TypeScript strongly preferred
- modern browser APIs
- minimal dependencies
- no Electron
- no backend
- no SSR requirement
- local-first data layer
- testable state model
- semantic HTML/CSS
- production build that creates static assets

Potential implementation shape:

```text
src/
  app/
  components/
  editor/
  data/
  persistence/
  search/
  import-export/
  shortcuts/
  settings/
  styles/
  utils/
```

But agents may reorganize this if a simpler structure is objectively better.

Do not optimize architecture for hypothetical scale.

---

# 38. Dependency Rules

Before adding a dependency, ask:

1. Is it necessary?
2. Is the browser already capable of this?
3. Does it materially increase bundle size?
4. Does it increase runtime memory?
5. Can the same capability be implemented simply and robustly in-house?
6. Does it create long-term maintenance burden?

Prefer the smallest stable dependency set.

---

# 39. State Management

Do not introduce a heavyweight state-management framework unless the product's actual complexity warrants it.

State should have clear ownership:

- UI state
- editor state
- persistent domain state
- settings state

Avoid circular state flows.

Persistent domain changes should be explicit and testable.

---

# 40. Data Integrity Contract

Every mutation should have:

- deterministic behavior
- validation
- persistence path
- undo/recovery strategy where appropriate

Import must never silently overwrite a user's active workspace.

Suggested flow:

```text
Import file
→ validate schema
→ preview / verify
→ create safe imported workspace
→ activate
```

---

# 41. Security

Because the app handles arbitrary pasted content and URLs:

- sanitize HTML
- avoid dangerous `innerHTML`
- treat pasted content as untrusted
- do not execute pasted scripts
- sanitize rendered links
- protect against XSS
- do not allow arbitrary file paths from untrusted data
- validate import file structure
- protect against malformed data causing application lockups

Do not fetch remote page contents automatically in MVP.

---

# 42. Source URL Handling

When displaying external links:

- show hostname clearly
- use safe link handling
- allow opening in a new tab
- do not silently send the URL to third-party services

No automatic website scraping in MVP.

---

# 43. Search Architecture

MVP may use a simple in-memory index over loaded local records.

As data grows:

- incremental indexing
- token normalization
- debounced search input
- result ranking
- optional fuzzy matching

The search must feel instantaneous.

Do not load all large content into the UI layer on every keystroke.

---

# 44. Suggested Ranking

Search result ranking can consider:

1. exact text match
2. title/first line match
3. recent update
4. active workspace
5. source URL match
6. partial/fuzzy match

Keep ranking deterministic and explainable.

---

# 45. Tags

Tags are optional and should NOT be central in MVP.

If introduced:

- simple
- lightweight
- no tag hierarchy
- no tag management system required

Example:

`#research`

But the product must remain fully useful without tags.

---

# 46. “Next” / Lightweight Tasks

Tasks are intentionally simple.

Required task properties:

- open/completed
- text
- optional workspace
- timestamps

No:

- due-date system
- priorities matrix
- subtask trees
- recurring tasks
- notifications
- project Gantt

Those belong outside the core product unless future evidence strongly justifies them.

---

# 47. Archive

Archive means:

> “I want to keep this, but I do not want it in my active working surface.”

Archive must be reversible.

It should not be destructive.

---

# 48. Delete

Deletion should be explicit.

Prefer:

- soft-delete
- undo toast
- recoverable trash

before permanent deletion.

---

# 49. Empty States

Empty states should not feel like an enterprise app.

TODAY empty:

> Nothing here yet.
> Start typing. Everything else can come later.

SCRATCH empty:

> Capture anything. Organize later.

WORKSPACES empty:

> Create a workspace when a project deserves one.

Do not fill empty screens with tutorial clutter.

---

# 50. Onboarding

The first-run experience must be optional/minimal.

The user should be productive in under 30 seconds.

Preferred:

```text
Welcome to Workpad.

No account.
No setup.
Just write.

[Start]
```

Then immediately focus the editor/capture area.

Do not force a multi-step onboarding carousel.

---

# 51. Product Copy / Tone

Tone:

- calm
- direct
- intelligent
- understated
- not “hustle culture”
- not corporate
- not gamified

Avoid copy such as:

- “10x your productivity”
- “Unlock your peak performance”
- “Crush your goals”

Prefer:

- “Write it down.”
- “Keep going.”
- “Organize later.”
- “Your workspace, on your device.”

---

# 52. Microcopy

Examples:

Quick capture:

> What’s on your mind?

Search:

> Search your work

Empty scratch:

> Capture anything. Sort it later.

Conversion:

> Turn into task

Archive:

> Keep, but get it out of the way

---

# 53. Error Handling

Errors should be:

- human-readable
- actionable
- non-alarming
- honest

Example:

Bad:

> DOMException 22

Good:

> Workpad could not save this workspace. Your current changes are still open. Export a backup before closing.

Never hide data-loss risk.

---

# 54. Export / Import UX

Settings:

```text
Data

Export workspace
Import workspace
Create backup
```

Export should be easy enough that users can understand:

> “I own my data.”

Before import, show:

- workspace name
- number of items
- last updated time
- schema/version
- potential conflicts

---

# 55. Backup Philosophy

The product should encourage backups without making them annoying.

Potential options:

- manual export
- optional automatic local snapshot
- versioned workspace files

Do not require a cloud account for backup.

---

# 56. Offline Behavior

Core app must remain functional when offline.

Test:

- initial load after cache
- creating note
- editing note
- searching
- changing workspace
- export/import

No essential path should depend on network.

---

# 57. PWA

PWA is an enhancement, not a dependency.

Where supported:

- installable
- standalone window
- app icon
- offline caching
- correct manifest
- correct service worker behavior

The browser app must still work without installation.

---

# 58. Static Distribution

The final build should be deployable as ordinary static assets.

No API server.

No database server.

No environment variables required for basic operation.

No secret keys.

---

# 59. Testing Strategy

The coding agent must create tests.

## Unit tests

At minimum:

- data model mutations
- serialization
- import validation
- export
- search ranking
- task conversion
- archive/restore
- settings
- shortcuts logic

## Integration tests

- create note
- reload
- note persists
- search finds it
- move to workspace
- archive
- recover
- export
- import

## Browser tests

At minimum verify:

- Chrome
- Safari where automation permits
- keyboard workflows
- persistence
- responsive layout
- accessibility basics

---

# 60. Performance Testing

Agents must profile enough to catch obvious regressions.

Measure:

- bundle size
- initial load
- render time
- search latency
- memory behavior with large datasets
- long-session behavior

Create a synthetic dataset, e.g.:

- 1,000 items
- 10,000 items
- long text items

The app should remain usable.

Do not claim a specific RAM ceiling unless measured.

---

# 61. Large Dataset Strategy

Do not assume users will only create 50 notes.

The architecture should remain sane at:

- 1,000
- 5,000
- 10,000+

items.

If rendering everything becomes expensive:

- virtualize lists
- paginate
- lazy render
- index search

Do not load/render every historical item at once.

---

# 62. Core User Journeys

## Journey A — 5 second capture

1. user opens Workpad
2. cursor is available
3. user types
4. item persists
5. user leaves

Success condition:

> no setup and no confusion.

## Journey B — quick capture while working

1. user is in browser
2. activates shortcut or capture UI
3. writes
4. dismisses
5. returns to work

Success condition:

> less friction than opening Notepad.

## Journey C — research

1. copy text
2. paste into Workpad
3. optionally keep URL
4. continue browsing
5. find source later

Success condition:

> source and thought remain connected.

## Journey D — organize later

1. open Scratch
2. select item
3. move to workspace
4. optionally convert to task
5. continue working

Success condition:

> organization happens after thinking, not before.

---

# 63. Suggested MVP Scope

MUST HAVE:

- Today
- Scratch
- basic workspace concept
- text items
- checklist/task conversion
- local persistence
- search
- quick capture
- keyboard shortcuts
- archive
- import/export
- light/dark/system theme
- responsive UI
- accessibility baseline
- robust error handling
- tests

SHOULD HAVE:

- source capture
- recent activity
- undo/recovery
- installable PWA
- command palette style search

NICE TO HAVE:

- tags
- browser extension
- richer source handling
- “Continue where you left off”
- local AI
- smart grouping

NOT MVP:

- cloud sync
- accounts
- team collaboration
- marketplace
- chat
- AI-first architecture
- notifications
- calendar
- enterprise admin

---

# 64. Product Architecture

High-level:

```text
                ┌─────────────────────┐
                │       UI Layer      │
                │ Today / Scratch     │
                │ Editor / Search     │
                └──────────┬──────────┘
                           │
                ┌──────────▼──────────┐
                │ Application State   │
                │ commands / actions  │
                └──────────┬──────────┘
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
          ▼                ▼                 ▼
   ┌────────────┐   ┌─────────────┐  ┌─────────────┐
   │ Persistence│   │ Search Index │  │ Import/Export│
   └─────┬──────┘   └─────────────┘  └─────────────┘
         │
         ▼
   Browser Local Storage / IndexedDB
```

No backend in the core architecture.

---

# 65. Agent Team / Work Breakdown

If a multi-agent implementation workflow is available, split responsibilities approximately as follows.

## Agent 1 — Product shell / UX

Responsibilities:

- app shell
- navigation
- Today
- Scratch
- workspace UI
- empty states
- responsive layout
- visual system

## Agent 2 — Editor / interactions

Responsibilities:

- content editing
- block model
- checklist conversion
- keyboard interactions
- quick capture
- undo/redo

## Agent 3 — Data / persistence

Responsibilities:

- domain model
- IndexedDB/local persistence
- migrations
- data integrity
- recovery
- import/export

## Agent 4 — Search

Responsibilities:

- local indexing
- search UI
- ranking
- performance

## Agent 5 — QA / accessibility / performance

Responsibilities:

- tests
- browser compatibility
- accessibility
- performance profiling
- regression detection

## Agent 6 — Documentation / open source

Responsibilities:

- README
- contribution docs
- architecture notes
- local development instructions
- release/build documentation

Agents MUST coordinate through a shared contract and must not duplicate or overwrite each other's architecture.

---

# 66. Implementation Sequence

Build in this order:

### Phase 1 — Skeleton
- project bootstrap
- static build
- app shell
- CSS tokens
- light/dark theme
- basic routing/state

### Phase 2 — Core capture
- Today
- Scratch
- text item
- quick capture
- persistence

### Phase 3 — Work organization
- workspace
- move item
- archive
- recent

### Phase 4 — Search
- indexing
- command palette
- ranking
- keyboard control

### Phase 5 — Reliability
- autosave
- undo
- recovery
- import/export
- corruption validation

### Phase 6 — Accessibility
- semantic markup
- focus management
- keyboard navigation
- reduced motion
- screen reader labels

### Phase 7 — Performance
- profile
- reduce bundle
- optimize renders
- large dataset tests

### Phase 8 — Packaging
- PWA
- static distribution
- documentation

Only after MVP stability:

### Phase 9 — Extensions
- source capture
- browser extension
- smart organization
- optional local AI

---

# 67. Definition of Done

A feature is not complete merely because it visually exists.

It is complete when:

1. it works end-to-end
2. state persists
3. keyboard flow works
4. accessibility baseline passes
5. errors are handled
6. tests cover important behavior
7. performance is reasonable
8. browser behavior is sane
9. no unnecessary dependency was introduced
10. documentation is updated where needed

---

# 68. Acceptance Criteria for MVP

The MVP is acceptable only if a fresh user can:

### A. Open
Open the static app without an account.

### B. Capture
Write a note immediately.

### C. Leave
Close/reload and still find the note.

### D. Find
Search and retrieve the note.

### E. Structure
Move the note into a workspace later.

### F. Act
Convert the note into a checklist item.

### G. Archive
Remove it from the active space without losing it.

### H. Port
Export workspace data.

### I. Restore
Import exported data into another browser/session.

### J. Operate
Use all primary workflows from the keyboard.

---

# 69. Quality Bar

The product should feel:

- faster than Notion
- simpler than OneNote
- more structured than Notepad
- more local/private than most SaaS productivity apps
- calmer than a project-management dashboard

Do NOT interpret these as benchmark claims. They are target product perceptions.

---

# 70. Success Metrics

Because this is an open-source product with privacy-first architecture, avoid requiring invasive analytics.

Primary qualitative/optional local metrics:

- time from open to first input
- time to capture a thought
- percentage of sessions where user immediately writes
- search success
- persistence reliability
- export/import reliability
- reported memory usage
- issue frequency around lost data
- user-reported friction

The strongest product metric hypothesis is:

> **Time from thought → captured thought**

A secondary hypothesis:

> **How often users return to the same workspace to continue work**

---

# 71. Core Strategic Differentiator

Workpad should win by being the answer to:

> “I need somewhere to put this right now.”

Not:

> “I need a complete productivity system.”

That distinction must remain visible in product decisions.

---

# 72. Strategic Product Loop

The intended long-term loop:

```text
WORK
  ↓
THOUGHT / OBSERVATION
  ↓
QUICK CAPTURE
  ↓
CONTINUE WORKING
  ↓
REVISIT
  ↓
STRUCTURE
  ↓
ACT
  ↓
WORK
```

This loop is more important than feature count.

---

# 73. Long-Term Expansion Model

Only after the core loop is excellent, consider:

## Layer 1
Quick capture

## Layer 2
Local research/source capture

## Layer 3
Context-aware workspaces

## Layer 4
Browser extension

## Layer 5
Smart organization

## Layer 6
Optional local AI

## Layer 7
Professional workflows

Each layer must strengthen the core loop.

---

# 74. Features That Should Be Explicitly Rejected Unless Strong Evidence Appears

Reject or defer:

- streaks
- gamification
- social feeds
- follower systems
- ads
- forced AI
- mandatory accounts
- usage tracking
- noisy notifications
- complicated dashboards
- complex databases
- unnecessary animations
- invasive permissions
- always-on background services

---

# 75. Product Principles for AI Agents

When making implementation decisions, agents MUST prioritize in this order:

1. data safety
2. core usability
3. performance
4. simplicity
5. accessibility
6. maintainability
7. visual polish
8. extensibility

Do not reverse this order.

---

# 76. Agent Decision Rule

Whenever a requirement is ambiguous, prefer the implementation that:

- has fewer moving parts
- works offline
- requires fewer permissions
- uses less memory
- is easier to explain
- is easier to migrate
- keeps the user's data local
- introduces less UI friction

Do not invent complex abstractions to solve hypothetical future requirements.

---

# 77. Agent Operating Instructions

When given this specification:

### Step 1
Read the entire document.

### Step 2
Extract requirements into:

- product
- UX
- domain model
- persistence
- browser behavior
- testing
- performance
- accessibility

### Step 3
Identify contradictions.

If any contradiction exists, prioritize:

1. data safety
2. offline/local-first
3. instant capture
4. lightweight runtime
5. browser compatibility
6. visual features

### Step 4
Build the simplest coherent architecture.

### Step 5
Implement vertical slices rather than disconnected mock screens.

### Step 6
After each meaningful phase, run tests.

### Step 7
Fix failures before moving on.

### Step 8
Profile before optimizing blindly.

### Step 9
Do not add unrequested features.

### Step 10
At the end, provide:

- what was implemented
- known limitations
- browser limitations
- test results
- performance results
- build instructions
- run instructions

---

# 78. Required Final Deliverables from Coding Agents

The completed repository should contain:

```text
working application
tests
README.md
LICENSE
CONTRIBUTING.md
SECURITY.md
CHANGELOG.md
architecture.md
```

The README must explain:

- what Workpad is
- why it exists
- local-first model
- how to run locally
- how to build
- how to export/import data
- browser support
- privacy behavior
- contribution process

---

# 79. Final UX Test

Before calling the product “done,” ask:

> I am in Chrome doing important work.
> I suddenly think of something.
> Can I capture it in roughly one or two seconds without breaking my flow?

If the answer is no:

**the product is not done.**

Second test:

> I captured something three days ago.
> Can I find it quickly?

If the answer is no:

**the product is not done.**

Third test:

> I have 5,000 captured items.
> Does the interface still feel calm and responsive?

If the answer is no:

**the product is not done.**

Fourth test:

> My internet is off.
> Can I still use my notes?

If the answer is no:

**the product violates the core philosophy.**

Fifth test:

> Do I understand Workpad within 10 seconds without reading a tutorial?

If the answer is no:

**simplify the UI.**

---

# 80. Final Product Definition

## Workpad

**A tiny, local-first work surface for computer work.**

> Open it.
> Capture thoughts.
> Keep working.
> Organize later.

No account.
No server.
No setup.
No forced AI.
No productivity theater.

Just a fast place to think while you work.

---

# END OF MASTER SPEC
