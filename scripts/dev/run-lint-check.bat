@echo off
echo === ESLint Check ===
call pnpm lint
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ESLint failed!
    pause
    exit /b %ERRORLEVEL%
)

echo === TypeScript Check ===
call pnpm type-check
if %ERRORLEVEL% NEQ 0 (
    echo ❌ TypeScript check failed!
    pause
    exit /b %ERRORLEVEL%
)

echo ✅ All checks passed!
pause