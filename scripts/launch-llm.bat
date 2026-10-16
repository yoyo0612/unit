@echo off
rem Double-click: start llama-server and open the chat page in the browser
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-llm.ps1"
if errorlevel 1 pause
