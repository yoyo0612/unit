# llama-server の起動スクリプト（RTX 3070 Ti 8GB / RAM 96GB / Ryzen 9 5950X 向け）
# 使い方: powershell -ExecutionPolicy Bypass -File scripts\start-llm-server.ps1 [-NCpuMoe 40] [-Ctx 131072]
# 既定値は llama-bench と実サーバーでの計測結果（docs/local-llm-setup.md の 5 章）に基づく。
# 既定: MoE expert を全層 CPU / RAM に置き（40 層中 40）、空いた VRAM を 128K コンテキストに使う。
# 短いコンテキストで速度優先にする場合: -NCpuMoe 33 -Ctx 16384（生成 約 +18%）

param(
    [string]$Model = "C:\llm\models\Qwen3.6-35B-A3B-UD-Q4_K_M.gguf",
    [int]$NCpuMoe = 40,
    [int]$Ctx = 131072,
    [int]$Threads = 12,
    [int]$UBatch = 2048,
    [int]$Port = 8080
)

& C:\llm\bin\llama-server.exe `
    -m $Model `
    -ngl 99 `
    --n-cpu-moe $NCpuMoe `
    -c $Ctx `
    -t $Threads `
    -b 2048 `
    -ub $UBatch `
    --flash-attn on `
    --host 127.0.0.1 `
    --port $Port
