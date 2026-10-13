@echo off
title LNH Symposium - development mode
cd /d "%~dp0"
if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"
if exist "%~dp0..\node\node.exe" set "PATH=%~dp0..\node;%PATH%"
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3000"
call npm run dev
pause
