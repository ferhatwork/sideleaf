@echo off
setlocal
title Sideleaf
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launcher.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"
if %EXIT_CODE% neq 0 (
    if "%~1"=="" (
        echo.
        echo Press any key to exit...
        pause >nul
    )
)
exit /b %EXIT_CODE%
