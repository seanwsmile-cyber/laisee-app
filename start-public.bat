@echo off
REM Starts the laisee server (if not running) and a Cloudflare quick tunnel.
cd /d "%~dp0"
powershell -NoProfile -Command "if(-not (Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)){Start-Process -WindowStyle Hidden -FilePath node -ArgumentList 'server.mjs' -WorkingDirectory '%~dp0' -RedirectStandardOutput '%~dp0server.log' -RedirectStandardError '%~dp0server.err.log'}"
powershell -NoProfile -Command "Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force"
if exist "%~dp0cloudflared.log" del "%~dp0cloudflared.log"
powershell -NoProfile -Command "Start-Process -WindowStyle Hidden -FilePath '%~dp0cloudflared.exe' -ArgumentList 'tunnel','--no-autoupdate','--url','http://127.0.0.1:8765','--logfile','%~dp0cloudflared.log'"
echo Waiting for public URL...
timeout /t 10 /nobreak >nul
powershell -NoProfile -Command "Select-String -Path '%~dp0cloudflared.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1 | ForEach-Object { $_.Matches[0].Value }"
pause
