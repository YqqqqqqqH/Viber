#!/bin/sh
# 一条命令出片（在 Git Bash 里跑）：
#   sh build.sh            正式版 1920×1080 → renders/final.mp4
#   sh build.sh --draft    草稿 960×540，先看节奏和转场
# 顺序：阅读检查 → 导出事件 → 逐帧渲染 → 混音（有 mix.py 才做）→ 合成并标准化到 -14 LUFS。
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}; export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "找不到 lemo 库 $LIB：在项目根目录跑 sh .claude/skills/lemo-opuscar/scripts/setup.sh"; exit 1; }
FPS=${FPS:-30}; SIZE=1920x1080; OUT=final
[ "$1" = "--draft" ] && { SIZE=960x540; OUT=draft; }
mkdir -p "$HERE/renders"
cd "$LIB"
node core/render/readcheck.mjs "$HERE" --size $SIZE
node core/render/events.mjs "$HERE" --size $SIZE
node core/render/video.mjs "$HERE" --fps $FPS --workers ${WORKERS:-3} --size $SIZE --out "$HERE/renders/video.mp4"
if [ -f "$HERE/mix.py" ]; then
  "$LIB/.venv/bin/python" "$HERE/mix.py"
  sh core/render/mux.sh "$HERE/renders/video.mp4" "$HERE/renders/mix.wav" "$HERE/renders/$OUT.mp4" $FPS ${GRAIN:-0}
else
  cp "$HERE/renders/video.mp4" "$HERE/renders/$OUT.mp4"
fi
echo "成片 → $HERE/renders/$OUT.mp4"
