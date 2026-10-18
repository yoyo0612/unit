# Start the local Minecraft Java Edition server (127.0.0.1:25565)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\start-minecraft-server.ps1
#
# First run: set eula=true in minecraft-server\eula.txt (this means you accept the Mojang EULA).

param(
    [string]$Java = '',
    [string]$Memory = '4G'
)

$ErrorActionPreference = 'Stop'
$serverDir = Join-Path $PSScriptRoot '..\minecraft-server'
Set-Location $serverDir

# Minecraft 26.x needs Java 25 or later. If -Java is not given, use the Adoptium JDK 25.
if (-not $Java) {
    $found = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -ErrorAction SilentlyContinue |
        Where-Object Name -like 'jdk-25*' | Select-Object -First 1
    if (-not $found) { throw 'Java 25 not found. Install EclipseAdoptium.Temurin.25.JDK.' }
    $Java = Join-Path $found.FullName 'bin\java.exe'
}

if (-not (Select-String -Path 'eula.txt' -Pattern '^eula=true' -Quiet)) {
    throw 'Set eula=true in minecraft-server\eula.txt to accept the Mojang EULA first.'
}

Write-Host "Starting server on 127.0.0.1:25565 (memory $Memory)"
& $Java "-Xmx$Memory" "-Xms$Memory" -jar server.jar nogui
