@echo off
setlocal
title LNH Symposium - Deploy online (Vercel + Neon)
cd /d "%~dp0"
if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"
if exist "%~dp0..\node\node.exe" set "PATH=%~dp0..\node;%PATH%"
where node >nul 2>nul || ( echo [X] Node.js not found. & pause & exit /b 1 )
set "VC=npx --yes vercel@latest"

echo ==================================================================
echo  STEP 1 of 5 - Sign in to Vercel (free account; a browser opens)
echo ==================================================================
call %VC% whoami >nul 2>nul || call %VC% login
if errorlevel 1 goto :err

echo.
echo ==================================================================
echo  STEP 2 of 5 - Create / link the Vercel project "lnh-symposium"
echo ==================================================================
call %VC% link --yes --project lnh-symposium
if errorlevel 1 goto :err

echo.
echo ==================================================================
echo  STEP 3 of 5 - Secure settings
echo ==================================================================
node scripts\deploy-env.mjs
if errorlevel 1 goto :err
for %%P in (AUTH_SECRET:auth CRON_SECRET:cron SEED_ADMIN_EMAIL:mail SEED_ADMIN_PASSWORD:pass PAYMENT_PROVIDER:pay) do (
  for /f "tokens=1,2 delims=:" %%A in ("%%P") do (
    call %VC% env rm %%A production --yes >nul 2>nul
    call %VC% env add %%A production < .vtmp_%%B >nul
    echo   set %%A
  )
)
del /q .vtmp_* >nul 2>nul

echo.
echo ==================================================================
echo  STEP 4 of 5 - Add the database (one-time, in the browser)
echo ==================================================================
echo  1. In the page that opens: Storage tab  ^>  Create Database  ^>  Neon (Serverless Postgres)
echo  2. Region: Singapore (closest to Karachi). Plan: Free.
echo  3. Connect it to the project "lnh-symposium" (all environments).
echo     This adds DATABASE_URL automatically.
start "" "https://vercel.com/dashboard/stores"
echo.
pause

echo.
echo ==================================================================
echo  STEP 5 of 5 - Build and publish (takes 2-4 minutes)
echo ==================================================================
call %VC% deploy --prod --yes
if errorlevel 1 goto :err

echo.
echo ==================================================================
echo  DONE! Your site is live at the "Production" / "Aliased" URL above
echo  (usually https://lnh-symposium.vercel.app). Admin: add /admin
echo  To publish changes later, just run deploy.bat again.
echo ==================================================================
pause
exit /b 0

:err
del /q .vtmp_* >nul 2>nul
echo.
echo [X] Something went wrong above. Copy the message and send it for help.
pause
exit /b 1
