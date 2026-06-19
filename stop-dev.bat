@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set PORT=3000
title MySteam - Stop Dev Server

echo.
echo  MySteam - stopping dev servers
echo  Project: %CD%
echo.

echo Stopping restart-dev.bat windows...
powershell -NoProfile -Command ^
  "$root = '%CD:\=\\%';" ^
  "Get-CimInstance Win32_Process -Filter \"Name = 'cmd.exe'\" -ErrorAction SilentlyContinue |" ^
  "Where-Object { $_.CommandLine -and $_.CommandLine -match 'restart-dev\.bat' -and $_.CommandLine -match [regex]::Escape($root) } |" ^
  "ForEach-Object { Write-Host ('  Stopped restart-dev window (PID ' + $_.ProcessId + ')'); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo Stopping Next.js dev processes in this project...
powershell -NoProfile -Command ^
  "$root = '%CD:\=\\%';" ^
  "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" -ErrorAction SilentlyContinue |" ^
  "Where-Object { $_.CommandLine -and $_.CommandLine -match 'next' -and $_.CommandLine -match [regex]::Escape($root) } |" ^
  "ForEach-Object { Write-Host ('  Stopped node (PID ' + $_.ProcessId + ')'); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

for %%P in (%PORT% 3001) do (
  echo Stopping anything on port %%P...
  powershell -NoProfile -Command ^
    "Get-NetTCPConnection -LocalPort %%P -ErrorAction SilentlyContinue |" ^
    "Select-Object -ExpandProperty OwningProcess -Unique |" ^
    "ForEach-Object { if ($_ -and $_ -ne 0) { Write-Host ('  Stopped PID ' + $_ + ' on port %%P'); Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"
)

echo.
echo All dev servers stopped.
echo.
pause
