@echo off
echo Building production files...
call pnpm type-check
if %errorlevel% neq 0 (
    echo Type check failed!
    exit /b %errorlevel%
)
call pnpm vite build
if %errorlevel% neq 0 (
    echo Build failed!
    exit /b %errorlevel%
)
echo Build completed successfully!
echo Check the ./dist folder for output files.