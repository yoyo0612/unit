# Start the LLM-driven Minecraft bot (requires the server and llama-server to be running)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\start-minecraft-bot.ps1 [-Name LLMBot]

param(
    [string]$Name = 'LLMBot'
)

$ErrorActionPreference = 'Stop'
$botDir = Join-Path $PSScriptRoot '..\minecraft-bot'
Set-Location $botDir

if (-not (Test-Path 'node_modules')) { npm install --silent }

Write-Host "Starting bot '$Name' (server 127.0.0.1:25565, LLM 127.0.0.1:8080)"
node bot.js $Name
