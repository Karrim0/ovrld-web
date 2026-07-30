@echo off
setlocal
cd /d "%~dp0"

echo [1/5] Verify OVRLD backend alignment and safe rename contract
call npm run verify:phase1
if errorlevel 1 exit /b 1

echo [2/5] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [3/5] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [4/5] Next.js production build
call npm run build
if errorlevel 1 exit /b 1

echo [5/5] Git whitespace check
git diff --check
if errorlevel 1 exit /b 1

echo.
echo [OK] OVRLD Web Phase 1 verification passed.
endlocal
