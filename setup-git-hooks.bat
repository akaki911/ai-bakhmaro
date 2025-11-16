@echo off
REM Setup Git hooks for Windows
echo Setting up Git hooks...
git config core.hooksPath .githooks
if %errorlevel% == 0 (
    echo Git hooks configured successfully!
    echo Hooks directory: .githooks
    echo.
    echo Pre-commit hook will now run before each commit.
) else (
    echo Failed to configure Git hooks
    exit /b 1
)
