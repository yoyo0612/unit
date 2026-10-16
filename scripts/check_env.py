"""Curiosity-driven Learning 用の環境チェック。

GPU が使えるか、Gymnasium / MiniGrid の環境が動くかを確認する。
"""

import sys

import gymnasium as gym
import minigrid  # noqa: F401  MiniGrid 環境を gym に登録する
import torch


def check_torch() -> None:
    print(f"Python : {sys.version.split()[0]}")
    print(f"PyTorch: {torch.__version__}")
    print(f"CUDA   : {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU    : {torch.cuda.get_device_name(0)}")
        props = torch.cuda.get_device_properties(0)
        print(f"VRAM   : {props.total_memory / 1024**3:.1f} GB")
    else:
        print("警告: CUDA が使えません。CPU で動作します。")


def check_env(env_id: str = "MiniGrid-Empty-5x5-v0") -> None:
    env = gym.make(env_id)
    obs, _ = env.reset(seed=0)
    total = 0.0
    steps = 0
    for _ in range(10):
        obs, reward, terminated, truncated, _ = env.step(env.action_space.sample())
        total += reward
        steps += 1
        if terminated or truncated:
            break
    env.close()
    print(f"Env    : {env_id} OK（{steps} ステップ、報酬合計 {total:.2f}）")


if __name__ == "__main__":
    check_torch()
    check_env()
