@echo off
cd /d "%~dp0"
title Origin Monitor Local Server
echo Starting local site at http://localhost:8080/
python -m http.server 8080
