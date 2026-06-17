@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set PORT=3000
set FAILURES=0

title MySteam Dev Server (auto-restart)

if not exist "package.json" (
  echo ERROR: package.json not found. Run restart-dev.bat from the MySteam project folder.
  pause
  exit /b 1
)

if not exist "src\app" if not exist "app" (
  echo ERROR: No src\app or app directory found in %CD%
  pause
  exit /b 1
)

if not exist "node_modules\next\package.json" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo  MySteam dev server - auto-restart on crash
echo  Project: %CD%
echo  http://localhost:%PORT%
echo  Close this window or press Ctrl+C to stop.
echo.

:restart
echo [%time%] Stopping anything on port %PORT%...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort %PORT% -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
timeout /t 1 /nobreak >nul

if !FAILURES! gtr 0 (
  echo [%time%] Clearing .next cache after crash...
  if exist .next rmdir /s /q .next 2>nul
  if exist node_modules\.cache rmdir /s /q node_modules\.cache 2>nul
)

echo [%time%] Starting Next.js...
echo.
call node_modules\.bin\next.cmd dev --turbopack
set EXIT_CODE=!ERRORLEVEL!
echo.

if !EXIT_CODE! equ 0 goto done

set /a FAILURES+=1
if !FAILURES! geq 5 (
  echo [%time%] Server failed !FAILURES! times in a row. Stopping loop.
  echo Check the error above ^(wrong folder, missing deps, etc.^).
  pause
  exit /b !EXIT_CODE!
)

echo [%time%] Server stopped ^(exit !EXIT_CODE!^). Restarting in 2 seconds... ^(!FAILURES!/5^)
timeout /t 2 /nobreak >nul
goto restart

:done
echo [%time%] Server exited cleanly.
pause
