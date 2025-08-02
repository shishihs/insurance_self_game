@echo off

echo 🔍 Pre-commit checks starting...

echo 🛡️ Running security audits...
call npm audit --audit-level moderate || echo ⚠️ Security vulnerabilities detected, but continuing...

echo 📝 Running ESLint with security rules...
call pnpm run lint
if %errorlevel% neq 0 exit /b %errorlevel%

echo 🔬 Running TypeScript type check...
call pnpm run type-check
if %errorlevel% neq 0 exit /b %errorlevel%

echo 🔒 Running security tests...
call pnpm run test:run src/__tests__/security -- --reporter=dot
if %errorlevel% neq 0 exit /b %errorlevel%

echo 🧪 Running core tests...
call pnpm run test:run -- --reporter=dot --testTimeout=10000
if %errorlevel% neq 0 exit /b %errorlevel%

echo 🎨 Checking code formatting...
call pnpm run format
if %errorlevel% neq 0 exit /b %errorlevel%

echo ✅ All pre-commit checks passed!