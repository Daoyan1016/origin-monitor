@echo off
cd /d "%~dp0"
title Start Origin Monitor
call start_monitor_stack.bat
timeout /t 3 >nul
start http://localhost:8080/
