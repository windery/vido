#!/bin/bash
# 启动性能测量：应用内分阶段耗时（主指标）+ 稳态进程树 RSS
#
# 主指标是应用自己上报的 `total`（`process.uptime()`，从进程创建到 ready-to-show），
# 不受本脚本自身的测量开销影响（node 冷启动、轮询粒度）。`wall_upper` 只是粗糙上界。
#
# 用法:
#   APP_BIN=/path/to/Vido.app/Contents/MacOS/Vido bash scripts/measure-startup.sh <label> [runs]
#
#   APP_BIN 经环境变量传入：避免本脚本自身的命令行出现在 ps 结果里。
#
# 测量模式（两种都隔离，绝不碰用户的 ~/.vido / ~/.vido-dev）:
#   VIDO_MEASURE_BACKGROUND=1（默认）后台模式，数据落 ~/.vido-dev-test，窗口隐藏不抢焦点。
#                                    注意：此模式会启动测试服务器，因而会加载 express。
#   VIDO_MEASURE_BACKGROUND=0        生产路径，配合 HOME 覆盖做数据隔离；窗口会短暂显示。
#     例: HOME=/tmp/vido-measure-home VIDO_MEASURE_BACKGROUND=0 \
#           VIDO_MEASURE_LOG=/tmp/vido-measure-home/.vido/log/vido-$(date +%F).log \
#           APP_BIN=... bash scripts/measure-startup.sh prod 3
#
# 前置：主进程需支持 VIDO_STARTUP_TRACE=1（见 src/main/index.ts 的 StartupTrace）。
# 脚本只精确 kill 自己启动的进程树，不做全局 pkill。
set -u

LABEL="${1:-run}"; RUNS="${2:-3}"
: "${APP_BIN:?APP_BIN 未设置}"
# VIDO_MEASURE_LOG 可覆盖日志路径（生产模式测量时配合隔离的 HOME）
LOG="${VIDO_MEASURE_LOG:-$HOME/.vido-dev-test/log/vido-$(date +%Y-%m-%d).log}"
mkdir -p "$(dirname "$LOG")"

# 递归收集进程树 PID（Electron 的 GPU/Renderer/Utility 都是主进程子进程）
collect_pids() {
  local p="$1" c
  echo "$p"
  for c in $(pgrep -P "$p" 2>/dev/null); do collect_pids "$c"; done
}

now_ms() { node -e 'process.stdout.write(String(Date.now()))'; }

echo "### label=$LABEL runs=$RUNS"
echo "### log=$LOG"
TOTALS=(); RSSES=()

for i in $(seq 1 "$RUNS"); do
  BEFORE=$( { [ -f "$LOG" ] && wc -l < "$LOG"; } 2>/dev/null | tr -d ' ' || echo 0 )
  T0=$(now_ms)
  VIDO_BACKGROUND="${VIDO_MEASURE_BACKGROUND:-1}" VIDO_STARTUP_TRACE=1 "$APP_BIN" >/dev/null 2>&1 &
  PID=$!

  # 等待本轮新增的 StartupTrace 行（最多 30s）
  LINE=""
  for _ in $(seq 1 300); do
    sleep 0.1
    LINE=$(tail -n +"$((BEFORE + 1))" "$LOG" 2>/dev/null | grep "StartupTrace" | tail -1)
    [ -n "$LINE" ] && break
    kill -0 "$PID" 2>/dev/null || break
  done
  T1=$(now_ms)

  if [ -z "$LINE" ]; then
    echo "run $i: NO_TRACE (timeout or early exit)"
    kill "$PID" 2>/dev/null; wait "$PID" 2>/dev/null
    continue
  fi

  WALL=$((T1 - T0))
  # 日志值为字符串，formatLogEntry 会 JSON.stringify → 带引号
  TOTALMS=$(printf '%s' "$LINE" | sed -n 's/.*total="\{0,1\}\([0-9.]*\)ms.*/\1/p')
  STAGES=$(printf '%s' "$LINE" | sed -n 's/.*stages="\{0,1\}\(.*\)" | rssMain.*/\1/p')
  RSSMAIN=$(printf '%s' "$LINE" | sed -n 's/.*rssMain="\{0,1\}\([0-9.]*\)MB.*/\1/p')

  sleep 2  # 让渲染进程起齐后取稳态
  NPROC=0; RSSSUM=0
  for p in $(collect_pids "$PID"); do
    r=$(ps -o rss= -p "$p" 2>/dev/null | tr -d ' ')
    [ -n "$r" ] && { RSSSUM=$((RSSSUM + r)); NPROC=$((NPROC + 1)); }
  done
  RSS_TOTAL=$(node -e "process.stdout.write(($RSSSUM/1024).toFixed(1))")

  echo "run $i: appTotal=${TOTALMS}ms wall_upper=${WALL}ms rssMain=${RSSMAIN}MB rssTotal=${RSS_TOTAL}MB procs=${NPROC}"
  echo "        ${STAGES}"
  TOTALS+=("$TOTALMS"); RSSES+=("$RSS_TOTAL")

  kill "$PID" 2>/dev/null
  wait "$PID" 2>/dev/null
  sleep 1
done

if [ ${#TOTALS[@]} -gt 0 ]; then
  node -e '
    const t = process.argv[1].split(",").map(Number).sort((a,b)=>a-b);
    const m = process.argv[2].split(",").map(Number).sort((a,b)=>a-b);
    const med = a => a.length % 2 ? a[(a.length-1)/2] : (a[a.length/2-1]+a[a.length/2])/2;
    console.log(`### ${process.argv[3]} median: appTotal=${med(t)}ms rssTotal=${med(m).toFixed(1)}MB`);
  ' "$(IFS=,; echo "${TOTALS[*]}")" "$(IFS=,; echo "${RSSES[*]}")" "$LABEL"
fi
