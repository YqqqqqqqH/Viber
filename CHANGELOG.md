# 更新日志

新的在上面。每支片的版本细节见各自的 `versions/README.md`。

## 2026-10-23

- duet：v2《The Ride》（0:58，英文，无声）。v1 被说平淡、转场没新意、看不出所有镜头合成什么大图，故事重做：过山车的轨道走向就是 Duet 图标那一笔放大 9 倍，沿途每一站都在图标里，最后轨道躺平变成官方图标；全片一条连续运镜。共用引擎 `lib/ink3d.js` 加了纸的大小选项，字幕加纸色光晕。
- viber-studio：硬规矩加「所有镜头拼成同一幅大图」，`references/工具命令.md` 记下这次 Three.js 跟拍和亮度跳变的坑。
- duet：《Two Lines》Claude Duet 宣传片，源码与 v1 成片（0:58，英文，无声）。第一支完整走完 viber-studio 四道关（风格样片 → 方案 → 分镜 → 成片）的片子。
- `.gitignore`：方案预览的小样视频（`previews/` 下的 mp4）和风格样片的小样一样不进仓库。

## 2026-10-22

- **viber-studio：风格样片成为第一道关，而且必做。** 起因是 iphone18 只用了 anatomy 一种画法，lemo 和 huashu 的风格库一张都没用上。现在每支新片在立项后先出风格样片：从 lemo 风格卡和 huashu 风格配方、解说语法里挑 6 个候选（每家至少 2 个），画同一个招牌镜头，拼成对比图和并排视频给人挑；点名了画法也照样比。四道关变成：风格样片、方案、分镜（风格帧并进分镜）、成片。
- 新增 `style_catalog.py`（全库 89 种风格的目录页，生成在不进仓库的 `refs/style-catalog/`）和 `style_demos.py`（渲样片、拼对比图和并排视频）；`.claude/launch.json` 加了打开目录的本地服务 `style-catalog`。

## 2026-10-20

- **放弃《七里香》（草稿本漫画 MV）。** 方案 C《草稿本》：2004 年的笔记本里，圆珠笔和荧光笔画出一本漫画，配原曲整首（4:59）加拟音。viber-studio 七步都走完，出到 v2，看完觉得太烂，搁置几天后决定不做了。它的文件从没进过仓库；本地的作品文件夹 `qilixiang/`（含渲染）删除，`.gitignore` 里为它的原曲加的规则一并去掉。
- 加入 `viber-studio`：做片的总工作流 skill（`.claude/skills/viber-studio/`），和根目录的 `CLAUDE.md`。
- **放弃《嘀嗒》（机械表是怎么数秒的）。** 这条片子想用 Anatomy skill 画一块透明表盘机械表，再录成底片做成字幕讲解片。方案 A、字幕稿和镜头表都定了，在画机械表图的时候停下，没有出风格帧，也没有成片。它的文件从没进过仓库；本地的作品文件夹 `jixiebiao/` 和为它写的底片录制工具（`viber-studio/plate/`）一并删除。

## 2026-10-16

- iphone18：v2《口袋里的六层楼》。
- iphone18：《八毫米的楼》源码与 v1 成片。

## 2026-10-14

- `.gitignore`：第三方 skill 和参考库不进仓库（[#1](https://github.com/YqqqqqqqH/Viber/pull/1)）。

## 2026-10-13

- luanjiyuan：《乱纪元》源码与 v4 成片。
- berkson：《伯克森悖论》源码与 v1–v3 成片。
- skills：加入「丝滑转场」规则（《乱纪元》第一轮审片定下）。
- skills：引入上游 vibe-knowledge-film @5018671 作为底子（不含字体和示例 GIF）。
- 初始化仓库：README、忽略规则、视频走 Git LFS。
