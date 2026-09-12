# Sideleaf - Windows PowerShell Production Launcher & Runtime Manager
# Strict 127.0.0.1:47321 loopback binding, single-instance management, zero-dependency

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status", "doctor", "server", "")]
    [string]$Command = "start",

    [switch]$Foreground,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

# Configuration constants
$PORT = 47321
$HOST_IP = "127.0.0.1"
$ORIGIN = "http://${HOST_IP}:${PORT}"
$PREFIX = "http://${HOST_IP}:${PORT}/"

# Resolve directories
$rootDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$distDir = Join-Path $rootDir "dist"
$indexPath = Join-Path $distDir "index.html"
$buildInfoPath = Join-Path $distDir "build-info.json"

# Resolve runtime directory (%LOCALAPPDATA%\Sideleaf)
$localAppData = $env:LOCALAPPDATA
if ([string]::IsNullOrWhiteSpace($localAppData)) {
    $runtimeDir = Join-Path $env:USERPROFILE ".sideleaf"
} else {
    $runtimeDir = Join-Path $localAppData "Sideleaf"
}

if (-not (Test-Path $runtimeDir)) {
    try {
        New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
    } catch {}
}

$runtimeJsonPath = Join-Path $runtimeDir "runtime.json"

# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

function Get-LocalBuildInfo {
    if (Test-Path $buildInfoPath) {
        try {
            $raw = Get-Content $buildInfoPath -Raw -ErrorAction SilentlyContinue
            return ($raw | ConvertFrom-Json)
        } catch {}
    }
    return $null
}

function Get-RuntimeMetadata {
    if (Test-Path $runtimeJsonPath) {
        try {
            $raw = Get-Content $runtimeJsonPath -Raw -ErrorAction SilentlyContinue
            if (-not [string]::IsNullOrWhiteSpace($raw)) {
                return ($raw | ConvertFrom-Json)
            }
        } catch {}
    }
    return $null
}

function Save-RuntimeMetadata([int]$processId, $buildInfo) {
    $data = @{
        pid       = $processId
        port      = $PORT
        host      = $HOST_IP
        root      = $rootDir
        startedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        version   = if ($buildInfo -and $buildInfo.version) { $buildInfo.version } else { "1.0.0" }
        builtAt   = if ($buildInfo -and $buildInfo.builtAt) { $buildInfo.builtAt } else { $null }
        commit    = if ($buildInfo -and $buildInfo.commit) { $buildInfo.commit } else { $null }
    }
    $json = $data | ConvertTo-Json -Compress
    Set-Content -Path $runtimeJsonPath -Value $json -Force
}

function Remove-RuntimeMetadata {
    if (Test-Path $runtimeJsonPath) {
        try {
            Remove-Item -Path $runtimeJsonPath -Force -ErrorAction SilentlyContinue
        } catch {}
    }
}

function Get-PortOccupantPid {
    try {
        $conn = Get-NetTCPConnection -LocalAddress $HOST_IP -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) {
            return $conn.OwningProcess
        }
    } catch {}
    return $null
}

function Test-SideleafProcessOwnership([int]$targetPid) {
    if ($targetPid -le 4) { return $false }
    try {
        $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
        if (-not $proc) { return $false }

        # Check process name
        $name = $proc.ProcessName.ToLowerInvariant()
        if ($name -ne "powershell" -and $name -ne "pwsh" -and $name -ne "node") {
            return $false
        }

        # Inspect CommandLine via WMI / CIM
        try {
            $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $targetPid" -ErrorAction SilentlyContinue
            if ($cim -and $cim.CommandLine) {
                $cmd = $cim.CommandLine.ToLowerInvariant()
                $rootNorm = $rootDir.ToLowerInvariant()
                if ($cmd.Contains("launcher.ps1") -or $cmd.Contains("launcher.mjs") -or $cmd.Contains($rootNorm)) {
                    return $true
                }
            }
        } catch {}

        # Fallback: check runtime.json match
        $meta = Get-RuntimeMetadata
        if ($meta -and $meta.pid -eq $targetPid) {
            return $true
        }
    } catch {}
    return $false
}

function Test-SideleafHttpHandshake {
    try {
        $req = [System.Net.HttpWebRequest]::Create("${ORIGIN}/build-info.json")
        $req.Timeout = 1200
        $req.Method = "GET"
        $resp = $req.GetResponse()
        $isSideleafHeader = ($resp.Headers["X-Sideleaf-Server"] -eq "1")

        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
        $resp.Close()

        $isSideleafBody = ($body -and $body.Contains('"name": "Sideleaf"'))
        if ($isSideleafHeader -or $isSideleafBody) {
            try {
                $parsed = $body | ConvertFrom-Json
                return @{ isSideleaf = $true; buildInfo = $parsed }
            } catch {
                return @{ isSideleaf = $true; buildInfo = $null }
            }
        }
    } catch {}
    return @{ isSideleaf = $false; buildInfo = $null }
}

# ---------------------------------------------------------------------------
# Command Implementations
# ---------------------------------------------------------------------------

function Invoke-Stop([switch]$Quiet) {
    $meta = Get-RuntimeMetadata
    $occupantPid = Get-PortOccupantPid
    $stoppedAny = $false

    # 1. Stop process recorded in runtime.json if verified
    if ($meta -and $meta.pid) {
        $rPid = [int]$meta.pid
        if (Test-SideleafProcessOwnership $rPid) {
            try {
                Stop-Process -Id $rPid -Force -ErrorAction SilentlyContinue
                $stoppedAny = $true
            } catch {}
        }
    }

    # 2. If port is still occupied, verify if it belongs to Sideleaf before touching (never touch PID <= 4)
    $occupantPid = Get-PortOccupantPid
    if ($occupantPid -and $occupantPid -gt 4) {
        if (Test-SideleafProcessOwnership $occupantPid) {
            try {
                Stop-Process -Id $occupantPid -Force -ErrorAction SilentlyContinue
                $stoppedAny = $true
            } catch {}
        } else {
            # Double check via HTTP handshake
            $handshake = Test-SideleafHttpHandshake
            if ($handshake.isSideleaf) {
                try {
                    Stop-Process -Id $occupantPid -Force -ErrorAction SilentlyContinue
                    $stoppedAny = $true
                } catch {}
            }
        }
    }

    Remove-RuntimeMetadata

    # Wait for port to be released (up to 2 seconds)
    $waited = 0
    while ((Get-PortOccupantPid) -and ($waited -lt 20)) {
        Start-Sleep -Milliseconds 100
        $waited++
    }

    if (-not $Quiet) {
        if ($stoppedAny) {
            Write-Host "Sideleaf has been stopped." -ForegroundColor Green
        } else {
            Write-Host "Sideleaf is not running." -ForegroundColor Gray
        }
    }
}

function Invoke-Status {
    $meta = Get-RuntimeMetadata
    $occupantPid = Get-PortOccupantPid
    $handshake = Test-SideleafHttpHandshake

    $isSideleaf = $false
    if ($occupantPid) {
        $isSideleaf = (Test-SideleafProcessOwnership $occupantPid) -or $handshake.isSideleaf
    } elseif ($handshake.isSideleaf) {
        $isSideleaf = $true
    }

    if ($isSideleaf) {
        $bInfo = if ($handshake.buildInfo) { $handshake.buildInfo } else { $meta }
        $displayPid = if ($meta -and $meta.pid -and (Test-SideleafProcessOwnership $meta.pid)) { [int]$meta.pid } else { $occupantPid }
        Write-Host ""
        Write-Host "Sideleaf is running" -ForegroundColor Green
        Write-Host ""
        Write-Host "  PID:       $displayPid"
        Write-Host "  URL:       $ORIGIN"
        if ($bInfo) {
            if ($bInfo.version) { Write-Host "  Version:   $($bInfo.version)" }
            if ($bInfo.builtAt) { Write-Host "  Built:     $($bInfo.builtAt)" }
            if ($bInfo.commit)  { Write-Host "  Commit:    $($bInfo.commit)" }
        }
        if ($meta -and $meta.root) {
            Write-Host "  Directory: $($meta.root)"
        }
        Write-Host ""
        return
    } elseif ($occupantPid) {
        try {
            $proc = Get-Process -Id $occupantPid -ErrorAction SilentlyContinue
            $pName = if ($proc) { $proc.ProcessName } else { "Unknown" }
        } catch { $pName = "Unknown" }
        Write-Host ""
        Write-Host "Port $PORT is occupied by another application (PID: $occupantPid, Name: $pName)." -ForegroundColor Yellow
        Write-Host "Sideleaf is not running on this port." -ForegroundColor Gray
        Write-Host ""
        return
    }

    # Stale metadata cleanup
    if ($meta -and $meta.pid) {
        Remove-RuntimeMetadata
        Write-Host "Sideleaf is not running (cleaned stale runtime metadata)." -ForegroundColor Gray
        return
    }

    Write-Host "Sideleaf is not running." -ForegroundColor Gray
}

function Invoke-Doctor {
    Write-Host ""
    Write-Host "=== Sideleaf Diagnostics & Doctor ===" -ForegroundColor Cyan
    Write-Host ""

    # 1. Dist index.html
    if (Test-Path $indexPath) {
        Write-Host "  [OK] Production build exists: $distDir" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Production build missing: index.html not found in $distDir" -ForegroundColor Red
        Write-Host "         Run 'npm run build' to generate the production assets." -ForegroundColor Yellow
    }

    # 2. Build metadata
    $localBuild = Get-LocalBuildInfo
    if ($localBuild) {
        $commitStr = if ($localBuild.commit) { $localBuild.commit } else { "none" }
        Write-Host "  [OK] Build metadata valid (v$($localBuild.version), built: $($localBuild.builtAt), commit: $commitStr)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Build metadata missing: $buildInfoPath" -ForegroundColor Yellow
        Write-Host "         Run 'npm run build' to generate build-info.json." -ForegroundColor Gray
    }

    # 3. Runtime directory
    if (Test-Path $runtimeDir) {
        Write-Host "  [OK] Runtime directory writable: $runtimeDir" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Runtime directory could not be accessed: $runtimeDir" -ForegroundColor Red
    }

    # 4. Port state
    $occupantPid = Get-PortOccupantPid
    $handshake = Test-SideleafHttpHandshake
    $meta = Get-RuntimeMetadata
    $isSideleaf = $false

    if ($occupantPid) {
        $isSideleaf = (Test-SideleafProcessOwnership $occupantPid) -or $handshake.isSideleaf
        if ($isSideleaf) {
            $displayPid = if ($meta -and $meta.pid -and (Test-SideleafProcessOwnership $meta.pid)) { [int]$meta.pid } else { $occupantPid }
            Write-Host "  [OK] Port $PORT bound to verified Sideleaf server (PID: $displayPid)" -ForegroundColor Green
        } else {
            try {
                $proc = Get-Process -Id $occupantPid -ErrorAction SilentlyContinue
                $pName = if ($proc) { $proc.ProcessName } else { "Unknown" }
            } catch { $pName = "Unknown" }
            Write-Host "  [FAIL] Port $PORT occupied by foreign process (PID: $occupantPid, Name: $pName)" -ForegroundColor Red
            Write-Host "         Sideleaf will not terminate foreign processes. Free port $PORT to proceed." -ForegroundColor Yellow
        }
    } elseif ($handshake.isSideleaf) {
        $isSideleaf = $true
        $displayPid = if ($meta -and $meta.pid -and (Test-SideleafProcessOwnership $meta.pid)) { [int]$meta.pid } else { "unknown" }
        Write-Host "  [OK] Port $PORT bound to verified Sideleaf server (PID: $displayPid)" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Port $PORT is available" -ForegroundColor Green
    }

    # 5. HTTP response and build match
    if ($isSideleaf) {
        Write-Host "  [OK] Sideleaf HTTP server responding on $ORIGIN" -ForegroundColor Green
        if ($localBuild -and $handshake.buildInfo) {
            if ($localBuild.builtAt -eq $handshake.buildInfo.builtAt) {
                Write-Host "  [OK] Served build matches current local dist build" -ForegroundColor Green
            } else {
                Write-Host "  [WARN] Served build ($($handshake.buildInfo.builtAt)) differs from local dist ($($localBuild.builtAt))" -ForegroundColor Yellow
                Write-Host "         Run 'Sideleaf.bat restart' to serve the newest build." -ForegroundColor Gray
            }
        }
    }

    # 6. Service worker and PWA manifest
    $swPath = Join-Path $distDir "sw.js"
    $manifestPath = Join-Path $distDir "manifest.webmanifest"
    if (Test-Path $swPath) {
        Write-Host "  [OK] Offline Service Worker present: dist/sw.js" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Service Worker missing in dist/sw.js" -ForegroundColor Yellow
    }
    if (Test-Path $manifestPath) {
        Write-Host "  [OK] PWA Web Manifest present: dist/manifest.webmanifest" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] PWA Manifest missing in dist/manifest.webmanifest" -ForegroundColor Yellow
    }

    Write-Host ""
}

function Invoke-Start {
    # 1. Verify build exists
    if (-not (Test-Path $indexPath)) {
        Write-Host ""
        Write-Host "  Sideleaf could not start." -ForegroundColor Red
        Write-Host "  Production build not found in: $distDir" -ForegroundColor Yellow
        Write-Host "  Please build Sideleaf first (e.g. npm run build) before launching." -ForegroundColor Gray
        Write-Host ""
        exit 1
    }

    $localBuild = Get-LocalBuildInfo
    $occupantPid = Get-PortOccupantPid
    $handshake = Test-SideleafHttpHandshake
    $meta = Get-RuntimeMetadata

    # 2. Check if already running on port 47321
    $isSideleafRunning = $false
    if ($occupantPid) {
        $isSideleafRunning = (Test-SideleafProcessOwnership $occupantPid) -or $handshake.isSideleaf
        if (-not $isSideleafRunning) {
            # Foreign process occupant -> NEVER KILL
            try {
                $proc = Get-Process -Id $occupantPid -ErrorAction SilentlyContinue
                $pName = if ($proc) { $proc.ProcessName } else { "Unknown" }
            } catch { $pName = "Unknown" }

            Write-Host ""
            Write-Host "  [FAIL] Port $PORT is occupied by another application." -ForegroundColor Red
            Write-Host "  Process: $pName (PID: $occupantPid)" -ForegroundColor Yellow
            Write-Host "  Sideleaf will NOT terminate foreign processes." -ForegroundColor Gray
            Write-Host "  Please close the conflicting application or free port $PORT." -ForegroundColor Gray
            Write-Host ""
            exit 1
        }
    } elseif ($handshake.isSideleaf) {
        $isSideleafRunning = $true
    }

    if ($isSideleafRunning) {
        # Check if it is running the CURRENT build
        $isSameBuild = $false
        if ($localBuild -and $handshake.buildInfo -and $localBuild.builtAt -eq $handshake.buildInfo.builtAt) {
            $isSameBuild = $true
        }

        $displayPid = if ($meta -and $meta.pid -and (Test-SideleafProcessOwnership $meta.pid)) { [int]$meta.pid } else { $occupantPid }
        if ($isSameBuild) {
            Write-Host "Sideleaf is already running (PID: $displayPid) at $ORIGIN" -ForegroundColor Green
            if (-not $NoBrowser) {
                try { Start-Process $ORIGIN } catch {}
            }
            return
        } else {
            # Older build detected -> stop cleanly before starting new build
            Write-Host "Older Sideleaf instance running. Stopping to serve newest build..." -ForegroundColor Yellow
            Invoke-Stop -Quiet
            Start-Sleep -Milliseconds 300
        }
    } else {
        # Port is free, but check stale runtime metadata
        Remove-RuntimeMetadata
    }

    # 3. Start Sideleaf Server
    if ($Foreground) {
        Run-HttpServer
        return
    }

    # Start detached background process using CIM / WMI to avoid console lifetime binding
    $launcherPath = Join-Path $PSScriptRoot "launcher.ps1"
    $cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcherPath`" server"
    try {
        $wmiRes = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
            CommandLine      = $cmd
            CurrentDirectory = $rootDir
        }
        if ($wmiRes.ReturnValue -ne 0) {
            Write-Host "Failed to launch background server process (WMI ReturnValue: $($wmiRes.ReturnValue))" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "Failed to launch background server process: $_" -ForegroundColor Red
        exit 1
    }

    # 4. Readiness polling loop (up to 10 seconds, polling every 200ms)
    $ready = $false
    $attempts = 0
    $maxAttempts = 50

    while ($attempts -lt $maxAttempts) {
        Start-Sleep -Milliseconds 200
        $check = Test-SideleafHttpHandshake
        if ($check.isSideleaf) {
            $ready = $true
            break
        }
        $attempts++
    }

    if (-not $ready) {
        Write-Host ""
        Write-Host "  Sideleaf failed to start or did not respond within 10 seconds." -ForegroundColor Red
        Write-Host "  Run 'Sideleaf.bat doctor' to diagnose." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }

    $activeMeta = Get-RuntimeMetadata
    $activePid = if ($activeMeta -and $activeMeta.pid -and (Test-SideleafProcessOwnership $activeMeta.pid)) { [int]$activeMeta.pid } else { Get-PortOccupantPid }

    Write-Host ""
    Write-Host "Sideleaf started successfully." -ForegroundColor Green
    Write-Host "  PID:   $activePid" -ForegroundColor Gray
    Write-Host "  URL:   $ORIGIN" -ForegroundColor Cyan
    if ($localBuild -and $localBuild.builtAt) {
        $commitStr = if ($localBuild.commit) { $localBuild.commit } else { "no-git" }
        Write-Host "  Build: $($localBuild.builtAt) ($commitStr)" -ForegroundColor Gray
    }
    Write-Host ""

    if (-not $NoBrowser) {
        try { Start-Process $ORIGIN } catch {}
    }
}

# ---------------------------------------------------------------------------
# Background HTTP Server Engine
# ---------------------------------------------------------------------------

function Run-HttpServer {
    if (-not (Test-Path $indexPath)) {
        exit 1
    }

    $distCanonical = [System.IO.Path]::GetFullPath($distDir)
    if (-not $distCanonical.EndsWith([System.IO.Path]::DirectorySeparatorChar.ToString())) {
        $distCanonical += [System.IO.Path]::DirectorySeparatorChar
    }

    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($PREFIX)

    try {
        $listener.Start()
    } catch {
        exit 1
    }

    $localBuild = Get-LocalBuildInfo
    Save-RuntimeMetadata $PID $localBuild

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
        ".map"         = "application/json; charset=utf-8"
    }

    $buildHeaderVal = if ($localBuild -and $localBuild.builtAt) { $localBuild.builtAt } else { "unknown" }

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

                $ext = [System.IO.Path]::GetExtension($targetPath).ToLowerInvariant()
                $contentType = "application/octet-stream"
                if ($mimeTypes.ContainsKey($ext)) {
                    $contentType = $mimeTypes[$ext]
                }

                $response.StatusCode = 200
                $response.ContentType = $contentType
                $response.Headers.Add("X-Content-Type-Options", "nosniff")
                $response.Headers.Add("X-Sideleaf-Server", "1")
                $response.Headers.Add("X-Sideleaf-Build", $buildHeaderVal)

                # Cache control:
                # - No-cache for HTML, Service Worker, and build metadata (instant updates)
                # - Long immutable cache for hashed static bundles
                $isDynamicFile = ($ext -eq ".html" -or $ext -eq ".htm" -or $targetPath.EndsWith("sw.js") -or $targetPath.EndsWith("build-info.json"))
                if ($isDynamicFile) {
                    $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                } else {
                    $response.Headers.Add("Cache-Control", "public, max-age=31536000, immutable")
                }

                if ($request.HttpMethod -ne "HEAD") {
                    $fileBytes = [System.IO.File]::ReadAllBytes($targetPath)
                    $response.ContentLength64 = $fileBytes.Length
                    $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
                } else {
                    $fileInfo = New-Object System.IO.FileInfo ($targetPath)
                    $response.ContentLength64 = $fileInfo.Length
                }
            } catch {
                # Transient client abort or socket reset
            } finally {
                try { $response.OutputStream.Close() } catch {}
                try { $response.Close() } catch {}
            }
        }
    } catch {
        # Shutdown or loop termination
    } finally {
        if ($listener -ne $null) {
            try {
                if ($listener.IsListening) { $listener.Stop() }
                $listener.Close()
            } catch {}
        }
        Remove-RuntimeMetadata
    }
}

# ---------------------------------------------------------------------------
# CLI Command Dispatcher
# ---------------------------------------------------------------------------

$cmdNormalized = if ([string]::IsNullOrWhiteSpace($Command)) { "start" } else { $Command.ToLowerInvariant() }

switch ($cmdNormalized) {
    "start"   { Invoke-Start }
    "stop"    { Invoke-Stop }
    "restart" { Invoke-Stop -Quiet; Start-Sleep -Milliseconds 300; Invoke-Start }
    "status"  { Invoke-Status }
    "doctor"  { Invoke-Doctor }
    "server"  { Run-HttpServer }
    default   {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Usage: Sideleaf.bat [start | stop | restart | status | doctor]" -ForegroundColor Yellow
        exit 1
    }
}
