# llama-server の起動スクリプト（RTX 3070 Ti 8GB / RAM 96GB / Ryzen 9 5950X 向け）
# 使い方: powershell -ExecutionPolicy Bypass -File scripts\start-llm-server.ps1 [-NCpuMoe 30] [-Ctx 16384]

param(
    [string]$Model = "C:\llm\models\Qwen3.6-35B-A3B-UD-Q4_K_M.gguf",
    [int]$NCpuMoe = 30,
    [int]$Ctx = 16384,
    [int]$Threads = 16,
    [int]$Port = 8080
)

& C:\llm\bin\llama-server.exe `
    -m $Model `
    -ngl 99 `
    --n-cpu-moe $NCpuMoe `
    -c $Ctx `
    -t $Threads `
    --flash-attn on `
    --host 127.0.0.1 `
    --port $Port
