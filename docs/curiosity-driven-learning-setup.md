# Curiosity-driven Learning 準備手順

好奇心（予測誤差）を内発的報酬として使い、外部報酬が疎な環境でも探索を進める強化学習の研究・学習用環境です。

> 前提: [local-llm-setup.md](local-llm-setup.md) とは別の Python 環境を使います（強化学習用の PyTorch を入れるため）。

---

## 1. 現状の確認結果

| 項目 | 状態 | 対処 |
|---|---|---|
| NVIDIA ドライバ | `nvidia-smi` が見つからない | ドライバを入れ直すか、PATH を確認。GPU 無しでも小規模実験は可能 |
| Python | 3.14.8 のみ | PyTorch の CUDA 版は 3.14 未対応の可能性があるため **3.12 を推奨** |

Python 3.12 の導入例:

```powershell
winget install --id Python.Python.3.12 -e
py -0p   # 3.12 が一覧に出れば OK
```

---

## 2. 環境構築

```powershell
cd C:\kait\unit\unit
py -3.12 -m venv .venv
.venv\Scripts\activate

# PyTorch（CUDA 版）。GPU のドライバに合わせて cu128 / cu126 等を選ぶ
pip install torch --index-url https://download.pytorch.org/whl/cu128

pip install -r requirements-curiosity.txt
```

> `.venv` は `.gitignore` の対象に入れてください（現在のリポジトリには `.gitignore` がありません）。

### 動作確認

```powershell
python scripts\check_env.py
```

期待する出力の例:

```
Python : 3.12.x
PyTorch: 2.x.x+cu128
CUDA   : True
GPU    : NVIDIA GeForce RTX 3070 Ti
VRAM   : 8.0 GB
Env    : MiniGrid-Empty-5x5-v0 OK（10 ステップ、報酬合計 ...）
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
