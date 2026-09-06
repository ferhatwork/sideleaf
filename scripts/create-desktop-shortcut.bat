@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-desktop-shortcut.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Failed to create desktop shortcut.
)
echo.
pause
