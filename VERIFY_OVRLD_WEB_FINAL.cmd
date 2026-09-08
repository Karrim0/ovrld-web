@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (
  echo [ERROR] Node.js is not available in PATH.
  exit /b 1
)

where npm >nul 2>nul || (
  echo [ERROR] npm is not available in PATH.
  exit /b 1
)

echo [1/2] OVRLD V2 Phase 1-8 quality gate
call npm run phase8:check || exit /b 1

echo [2/2] Git whitespace check
git diff --check || exit /b 1

echo.
echo [OK] OVRLD V2 Phase 8 verification passed.
endlocal
