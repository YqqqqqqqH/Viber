#!/bin/sh
# 开新片或开一个预览页（在 Git Bash 里跑，路径相对当前目录）：
#   sh .claude/skills/viber-studio/new_film.sh <作品文件夹>                     整片：页面 + mix.py + build.sh + 字体 + 审片/
#   sh .claude/skills/viber-studio/new_film.sh <作品文件夹>/styles/1-ukiyoe --page   只要一个页面（风格样片、方案预览）
set -e
[ -n "$1" ] || { echo "用法：sh new_film.sh <文件夹> [--page]"; exit 1; }
SK=$(cd "$(dirname "$0")" && pwd)
FONTS="$SK/../huashu-art-motion/scripts/engine/lib/fonts"
DST=$1
[ -e "$DST/index.html" ] && { echo "$DST/index.html 已经存在，不覆盖"; exit 1; }
mkdir -p "$DST/fonts"
cp "$SK/starter/index.html" "$DST/"
# 整片带三款中文字体（约 5 MB，随作品进仓库）；预览页只带正文一款（.gitignore 不收预览页的字体）
FONTSET="NotoSansSC-500.woff NotoSansSC-700.woff LXGWWenKai-500.woff"
[ "$2" = "--page" ] && FONTSET="NotoSansSC-500.woff"
for f in $FONTSET; do
  [ -f "$FONTS/$f" ] && cp "$FONTS/$f" "$DST/fonts/" || echo "! 没找到字体 $f（huashu-art-motion 没装？）"
done
if [ "$2" != "--page" ]; then
  cp "$SK/starter/mix.py" "$SK/starter/build.sh" "$DST/"
  mkdir -p "$DST/审片" "$DST/previews" "$DST/versions"
fi
echo "建好了：$DST"
