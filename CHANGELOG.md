# Changelog

All notable changes to **Workpad** will be documented in this file.

## [1.0.0] - 2026-09-06

### Added
- **Core Capture Surface**:
  - `Today` view with `Now` (active today), `Scratch` (unassigned captures), and `Next` (actionable tasks).
  - Dedicated `Scratch` surface with frictionless inline quick capture.
  - Floating `Quick Capture` overlay (`Ctrl+Space`) with immediate focus and Enter-to-save.
  - Lightweight block types: Text, Checklist task, Quote / Reference, Link, and Divider.
- **Context & Workspaces**:
  - Optional workspaces for grouping projects without rigid hierarchical folders.
  - Fluid move-to-workspace and scratch re-assignment.
  - Workspace export to clean Markdown (`.md`).
- **Search & Navigation**:
  - Command palette style search (`Ctrl+K`) with multi-factor relevance ranking (exact match, title match, recency boost, active workspace bonus).
  - Keyboard navigation in search results (`↑`, `↓`, `Enter`).
- **Data & Reliability**:
  - Native IndexedDB persistence (`workpad_db`) with automatic LocalStorage fallback.
  - Reversible soft-delete with recoverable `Trash` view and undo toasts.
  - Non-destructive `Archive` view for out-of-sight notes.
  - Versioned `.workpad` export & import with schema validation.
- **Interface & Accessibility**:
  - Distraction-free, calm interface adhering to Linear / notebook aesthetic principles.
  - First-class Dark, Light, and System themes.
  - Full keyboard accessibility, visible focus rings, and reduced-motion support.
  - Offline Service Worker PWA support.
- **Testing**:
  - Full unit test suite covering search, domain transitions, export/import validation, and performance benchmarks up to 5,000 items.
