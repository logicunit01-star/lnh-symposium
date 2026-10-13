@echo off
setlocal
title LNH Symposium - Setup
cd /d "%~dp0"

rem Use a portable Node.js if it was placed next to the project (..\node or .\node)
if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"
if exist "%~dp0..\node\node.exe" set "PATH=%~dp0..\node;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js was not found. Install Node.js 20+ from https://nodejs.org and run this again.
  pause & exit /b 1
)
for /f %%v in ('node -v') do echo Using Node.js %%v

if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  rem generate random secrets
  node -e "const fs=require('fs'),c=require('crypto');let s=fs.readFileSync('.env','utf8');s=s.replace(/AUTH_SECRET=.*/,'AUTH_SECRET=\"'+c.randomBytes(32).toString('hex')+'\"').replace(/CRON_SECRET=.*/,'CRON_SECRET=\"'+c.randomBytes(16).toString('hex')+'\"');fs.writeFileSync('.env',s)"
  echo [OK] Created .env
)

echo.
echo [1/4] Installing packages (first time takes a few minutes)...
call npm install
if errorlevel 1 goto :err

echo.
echo [2/4] Creating database and default data...
call npm run db:setup
if errorlevel 1 goto :err

echo.
set /p DEMO="[3/4] Add FAKE demo registrations/abstracts/feedback for testing? (y/N): "
if /i "%DEMO%"=="y" call npm run db:demo

echo.
echo [4/4] Building the website...
call npm run build
if errorlevel 1 goto :err

echo.
echo ===========================================================
echo  Setup complete. Double-click start.bat to run the website.
echo  Admin login: admin@lnh.edu.pk / ChangeMe!2026  (change it!)
echo ===========================================================
pause
exit /b 0

:err
echo.
echo [X] Something went wrong above. Copy the error and send it for help.
pause
exit /b 1
