@echo off
title 高考志愿填报助手
echo Starting server...
cd /d %~dp0
start http://localhost:8080
python -m http.server 8080
pause
