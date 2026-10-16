@echo off
rem ダブルクリックで llama-server を起動し、チャット画面をブラウザで開く
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-llm.ps1"
if errorlevel 1 pause
