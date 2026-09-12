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

$remindersJsonPath = Join-Path $runtimeDir "reminders.json"
$script:runtimeLocale = "tr"

function Send-SideleafNotification([string]$title, [string]$message, [string]$itemId, [string]$remId) {
    $launchUrl = if ([string]::IsNullOrWhiteSpace($itemId)) { 
        "$ORIGIN/__sideleaf/reminder-action?action=open&id=$remId" 
    } else { 
        "$ORIGIN/__sideleaf/reminder-action?action=open&id=$remId&item=$itemId" 
    }
    $openUrl = $launchUrl
    $snoozeUrl = "$ORIGIN/__sideleaf/reminder-action?action=snooze&id=$remId&item=$itemId"
    $dismissUrl = "$ORIGIN/__sideleaf/reminder-action?action=dismiss&id=$remId&item=$itemId"

    $isEn = ($script:runtimeLocale -eq "en")
    $openLabel = if ($isEn) { "Open in Sideleaf" } else { "Sideleaf'te A$([char]0x00E7)" }
    $snoozeLabel = if ($isEn) { "Snooze 10 min" } else { "10 dk Ertele" }
    $dismissLabel = if ($isEn) { "Dismiss" } else { "Kapat" }

    # 1. Try modern WinRT Toast Notification (Windows 10 / 11)
    try {
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

        $safeTitle = [System.Security.SecurityElement]::Escape($title)
        $safeMessage = [System.Security.SecurityElement]::Escape($message)
        $safeLaunch = [System.Security.SecurityElement]::Escape($launchUrl)
        $safeOpen = [System.Security.SecurityElement]::Escape($openUrl)
        $safeSnooze = [System.Security.SecurityElement]::Escape($snoozeUrl)
        $safeDismiss = [System.Security.SecurityElement]::Escape($dismissUrl)
        $safeOpenLabel = [System.Security.SecurityElement]::Escape($openLabel)
        $safeSnoozeLabel = [System.Security.SecurityElement]::Escape($snoozeLabel)
        $safeDismissLabel = [System.Security.SecurityElement]::Escape($dismissLabel)

        $template = @"
<toast scenario="reminder" activationType="protocol" launch="$safeLaunch">
    <visual>
        <binding template="ToastGeneric">
            <text>$safeTitle</text>
            <text>$safeMessage</text>
        </binding>
    </visual>
    <actions>
        <action content="$safeOpenLabel" arguments="$safeOpen" activationType="protocol"/>
        <action content="$safeSnoozeLabel" arguments="$safeSnooze" activationType="protocol"/>
        <action content="$safeDismissLabel" arguments="$safeDismiss" activationType="protocol"/>
    </actions>
    <audio src="ms-winsoundevent:Notification.Reminder" loop="false" />
</toast>
"@

        $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
        $xml.LoadXml($template)
        $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)

        $appId = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe"
        $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId)
        $notifier.Show($toast)
        return $true
    } catch {
        # 2. Fallback to System.Windows.Forms.NotifyIcon Balloon
        try {
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing
            $notify = New-Object System.Windows.Forms.NotifyIcon
            $notify.Icon = [System.Drawing.SystemIcons]::Information
            $notify.BalloonTipTitle = $title
            $notify.BalloonTipText = $message
            $notify.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
            $notify.Visible = $true
            $notify.ShowBalloonTip(5000)
            return $true
        } catch {
            return $false
        }
    }
}

function Set-RemProp($obj, [string]$propName, $value) {
    if ($obj -ne $null) {
        $obj | Add-Member -MemberType NoteProperty -Name $propName -Value $value -Force
    }
}

function Get-RuntimeReminders {
    if (Test-Path $remindersJsonPath) {
        try {
            $raw = [System.IO.File]::ReadAllText($remindersJsonPath, [System.Text.Encoding]::UTF8)
            if (-not [string]::IsNullOrWhiteSpace($raw)) {
                $parsed = $raw | ConvertFrom-Json
                if ($parsed) {
                    if ($parsed.locale) {
                        $script:runtimeLocale = [string]$parsed.locale
                    }
                    if ($parsed.reminders) {
                        $res = [System.Collections.ArrayList]@()
                        foreach ($r in $parsed.reminders) {
                            if ($r -is [PSCustomObject]) {
                                if (-not $r.PSObject.Properties['state']) {
                                    $r | Add-Member -MemberType NoteProperty -Name "state" -Value "pending" -Force
                                }
                                if (-not $r.PSObject.Properties['snoozedUntil']) {
                                    $r | Add-Member -MemberType NoteProperty -Name "snoozedUntil" -Value $null -Force
                                }
                                if (-not $r.PSObject.Properties['lastTriggeredAt']) {
                                    $r | Add-Member -MemberType NoteProperty -Name "lastTriggeredAt" -Value $null -Force
                                }
                            }
                            [void]$res.Add($r)
                        }
                        return $res
                    }
                }
            }
        } catch {}
    }
    return [System.Collections.ArrayList]@()
}

function Save-RuntimeReminders($remindersList, $locale = $null) {
    try {
        if (-not $locale) {
            $locale = $script:runtimeLocale
        }
        $payload = @{
            version   = 1
            updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            locale    = if ($locale) { $locale } else { "tr" }
            reminders = @($remindersList)
        }
        $json = $payload | ConvertTo-Json -Depth 5
        [System.IO.File]::WriteAllText($remindersJsonPath, $json, [System.Text.Encoding]::UTF8)
    } catch {}
}

function Calculate-NextOccurrenceMs($rem, [long]$fromMs) {
    try {
        $now = [DateTimeOffset]::FromUnixTimeMilliseconds($fromMs).LocalDateTime
        $timeStr = if ($rem.time) { [string]$rem.time } else { "09:00" }
        $parts = $timeStr.Split(":")
        $hour = [int]$parts[0]
        $minute = if ($parts.Length -gt 1) { [int]$parts[1] } else { 0 }

        if ($rem.type -eq "daily") {
            $candidate = [DateTime]::new($now.Year, $now.Month, $now.Day, $hour, $minute, 0)
            if ($candidate -le $now) {
                $candidate = $candidate.AddDays(1)
            }
            return [DateTimeOffset]::new($candidate).ToUnixTimeMilliseconds()
        }

        if ($rem.type -eq "weekly") {
            $wDays = if ($rem.weekdays) { [int[]]$rem.weekdays } else { @(1) }
            for ($offset = 0; $offset -le 7; $offset++) {
                $candidate = [DateTime]::new($now.Year, $now.Month, $now.Day, $hour, $minute, 0).AddDays($offset)
                $isoDay = if ($candidate.DayOfWeek -eq [DayOfWeek]::Sunday) { 7 } else { [int]$candidate.DayOfWeek }
                if ($wDays -contains $isoDay) {
                    if ($candidate -gt $now) {
                        return [DateTimeOffset]::new($candidate).ToUnixTimeMilliseconds()
                    }
                }
            }
            $fallback = [DateTime]::new($now.Year, $now.Month, $now.Day, $hour, $minute, 0).AddDays(7)
            return [DateTimeOffset]::new($fallback).ToUnixTimeMilliseconds()
        }
    } catch {}
    return $null
}

function Check-And-Fire-DueReminders {
    if (-not $script:activeReminders -or $script:activeReminders.Count -eq 0) {
        $script:activeReminders = Get-RuntimeReminders
    }
    if (-not $script:activeReminders -or $script:activeReminders.Count -eq 0) { return }

    $nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $changed = $false

    foreach ($rem in $script:activeReminders) {
        try {
            if ($rem.enabled -ne $true) { continue }

            $state = if ($rem.state) { [string]$rem.state } else { "pending" }

            # Check recurring rollover if fired previously and a new cycle has arrived
            if ($rem.type -ne "once" -and $state -eq "fired") {
                $nextCycle = Calculate-NextOccurrenceMs $rem $rem.lastTriggeredAt
                if ($nextCycle -and $nowMs -ge $nextCycle) {
                    Set-RemProp $rem "scheduledAt" $nextCycle
                    $state = "pending"
                    Set-RemProp $rem "state" "pending"
                    Set-RemProp $rem "snoozedUntil" $null
                    $changed = $true
                }
            }

            # Check snoozed state
            if ($state -eq "snoozed") {
                if ($rem.snoozedUntil -and $nowMs -ge [long]$rem.snoozedUntil) {
                    # Snooze period expired, re-trigger
                    Set-RemProp $rem "snoozedUntil" $null
                    # will be fired below
                } else {
                    # Still snoozing
                    continue
                }
            } elseif ($state -eq "fired") {
                # Already fired for this occurrence; do not duplicate notification loop
                continue
            } elseif ($state -eq "dismissed" -or $state -eq "acknowledged") {
                continue
            } else {
                # Pending
                if ([long]$rem.scheduledAt -gt $nowMs) { continue }
                if ($rem.lastTriggeredAt -and [long]$rem.lastTriggeredAt -ge [long]$rem.scheduledAt) { continue }
            }

            # Trigger notification
            $itemId = if ($rem.itemId) { [string]$rem.itemId } else { "" }
            $remId = if ($rem.id) { [string]$rem.id } else { "" }
            $isEn = ($script:runtimeLocale -eq "en")
            $bullet = [char]0x2022
            $iDotless = [char]0x0131
            $title = if ($isEn) { "Sideleaf • Reminder" } else { "Sideleaf $bullet Hat${iDotless}rlat${iDotless}c${iDotless}" }
            $msg = if ($rem.itemContent) { [string]$rem.itemContent } else { if ($isEn) { "Reminder" } else { "Hat${iDotless}rlat${iDotless}c${iDotless}" } }

            [void](Send-SideleafNotification $title $msg $itemId $remId)

            Set-RemProp $rem "lastTriggeredAt" $nowMs
            Set-RemProp $rem "state" "fired"
            $changed = $true
        } catch {}
    }

    if ($changed) {
        Save-RuntimeReminders $script:activeReminders
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

    $script:activeReminders = Get-RuntimeReminders
    $script:lastReminderCheck = [DateTime]::MinValue
    $asyncContext = $listener.BeginGetContext($null, $null)

    try {
        while ($listener.IsListening) {
            $hasReq = $false
            try {
                $hasReq = $asyncContext.AsyncWaitHandle.WaitOne(1000)
            } catch {
                break
            }

            # Periodic check for due reminders even when browser is closed
            if ((Get-Date) -gt $script:lastReminderCheck.AddSeconds(3)) {
                $script:lastReminderCheck = Get-Date
                [void](Check-And-Fire-DueReminders)
            }

            if (-not $hasReq) {
                continue
            }

            $context = $null
            try {
                $context = $listener.EndGetContext($asyncContext)
            } catch {
                break
            }

            # Re-arm listener for next request immediately
            $asyncContext = $listener.BeginGetContext($null, $null)

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

                # Internal local API: /__sideleaf/reminders
                if ($unescaped -eq "/__sideleaf/reminders") {
                    $reqHost = $request.Headers["Host"]
                    $origin = $request.Headers["Origin"]
                    $referer = $request.Headers["Referer"]
                    $secSite = $request.Headers["Sec-Fetch-Site"]

                    $validHost = ($reqHost -eq "127.0.0.1:$PORT" -or $reqHost -eq "localhost:$PORT")
                    $validOrigin = ([string]::IsNullOrEmpty($origin) -or $origin -eq $ORIGIN -or $origin -eq "http://localhost:$PORT")
                    $validReferer = ([string]::IsNullOrEmpty($referer) -or $referer.StartsWith($PREFIX) -or $referer.StartsWith("http://localhost:$PORT/"))
                    $validSecSite = ([string]::IsNullOrEmpty($secSite) -or $secSite -eq "same-origin" -or $secSite -eq "none")

                    if (-not ($validHost -and $validOrigin -and $validReferer -and $validSecSite)) {
                        $response.StatusCode = 403
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
                        $response.ContentType = "text/plain; charset=utf-8"
                        $response.ContentLength64 = $bytes.Length
                        $response.OutputStream.Write($bytes, 0, $bytes.Length)
                        continue
                    }

                    if ($request.HttpMethod -eq "GET") {
                        $content = if (Test-Path $remindersJsonPath) {
                            [System.IO.File]::ReadAllText($remindersJsonPath, [System.Text.Encoding]::UTF8)
                        } else {
                            '{"version":1,"updatedAt":null,"reminders":[]}'
                        }
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
                        $response.StatusCode = 200
                        $response.ContentType = "application/json; charset=utf-8"
                        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                        $response.Headers.Add("X-Sideleaf-Server", "1")
                        $response.ContentLength64 = $bytes.Length
                        $response.OutputStream.Write($bytes, 0, $bytes.Length)
                        continue
                    } elseif ($request.HttpMethod -eq "PUT" -or $request.HttpMethod -eq "POST") {
                        $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                        $body = $reader.ReadToEnd()
                        $reader.Close()

                        try {
                            $parsed = $body | ConvertFrom-Json
                            if ($parsed -and $parsed.reminders -ne $null) {
                                if ($parsed.locale) {
                                    $script:runtimeLocale = [string]$parsed.locale
                                }

                                $existingMap = @{}
                                if ($script:activeReminders) {
                                    foreach ($old in $script:activeReminders) {
                                        if ($old.id) {
                                            $existingMap[[string]$old.id] = $old
                                        }
                                    }
                                }

                                $newReminders = [System.Collections.ArrayList]@()
                                foreach ($newRem in $parsed.reminders) {
                                    $remIdStr = if ($newRem.id) { [string]$newRem.id } else { "" }
                                    if ($remIdStr -and $existingMap.ContainsKey($remIdStr)) {
                                        $oldRem = $existingMap[$remIdStr]
                                        if ([long]$oldRem.scheduledAt -eq [long]$newRem.scheduledAt) {
                                            if ($oldRem.snoozedUntil -and -not $newRem.snoozedUntil) {
                                                $newRem | Add-Member -MemberType NoteProperty -Name "snoozedUntil" -Value $oldRem.snoozedUntil -Force
                                            }
                                            if ($oldRem.state -and -not $newRem.state) {
                                                $newRem | Add-Member -MemberType NoteProperty -Name "state" -Value $oldRem.state -Force
                                            }
                                            if ($oldRem.lastTriggeredAt -and -not $newRem.lastTriggeredAt) {
                                                $newRem | Add-Member -MemberType NoteProperty -Name "lastTriggeredAt" -Value $oldRem.lastTriggeredAt -Force
                                            }
                                        }
                                    }
                                    if (-not $newRem.state) {
                                        $newRem | Add-Member -MemberType NoteProperty -Name "state" -Value "pending" -Force
                                    }
                                    [void]$newReminders.Add($newRem)
                                }

                                $script:activeReminders = $newReminders
                                Save-RuntimeReminders $script:activeReminders $script:runtimeLocale
                            }
                        } catch {}

                        $respText = '{"ok":true}'
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes($respText)
                        $response.StatusCode = 200
                        $response.ContentType = "application/json; charset=utf-8"
                        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                        $response.Headers.Add("X-Sideleaf-Server", "1")
                        $response.ContentLength64 = $bytes.Length
                        $response.OutputStream.Write($bytes, 0, $bytes.Length)
                        continue
                    }
                }

                # Internal local API: /__sideleaf/reminder-action
                if ($unescaped -eq "/__sideleaf/reminder-action") {
                    $reqHost = $request.Headers["Host"]
                    $origin = $request.Headers["Origin"]
                    $referer = $request.Headers["Referer"]
                    $secSite = $request.Headers["Sec-Fetch-Site"]

                    $validHost = ($reqHost -eq "127.0.0.1:$PORT" -or $reqHost -eq "localhost:$PORT")
                    $validOrigin = ([string]::IsNullOrEmpty($origin) -or $origin -eq $ORIGIN -or $origin -eq "http://localhost:$PORT")
                    $validReferer = ([string]::IsNullOrEmpty($referer) -or $referer.StartsWith($PREFIX) -or $referer.StartsWith("http://localhost:$PORT/"))
                    $validSecSite = ([string]::IsNullOrEmpty($secSite) -or $secSite -eq "same-origin" -or $secSite -eq "none")

                    if (-not ($validHost -and $validOrigin -and $validReferer -and $validSecSite)) {
                        $response.StatusCode = 403
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
                        $response.ContentType = "text/plain; charset=utf-8"
                        $response.ContentLength64 = $bytes.Length
                        $response.OutputStream.Write($bytes, 0, $bytes.Length)
                        continue
                    }

                    $action = $request.QueryString["action"]
                    $remId = $request.QueryString["id"]
                    $itemId = $request.QueryString["item"]

                    if (-not $script:activeReminders -or $script:activeReminders.Count -eq 0) {
                        $script:activeReminders = Get-RuntimeReminders
                    }

                    $targetRem = $null
                    if ($remId -and $script:activeReminders) {
                        foreach ($r in $script:activeReminders) {
                            if ($r.id -eq $remId) {
                                $targetRem = $r
                                break
                            }
                        }
                    }

                    $nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                    $isEn = ($script:runtimeLocale -eq "en")

                    if ($action -eq "snooze") {
                        if ($targetRem) {
                            Set-RemProp $targetRem "snoozedUntil" ($nowMs + (10 * 60 * 1000))
                            Set-RemProp $targetRem "state" "snoozed"
                            Set-RemProp $targetRem "enabled" $true
                            Save-RuntimeReminders $script:activeReminders
                        }

                        $isJson = ($request.Headers["Accept"] -and $request.Headers["Accept"].Contains("application/json")) -or ($request.Headers["X-Sideleaf-Client"] -ne $null)
                        if ($isJson) {
                            $respJson = @{ ok = $true; action = "snooze"; id = $remId; snoozedUntil = if ($targetRem) { $targetRem.snoozedUntil } else { $null } } | ConvertTo-Json
                            $bytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                            $response.StatusCode = 200
                            $response.ContentType = "application/json; charset=utf-8"
                            $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                            $response.Headers.Add("X-Sideleaf-Server", "1")
                            $response.ContentLength64 = $bytes.Length
                            $response.OutputStream.Write($bytes, 0, $bytes.Length)
                            continue
                        }

                        $cardTitle = "Sideleaf"
                        $cardMsg = if ($isEn) { "Reminder snoozed for 10 minutes." } else { "Hat$([char]0x0131)rlat$([char]0x0131)c$([char]0x0131) 10 dakika ertelendi." }
                        $closeBtn = if ($isEn) { "Close" } else { "Kapat" }
                        $html = @"
<!DOCTYPE html>
<html lang="$(if ($isEn) { "en" } else { "tr" })">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sideleaf</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa; color: #18181b; }
  .card { text-align: center; padding: 24px 32px; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e4e4e7; max-width: 360px; width: 90%; }
  h2 { margin: 0 0 8px 0; font-size: 17px; font-weight: 600; color: #09090b; }
  p { margin: 0 0 16px 0; font-size: 14px; color: #71717a; }
  .btn { display: inline-block; padding: 6px 16px; border-radius: 6px; background: #f4f4f5; color: #18181b; font-size: 13px; font-weight: 500; border: 1px solid #e4e4e7; cursor: pointer; }
  .btn:hover { background: #e4e4e7; }
  @media (prefers-color-scheme: dark) {
    body { background: #121214; color: #f4f4f5; }
    .card { background: #18181b; border-color: #27272a; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
    h2 { color: #fafafa; }
    p { color: #a1a1aa; }
    .btn { background: #27272a; color: #f4f4f5; border-color: #3f3f46; }
    .btn:hover { background: #3f3f46; }
  }
</style>
</head>
<body>
<div class="card">
  <h2>$cardTitle</h2>
  <p>$cardMsg</p>
  <button class="btn" onclick="window.close()">$closeBtn</button>
</div>
<script>
  setTimeout(function() { try { window.close(); } catch(e){} }, 2000);
</script>
</body>
</html>
"@
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes($html)
                        $response.StatusCode = 200
                        $response.ContentType = "text/html; charset=utf-8"
                        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                        $response.Headers.Add("X-Sideleaf-Server", "1")
                        $response.ContentLength64 = $bytes.Length
                        $response.OutputStream.Write($bytes, 0, $bytes.Length)
                        continue
                    }

                    if ($action -eq "dismiss") {
                        if ($targetRem) {
                            Set-RemProp $targetRem "snoozedUntil" $null
                            Set-RemProp $targetRem "state" "dismissed"
                            if ($targetRem.type -eq "once") {
                                Set-RemProp $targetRem "enabled" $false
                            } else {
                                $nextMs = Calculate-NextOccurrenceMs $targetRem $nowMs
                                if ($nextMs) {
                                    Set-RemProp $targetRem "scheduledAt" $nextMs
                                    Set-RemProp $targetRem "state" "pending"
                                    Set-RemProp $targetRem "lastTriggeredAt" $null
                                } else {
                                    Set-RemProp $targetRem "enabled" $false
                                }
                            }
                            Save-RuntimeReminders $script:activeReminders
                        }

                        $isJson = ($request.Headers["Accept"] -and $request.Headers["Accept"].Contains("application/json")) -or ($request.Headers["X-Sideleaf-Client"] -ne $null)
                        if ($isJson) {
                            $respJson = @{ ok = $true; action = "dismiss"; id = $remId; state = if ($targetRem) { $targetRem.state } else { $null } } | ConvertTo-Json
                            $bytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                            $response.StatusCode = 200
                            $response.ContentType = "application/json; charset=utf-8"
                            $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                            $response.Headers.Add("X-Sideleaf-Server", "1")
                            $response.ContentLength64 = $bytes.Length
                            $response.OutputStream.Write($bytes, 0, $bytes.Length)
                            continue
                        }

                        $cardTitle = "Sideleaf"
                        $cardMsg = if ($isEn) { "Reminder dismissed." } else { "Hat$([char]0x0131)rlat$([char]0x0131)c$([char]0x0131) kapat$([char]0x0131)ld$([char]0x0131)." }
                        $closeBtn = if ($isEn) { "Close" } else { "Kapat" }
                        $html = @"
<!DOCTYPE html>
<html lang="$(if ($isEn) { "en" } else { "tr" })">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sideleaf</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa; color: #18181b; }
  .card { text-align: center; padding: 24px 32px; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e4e4e7; max-width: 360px; width: 90%; }
  h2 { margin: 0 0 8px 0; font-size: 17px; font-weight: 600; color: #09090b; }
  p { margin: 0 0 16px 0; font-size: 14px; color: #71717a; }
  .btn { display: inline-block; padding: 6px 16px; border-radius: 6px; background: #f4f4f5; color: #18181b; font-size: 13px; font-weight: 500; border: 1px solid #e4e4e7; cursor: pointer; }
  .btn:hover { background: #e4e4e7; }
  @media (prefers-color-scheme: dark) {
    body { background: #121214; color: #f4f4f5; }
    .card { background: #18181b; border-color: #27272a; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
    h2 { color: #fafafa; }
    p { color: #a1a1aa; }
    .btn { background: #27272a; color: #f4f4f5; border-color: #3f3f46; }
    .btn:hover { background: #3f3f46; }
  }
</style>
</head>
<body>
<div class="card">
  <h2>$cardTitle</h2>
  <p>$cardMsg</p>
  <button class="btn" onclick="window.close()">$closeBtn</button>
</div>
<script>
  setTimeout(function() { try { window.close(); } catch(e){} }, 2000);
</script>
</body>
</html>
"@
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes($html)
                        $response.StatusCode = 200
                        $response.ContentType = "text/html; charset=utf-8"
                        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                        $response.Headers.Add("X-Sideleaf-Server", "1")
                        $response.ContentLength64 = $bytes.Length
                        $response.OutputStream.Write($bytes, 0, $bytes.Length)
                        continue
                    }

                    if ($action -eq "open") {
                        if ($targetRem) {
                            Set-RemProp $targetRem "state" "acknowledged"
                            Set-RemProp $targetRem "snoozedUntil" $null
                            if ($targetRem.type -eq "once") {
                                Set-RemProp $targetRem "enabled" $false
                            } else {
                                $nextMs = Calculate-NextOccurrenceMs $targetRem $nowMs
                                if ($nextMs) {
                                    Set-RemProp $targetRem "scheduledAt" $nextMs
                                    Set-RemProp $targetRem "state" "pending"
                                    Set-RemProp $targetRem "lastTriggeredAt" $null
                                } else {
                                    Set-RemProp $targetRem "enabled" $false
                                }
                            }
                            Save-RuntimeReminders $script:activeReminders
                        }

                        $targetRedirect = if ([string]::IsNullOrWhiteSpace($itemId)) { "/" } else { "/?item=$itemId" }
                        $response.StatusCode = 302
                        $response.Headers.Add("Location", $targetRedirect)
                        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                        $response.Headers.Add("X-Sideleaf-Server", "1")
                        $response.ContentLength64 = 0
                        $response.Close()
                        continue
                    }

                    $response.StatusCode = 400
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes("400 Bad Request")
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
        # Server termination or error
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
