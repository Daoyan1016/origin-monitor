@echo off
cd /d "%~dp0"
start "Origin Monitor Local Server" cmd /k run_local_site.bat
start "Origin Monitor Data Sync" cmd /k start_sync_data.bat
echo Started local site and live data sync.
echo Then open cpolar and expose localhost:8080
