@echo off
setlocal
cd /d "%~dp0"

rem A normal double-click starts the hidden launcher and immediately closes this
rem compatibility shim, so no command window remains open.
if "%~1"=="" (
    start "" /b powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0scripts\launcher.ps1" start
    exit /b 0
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launcher.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"
exit /b %EXIT_CODE%
