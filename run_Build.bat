@echo off
setlocal

cd /d "%~dp0"
set "ELECTRON_RUN_AS_NODE="

call npm run build
exit /b %ERRORLEVEL%
