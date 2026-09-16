# Sideleaf - Create Desktop Shortcut Script
# Creates a unique, hidden PowerShell shortcut for the current build.

$ErrorActionPreference = "Stop"

$rootDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$launcherPath = Join-Path $rootDir "scripts\launcher.ps1"

if (-not (Test-Path $launcherPath)) {
    Write-Host "Error: launcher.ps1 not found at $launcherPath" -ForegroundColor Red
    exit 1
}

# Resolve user Desktop path
$desktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktopPath "Sideleaf-Guncel.lnk"
$powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source

# Locate icon (prefers dist/icon.ico, then public/icon.ico, then root icon.ico)
$iconPath = Join-Path $rootDir "dist\icon.ico"
if (-not (Test-Path $iconPath)) {
    $iconPath = Join-Path $rootDir "public\icon.ico"
}
if (-not (Test-Path $iconPath)) {
    $iconPath = Join-Path $rootDir "icon.ico"
}

try {
    $wscript = New-Object -ComObject WScript.Shell
    $shortcut = $wscript.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $powershellPath
    $shortcut.Arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcherPath`" start"
    $shortcut.WorkingDirectory = $rootDir
    $shortcut.Description = "Sideleaf - Local-First Work Surface"

    if (Test-Path $iconPath) {
        $shortcut.IconLocation = "$iconPath,0"
    }

    $shortcut.Save()

    Write-Host ""
    Write-Host "  Sideleaf current desktop shortcut created successfully!" -ForegroundColor Green
    Write-Host "  Location: $shortcutPath" -ForegroundColor Gray
    Write-Host "  Target:   $powershellPath (hidden launcher)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "Error creating desktop shortcut: $_" -ForegroundColor Red
    exit 1
}
