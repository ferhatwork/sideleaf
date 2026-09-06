# Sideleaf - Create Desktop Shortcut Script
# Creates a Sideleaf shortcut on the current user's desktop pointing to Sideleaf.bat

$ErrorActionPreference = "Stop"

$rootDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$batPath = Join-Path $rootDir "Sideleaf.bat"

if (-not (Test-Path $batPath)) {
    Write-Host "Error: Sideleaf.bat not found at $batPath" -ForegroundColor Red
    exit 1
}

# Resolve user Desktop path
$desktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktopPath "Sideleaf.lnk"

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
    $shortcut.TargetPath = $batPath
    $shortcut.WorkingDirectory = $rootDir
    $shortcut.Description = "Sideleaf - Local-First Work Surface"

    if (Test-Path $iconPath) {
        $shortcut.IconLocation = "$iconPath,0"
    }

    $shortcut.Save()

    Write-Host ""
    Write-Host "  Sideleaf desktop shortcut created successfully!" -ForegroundColor Green
    Write-Host "  Location: $shortcutPath" -ForegroundColor Gray
    Write-Host "  Target:   $batPath" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "Error creating desktop shortcut: $_" -ForegroundColor Red
    exit 1
}
