# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in Workpad, please report it responsibly by contacting the maintainers or opening a private security advisory on GitHub.

Please do not disclose security issues in public issue trackers before a fix is released.

## Security Architecture

1. **Local-Only Storage**: All user data is kept locally inside the browser's IndexedDB / LocalStorage sandbox.
2. **Zero Remote Telemetry**: Workpad communicates with zero analytics or backend tracking servers.
3. **Pasted Content Sanitization**: Arbitrary pasted HTML or JavaScript is sanitized to prevent cross-site scripting (XSS).
4. **Offline Resilience**: Offline caching is scoped strictly to application assets via Service Worker.
