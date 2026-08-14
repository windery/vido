#!/usr/bin/env bash
# 仅终止后台测试实例（VIDO_BACKGROUND=1 的 vite / Electron 进程）。
# 按环境变量精确匹配，绝不误伤用户正常启动的 Vido（VS Code F5 / pnpm dev）实例。
#
# 背景：测试实例不能持有单实例锁、不能占用用户端口（见 src/main/index.ts、
# src/main/paths.ts、vite.config.ts 的 BACKGROUND/VIDO_PORT 隔离），
# 清理时同样只允许按 VIDO_BACKGROUND=1 精确匹配，禁止 pkill -f "electron|vite" 全局杀进程。
set -u

killed=0
for pid in $(pgrep -f "electron|vite" 2>/dev/null); do
  # 进程可能已退出
  env_line=$(ps eww -p "$pid" 2>/dev/null) || continue
  if printf '%s' "$env_line" | grep -q "VIDO_BACKGROUND=1"; then
    kill "$pid" 2>/dev/null && {
      echo "killed background test process: $pid"
      killed=1
    }
  fi
done
[ "$killed" -eq 1 ] || echo "no background test instance found"
exit 0
