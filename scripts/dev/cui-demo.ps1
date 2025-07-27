#!/usr/bin/env pwsh
# CUI Demo Script for PowerShell

Write-Host "🎮 Starting CUI Demo..." -ForegroundColor Cyan
Set-Location -Path (Split-Path -Parent $PSScriptRoot | Split-Path -Parent)
& tsx --tsconfig tsconfig.node.json src/cui/auto-demo.ts