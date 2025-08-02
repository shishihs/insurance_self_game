@echo off
echo 🎮 Starting MCP Servers for Life Fulfillment Game...
echo =====================================

REM Get current directory
set PROJECT_DIR=%cd%

echo 📁 Project Directory: %PROJECT_DIR%
echo.

REM Start Filesystem MCP Server
echo Starting Filesystem MCP Server...
start /B npx -y @modelcontextprotocol/server-filesystem "%PROJECT_DIR%" "%PROJECT_DIR%\public\assets" "%PROJECT_DIR%\save-data"

echo.
echo ✅ MCP Servers started!
echo.
echo 📝 Available in:
echo    - VS Code (with MCP extension)
echo    - Cursor
echo    - Windsurf
echo    - Cline
echo.
echo Press Ctrl+C to stop the servers.
pause >nul