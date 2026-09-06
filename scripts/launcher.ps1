# Sideleaf - Windows PowerShell Launcher
# Local-first, zero-dependency launcher (No Node.js or npm required)
# Strict 127.0.0.1 loopback binding, automatic port selection, SPA fallback, traversal prevention

$ErrorActionPreference = "Stop"

# Resolve dist directory relative to this script
$rootDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$distDir = Join-Path $rootDir "dist"
if (-not (Test-Path $distDir)) {
    $distDir = Join-Path $PSScriptRoot "dist"
}

$indexPath = Join-Path $distDir "index.html"
if (-not (Test-Path $indexPath)) {
    Write-Host ""
    Write-Host "  Sideleaf could not start." -ForegroundColor Red
    Write-Host "  Production build directory not found: $distDir" -ForegroundColor Yellow
    Write-Host "  Please build Sideleaf first (e.g. npm run build) before launching." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Press any key to exit..."
    [Console]::ReadKey($true) | Out-Null
    exit 1
}

# Ensure canonical path with trailing separator for traversal checks
$distCanonical = [System.IO.Path]::GetFullPath($distDir)
if (-not $distCanonical.EndsWith([System.IO.Path]::DirectorySeparatorChar.ToString())) {
    $distCanonical += [System.IO.Path]::DirectorySeparatorChar
}

# Find a free local ephemeral port on 127.0.0.1
try {
    $tcpListener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback, 0)
    $tcpListener.Start()
    $port = ($tcpListener.LocalEndpoint).Port
    $tcpListener.Stop()
}
catch {
    Write-Host ""
    Write-Host "  Sideleaf could not start." -ForegroundColor Red
    Write-Host "  Failed to allocate a local port: $_" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    [Console]::ReadKey($true) | Out-Null
    exit 1
}

# Initialize HttpListener bound strictly to 127.0.0.1
$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
}
catch {
    Write-Host ""
    Write-Host "  Sideleaf could not start." -ForegroundColor Red
    Write-Host "  Another local service may be using port $port or permissions are restricted." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    [Console]::ReadKey($true) | Out-Null
    exit 1
}

# MIME Types Map
$mimeTypes = @{
    ".html"        = "text/html; charset=utf-8"
    ".htm"         = "text/html; charset=utf-8"
    ".js"          = "application/javascript; charset=utf-8"
    ".mjs"         = "application/javascript; charset=utf-8"
    ".css"         = "text/css; charset=utf-8"
    ".json"        = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json; charset=utf-8"
    ".svg"         = "image/svg+xml"
    ".png"         = "image/png"
    ".jpg"         = "image/jpeg"
    ".jpeg"        = "image/jpeg"
    ".gif"         = "image/gif"
    ".ico"         = "image/x-icon"
    ".webp"        = "image/webp"
    ".txt"         = "text/plain; charset=utf-8"
    ".wasm"        = "application/wasm"
    ".woff"        = "font/woff"
    ".woff2"       = "font/woff2"
    ".ttf"         = "font/ttf"
    ".eot"         = "application/vnd.ms-fontobject"
    ".map"         = "application/json; charset=utf-8"
}

# Launch browser to local URL
try {
    Start-Process $prefix
}
catch {
    # If Start-Process fails, the user will still see the URL below
}

Write-Host "Sideleaf is running locally at http://127.0.0.1:$port/"
Write-Host "Press Ctrl+C to close this window when done."

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $rawUrl = $request.Url.AbsolutePath
            $unescaped = [System.Uri]::UnescapeDataString($rawUrl)

            # Security: Path traversal prevention
            if ($unescaped.Contains("..") -or $rawUrl.Contains("..")) {
                $response.StatusCode = 403
                $bytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
                $response.ContentType = "text/plain; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                continue
            }

            # Map to dist folder
            $relPath = $unescaped.TrimStart('/')
            if ([string]::IsNullOrEmpty($relPath)) {
                $relPath = "index.html"
            }

            $normalizedRel = $relPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $targetPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($distCanonical, $normalizedRel))

            # Security: Must strictly stay inside dist canonical path
            if (-not $targetPath.StartsWith($distCanonical, [System.StringComparison]::OrdinalIgnoreCase)) {
                $response.StatusCode = 403
                $bytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
                $response.ContentType = "text/plain; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                continue
            }

            # Directory index handling
            if ([System.IO.Directory]::Exists($targetPath)) {
                $targetPath = [System.IO.Path]::Combine($targetPath, "index.html")
            }

            # SPA fallback: if file does not exist and has no extension, serve index.html
            if (-not [System.IO.File]::Exists($targetPath)) {
                $ext = [System.IO.Path]::GetExtension($targetPath)
                if ([string]::IsNullOrEmpty($ext)) {
                    $targetPath = $indexPath
                }
            }

            # If still not found, return 404
            if (-not [System.IO.File]::Exists($targetPath)) {
                $response.StatusCode = 404
                $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.ContentType = "text/plain; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                continue
            }

            # Determine MIME type
            $ext = [System.IO.Path]::GetExtension($targetPath).ToLowerInvariant()
            $contentType = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $contentType = $mimeTypes[$ext]
            }

            $response.StatusCode = 200
            $response.ContentType = $contentType
            $response.Headers.Add("X-Content-Type-Options", "nosniff")

            if ($ext -eq ".html" -or $ext -eq ".htm") {
                $response.Headers.Add("Cache-Control", "no-cache")
            } else {
                $response.Headers.Add("Cache-Control", "public, max-age=31536000")
            }

            if ($request.HttpMethod -ne "HEAD") {
                $fileBytes = [System.IO.File]::ReadAllBytes($targetPath)
                $response.ContentLength64 = $fileBytes.Length
                $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            } else {
                $fileInfo = New-Object System.IO.FileInfo ($targetPath)
                $response.ContentLength64 = $fileInfo.Length
            }
        }
        catch {
            # Catch transient socket or client abort errors
        }
        finally {
            try {
                $response.OutputStream.Close()
            }
            catch {}
            try {
                $response.Close()
            }
            catch {}
        }
    }
}
catch [System.Net.HttpListenerException] {
    # Normal shutdown when listener is stopped
}
catch {
    # Clean shutdown on interrupt
}
finally {
    if ($listener -ne $null) {
        if ($listener.IsListening) {
            $listener.Stop()
        }
        $listener.Close()
    }
}
