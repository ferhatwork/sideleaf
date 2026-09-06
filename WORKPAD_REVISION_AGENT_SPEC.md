# WORKPAD — REVISION & PRODUCT HARDENING SPEC
## One-Shot Prompt for an AI Coding Agent

> IMPORTANT: This document is a **revision prompt for an already-existing Workpad implementation**.
> Do NOT start from zero unless the existing repository is unusable.
> First inspect the current codebase and existing UI, then refactor the product toward this specification.

---

# 0. YOUR ROLE

You are the lead product engineer, UX engineer, architect, and QA lead responsible for revising the existing Workpad application.

You are receiving an already-built prototype. Your job is NOT to blindly add more features.

Your job is to:

1. inspect the current implementation,
2. preserve what is already correct,
3. identify where the implementation drifted from the intended product,
4. refactor the UX and architecture where necessary,
5. make the product feel like a **work surface**, not a productivity dashboard,
6. keep the application lightweight, local-first, offline-capable, browser-native, and open-source friendly,
7. run tests and verify behavior before declaring completion.

The existing application may already contain:

- Today
- Scratch
- Recent
- Workspaces
- Archive
- Trash
- Quick Capture
- Search
- local-only messaging
- theme settings
- note/task/link/quote/divider concepts
- persistence

These are NOT automatically wrong. Reuse them where they support the new vision.

---

# 1. THE PRODUCT HAS CHANGED IN EMPHASIS

The current prototype visually resembles a:

> minimalist productivity dashboard.

That is not the final product.

The desired product is:

> **a digital sheet of paper beside your keyboard that quietly understands the work you are doing.**

Workpad should feel like:

- a scratchpad
- a workbench
- a digital sheet of paper
- an external working memory

It should NOT feel like:

- a task manager
- a dashboard
- a project management tool
- a Notion clone
- a database app

---

# 2. CORE PRODUCT DEFINITION

## Workpad

**A tiny, local-first work surface for computer work.**

Primary promise:

> Open it. Capture the thought. Keep working. Organize later.

The core problem is NOT:

> “I need a better notes app.”

The core problem is:

> **“I need somewhere to put this thought right now without breaking my flow.”**

Therefore the primary product metric and design objective is:

# Reduce thought → capture friction.

---

# 3. MOST IMPORTANT REVISION

## CURRENT PROTOTYPE PROBLEM

The current UI over-emphasizes:

- dashboard sections
- cards
- item counts
- tasks
- structured categories
- explicit organization

This creates a subtle pressure on users to:

> manage the Workpad.

The desired experience is:

> **use the Workpad.**

The product should not make the user think about the system while they are trying to think about their actual work.

---

# 4. NEW PRODUCT PRINCIPLES

These principles override previous UI decisions when there is conflict.

## 4.1 Work Surface > Dashboard

The main screen should feel like an active workspace, not a metrics panel.

Do NOT optimize the home screen for:

- showing more information
- showing more cards
- showing more counters
- showing more categories

Optimize it for:

- immediate capture
- calmness
- continuity
- readability
- low cognitive load

---

## 4.2 Capture Before Organization

A user must be able to capture something without deciding:

- project
- folder
- tag
- type
- priority
- due date
- destination

Those are optional transformations after capture.

---

## 4.3 Scratch Is Valid

Unorganized notes are NOT a failure state.

A scratch note may remain:

- messy
- incomplete
- ambiguous
- temporary
- unstructured

That is intentional.

---

## 4.4 Progressive Structure

The system should allow structure to emerge from use.

The correct flow is:

```text
THOUGHT
  ↓
CAPTURE
  ↓
CONTINUE WORK
  ↓
REVISIT
  ↓
OPTIONALLY STRUCTURE
```

NOT:

```text
CREATE PROJECT
  ↓
CREATE PAGE
  ↓
CHOOSE TYPE
  ↓
ADD TAG
  ↓
WRITE
```

---

## 4.5 External Memory

Search, recency, history, and context exist to help answer:

> “What was I doing?”

not merely:

> “Where is my note?”

---

## 4.6 Reliability > Novelty

A lost note is a severe product failure.

Do not introduce new interaction patterns at the expense of persistence reliability.

---

## 4.7 Lightweight Is a Product Feature

Do not add:

- Electron
- background daemons
- unnecessary services
- large UI frameworks
- large editor dependencies
- unnecessary animations
- polling loops
- telemetry SDKs

unless there is a compelling measured reason.

---

# 5. REVISE THE CURRENT INFORMATION ARCHITECTURE

Keep the useful navigation but reduce the visual dominance of the categories.

Recommended sidebar:

```text
TODAY
SCRATCH
RECENT

WORKSPACES
  • Website Redesign
  • Research

──────────────

ARCHIVE
RECENTLY DELETED

──────────────

Settings
```

Notes:

- counters should be subtle or removed
- do not make every navigation item look like a task queue
- workspace counts are optional
- active workspace may be indicated with a small dot rather than heavy badges
- the sidebar is navigation, not a dashboard

---

# 6. NEW HOME SCREEN MENTAL MODEL

The main screen should be a **work session surface**.

It should be substantially calmer than the current screenshot.

## Preferred structure

```text
┌──────────────────────────────────────────────────────────────┐
│ Workpad                              Search       Local   ⚙  │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│ Today        │ Today                                         │
│ Scratch      │                                               │
│ Recent       │ Capture something...                          │
│              │                                               │
│ Workspaces   │ • Check Stripe webhook limits                │
│  Website     │ • Ask client about billing                   │
│  Research    │ • Test Safari responsive behavior             │
│              │                                               │
│              │                                               │
│              │ Continue                                      │
│              │ Website Redesign                              │
│              │ Last active recently                          │
│              │                                               │
│ Archive      │ Recent sources                                │
│ Recently     │ docs.stripe.com                               │
│ deleted      │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

Do NOT reproduce this literally if a better layout exists.

The important qualities are:

- large breathing room
- work content first
- little chrome
- minimal cards
- no giant dashboard widgets
- easy typing
- clear current context

---

# 7. TODAY IS A WORK SURFACE, NOT A TASK DASHBOARD

The current implementation uses sections such as:

- NOW — ACTIVE TODAY
- NEXT — ACTIONABLE TASKS
- SCRATCH — UNORGANIZED

This hierarchy is too rigid.

Replace the visual hierarchy with a more natural working surface.

Potential presentation:

```text
Today
Sunday, September 6

────────────────────────────────────────

Check Stripe webhook limits before changing this.

Ask client about billing.

Try a new mobile layout.

The pricing section feels too dense.

docs.stripe.com

────────────────────────────────────────

Continue
Website Redesign
```

The system may still classify these records internally.

The UI should not force the user to think in those categories.

---

# 8. DO NOT MAKE EVERYTHING A CARD

This is a major revision.

The current prototype is too card-heavy.

Do NOT render every captured item as a large rounded rectangle.

Instead:

- ordinary text → lightweight row/block
- checkbox → lightweight task row
- source → compact source row
- grouped context → subtle container
- important content → optional emphasis

Cards should be reserved for:

- actual contextual grouping
- important continuation state
- dialogs/overlays

The main work surface should feel more like a document than a dashboard.

---

# 9. REVISE QUICK CAPTURE

Quick Capture is one of the strongest existing ideas, but it currently feels too much like a form.

## Current problem

Large bordered panel + permanent type toolbar communicates:

> “Please configure your note.”

That is too much friction.

## Desired state

### Idle state

```text
┌──────────────────────────────────────────┐
│ +  Capture something…            ⌘↵     │
└──────────────────────────────────────────┘
```

Very small.

Very quiet.

### Focused state

```text
┌──────────────────────────────────────────┐
│ What’s on your mind?                    │
│                                          │
│ check Safari responsive issue            │
│                                          │
│                              Enter ↵     │
└──────────────────────────────────────────┘
```

Only after content exists should secondary actions become available.

---

# 10. QUICK CAPTURE RULE

The user must NOT be asked to choose an item type before typing.

Default:

> TEXT.

After writing, optional actions can appear:

- Convert to task
- Keep as note
- Add source
- Move to workspace
- Archive

This implements:

# capture first, structure later.

---

# 11. TYPE TOOLBAR REVISION

Remove the permanent first-class toolbar:

```text
Text
Task
Quote
Link
Divider
```

from the idle capture interface.

Replace with either:

- nothing, or
- a compact secondary menu

Example:

```text
⋯
```

which exposes:

- Task
- Quote
- Link
- Divider

Only show this when context requires it.

---

# 12. TASKS SHOULD BECOME A TRANSFORMATION, NOT A CATEGORY

The product should not scream:

> TASKS.

A normal note:

`Ask client about API rate limits`

may later become:

`☐ Ask client about API rate limits`

This can happen through:

- context menu
- keyboard shortcut
- inline action

The task representation should be lightweight.

Do NOT build:

- priorities
- due dates
- recurring tasks
- subtasks
- task boards
- project management UI

in this revision.

---

# 13. REMOVE DEMO / TEST-CONTENT FEEL

The current screenshot includes items like:

> Try converting any note into a task with one click

This reads like a product demo artifact.

Replace seeded content with either:

### genuinely empty state

or

### one small realistic example

The first-run state should not make the application look pre-populated with fake productivity data.

If demo data is retained for development, isolate it from production/fresh-user state.

---

# 14. CONTINUE WHERE YOU LEFT OFF

Keep this idea.

It is strategically strong.

But make it compact.

Do NOT present a large dashboard widget.

Preferred:

```text
Continue
Website Redesign
Last active 14 min ago
```

This may be a compact section or row.

Show it only when meaningful.

---

# 15. INTRODUCE “CURRENT WORK”

Add a lightweight concept:

# Working On

Example:

```text
WORKING ON
● Website Redesign
```

This is not a project-management field.

It is simply the user's current context.

It may affect:

- capture destination
- recent items
- search ranking
- continuation state

But capture must still work with NO current workspace selected.

---

# 16. WORK SESSION CONCEPT

Introduce a lightweight internal concept called:

# Work Session

A session represents a context the user is actively working within.

Example:

```text
Website Redesign
Started 09:41
Last active 12:36
```

A session may contain:

- notes
- tasks
- sources
- decisions
- recent activity

But the user must NOT manually create a session before taking notes.

Sessions should emerge naturally from workspaces/current context/activity.

---

# 17. FUTURE “DECISIONS” CONCEPT

Do not necessarily expose this prominently in MVP.

Architecturally allow a future item subtype:

`decision`

Example:

> Chose Stripe instead of Paddle because of webhook tooling.

This enables a future query:

> “Why did we decide this?”

For now, keep the data model extensible without adding visual complexity.

---

# 18. TODAY SHOULD FEEL LIKE A PAGE

This is a critical aesthetic revision.

Use:

- vertical flow
- subtle separators
- clean typography
- text-first layout
- quiet metadata

Avoid:

- rigid card grids
- huge KPI-like counters
- visually dominant colored widgets

The user should be able to imagine:

> “This is a piece of paper on my desk.”

---

# 19. TYPOGRAPHY REVISION

Current content hierarchy is broadly good, but make content more dominant than metadata.

Example:

```text
Review Stripe webhook documentation for API limits

docs.stripe.com · Website Redesign · 5m
```

The first line:

- readable
- strong
- focused

The metadata:

- smaller
- lower contrast
- never compete with content

---

# 20. CONTEXT MENU

Each item should support a subtle contextual action affordance.

Hover:

```text
⋯
```

Menu:

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

Do not expose these controls permanently on every item.

---

# 21. SOURCE CAPTURE

Keep source capture as an important differentiator.

When the user pastes:

- URL
- quoted text
- web content

the system may recognize it.

Desired rendering:

```text
“quoted research content…”

Source
docs.stripe.com
Captured 14:32
```

But:

- no automatic web scraping
- no remote fetching
- no third-party enrichment required
- no browser extension dependency in MVP

---

# 22. SEARCH SHOULD FEEL LIKE EXTERNAL MEMORY

The current search location is good.

Keep:

`Ctrl/Cmd + K`

Search results should include context.

Example:

```text
Search your work…

Review Stripe webhook documentation
Website Redesign · Today · 5m ago
“…API rate limits…”

Stripe migration decision
Research · 3 weeks ago
“…webhook tooling…”
```

Search should help the user reconstruct context, not just locate a string.

---

# 23. SEARCH RANKING

Prefer, in order:

1. exact text match
2. title/first-line match
3. recent active context
4. current workspace
5. recent update
6. source URL
7. partial/fuzzy match

Keep ranking deterministic.

---

# 24. SIDEBAR COUNTERS

Review all numeric counters.

The current screenshot shows:

```text
Today 3
Scratch 2
Recent 0
Website Redesign 1
Archive 0
Trash 0
```

This feels overly dashboard-like.

Preferred:

- hide zero counts
- minimize non-zero counts
- show counts only where useful
- consider no count for Today/Scratch altogether

Do not let navigation look like a notification center.

---

# 25. “LOCAL-ONLY” BRANDING

Keep the concept.

It is a valuable identity marker.

Use a subtle badge:

```text
◉ Local
```

or:

```text
Local-only
```

Do not over-emphasize it.

The product should not constantly remind users about architecture.

---

# 26. EMPTY STATE REVISION

TODAY:

> Nothing here yet.  
> Start writing. Organize later.

SCRATCH:

> Capture anything. It does not need a home yet.

WORKSPACES:

> Create a workspace when a project deserves one.

These should be visually quiet.

No illustration-heavy onboarding.

---

# 27. FIRST-RUN EXPERIENCE

Do NOT present fake notes by default.

Preferred first launch:

```text
Workpad

A quiet place for thoughts while you work.

No account.
No setup.

[ Start writing ]
```

After clicking, focus the capture surface.

The user should reach useful interaction in under 10 seconds.

---

# 28. HOME SCREEN MUST PASS THIS TEST

Ask:

> “If I opened this while already doing important work, would the UI get in my way?”

If yes:

simplify.

The main screen must not require the user to browse:

- widgets
- stats
- categories
- settings
- onboarding
- task systems

before writing.

---

# 29. KEYBOARD-FIRST REVISION

Required shortcuts:

`Ctrl/Cmd + Space`
→ Quick Capture

`Ctrl/Cmd + K`
→ Search

`Esc`
→ close transient UI

`Ctrl/Cmd + Enter`
→ convert to task where editor context exists

`Ctrl/Cmd + Z`
→ undo

`Ctrl/Cmd + Shift + Z`
→ redo

Keep the shortcut set small.

Do not create an entire command language.

---

# 30. QUICK CAPTURE SHOULD FEEL FASTER THAN NOTEPAD

This is a product acceptance criterion.

A user should be able to:

1. invoke capture
2. type
3. save
4. disappear back to work

without:

- navigating folders
- choosing note type
- choosing workspace
- opening a large editor
- logging in

---

# 31. MOBILE / RESPONSIVE RULE

Desktop is primary.

On narrow screens:

- collapse sidebar
- preserve capture access
- preserve search
- retain readable content width
- enlarge touch targets

Do not redesign the product into a mobile productivity app.

---

# 32. PERFORMANCE RULES

Performance must remain a first-class feature.

## Avoid

- Electron
- heavy editor frameworks
- unnecessary state libraries
- background polling
- expensive reactive subscriptions
- rendering thousands of DOM nodes
- duplicate copies of large documents
- large images loaded eagerly

## Prefer

- native browser capabilities
- small dependencies
- incremental updates
- lazy rendering
- virtualized history when needed
- IndexedDB for durable local data
- in-memory state only for active UI concerns

Do not promise “zero RAM.”

Instead optimize for:

> no unnecessary runtime overhead.

---

# 33. PERSISTENCE

Keep local-first persistence.

Recommended:

- IndexedDB for structured local state
- safe serialization
- versioned data schema
- migrations
- explicit export/import

Do not assume `file://` storage behaves identically in Chrome and Safari.

Gracefully handle browser limitations.

---

# 34. PORTABLE DATA

The application should support:

```text
Export Workspace
Import Workspace
```

Preferred portable file:

```text
something.workpad
```

with a documented, versioned internal format.

Requirements:

- schema version
- validation
- safe import
- no silent overwrite
- backward-compatible migration where possible

---

# 35. IMPORTANT FILE-BASED DISTRIBUTION CONSTRAINT

The product goal remains:

> click an HTML-like static artifact and use it without deployment.

The agent must support static distribution.

But do NOT violate browser security/storage behavior to force this.

Support:

1. static build
2. ordinary local/static hosting
3. PWA installation where supported
4. local persistence through browser storage
5. explicit portable export/import

Do not invent unsupported filesystem behavior.

---

# 36. BROWSER SUPPORT

Primary:

- Chrome
- Safari

Secondary:

- Firefox
- Chromium-based browsers

Where an API differs:

- use feature detection
- provide fallback
- never break the core note workflow

---

# 37. ACCESSIBILITY

All primary workflows must support:

- keyboard navigation
- visible focus
- semantic controls
- accessible dialogs
- screen-reader-friendly labels
- reduced motion
- sufficient contrast
- logical tab order

Do not rely on hover-only controls for critical actions.

---

# 38. SECURITY

Because pasted content and imports may be untrusted:

- sanitize rendered content
- avoid unsafe `innerHTML`
- validate imported structures
- treat URLs as untrusted
- prevent script execution from pasted data
- do not auto-fetch arbitrary URLs
- do not execute HTML pasted by a user

---

# 39. NO BACKEND

Do not add:

- API server
- hosted database
- user account service
- authentication
- analytics backend
- sync service

to the core product.

---

# 40. NO TELEMETRY

The default product should not contain tracking.

Do not add analytics SDKs simply to measure usage.

If future telemetry is ever introduced, it must be opt-in and explicitly documented.

---

# 41. AI

Do not make AI part of this revision unless it is already deeply embedded and can be safely hidden behind an optional layer.

The product should remain excellent without AI.

Future AI should help with:

- grouping scratch notes
- summarizing research
- finding unfinished work
- extracting next actions
- reconstructing project context
- turning existing notes into useful study/work material

AI must not become:

- the center of the home screen
- a chatbot dashboard
- a required network dependency

---

# 42. EXISTING PROTOTYPE: WHAT TO KEEP

Keep/reuse where sound:

- sidebar architecture
- search
- local-only indicator
- settings
- theme system
- current workspace concept
- persistence layer
- current item data model if extensible
- quick capture shortcut
- archive
- trash/recovery concepts

Do not rewrite stable architecture solely for aesthetics.

---

# 43. EXISTING PROTOTYPE: WHAT TO CHANGE

Refactor:

### 1.
Card-heavy content presentation.

### 2.
Large persistent Quick Capture box.

### 3.
Permanent type toolbar.

### 4.
Task prominence.

### 5.
Dashboard-like section hierarchy.

### 6.
Excessive counters.

### 7.
Fake/demo content.

### 8.
Visual emphasis on category management.

### 9.
Any interaction that asks for structure before capture.

---

# 44. EXISTING PROTOTYPE: WHAT TO ADD

Add or strengthen:

### 1.
Work Surface mental model.

### 2.
Scratch-first capture.

### 3.
Working On/current context.

### 4.
Compact Continue state.

### 5.
Document-like item presentation.

### 6.
Contextual item actions.

### 7.
External-memory search experience.

### 8.
Work Session internal model.

### 9.
Better first-run experience.

### 10.
Clear separation between:
- capture
- organization
- action

---

# 45. VISUAL DESIGN DIRECTION

Target:

- dark mode first if current system already supports it
- calm neutral surfaces
- restrained blue accent
- minimal borders
- subtle separators
- generous content area
- high information clarity
- low visual noise

Avoid:

- neon gradients
- giant glossy widgets
- excessive shadows
- excessive rounded cards
- gamification
- excessive color coding
- decorative animations

The interface should feel mature and quiet.

---

# 46. SPACING DIRECTION

The main content should breathe.

Use:

- readable max-width for text
- larger vertical rhythm between logical groups
- tighter spacing between related lines
- compact metadata
- no unnecessary vertical duplication

Do not make every block look like a separate “component card.”

---

# 47. CONTENT WIDTH

The central writing surface should have a comfortable reading/writing width.

Do not force the editor to span the entire ultrawide screen.

The sidebar may remain fixed.

The work content should stay visually centered or naturally aligned.

---

# 48. ULTRAWIDE DISPLAY

Do not stretch content endlessly on large monitors.

Use a sensible maximum content width.

The app should still feel like a desk surface, not an enterprise admin console.

---

# 49. ITEM PRESENTATION

Default note:

```text
Check Safari responsive behavior

8 min ago · Website Redesign
```

Task:

```text
☐ Ask client about billing

8 min ago · Scratch
```

Source:

```text
docs.stripe.com
“Webhook limits…”

5 min ago · Website Redesign
```

Keep metadata low-contrast.

---

# 50. ITEM INTERACTION

Clicking an item should:

- focus it
- expand or open editing context
- not necessarily navigate to an entirely separate page

Avoid excessive modal navigation.

The user should feel they are interacting with a continuous work surface.

---

# 51. EDITING MODEL

Prefer inline editing.

The user should be able to:

- click
- type
- continue

without being thrown into a completely different editor route.

---

# 52. SAVE MODEL

Autosave locally.

Do not force:

> Save

for basic note creation.

Manual export/save applies to:

> portable workspace files.

The user should not fear losing a thought because they forgot to click Save.

---

# 53. RECOVERY MODEL

Implement:

- undo
- safe deletion
- recoverable trash
- import validation
- local persistence verification

A user should not lose a note because of an accidental click.

---

# 54. DELETE UX

Delete:

1. move to trash
2. show brief undo affordance
3. permanent deletion only from trash or explicit action

Do not immediately destroy data.

---

# 55. ARCHIVE UX

Archive means:

> “I still care about this, but it is not active.”

Archive should never feel like deletion.

---

# 56. SEARCH EMPTY STATE

When no results:

> Nothing found.

Optional:

> Try a different word or search source/title.

No elaborate illustration needed.

---

# 57. SEARCH RESULT ACTIONS

Search results should allow:

- open/focus
- move
- archive
- convert to task
- copy

without making search cumbersome.

---

# 58. CURRENT WORKSPACE

If the user chooses:

`Website Redesign`

then newly captured items may default there.

But:

> capture must still succeed with no workspace.

The app should remember the last active context but never force one.

---

# 59. CONTEXTUAL CAPTURE

Future-ready behavior:

If current workspace is Website Redesign:

```text
Quick Capture
→ note automatically associated with Website Redesign
```

The UI should not ask:

> “Select workspace?”

unless the user explicitly wants to change it.

---

# 60. WORKSPACE SWITCHING

Make switching fast.

Possible shortcut later:

`Ctrl/Cmd + Shift + P`

but do not add it unless useful.

Mouse and keyboard routes should both exist.

---

# 61. WORKSPACES MUST REMAIN LIGHTWEIGHT

A workspace should not require:

- custom templates
- settings pages
- databases
- status systems
- roles
- permissions
- project boards

It is simply:

> a context boundary.

---

# 62. RECENT

Recent should answer:

> “What was I touching lately?”

Not:

> “Here is another giant dashboard.”

Use a compact chronological list.

---

# 63. ACTIVITY

A lightweight activity history may contain:

```text
10:04 captured note
10:12 added source
10:25 converted note to task
11:03 archived item
```

This is private history.

Do NOT present it like a social feed.

---

# 64. LOCAL DATA BOUNDARY

All normal interactions remain on the user's device.

Network access should only happen for explicitly external things, such as:

- opening an external URL
- future optional integrations

Core application behavior must not need the network.

---

# 65. DEPENDENCY AUDIT

Before finalizing:

1. inspect existing dependencies
2. remove dependencies that are unnecessary
3. identify large dependencies
4. document why each remaining major dependency exists
5. avoid adding a library for a trivial function

The final bundle should be measured.

---

# 66. PERFORMANCE ACCEPTANCE

Create and test against synthetic data of:

- 1,000 items
- 5,000 items
- 10,000 items

Verify:

- scrolling
- search
- opening item
- capture
- workspace switching
- reload
- persistence

remain usable.

Do not claim zero-lag unless measured.

---

# 67. STARTUP ACCEPTANCE

Test:

- first load
- repeat load
- offline load after caching where applicable

Capture surface should become usable quickly.

The initial screen must not wait on:

- search indexing
- large history loading
- noncritical UI
- network resources

---

# 68. SEARCH PERFORMANCE

Search should not rebuild a massive index synchronously on every keystroke.

Use:

- normalized local index
- debouncing when appropriate
- incremental updates
- lazy loading

Measure actual latency.

---

# 69. TESTING

Required automated coverage:

## Unit

- item creation
- item mutation
- task conversion
- archive
- trash
- restore
- serialization
- schema validation
- import
- export
- search ranking

## Integration

- capture
- reload persistence
- search
- workspace movement
- task conversion
- archive
- restore

## Browser

- Chrome
- Safari where tooling permits

---

# 70. MANUAL QA CHECKLIST

Test this exact sequence:

### Test 1 — instant capture
Open Workpad → type → close → reopen.

### Test 2 — context capture
Select workspace → capture → verify association.

### Test 3 — no context
Remove workspace → capture → verify capture still works.

### Test 4 — task conversion
Create note → convert → complete → verify history.

### Test 5 — source
Paste URL + text → verify source context.

### Test 6 — search
Create several related notes → search → verify contextual ranking.

### Test 7 — delete recovery
Delete → undo → verify restoration.

### Test 8 — export/import
Export → clear test dataset → import → verify data.

### Test 9 — offline
Disable network → continue using core workflow.

### Test 10 — keyboard
Perform primary workflow without mouse.

---

# 71. VISUAL QA

Compare the final UI against these questions:

### Does it look like a dashboard?
If yes, reduce cards/widgets.

### Does it look like a task manager?
If yes, reduce task prominence.

### Does it look like Notion?
If yes, simplify structure.

### Does it look like a work surface?
If no, redesign the information presentation.

---

# 72. CRITICAL VISUAL TEST

Imagine the UI is printed on paper.

Would the user understand:

> “This is where I work.”

rather than:

> “This is my productivity control panel.”

The desired answer is the first.

---

# 73. PRODUCT LANGUAGE

Use:

- Today
- Scratch
- Working on
- Continue
- Recent
- Archive
- Capture

Avoid excessive use of:

- dashboard
- productivity
- goals
- metrics
- project management
- optimize
- score
- streak

---

# 74. FIRST-RUN COPY

Recommended:

```text
Workpad

A quiet place for thoughts while you work.

No account.
No setup.

Start writing.
```

Button:

`Start writing`

After action, focus the capture surface.

---

# 75. SETTINGS

Keep Settings & Data.

Sections:

```text
Appearance
Data
Keyboard
About
```

Data should contain:

- Export
- Import
- Backup
- Clear local data

Clear local data must be explicit and destructive.

---

# 76. SETTINGS SHOULD NOT DOMINATE THE PRODUCT

Do not expose:

- dozens of toggles
- advanced configuration
- unnecessary preferences

The best productivity setting is:

> no setting required.

---

# 77. PWA

Keep or add PWA support where technically sound:

- manifest
- offline caching
- standalone launch
- app icon
- install support

But PWA must be additive.

The static browser build remains the fundamental distribution method.

---

# 78. NO ELECTRON

Do NOT convert this project to Electron.

The target remains browser-native.

---

# 79. OPTIONAL LOCAL APP WRAPPER

Do not build native wrappers in this revision.

If future demand exists, revisit only after the browser product is validated.

---

# 80. ARCHITECTURAL CONTRACT

The codebase should keep clear separation:

```text
UI
↓
Application Commands
↓
Domain Model
↓
Persistence / Search / Import-Export
```

The UI must not directly manipulate storage structures in scattered places.

---

# 81. COMMAND MODEL

Prefer explicit application actions such as:

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
```

This makes behavior testable and future integrations possible.

---

# 82. DOMAIN MODEL

At minimum:

```text
Workspace
Item
Source
Settings
```

Item:

```text
id
type
content
workspaceId
status
createdAt
updatedAt
archivedAt
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

Do not build UI for every future type yet.

---

# 83. MIGRATION

If the existing implementation has a working data model:

1. inspect it
2. preserve existing user data
3. write a migration if necessary
4. do not silently destroy stored notes

If the model is already appropriate, reuse it.

---

# 84. USER DATA IS SACRED

Never:

- overwrite data during a UI refactor
- clear storage during app boot
- silently change schema without migration
- delete old data because a feature was removed

Always test upgrade scenarios.

---

# 85. DESIGN TOKENS

Create centralized design tokens for:

- colors
- surfaces
- typography
- spacing
- border radius
- shadows
- focus
- transitions

The visual system should be consistent.

---

# 86. ANIMATION

Use minimal animation.

Allowed:

- subtle modal entrance
- subtle hover state
- small transition on expand/collapse

Avoid:

- continuous movement
- decorative motion
- delayed UI
- animated background
- large panel transitions

Respect `prefers-reduced-motion`.

---

# 87. COLOR

Use color as a cue, not a communication system.

The primary accent may be a restrained blue.

Metadata should be lower contrast.

Status should never depend solely on color.

---

# 88. ICONOGRAPHY

Use a consistent icon system.

Do not mix:

- emoji
- unrelated icon sets
- decorative symbols

unless intentional.

Icons should support scanning, not dominate the UI.

---

# 89. RESPONSIVE SIDEBAR

Desktop:

fixed narrow sidebar.

Tablet/narrow:

collapsible sidebar.

Do not turn the whole UI into a card-heavy mobile dashboard.

---

# 90. LARGE CONTENT

For large notes:

- keep editing smooth
- avoid full document rerenders
- preserve cursor position
- debounce expensive persistence if needed without risking data loss
- use incremental persistence carefully

---

# 91. CLIPBOARD

Pasted data must be sanitized and normalized.

Preserve useful text.

Avoid importing huge hidden formatting payloads.

Future rich clipboard support should not compromise simplicity.

---

# 92. LINKS

Recognize URLs.

Render them safely.

Show:

- hostname
- optional title if explicitly known

Do not automatically fetch metadata in MVP.

---

# 93. NO AUTOMATIC INTERNET DEPENDENCY

Do not make the UI depend on:

- remote fonts
- remote icons
- remote APIs
- remote configuration

where avoidable.

Prefer locally bundled assets.

This improves offline behavior and startup.

---

# 94. OPEN SOURCE QUALITY

Update:

- README
- CONTRIBUTING
- SECURITY
- architecture documentation

README should explain:

- what Workpad is
- why it exists
- local-first model
- browser behavior
- development
- build
- persistence
- import/export
- privacy philosophy

---

# 95. AGENT MUST INSPECT BEFORE MODIFYING

Before coding:

1. list repository files
2. inspect package/config
3. inspect current entry points
4. inspect current storage logic
5. inspect current components
6. inspect current styles
7. identify test infrastructure
8. identify build system
9. run existing tests
10. launch the app if possible
11. compare the current implementation against this specification

Do not rewrite blindly.

---

# 96. AGENT MUST PRODUCE A GAP ANALYSIS

Before substantial refactoring, produce internally a table:

```text
Current behavior
Required behavior
Keep / Modify / Remove / Add
Reason
```

This should guide implementation.

Do not ask the user for confirmation unless there is a genuine contradiction that cannot be resolved from this document.

---

# 97. IMPLEMENTATION STRATEGY

Use vertical slices.

Recommended order:

### Slice 1
Home/work-surface redesign

### Slice 2
Quick Capture redesign

### Slice 3
Capture-first item behavior

### Slice 4
Inline editing + contextual actions

### Slice 5
Working On / current context

### Slice 6
Continue

### Slice 7
Search refinement

### Slice 8
Persistence/recovery audit

### Slice 9
Performance/a11y/browser audit

### Slice 10
Documentation

---

# 98. DO NOT ADD FEATURES DURING THIS REVISION

Unless needed to fulfill the core experience, do not introduce:

- calendar
- reminders
- notifications
- collaboration
- cloud sync
- chat
- marketplace
- social feed
- gamification
- AI assistant
- browser extension
- complex task management

The goal of this revision is product clarity, not feature count.

---

# 99. SPECIAL RULE: REMOVE BEFORE ADDING

Whenever the agent wants to add a new UI component to solve a usability problem:

First ask:

> Can the problem be solved by removing an existing layer?

Prefer simplification.

---

# 100. SPECIAL RULE: NO “MORE CARDS”

If the agent's first solution to a problem is:

> “add another card”

reject it unless the card clearly represents a meaningful contextual object.

---

# 101. SPECIAL RULE: DEFAULTS MUST BE INVISIBLE

A good default should happen silently.

Examples:

- current workspace inherited automatically
- text type selected automatically
- autosave automatically
- local persistence automatically

Do not turn defaults into forms.

---

# 102. SPECIAL RULE: THE USER CAN THINK MESSILY

The UI must tolerate:

- fragments
- half sentences
- random links
- temporary thoughts
- incomplete tasks
- messy ordering

This is not an error state.

---

# 103. SPECIAL RULE: WORKPAD IS NOT A SYSTEM TO MANAGE

If a proposed UX causes the user to spend more time:

> organizing Workpad

than:

> doing their actual work,

the UX is wrong.

---

# 104. FUTURE ROADMAP HOOKS

The architecture should leave clean extension points for:

### Browser extension
Send selected text + URL.

### Contextual capture
Capture current page.

### Local AI
Group and summarize local notes.

### Decisions
Track rationale.

### Smart continuation
Reconstruct where the user left off.

### Temporary scratch expiration
Optional cleanup.

But none of these should clutter MVP.

---

# 105. PRODUCT NORTH STAR

The strongest conceptual north-star metric is:

# Thought → Capture Time

Secondary:

# Capture → Revisit Rate

Useful reliability metric:

# Lost Data Incidents = 0

Do not add invasive analytics just to obtain these metrics.

Use user testing, manual benchmarking, and optional opt-in instrumentation if needed later.

---

# 106. FINAL ACCEPTANCE TEST

The revised app must pass all of these:

## Test A
I can open Workpad and start writing immediately.

## Test B
I can capture a thought without choosing a type.

## Test C
I can close/reload and the thought is still there.

## Test D
I can continue working without organizing it.

## Test E
I can later convert it into a task.

## Test F
I can search for it quickly.

## Test G
I can understand its context.

## Test H
I can export my data.

## Test I
I can restore my data.

## Test J
The interface does not feel like a dashboard.

## Test K
The app remains responsive with large datasets.

## Test L
Core behavior works offline.

## Test M
Primary actions work via keyboard.

---

# 107. FINAL VISUAL ACCEPTANCE CRITERIA

The finished interface should communicate:

### “Write here.”

not:

### “Manage your productivity here.”

It should communicate:

### “Continue your work.”

not:

### “Configure your workspace.”

It should communicate:

### “This is your external working memory.”

not:

### “This is another productivity system.”

---

# 108. THE KEY DESIGN TRANSFORMATION

Current prototype:

```text
Dashboard
  ↓
Sections
  ↓
Cards
  ↓
Tasks
  ↓
Notes
```

Desired Workpad:

```text
Work
  ↓
Thought
  ↓
Capture
  ↓
Work Surface
  ↓
Continue
  ↓
Revisit
  ↓
Optional Structure
```

This is the central transformation.

---

# 109. FINAL PRODUCT STATEMENT

## Workpad

> **A tiny, local-first work surface for computer work.**

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

# 110. FINAL AGENT INSTRUCTION

You are not being asked to create a prettier version of the current prototype.

You are being asked to make the current product more faithful to its core idea.

The ideal result should feel like:

> **a digital piece of paper that understands context, but never makes the user manage the paper.**

When forced to choose between:

- more information
- more structure
- more features

and:

- less friction
- less cognitive load
- faster capture
- clearer work context

choose the second.

When forced to choose between:

- architectural cleverness
- feature breadth

and:

- reliability
- simplicity
- portability
- performance

choose the second.

When the implementation is finished:

1. run automated tests,
2. run browser/manual QA,
3. test persistence and import/export,
4. test with large datasets,
5. inspect memory/bundle behavior,
6. verify keyboard flows,
7. verify accessibility,
8. review the UI against the “dashboard vs work surface” criterion,
9. remove unnecessary UI that was introduced during implementation,
10. provide a concise final report with:
   - changed
   - removed
   - added
   - tests
   - known limitations
   - browser-specific limitations
   - performance observations

Do not declare success solely because the application compiles.

The product is successful only when it feels like:

# “the place I put thoughts while I work.”

---

# END OF REVISION SPEC
