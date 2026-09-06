#!/usr/bin/env bash
# Sideleaf - macOS & Linux Launcher
# Local-first launcher: detects node or python3, picks a free port on 127.0.0.1,
# opens the browser, and serves the static production build.

set -e

# Resolve repository root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
INDEX_PATH="$DIST_DIR/index.html"

if [ ! -f "$INDEX_PATH" ]; then
  echo ""
  echo "  Sideleaf could not start."
  echo "  Production build not found in: $DIST_DIR"
  echo "  Please run 'npm run build' first."
  echo ""
  exit 1
fi

# If Node.js is installed, use the cross-platform launcher
if command -v node > /dev/null 2>&1 && [ -f "$SCRIPT_DIR/scripts/launcher.mjs" ]; then
  exec node "$SCRIPT_DIR/scripts/launcher.mjs"
fi

# If Python 3 is installed, use Python's built-in HTTP server with loopback binding and SPA fallback
if command -v python3 > /dev/null 2>&1; then
  python3 - <<'EOF' "$DIST_DIR"
import sys, os, socket, socketserver, http.server, urllib.parse, subprocess

dist_dir = os.path.abspath(sys.argv[1])
index_file = os.path.join(dist_dir, "index.html")

# Find a free port on 127.0.0.1
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.bind(('127.0.0.1', 0))
port = sock.getsockname()[1]
sock.close()

class SPAServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=dist_dir, **kwargs)

    def do_GET(self):
        req_path = urllib.parse.unquote(self.path.split('?')[0].split('#')[0])
        # Prevent traversal
        if '..' in req_path:
            self.send_error(403, "Forbidden")
            return

        rel = req_path.lstrip('/')
        target = os.path.normpath(os.path.join(dist_dir, rel))

        if not target.startswith(dist_dir):
            self.send_error(403, "Forbidden")
            return

        # SPA fallback: if file does not exist and has no extension, serve index.html
        if not os.path.exists(target):
            _, ext = os.path.splitext(target)
            if not ext:
                self.path = '/index.html'

        return super().do_GET()

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def log_message(self, format, *args):
        # Quiet output
        pass

url = f"http://127.0.0.1:{port}/"
print(f"Sideleaf is running locally at {url}")
print("Press Ctrl+C to close this window when done.")

# Launch browser
if sys.platform == 'darwin':
    subprocess.Popen(['open', url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
else:
    subprocess.Popen(['xdg-open', url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', port), SPAServer) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
EOF
  exit 0
fi

echo ""
echo "  Sideleaf could not start."
echo "  Neither Node.js nor Python 3 was detected on this system."
echo "  Please install Node.js (https://nodejs.org) or Python 3 to run Sideleaf."
echo ""
exit 1
