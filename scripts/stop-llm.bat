@echo off
rem Double-click: stop llama-server and its launcher window
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-llm.ps1"
pause
