# Curiosity-driven Learning 準備手順

好奇心（予測誤差）を内発的報酬として使い、外部報酬が疎な環境でも探索を進める強化学習の研究・学習用環境です。

> 前提: [local-llm-setup.md](local-llm-setup.md) とは別の Python 環境を使います（強化学習用の PyTorch を入れるため）。

---

## 1. 現状の確認結果（2026-10-16 時点）

| 項目 | 状態 |
|---|---|
| GPU | NVIDIA GeForce RTX 3070 Ti（VRAM 8GB）、ドライバ 610.47（CUDA 13.3 まで対応） |
| CPU / RAM | AMD Ryzen 9 5950X（16 コア / 32 スレッド）/ 96GB |
| システムの Python | 未導入（`python` は Microsoft Store のスタブのみ、`py` ランチャーも無し） |
| Python の管理 | `uv` 0.11.3 を使用。Python 3.12.13 は `uv python install 3.12` で導入済み |
| venv | `C:\unit\.venv`（Python 3.12.13、PyTorch 2.11.0+cu128）構築済み |

> PyTorch の CUDA 版は Python 3.14 未対応の可能性があるため、3.12 を使っています。

---

## 2. 環境構築

この PC では `uv` を使います（`pip` / `py` は不要）。

```powershell
cd C:\unit
uv python install 3.12
uv venv --python 3.12 .venv

# PyTorch（CUDA 版）。ドライバは CUDA 13.3 まで対応なので cu128 で問題ない
uv pip install --python .venv torch --index-url https://download.pytorch.org/whl/cu128

uv pip install --python .venv -r requirements-curiosity.txt
```

> `.venv` は `.gitignore` で除外しています。

### 動作確認

```powershell
.venv\Scripts\activate
python scripts\check_env.py
```

この PC での実際の出力:

```
Python : 3.12.13
PyTorch: 2.11.0+cu128
CUDA   : True
GPU    : NVIDIA GeForce RTX 3070 Ti
VRAM   : 8.0 GB
Env    : MiniGrid-Empty-5x5-v0 OK（10 ステップ、報酬合計 0.00）
```

`CUDA : False` の場合はドライバか PyTorch の CUDA 版インストールを確認してください。

---

## 3. 推奨する学習の進め方

1. **環境の把握**: MiniGrid（疎な報酬の迷路）で、ランダム行動の挙動を見る
2. **ベースライン**: 外部報酬のみで PPO を学習し、学習曲線を記録
3. **好奇心の追加**: 下記のどちらかを実装して比較
   - **ICM**（Intrinsic Curiosity Module）: 順モデルの予測誤差を報酬にする
   - **RND**（Random Network Distillation）: ランダムなネットワークの予測誤差を報酬にする（実装が比較的簡単）
4. **評価**: 探索した状態数、到達率、学習の安定性を比較
5. **記録**: TensorBoard で可視化（`tensorboard --logdir runs`）

---

## 4. 参考文献

- Pathak et al., *Curiosity-driven Exploration by Self-supervised Prediction* (ICM, 2017) — arXiv:1705.05363
- Burda et al., *Exploration by Random Network Distillation* (RND, 2018) — arXiv:1810.12894
- Burda et al., *Large-Scale Study of Curiosity-Driven Learning* (2018) — arXiv:1808.04355
- [Gymnasium](https://gymnasium.farama.org/) / [MiniGrid](https://minigrid.farama.org/)

> 論文の内容や arXiv 番号は実装前に原文で確認してください（本手順書は検索で得た情報に基づいています）。
