# Viber

抖音「Vibe 知识大赏」式的无旁白知识短片。全片由代码逐帧画出。

## 作品

| 作品 | 题目 | 最新版本 | 版本记录 |
|---|---|---|---|
| [berkson](berkson/) | 《伯克森悖论》：好看的人为什么好像都不靠谱 | v3 · 3:32 · 2D Canvas，有配乐和拟音 | [berkson/versions](berkson/versions/) |
| [luanjiyuan](luanjiyuan/) | 《乱纪元》：为什么天气预报只能准一周 | v4 · 3:35 · 3D（Three.js），只有画面 | [luanjiyuan/versions](luanjiyuan/versions/) |

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
