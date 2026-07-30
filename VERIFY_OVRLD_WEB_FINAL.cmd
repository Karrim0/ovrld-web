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

echo [1/7] Verify Phase 1 backend alignment
call npm run verify:phase1 || exit /b 1

echo [2/7] Verify Phase 2 functional repair
call npm run verify:phase2 || exit /b 1

echo [3/7] Verify Phase 3 final release contract
call npm run verify:phase3 || exit /b 1

echo [4/7] TypeScript
call npm run typecheck || exit /b 1

echo [5/7] ESLint
call npm run lint || exit /b 1

echo [6/7] Next.js production build
call npm run build || exit /b 1

echo [7/7] Git whitespace check
git diff --check || exit /b 1

echo.
echo [OK] OVRLD Web final release verification passed.
endlocal
