@echo off
cd /d "%~dp0"
set PORT=8765
set "NODE_EXE=node"
if exist "%~dp0node\node.exe" (
  set "NODE_EXE=%~dp0node\node.exe"
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo Node.js was not found. Install Node.js 22 or newer, then reopen this file.
    echo https://nodejs.org/
    pause
    exit /b 1
  )
)
netstat -ano | findstr /R /C:":8765 .*LISTENING" >nul
if errorlevel 1 (
  start "laisee-server" /min cmd /c ""%NODE_EXE%" server.mjs 1>server.out.log 2>server.err.log"
  timeout /t 2 /nobreak >nul
)
start "" http://127.0.0.1:8765/
