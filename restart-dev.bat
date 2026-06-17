@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set PORT=3000

title MySteam Dev Server (auto-restart)
echo.
echo  MySteam dev server - auto-restart on crash
echo  http://localhost:%PORT%
echo  Close this window or press Ctrl+C to stop.
echo.

:restart
echo [%time%] Stopping anything on port %PORT%...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort %PORT% -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
timeout /t 1 /nobreak >nul

echo [%time%] Clearing .next cache...
if exist .next rmdir /s /q .next 2>nul
if exist node_modules\.cache rmdir /s /q node_modules\.cache 2>nul

echo [%time%] Starting Next.js...
echo.
call npx next dev --turbopack
echo.
echo [%time%] Server stopped. Restarting in 2 seconds...
timeout /t 2 /nobreak >nul
goto restart
