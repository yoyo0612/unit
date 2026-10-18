# Minecraft Java 版ローカルサーバー

対象バージョン: 26.3（Java 版の最新リリース）。Java 25 以上が必要です。

## 構成

| 項目 | 内容 |
|---|---|
| サーバー本体 | `minecraft-server\server.jar`（Mojang 公式、SHA1 検証済み） |
| JDK | Temurin 25（`EclipseAdoptium.Temurin.25.JDK`） |
| アドレス | `127.0.0.1:25565`（ローカルのみ） |
| 認証 | `online-mode=false`（ボット接続用。ローカル専用のため） |

`minecraft-server\` はワールドや EULA 同意を含むので Git 管理しません。

## 初回セットアップ

1. `minecraft-server\eula.txt` を開き、`eula=false` を `eula=true` に変更する（Mojang の EULA への同意になります）
2. 起動する

```powershell
cd C:\unit
powershell -ExecutionPolicy Bypass -File scripts\start-minecraft-server.ps1
```

`Done (...)! For help, type "help"` が出れば起動完了です。停止はサーバーのウィンドウで `stop` と入力します。

## 設定の変更

`minecraft-server\server.properties` を編集します（サーバー停止中に行う）。
このリポジトリで設定したのは `online-mode=false`、`server-ip=127.0.0.1`、`gamemode=survival`、`difficulty=normal`、`max-players=4` です。
