@echo off
setlocal enabledelayedexpansion
title QDS Framework Launcher

set OPENBLAS_NUM_THREADS=1
set MKL_NUM_THREADS=1
set OMP_NUM_THREADS=1
set NUMEXPR_NUM_THREADS=1
set VECLIB_MAXIMUM_THREADS=1

cd /d "%~dp0"

echo ======================================================================
echo   Quantum-Inspired Cyber Threat Detection Framework (QDS)
echo   Initializing Launcher...
echo ======================================================================
echo.

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERR] Python is not detected in your system PATH.
    echo Please install Python 3.11+ or add it to PATH.
    echo.
    pause
    exit /b 1
)

python start.py %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERR] Launcher exited with code %ERRORLEVEL%.
    pause
)
