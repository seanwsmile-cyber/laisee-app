@echo off
cd /d "%~dp0"
echo Development preview only. Use the production deployment in README.md for the public site.
echo Start the local server first with start-local.bat.
if exist "%~dp0cloudflared.exe" (
  "%~dp0cloudflared.exe" tunnel --url http://127.0.0.1:8765
) else (
  cloudflared tunnel --url http://127.0.0.1:8765
)
pause
