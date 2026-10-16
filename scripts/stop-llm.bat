@echo off
rem ダブルクリックで llama-server を停止する
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-llm.ps1"
pause
