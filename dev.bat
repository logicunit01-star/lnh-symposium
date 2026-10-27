@echo off
title LNH Symposium - development mode
cd /d "%~dp0"
if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"
if exist "%~dp0..\node\node.exe" set "PATH=%~dp0..\node;%PATH%"
rem Keep packages and the database up to date (safe to repeat; fast when nothing changed)
call npm install --no-audit --no-fund || (pause & exit /b 1)
call npm run db:setup || (echo [X] Database setup failed - see the error above. & pause & exit /b 1)
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3000"
call npm run dev
pause
