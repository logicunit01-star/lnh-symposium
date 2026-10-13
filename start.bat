@echo off
title LNH Symposium - running on http://localhost:3000
cd /d "%~dp0"
if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"
if exist "%~dp0..\node\node.exe" set "PATH=%~dp0..\node;%PATH%"
if not exist ".env" ( echo Run setup.bat first. & pause & exit /b 1 )
if not exist ".next\BUILD_ID" ( call npm run build || (pause & exit /b 1) )
echo Starting... the browser will open at http://localhost:3000  (close this window to stop)
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"
call npm start
pause
