@echo off
echo ========================================
echo Git Configuration for WordPecker
echo ========================================
echo.

echo [1/2] Setting commit message template...
git config commit.template .gitmessage
if errorlevel 1 (
    echo [ERROR] Failed to set commit template
    pause
    exit /b 1
)
echo [OK] Commit template configured

echo.
echo [2/2] Testing configuration...
git config --get commit.template
if errorlevel 1 (
    echo [ERROR] Configuration verification failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Configuration Complete!
echo ========================================
echo.
echo Next time you commit, you'll see the template:
echo   git commit
echo.
echo Or commit with message directly:
echo   git commit -m "mobile: add word list page"
echo.
echo Commit message format:
echo   ^<type^>(^<scope^>): ^<subject^>
echo.
echo Examples:
echo   mobile: add word list page
echo   mobile(ui): implement learning mode
echo   mobile(db): setup drift database
echo   web: update word card component
echo   backend: add quiz generation endpoint
echo   shared: add new templates
echo   docs: update architecture diagram
echo.
pause
