@echo off
REM MySteam Dev Server Tool — double-click or run from terminal
cd /d "%~dp0"
node scripts/devctl.mjs %*
