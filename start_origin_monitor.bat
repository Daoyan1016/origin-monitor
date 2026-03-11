@echo off
cd /d "d:\我的\codex\26.3.10 lgns监测网页"
title Start Origin Monitor
start "Origin Monitor Service" cmd.exe /k "cd /d d:\我的\codex\26.3.10 lgns监测网页 && python serve_monitor.py"
timeout /t 5 >nul
start http://localhost:8080/
