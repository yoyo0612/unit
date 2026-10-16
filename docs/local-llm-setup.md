# ローカル LLM セットアップ手順（RTX 3070 Ti 8GB / RAM 96GB）

対象環境: Windows 11、AMD Ryzen 9 5950X（16 コア / 32 スレッド）、NVIDIA RTX 3070 Ti（VRAM 8GB）、システム RAM 96GB

導入済み（2026-10-16 時点）:
- NVIDIA ドライバ 610.47（CUDA 13.3 まで対応）
- llama.cpp b11675（CUDA 12.4 版）→ `C:\llm\bin\`
- `hf` CLI（huggingface_hub 2.2.0、`uv tool` で導入）
- Docker Desktop
- モデル: `unsloth/Qwen3.6-35B-A3B-GGUF` の `Qwen3.6-35B-A3B-UD-Q4_K_M.gguf`（約 20.6GB、MoE）→ `C:\llm\models\`
- 起動スクリプト: `scripts\start-llm-server.ps1`（このリポジトリ内）

未導入: Ollama、LM Studio

### すぐ使う

```powershell
cd C:\unit
powershell -ExecutionPolicy Bypass -File scripts\start-llm-server.ps1
```

`llama_server: listening on http://127.0.0.1:8080` と出たら起動完了です（読み込みに数秒〜十数秒）。
- ブラウザ: `http://127.0.0.1:8080` で llama-server 内蔵のチャット画面が開く
- API: `http://127.0.0.1:8080/v1`（OpenAI 互換、API キー不要）
- 停止: 起動したターミナルで Ctrl+C

> 注意: 速度や対応モデルは個人の報告やベンチマークに基づく推定を含みます。
> モデル名・フラグ・リリース版は導入時に必ず最新の公式情報で確認してください。

---

## 1. 前提確認

### 1-1. NVIDIA ドライバ

PowerShell で確認します。

```powershell
nvidia-smi
```

GPU 名と Driver Version、CUDA Version が表示されれば OK です。表示されない場合は
[NVIDIA ドライバダウンロード](https://www.nvidia.com/Download/index.aspx) から最新版を入れてください。

### 1-2. 作業ディレクトリ

```
C:\llm\
├── bin\        # llama.cpp のバイナリ
├── models\     # GGUF モデル
└── scripts\    # 起動スクリプト
```

```powershell
New-Item -ItemType Directory -Force C:\llm\bin, C:\llm\models, C:\llm\scripts
```

---

## 2. 推論エンジンの導入

用途に応じて選びます。どれも内部は llama.cpp です。

| 用途 | 選択 |
|---|---|
| API を使ったスクリプト・エージェント開発 | Ollama |
| フラグを細かく調整したい、最新機能を早く使いたい | llama-server（推奨） |
| GUI でモデルを試したい | LM Studio |

### 2-A. llama.cpp（CUDA ビルド版）を使う場合（推奨）

1. [llama.cpp Releases](https://github.com/ggml-org/llama.cpp/releases) を開く
2. Windows 向けの **CUDA 対応 zip** と、対応する **cudart** の zip を両方ダウンロードする
   - この PC のドライバは CUDA 13.3 までの対応なので、`cuda-12.4-x64` 版を使う（`cuda-13.4` 版はドライバ更新が必要になる可能性がある）
   - 例: `llama-bXXXXX-bin-win-cuda-12.4-x64.zip` と `cudart-llama-bin-win-cuda-12.4-x64.zip`
3. 両方を `C:\llm\bin\` に展開する
4. 動作確認

```powershell
C:\llm\bin\llama-cli.exe --version
C:\llm\bin\llama-server.exe --list-devices   # CUDA0: NVIDIA GeForce RTX 3070 Ti と出れば OK
```

### 2-B. Ollama を使う場合

1. [ollama.com](https://ollama.com/download) から Windows 版をインストール
2. 確認

```powershell
ollama --version
ollama run llama3.2 "hello"   # 動作確認用の小型モデル。任意のモデルで可
```

Ollama は内部で GGUF を扱うため、Hugging Face の GGUF を `Modelfile` 経由で登録することもできます。

### 2-C. LM Studio を使う場合

1. [lmstudio.ai](https://lmstudio.ai/) からインストール
2. 設定でサーバーモードを有効にすると、`http://localhost:1234/v1` で OpenAI 互換 API が使えます。

---

## 3. モデルの取得

### 3-1. Hugging Face の準備

1. [huggingface.co](https://huggingface.co/) でアカウントを作成
2. 必要に応じてアクセストークンを発行し、環境変数に設定

```powershell
$env:HF_TOKEN = "hf_xxxxxxxx"   # 公開モデルでは不要な場合が多い
```

### 3-2. GGUF の選び方

| 量子化 | 目安 | 用途 |
|---|---|---|
| Q4_K_M | 品質と容量のバランス | 基本の選択 |
| IQ3_XXS / Q3_K_M | 小さい | VRAM 8GB に収めたい場合、品質は落ちる |
| Q5_K_M / Q6_K | 大きい | 品質重視で RAM に余裕がある場合 |

配布元は次の順で確認してください。
- [Unsloth](https://huggingface.co/unsloth)
- [bartowski](https://huggingface.co/bartowski)

### 3-3. ダウンロード

この PC にはシステムの Python が無いため、`uv` でツールとして入れます（導入済み）。

```powershell
uv tool install huggingface_hub
hf download <リポジトリID> <ファイル名>.gguf --local-dir C:\llm\models
```

> `hf` が見つからない場合は `uv tool update-shell` を実行してターミナルを開き直してください。

ダウンロード対象のモデルは、ファイルサイズを先に確認してください。
- VRAM 8GB に全部は載らない → CPU オフロード前提で RAM 96GB に収まるか確認（OS や他アプリの分を除き、モデルは 70〜80GB 程度までが目安）
- C ドライブの空きは約 420GB。大きいモデルを多数置く場合は D ドライブ（約 5TB 空き）に `models` を置いてもよい
- MoE モデルは `-ncmoe` で expert を CPU 側に寄せる

---

## 4. 起動

### 4-1. llama-server（推奨の起動方法）

まず全層を GPU に載せずに起動し、VRAM の使用量を見ながら調整します。

```powershell
C:\llm\bin\llama-server.exe `
  -m C:\llm\models\<モデル名>.gguf `
  -ngl 99 `
  --n-cpu-moe 30 `
  -c 8192 `
  -t 16 `
  --flash-attn on `
  --port 8080
```

| フラグ | 意味 | 調整のヒント |
|---|---|---|
| `-ngl 99` | GPU に載せる層数（多めに指定すると余った分は自動で CPU へ） | 基本は大きい値 |
| `--n-cpu-moe N` | 先頭 N 層の MoE expert を CPU に置く | VRAM が溢れたら増やす、余裕があれば減らす |
| `-c` | コンテキスト長 | 長いほど VRAM / RAM を使う |
| `-t` | CPU スレッド数 | 5950X は物理 16 コア。16 から始め、12〜16 の範囲で試す（32 は遅くなりやすい） |
| `--flash-attn on` | Flash Attention | 対応モデルでは有効にする |
| `-ctk q8_0 -ctv q8_0` | KV キャッシュの量子化 | 長いコンテキストで VRAM を節約 |

> `--flash-attn` の書式や `-ctk` の対応値はビルド版によって異なるため、`--help` で確認してください。

```powershell
C:\llm\bin\llama-server.exe --help | more
```

動作確認（別のターミナルで実行）:

```powershell
curl http://localhost:8080/v1/models
```

### 4-2. Ollama の起動

```powershell
ollama serve            # 通常はインストール時に自動起動する
ollama run <モデル名>
```

### 4-3. LM Studio の起動

GUI でモデルを読み込み、「Local Server」から起動します。

---

## 5. VRAM / 速度の調整手順

1. `-ncmoe` を大きめ（例: 30）にして起動
2. 別ターミナルで `nvidia-smi` を実行し、VRAM 使用量を確認
3. VRAM に余裕（目安 85〜90% 以下）があれば `-ncmoe` を減らす
4. VRAM が溢れてエラーや極端な遅さになれば `-ncmoe` を増やす
5. 速度の最大点を探す

計測は `llama-bench` を使うと便利です。

```powershell
C:\llm\bin\llama-bench.exe -m C:\llm\models\<モデル名>.gguf -ngl 99 --n-cpu-moe 30 -t 16
```

記録する項目の例:
- モデル名、量子化
- `-ncmoe`、`-t`、`-c`
- プロンプト処理速度（pp）と生成速度（tg）、単位は tok/s
- VRAM 使用量

### この PC での最適化結果（2026-10-16、Qwen3.6-35B-A3B UD-Q4_K_M）

**採用設定**: `--n-cpu-moe 33`、`-t 12`、`-b 2048 -ub 2048`、`-c 16384`、`--flash-attn on`（`scripts\start-llm-server.ps1` の既定値）

実サーバーでの計測（約 4,800 トークンのプロンプト + 256 トークン生成、VRAM はデスクトップ分 約 0.56GB を含む）:

| `-ncmoe` | `-ub` | pp (tok/s) | tg (tok/s) | VRAM | 備考 |
|---|---|---|---|---|---|
| 30 | 512 | 140 | 21.9 | 7.94GB | 当初設定。VRAM が溢れて共有メモリに退避し遅い |
| 32 | 512 | 358 | 28.4 | 7.47GB | |
| 32 | 1024 | 535 | 28.3 | 7.52GB | |
| 32 | 2048 | 673 | 28.0 | 7.75GB | 最速だが余裕が 0.4GB しかない |
| **33** | **2048** | **659** | **27.6** | **7.28GB** | **採用。速度はほぼ同じで余裕 約 0.9GB** |
| 34 | 1024 | 501 | 26.8 | 6.59GB | |
| 34 | 2048 | 644 | 26.8 | 6.82GB | GPU アプリ併用時の候補 |

当初設定（`-ncmoe 30`、`-ub 512`）と比べ、プロンプト処理は約 4.7 倍、生成は約 1.26 倍になりました。

`llama-bench`（`-p 512 -n 128`、コンテキスト短）でわかったこと:
- `-ncmoe` は 30 以上で VRAM に収まり、29 以下にすると溢れて生成が 30 → 19 tok/s に落ちる。
  実サーバーは KV キャッシュの分だけ VRAM を多く使うため、境界は 1〜3 層ぶん大きい側にずれる
- スレッド数: 生成速度は 8〜16 でほぼ同じ（約 29〜30 tok/s）、24 で 27、32 で 26 と下がる。プロンプト処理は 12 以上で頭打ち → 12 を採用
- `-ub`: 512 → 1024 でプロンプト処理が約 1.7 倍、2048 でさらに少し伸びる（その分 VRAM を使う）

他の GPU を使うアプリ（ゲーム等）と同時に使う場合は `-NCpuMoe 34` 以上にしてください。

### 採用中: CPU / RAM 寄りの 128K コンテキスト構成

上の速度優先設定から、MoE expert を全 40 層とも CPU / RAM に移し（`--n-cpu-moe 40`）、空いた VRAM をコンテキスト長に回しています。
`scripts\start-llm-server.ps1` の既定値はこちらです（モデルの学習時コンテキスト長は 262,144 なので 128K は範囲内）。

| 構成 | `-ncmoe` | `-c` | pp (tok/s) | tg (tok/s) | VRAM |
|---|---|---|---|---|---|
| 速度優先 | 33 | 16384 | 659 | 27.6 | 7.28GB |
| 全 expert を CPU | 40 | 16384 | 568 | 23.4 | 3.91GB |
| 全 expert を CPU | 40 | 65536 | 564 | 23.4 | 5.06GB |
| **採用（全 expert を CPU）** | **40** | **131072** | **566** | **23.4** | **6.65GB** |

（約 4,800 トークンのプロンプトで計測、VRAM はデスクトップ分 約 0.56GB を含む）

長文の確認: 約 10 万トークン（99,736）の文章の中ほどに埋め込んだ合言葉を正しく答えられた。
プロンプト処理 124 秒（805 tok/s）、生成 22.9 tok/s、VRAM 6.67GB。

速度優先に戻す場合:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-llm-server.ps1 -NCpuMoe 33 -Ctx 16384
```

> Qwen3.6 は既定で思考（reasoning）を出力します。API 応答では `reasoning_content` に分かれて返ります。

---

## 6. 任意: Web UI の導入

Open WebUI（Docker 利用）:

```powershell
docker run -d -p 3000:8080 `
  -e OPENAI_API_BASE_URL=http://host.docker.internal:8080/v1 `
  --name open-webui ghcr.io/open-webui/open-webui:main
```

ブラウザで `http://localhost:3000` を開きます。

Docker を使わない場合は、Python 環境に `open-webui` を入れる方法もあります（公式手順を参照）。

---

## 7. トラブルシューティング

| 症状 | 対処 |
|---|---|
| `CUDA error: out of memory` | `-ngl` を下げる、`-ncmoe` を増やす、`-c` を減らす |
| 生成が極端に遅い | `-t` を減らす・増やす両方試す、`-ncmoe` を調整、量子化を軽くする |
| `nvidia-smi` が見つからない | ドライバ再インストール、PATH を確認 |
| DLL が見つからない（`cudart64_*.dll` など） | cudart の zip を `bin\` に展開し直す |
| モデルが読み込めない | GGUF が途中で切れていないか、ファイルサイズを確認 |

---

## 8. 参考情報

- [llama.cpp](https://github.com/ggml-org/llama.cpp)
- [Ollama](https://ollama.com/)
- [LM Studio](https://lmstudio.ai/)
- [Hugging Face](https://huggingface.co/)
- [Open WebUI](https://github.com/open-webui/open-webui)
- 性能の参考: [LLaMa Performance Benchmarking with llama.cpp on NVIDIA 3070 Ti](https://kubito.dev/posts/llama-nvidia-3070-ti-benchmarks/)
- 性能の参考: [Qwen3 MoE CPU Expert Offload Doubles Decode Speed on 12GB VRAM](https://aiweekly.co/alerts/qwen3-moe-cpu-expert-offload-doubles-decode-speed-on-12gb-vram)
