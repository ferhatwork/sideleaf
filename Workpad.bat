@echo off
setlocal
title Workpad
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launcher.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Press any key to exit...
    pause >nul
)
