# Contributing to Workpad

Thank you for your interest in improving Workpad!

## Design Principles

Before submitting a feature or code change, remember the core philosophy:

1. **Capture First, Structure Later**: Never introduce friction at the moment of capture.
2. **Local-First & Private**: Notes remain strictly on the user's machine. Never add network dependencies for core note operations.
3. **Keep Dependencies Minimal**: Evaluate bundle size and performance impact before proposing new npm dependencies.
4. **Keyboard-First**: All primary user flows must be accessible without reaching for a mouse.

## Development Workflow

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Run tests:
   ```bash
   npm test
   ```
5. Ensure production build succeeds:
   ```bash
   npm run build
   ```

## Pull Request Guidelines

- Write clean, self-documenting TypeScript with strict typing.
- Include unit tests for state mutations, search changes, or format parsers.
- Test both Dark and Light mode appearances.
- Verify accessibility (focus states, keyboard navigation).
