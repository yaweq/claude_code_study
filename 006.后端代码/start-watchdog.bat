@echo off
rem 每日记账后端守护脚本：崩溃自动重启
cd /d "%~dp0"
echo [FinanceBackend] starting server...
:loop
node server.js
echo [FinanceBackend] server exited (code %errorlevel%), restarting in 3s...
timeout /t 3 /nobreak >nul
goto loop
