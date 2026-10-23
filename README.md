# Viber

抖音「Vibe 知识大赏」式的无旁白知识短片，以及用同一套方法做的宣传片。全片由代码逐帧画出。

## 作品

| 作品 | 题目 | 最新版本 | 版本记录 |
|---|---|---|---|
| [berkson](berkson/) | 《伯克森悖论》：好看的人为什么好像都不靠谱 | v3 · 3:32 · 2D Canvas，有配乐和拟音 | [berkson/versions](berkson/versions/) |
| [luanjiyuan](luanjiyuan/) | 《乱纪元》：为什么天气预报只能准一周 | v4 · 3:35 · 3D（Three.js），只有画面 | [luanjiyuan/versions](luanjiyuan/versions/) |
| [iphone18](iphone18/) | 《口袋里的六层楼》：把 iPhone 18 Pro Max 拆成六层楼，一层层看里面有什么 | v2 · 2:16 · 等轴测零件图（anatomy kit，SVG），每层一种颜色，只有字幕，有配乐和拟音 | [iphone18/versions](iphone18/versions/) |
| [duet](duet/) | 《The Ride》：Claude Duet 宣传片，你和 Claude 坐一辆自己画轨道的过山车，整条轨道就是 Duet 图标 | v2 · 0:58 · 一笔画 × 3D（Three.js），英文，无声 | [duet/versions](duet/versions/) |

每个作品的文件夹里：

- `storyboard.md` 分镜表和每一轮的改动，`brief.md` 立题，`publish.md` 发布文案
- `*.js` / `index.html` 画面代码，`sound.py` 拟音和配乐
- `versions/` 每一版的成片 `vN.mp4`、缩略图 `vN_sheet.jpg`、版本记录 `README.md`

## 版本怎么存

- 每出一版：把 `renders/final.mp4` 复制成 `versions/vN.mp4`，生成缩略图，在 `versions/README.md` 里加一行，提交并打标签 `<作品>-vN`（比如 `luanjiyuan-v5`）。
- 比较两版的代码：`https://github.com/YqqqqqqqH/Viber/compare/luanjiyuan-v4...luanjiyuan-v5`
- `renders/`、`review/`、`audio/*.wav`、`node_modules/` 都是中间产物，不进仓库。
- 视频走 Git LFS。网页上点开 mp4 以后按 Download 下载观看；克隆仓库前先装好 `git lfs`。

## 方法论

[skills/](skills/)：我们一起定下来的做法。

[.claude/skills/viber-studio/](.claude/skills/viber-studio/)：做片的总工作流。它把三个第三方 skill 串成一条线：xilo-opus-video 出方案和预览，lemo-opuscar 提供风格卡和渲染、混音工具，huashu-art-motion 提供风格配方、解说语法，并管镜头语言和成片把关。中间停四次给人看：风格样片（从两家的风格库里挑几种，画同一个镜头来比）、方案、分镜、成片。三个第三方 skill 不进仓库，安装方法见该目录下的 `references/工具命令.md`。
