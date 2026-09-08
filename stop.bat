@echo off
setlocal enabledelayedexpansion
title Stopping QDS Services

echo ======================================================================
echo   Stopping QDS Threat Detection Framework Services...
echo ======================================================================
echo.

echo [1/2] Terminating processes on Port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo Stopping PID %%a...
    taskkill /F /T /PID %%a >nul 2>&1
)

echo [2/2] Terminating processes on Port 5173 (Frontend Dashboard)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Stopping PID %%a...
    taskkill /F /T /PID %%a >nul 2>&1
)

echo.
echo [OK] All QDS services on ports 8000 and 5173 have been terminated.
echo.
timeout /t 3 >nul
