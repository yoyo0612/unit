# llama-server を停止する
# 使い方: scripts\stop-llm.bat をダブルクリック
# llama-server.exe と、それを起動したサーバー用の PowerShell ウィンドウを閉じる。

$servers = Get-Process -Name "llama-server" -ErrorAction SilentlyContinue

if (-not $servers) {
    Write-Host "llama-server は起動していません。"
    exit 0
}

# 起動元の PowerShell（start-llm-server.ps1 を実行しているウィンドウ）も閉じる
$launchers = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
    Where-Object { $_.CommandLine -like "*start-llm-server.ps1*" }

$servers | Stop-Process -Force
Write-Host "llama-server を停止しました。"

foreach ($p in $launchers) {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
