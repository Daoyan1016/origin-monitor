@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process python -WorkingDirectory '%~dp0' -ArgumentList '-m','http.server','8080'"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process python -WorkingDirectory '%~dp0' -ArgumentList 'sync_live_data.py','--interval','60'"
echo Started local site and live data sync.
echo Then open cpolar and expose localhost:8080
