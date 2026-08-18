@echo off
title Hub Dashboard
echo ===================================================
echo   Iniciando tu Dashboard Hub Central...
echo ===================================================
cd /d "%~dp0"
call npm.cmd run dev
pause
