# Contributing to Sideleaf

Thank you for your interest in contributing to Sideleaf! Sideleaf is a tiny, local-first work surface designed to help people capture thoughts and do computer work with zero friction.

---

## Guiding Principles

Before contributing, please keep in mind the core philosophy that defines Sideleaf:

1. **Digital Paper, Not a Dashboard**: Sideleaf is designed like a digital sheet of paper beside your keyboard. Avoid heavy dashboard widgets, complex Kanban workflows, gamification, or forced hierarchies.
2. **Local-First & Zero Telemetry**: 100% of user data remains on the user's computer inside IndexedDB. We do not accept remote backend dependencies, user tracking, analytics, or external font/script loading.
3. **Capture First, Structure Later**: Thought capture must be sub-second (`Ctrl+Space`). Users should never be forced to pick a folder, category, or note type before writing.
4. **Keyboard-First Ergonomics**: Every primary interaction should have a keyboard shortcut and accessible focus management.
5. **Calm Aesthetics**: Quiet typography, high-contrast text, muted metadata, no visual noise or clutter.

---

## Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later

### Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/sideleaf.git
   cd sideleaf
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Run the test suite**:
   ```bash
   npm test
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

6. **Test the zero-dependency launcher**:
   ```bash
   npm run launch
   ```

---

## Localization (i18n)

Sideleaf officially supports English and Turkish. If you add or modify any user-facing text, please ensure:
- The English string is updated in `src/i18n/en.ts`
- The Turkish string is updated in `src/i18n/tr.ts`
- The type definition is updated in `src/i18n/types.ts`
- Automated branding tests pass (`npm test`)

---

## Pull Request Guidelines

1. **Create a branch**: Use descriptive branch names (e.g. `feat/markdown-preview`, `fix/shortcut-collision`).
2. **Ensure tests pass**: Run `npm test` and `npm run build` before opening a pull request.
3. **Keep PRs focused**: Smaller, well-scoped PRs are reviewed and merged much faster.
4. **Fill out the PR template**: Clearly describe what was changed, why, and confirm the checklist items.

---

## Reporting Issues

- **Bug Reports**: Use our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md). Include browser version, OS, steps to reproduce, and any console errors.
- **Feature Requests**: Use our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md). Please explain how the proposal fits into Sideleaf's "calm, local-first scratchpad" philosophy.

---

## License & Contributions

Sideleaf is source-available under the **PolyForm Noncommercial License 1.0.0**. By contributing code, documentation, or assets to Sideleaf, you agree that your contributions will be licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE) for noncommercial use.
