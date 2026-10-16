# llama-server を起動し、準備ができたらブラウザでチャット画面を開く
# 使い方: scripts\launch-llm.bat をダブルクリック（引数は start-llm-server.ps1 にそのまま渡す）
# 既に起動している場合はサーバーは起動せず、ブラウザだけ開く。

param(
    [int]$Port = 8080,
    [int]$TimeoutSec = 180
)

$url = "http://127.0.0.1:$Port"
$health = "$url/health"
$serverScript = Join-Path $PSScriptRoot "start-llm-server.ps1"

function Test-Server {
    try {
        $res = Invoke-WebRequest -Uri $health -UseBasicParsing -TimeoutSec 2
        return $res.StatusCode -eq 200
    } catch {
        return $false
    }
}

if (Test-Server) {
    Write-Host "llama-server は既に起動しています。ブラウザを開きます。"
} else {
    Write-Host "llama-server を起動しています（モデル読み込みに数十秒かかります）..."
    # サーバーは別ウィンドウで動かす。止めるにはそのウィンドウで Ctrl+C
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$serverScript`"", "-Port", $Port
    ) | Out-Null

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while (-not (Test-Server)) {
        if ((Get-Date) -gt $deadline) {
            Write-Host "時間内に起動しませんでした。サーバーのウィンドウでエラーを確認してください。"
            Read-Host "Enter で終了"
            exit 1
        }
        Start-Sleep -Seconds 2
    }
    Write-Host "起動しました。"
}

Start-Process $url
