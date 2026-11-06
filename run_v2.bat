@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

if not exist node_modules (
  echo Installing dependencies...
  call "C:\Program Files\nodejs\npm.cmd" install --legacy-peer-deps
)

echo Starting StatementHub v2 on http://localhost:3000 ...
call "C:\Program Files\nodejs\npm.cmd" run dev
