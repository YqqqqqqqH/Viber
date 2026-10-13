# 方法论（skills）

这里只收**我们两个都认可**的做法：审片时定下来的规矩、踩过的坑和对应的改法。每个 skill 一个文件夹。

## vibe-knowledge-film

- 底子是上游 [Dave-cc/vibe-knowledge-film](https://github.com/Dave-cc/vibe-knowledge-film) 的 `5018671`（MIT 许可，见 [LICENSE](vibe-knowledge-film/LICENSE)）。
- 仓库里第一次提交是上游原样，后面每次提交都是我们加的。看我们改了什么：

  ```bash
  git log -p -- skills/vibe-knowledge-film
  ```

- 已加入：
  - `references/visual-grammar.md` 第五节"丝滑转场：像 Apple 发布会那样"（来自《乱纪元》第一轮审片）
  - `references/visualization.md` 排错表里"转场处镜头一停一冲"一行
- 没放进来的：字体文件（运行 `engine/get_fonts.py` 下载）、两张示例 GIF（共 47 MB，见上游仓库）。
- 本机实际调用的是 `~/.claude/skills/vibe-knowledge-film`。两边改动要同步：在那边改完、确认以后，复制到这里提交。
