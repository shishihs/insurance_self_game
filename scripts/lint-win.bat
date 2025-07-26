@echo off
echo Running ESLint on Windows...
pnpm exec eslint . --fix
if %ERRORLEVEL% neq 0 (
    echo ESLint found issues. Please check the output above.
    exit /b %ERRORLEVEL%
) else (
    echo ESLint passed successfully!
)