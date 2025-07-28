@echo off

echo 🔍 Pre-commit checks starting...

echo 📝 Running ESLint...
call pnpm run lint
if %errorlevel% neq 0 exit /b %errorlevel%

echo 🔬 Running TypeScript type check...
call pnpm run type-check
if %errorlevel% neq 0 exit /b %errorlevel%

echo 🧪 Running tests...
call pnpm run test:run -- --reporter=dot
if %errorlevel% neq 0 exit /b %errorlevel%

echo 🎨 Checking code formatting...
call pnpm run format
if %errorlevel% neq 0 exit /b %errorlevel%

echo ✅ All pre-commit checks passed!