@echo off
title ID Card Generator - SMKN CIPATUJAH
cd /d "%~dp0"
echo ========================================================
echo       MEMULAI WEB ID CARD STUDIO SMKN CIPATUJAH
echo ========================================================
echo.
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python tidak terdeteksi. Silakan install Python 3 terlebih dahulu.
    pause
    exit /b
)

echo Menjalankan server lokal...
python server.py
pause

