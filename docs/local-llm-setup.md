# ローカル LLM セットアップ手順（RTX 3070 Ti 8GB / RAM 128GB）

対象環境: Windows 11、NVIDIA RTX 3070 Ti（VRAM 8GB）、システム RAM 128GB

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
2. Windows 向けの **CUDA 対応 zip**（`cuda-12.x` や `cuda-13.x` と付くもの）と、対応する **cudart** の zip を両方ダウンロードする
3. 両方を `C:\llm\bin\` に展開する
4. 動作確認

```powershell
C:\llm\bin\llama-cli.exe --version
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

```powershell
pip install -U "huggingface_hub[cli]"
hf download <リポジトリID> <ファイル名>.gguf --local-dir C:\llm\models
```

> `hf` コマンドが使えない場合は `huggingface-cli download` を試してください（ツールのバージョンにより異なります）。

ダウンロード対象のモデルは、ファイルサイズを先に確認してください。
- VRAM 8GB に全部は載らない → CPU オフロード前提で RAM 128GB に収まるか確認
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
  -t 8 `
  --flash-attn on `
  --port 8080
```

| フラグ | 意味 | 調整のヒント |
|---|---|---|
| `-ngl 99` | GPU に載せる層数（多めに指定すると余った分は自動で CPU へ） | 基本は大きい値 |
| `--n-cpu-moe N` | 先頭 N 層の MoE expert を CPU に置く | VRAM が溢れたら増やす、余裕があれば減らす |
| `-c` | コンテキスト長 | 長いほど VRAM / RAM を使う |
| `-t` | CPU スレッド数 | 物理コア数付近。多すぎると遅くなることがある |
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
C:\llm\bin\llama-bench.exe -m C:\llm\models\<モデル名>.gguf -ngl 99 --n-cpu-moe 30 -t 8
```

記録する項目の例:
- モデル名、量子化
- `-ncmoe`、`-t`、`-c`
- プロンプト処理速度（pp）と生成速度（tg）、単位は tok/s
- VRAM 使用量

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
