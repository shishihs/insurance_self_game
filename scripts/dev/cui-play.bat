@echo off
echo 🎮 Starting CUI Game Play...
cd /d "%~dp0..\.."
tsx --tsconfig tsconfig.node.json src/cui/cli.ts play