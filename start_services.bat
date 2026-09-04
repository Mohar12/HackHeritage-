@echo off
cd /d "%~dp0"
echo Starting QDS Threat Detection Backend on port 8000...
start "QDS_Backend" python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
echo Starting QDS React Dashboard on port 5173...
start "QDS_Frontend" /d "%~dp0dashboard" cmd /c "npm run dev"
echo Both services launched successfully.
