# Workpad Architecture & Engineering Specification

## 1. System Overview

Workpad is built as a zero-backend, browser-native, local-first single page application.

```text
┌────────────────────────────────────────────────────────┐
│                        UI Layer                        │
│   Today  │  Scratch  │  Workspaces  │  Recent  │  Archive   │
│   Quick Capture (Ctrl+Space)  │  Search Modal (Ctrl+K) │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Application State                   │
│        useWorkpad Context (Reactive Domain Store)      │
└──────────────┬────────────┬─────────────┬──────────────┘
               │            │             │
               ▼            ▼             ▼
       ┌──────────────┐┌──────────────┐┌──────────────┐
       │ Persistence  ││ Search Index ││ Import/Export│
       │ IndexedDB /  ││ In-Memory    ││ .workpad JSON│
       │ LocalStorage ││ Multi-field  ││ Markdown .md │
       └──────────────┘└──────────────┘└──────────────┘
```

---

## 2. Core Modules

### 2.1 State & Domain Model (`src/types/index.ts`, `src/hooks/useWorkpad.tsx`)

State is managed through React Context with fine-grained memoization (`useMemo`, `useCallback`) following the `vercel-react-best-practices` guidelines to prevent unnecessary re-renders.

Primary entities:
- **`Item`**: Individual unit of thought. Can be `text`, `checklist`, `quote`, `link`, or `divider`. Status is `active`, `archived`, or `deleted`.
- **`Workspace`**: Optional context tag (e.g. Website, Research, Thesis). Unassigned items reside in `Scratch` (`workspaceId: null`).
- **`ActivityLog`**: Private audit and working memory stream recording item creation, task completions, and conversions.
- **`UserSettings`**: Persisted theme preferences and keybindings.

### 2.2 Local Persistence (`src/services/db.ts`)

- **Database**: IndexedDB (`workpad_db`, v1).
- **Stores**:
  - `items`: Indexed by `workspaceId`, `status`, `updatedAt`, `type`.
  - `workspaces`: Indexed by `updatedAt`.
  - `activity`: Indexed by `timestamp`.
  - `settings`: Key-value storage.
- **Fail-safe**: If IndexedDB is blocked (e.g., restricted browser iframe or policy), operations seamlessly fall back to LocalStorage without throwing unhandled exceptions or losing user inputs.

### 2.3 Local Search Engine (`src/services/search.ts`)

Search executes locally in-memory using a multi-factor scoring heuristic:
1. **Exact phrase match**: +100 pts
2. **Title / first line match**: +50 pts
3. **Source URL / domain match**: +40 pts
4. **Workspace name match**: +35 pts
5. **Token match**: +15 pts per keyword
6. **Active workspace boost**: +20 pts
7. **Recency boost**: +15 pts (within 24h) / +8 pts (within 7d)

Benchmarks show sub-10ms query latency on synthetic datasets exceeding 5,000 items.

### 2.4 Data Portability (`src/services/exportImport.ts`)

- **`.workpad` JSON format**: Fully recoverable and versioned schema (`workpad-v1`).
- **Validation**: Every imported file is verified against schema invariants before state mutation.
- **Safe Import Modes**:
  - `merge`: Preserves existing local records and appends new ones.
  - `new_workspace`: Insulates imported items inside a freshly generated workspace.
  - `replace`: Complete restore with confirmation.
- **Markdown Export**: Direct serialization to human-readable Markdown with checklist checkboxes (`- [x]`) and quote blocks.

---

## 3. Keyboard Interactions & Shortcuts

Global keyboard listener (`src/services/shortcuts.ts`) traps shortcuts:
- `Ctrl/Cmd + Space`: Toggles Quick Capture modal. Allowed inside input fields.
- `Ctrl/Cmd + K`: Toggles Search / Command palette. Allowed inside input fields.
- `Ctrl/Cmd + S`: Generates and downloads a `.workpad` snapshot.
- `Esc`: Closes any open modal/sheet.
- `?`: Opens keyboard shortcuts reference guide.

---

## 4. UI & Aesthetics

- Adheres to the **Linear**, **Apple Notes**, and **Raycast** design principles outlined in Spec Section 29–31.
- Calm, distraction-free neutral color palette.
- High contrast, visible focus rings (`focus-visible:ring-2`) for accessibility (WCAG AA).
- Fully responsive across Desktop, Tablet, and Mobile.
