Write-Host "Running ESLint on Windows with PowerShell..." -ForegroundColor Green

# Change to project directory
Set-Location "C:\Users\shish\Workspace\insurance_game"

try {
    # Try direct node execution first
    Write-Host "Attempting to run ESLint directly via node..." -ForegroundColor Cyan
    
    # Find the ESLint executable
    $eslintPath = ".\node_modules\.bin\eslint.cmd"
    if (Test-Path $eslintPath) {
        Write-Host "Found ESLint at: $eslintPath" -ForegroundColor Green
        $output = & cmd /c "$eslintPath . --fix" 2>&1
    } else {
        Write-Host "ESLint not found locally, trying global pnpm..." -ForegroundColor Yellow
        $output = & cmd /c "pnpm exec eslint . --fix" 2>&1
    }
    
    Write-Host "ESLint output:" -ForegroundColor Yellow
    Write-Host $output
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "ESLint passed successfully!" -ForegroundColor Green
    } else {
        Write-Host "ESLint found issues. Exit code: $LASTEXITCODE" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error running ESLint: $_" -ForegroundColor Red
    exit 1
}