@echo off
setlocal
cd /d "%~dp0"

echo ==============================
echo origin-monitor update helper
echo ==============================
echo.

git status --short
echo.

set /p COMMIT_MSG=Enter commit message (default: update site): 
if "%COMMIT_MSG%"=="" set COMMIT_MSG=update site

echo.
echo [1/3] git add .
git add .
if errorlevel 1 goto :error

echo.
echo [2/3] git commit -m "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
  echo.
  echo No new commit created. If nothing changed, this is expected.
)

echo.
echo [3/3] git push
git push
if errorlevel 1 goto :error

echo.
echo Done. Your GitHub repo and Pages site should update shortly.
pause
exit /b 0

:error
echo.
echo Upload failed. Check the error above.
pause
exit /b 1
