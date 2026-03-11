@echo off
cd /d "%~dp0"
title Origin Monitor Data Sync
echo Starting live data sync loop...
py sync_live_data.py --interval 60
