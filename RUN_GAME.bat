@echo off
REM ============================================================
REM  IRON HERO launcher for Windows.
REM  Starts a tiny local web server (needed for smooth, reliable
REM  loading of the game's script files) and opens it in your
REM  default browser.
REM ============================================================

echo Starting IRON HERO...
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start "" http://localhost:8000/index.html
    python -m http.server 8000
    goto :eof
)

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start "" http://localhost:8000/index.html
    py -m http.server 8000
    goto :eof
)

echo Python was not found on this computer.
echo Opening index.html directly instead (this usually still works).
echo If the screen stays black, please install Python from:
echo   https://www.python.org/downloads/
echo and run this file again.
echo.
start "" index.html
pause
