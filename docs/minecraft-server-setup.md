# Minecraft Java 版ローカルサーバーと LLM ボット

LLM（ローカルの llama-server）が Minecraft 内で動くボットを操作します。

## 構成

| 項目 | 内容 |
|---|---|
| サーバー本体 | `minecraft-server\server.jar`（Mojang 公式 26.1.2、SHA1 検証済み） |
| JDK | Temurin 25（`EclipseAdoptium.Temurin.25.JDK`）。26.x は Java 25 以上が必要 |
| サーバーアドレス | `127.0.0.1:25565`（ローカルのみ） |
| 認証 | `online-mode=false`、`white-list=false`（ローカル専用・ボット接続用） |
| LLM | `http://127.0.0.1:8080/v1`（llama-server、OpenAI 互換・tool calling） |
| ボット | `minecraft-bot\bot.js`（Mineflayer 4.39.0） |

`minecraft-server\` と `minecraft-bot\node_modules\` は Git 管理しません（ワールド、jar、EULA 同意を含むため）。

### バージョンについて

Java 版の最新は 26.3 ですが、Mineflayer 4.39.0 が読み込めるのは 26.1.2 までです（`minecraft-data` に 26.3 のデータがないため）。
そのため、サーバーは 26.1.2 にしています。Mineflayer が 26.3 に対応したら `server.jar` とボットの `version` を更新してください。

## 起動手順

1. LLM サーバー: `powershell -ExecutionPolicy Bypass -File scripts\start-llm-server.ps1`
2. Minecraft サーバー: `powershell -ExecutionPolicy Bypass -File scripts\start-minecraft-server.ps1`（`Done (...)!` で起動完了。停止はウィンドウで `stop`）
3. ボット: `powershell -ExecutionPolicy Bypass -File scripts\start-minecraft-bot.ps1`

Minecraft の Java 版から `localhost:25565` に入ると、ボットが見えます。

## ボットへの指示

ゲーム内でチャットを送ると、ボットが LLM に渡して行動を決めます。例:

- 「前に 3 秒歩いてから挨拶して」
- 「ジャンプして近くのブロックを掘って」

使えるツール: `say`（返事）、`walk`（方向と秒数、最大 5 秒）、`jump`、`dig`（4 ブロック以内のブロックを掘る）、`stop`。

## 初回セットアップ

`minecraft-server\eula.txt` の `eula=false` を `eula=true` に変えると、Mojang の EULA に同意したことになります。
同意は利用者本人が行ってください。

## 注意

- ボットは LLM の判断で動くため、行動は保証されません。意図しない行動をとることがあります。
- 生成速度は約 23 tok/s です。1 回の判断に数秒かかるため、リアルタイムの戦闘には向きません。
- 認証なしのサーバーは 127.0.0.1 にのみバインドしてあります。外部に公開しないでください。
