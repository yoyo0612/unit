# C:\unit

学習・開発用の作業リポジトリです。現在はローカル LLM の実行環境と、Curiosity-driven Learning 用のセットアップを含みます。

---

## ローカル LLM の導入方法

### 対象環境

| 項目 | 内容 |
|---|---|
| OS | Windows 11 Home |
| CPU | AMD Ryzen 9 5950X（16 コア / 32 スレッド） |
| GPU | NVIDIA RTX 3070 Ti（VRAM 8GB） |
| RAM | 96GB |
| ドライバ | NVIDIA 610.47（CUDA 13.3 まで対応） |

### 構成

| 役割 | 採用 |
|---|---|
| 推論エンジン | llama.cpp b11675（CUDA 12.4 版）→ `C:\llm\bin\` |
| モデル | `unsloth/Qwen3.6-35B-A3B-GGUF`（`Qwen3.6-35B-A3B-UD-Q4_K_M.gguf`、約 20.6GB、MoE）→ `C:\llm\models\` |
| モデル取得 | `hf` CLI（`uv tool` で導入） |
| API | `http://127.0.0.1:8080/v1`（OpenAI 互換、API キー不要） |
| チャット画面 | `http://127.0.0.1:8080`（llama-server 内蔵） |
| Web UI（任意） | Open WebUI（Docker）。未導入 |

Ollama と LM Studio は未導入です。

### 起動

**ワンクリック**: `scripts\launch-llm.bat` をダブルクリックすると、サーバーを別ウィンドウで起動し、準備ができたらブラウザでチャット画面を開きます。すでに起動している場合はブラウザだけ開きます。停止はサーバーのウィンドウで Ctrl+C。

**停止ボタン**: `scripts\stop-llm.bat` をダブルクリックすると、サーバー（`llama-server.exe`）とそのウィンドウを閉じます。起動していなければ何もしません。

手動で起動する場合:

```powershell
cd C:\unit
powershell -ExecutionPolicy Bypass -File scripts\start-llm-server.ps1
```

`llama_server: listening on http://127.0.0.1:8080` と表示されれば起動完了です。停止は Ctrl+C。

既定の構成は **MoE expert を全層 CPU / RAM に置き、KV キャッシュを q8_0 にして 128K コンテキスト** です（VRAM 約 5.4GB）。
用途に合わせて切り替えられます。

```powershell
# 最大コンテキスト（262K）。VRAM の余裕が少なくなる
powershell -ExecutionPolicy Bypass -File scripts\start-llm-server.ps1 -Ctx 262144

# 速度優先（短いコンテキスト）
powershell -ExecutionPolicy Bypass -File scripts\start-llm-server.ps1 -NCpuMoe 33 -Ctx 16384 -KvType f16
```

### 今日の作業の流れ

1. **環境の確認と導入**: NVIDIA ドライバ、llama.cpp（CUDA 12.4 版）、`hf` CLI、Docker Desktop を確認・導入し、モデルを `C:\llm\models\` にダウンロード
2. **起動スクリプトの作成**（`50ca642`）: `scripts\start-llm-server.ps1` を追加し、llama-server の起動フラグを 1 か所にまとめた
3. **速度の最適化**（`b04cd5f`）: `llama-bench` と実サーバーで計測し、`-t 12`、`-ub 2048` などを採用。VRAM に収まる範囲で MoE expert を CPU へ寄せた
4. **128K 構成への切り替え**（`b04cd5f`）: MoE expert を全層 CPU / RAM に置き、空いた VRAM を文脈長に回した（既定を 128K に変更）
5. **KV キャッシュの量子化**（`2df7eea`）: KV キャッシュを q8_0 にし、128K の VRAM 使用量を 6.65GB から 5.43GB に削減
6. **長文での動作確認**: 約 10 万トークン（f16、128K）と約 20 万トークン（q8_0、262K）の文章で、埋め込んだ合言葉を正しく答えられることを確認

### 実測値（抜粋）

| 構成 | KV | `-c` | pp (tok/s) | tg (tok/s) | VRAM |
|---|---|---|---|---|---|
| 当初（`-ncmoe 30`、`-ub 512`） | f16 | 16384 | 140 | 21.9 | 7.94GB（溢れて遅い） |
| 速度優先（採用前） | f16 | 16384 | 659 | 27.6 | 7.28GB |
| 全 expert を CPU | f16 | 131072 | 566 | 23.4 | 6.65GB |
| **既定（全 expert を CPU）** | **q8_0** | **131072** | — | **23.0** | **5.43GB** |
| 最大（全 expert を CPU） | q8_0 | 262144 | — | 23.0 | 7.50GB |

pp / tg の計測条件は約 4,800 トークンのプロンプトと 256 トークン生成です。VRAM はデスクトップ分の約 0.56GB を含みます。

### 注意

- 速度や対応モデルの数値は、この PC での計測と個人の報告に基づく推定を含みます。
- モデル名・フラグ・リリース版は導入時に最新の公式情報で確認してください。
- `--flash-attn` の書式や `-ctk` の対応値はビルドによって異なるため、`llama-server.exe --help` で確認してください。
- Qwen3.6 は既定で思考（reasoning）を出力します。API 応答では `reasoning_content` に分かれて返ります。
- 他の GPU アプリ（ゲームなど）と併用する場合は `-NCpuMoe 34` 以上を推奨します。

### トラブルシューティング（抜粋）

| 症状 | 対処 |
|---|---|
| `CUDA error: out of memory` | `-NCpuMoe` を増やす、`-Ctx` を減らす |
| 生成が極端に遅い | `-NCpuMoe` を調整する（29 以下だと VRAM が溢れて遅くなる） |
| `nvidia-smi` が見つからない | ドライバを再インストールし、PATH を確認 |
| DLL が見つからない（`cudart64_*.dll`） | cudart の zip を `C:\llm\bin\` に展開し直す |

詳しい手順と計測の記録は [docs/local-llm-setup.md](docs/local-llm-setup.md) を参照してください。

---

## リポジトリ内の構成

```
C:\unit\
├── docs\
│   ├── local-llm-setup.md                    # ローカル LLM の導入手順・計測記録
│   ├── llm-model-selection-and-tuning.md     # モデル選定と最適化の経緯・判断
│   └── curiosity-driven-learning-setup.md    # Curiosity-driven Learning の環境構築
├── scripts\
│   ├── start-llm-server.ps1                  # llama-server の起動スクリプト
│   └── check_env.py                          # Python 環境の確認
├── requirements-curiosity.txt                # Curiosity-driven Learning の依存関係
└── .gitignore                                # .venv / __pycache__ / runs / *.gguf など
```

---

## 関連コミット（2026-10-16）

| コミット | 内容 |
|---|---|
| `7ddab54` | Curiosity-driven Learning 用のセットアップ一式を追加 |
| `a08c781` | 手順書をこの PC（RAM 96GB / Ryzen 9 5950X / uv）に合わせて更新 |
| `50ca642` | ローカル LLM の起動スクリプトと実測値を追加 |
| `b04cd5f` | llama-server の設定を最適化し、CPU / RAM 寄りの 128K 構成を既定にする |
| `2df7eea` | KV キャッシュを q8_0 にして 128K の VRAM 使用量を削減 |
