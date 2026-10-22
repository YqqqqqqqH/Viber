"""全库风格目录：把 lemo 的风格卡、huashu 的风格配方和解说语法、本项目做过的画法收进一个可以翻的网页。

    python .claude/skills/viber-studio/style_catalog.py            # 生成 / 更新 refs/style-catalog/
    python .claude/skills/viber-studio/style_catalog.py --refresh  # 缩略图全部重做（上游 skill 更新以后）

输出（refs/ 不进仓库）：
    refs/style-catalog/index.html     浏览器打开就能翻，按来源筛选、按名字搜
    refs/style-catalog/catalog.json   同一份数据，style_demos.py 从这里取参考缩略图
    refs/style-catalog/thumbs/        每种风格一张 640×360（解说语法是一条 1280 宽的分镜条）

每种风格一个 id，选风格、写 candidates.json 都用它：lemo/<slug>、huashu/<id>、grammar/<id>、house/<名>。
huashu 配方的缩略图要逐个渲（35 个约 5 分钟），已经有的不重渲。
"""
import argparse, html, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
LIB = Path(os.environ.get('LIB', Path.home() / 'lemo-opuscar'))
HUASHU = ROOT / '.claude/skills/huashu-art-motion'
OUT = ROOT / 'refs/style-catalog'
THUMBS = OUT / 'thumbs'
TW, TH = 640, 360

# 本项目做过的画法：取一张成片里的帧当缩略图（视频取帧，或者现成的图）
HOUSE = [
    dict(id='house/anatomy', cn='等轴测零件图', en='Anatomy isometric', category='本项目做过的',
         uses='拆开一个真实物件讲它的内部：手机、机械、装置', film='iphone18《口袋里的六层楼》',
         card='.claude/skills/anatomy/SKILL.md', img='iphone18/frames/sheet/f1_building_overview.jpg'),
    dict(id='house/vibe-explainer', cn='暗底卡片讲解（vibe 知识大赏）', en='Vibe knowledge explainer', category='本项目做过的',
         uses='无旁白知识短片：外行认得的形象、说到什么画什么', film='berkson《伯克森悖论》',
         card='~/.claude/skills/vibe-knowledge-film/SKILL.md', video='berkson/versions/v3.mp4', at=45),
    dict(id='house/three-3d', cn='Three.js 3D', en='Three.js 3D', category='本项目做过的',
         uses='要真实空间、光影和镜头穿行的题材', film='luanjiyuan《乱纪元》',
         card='luanjiyuan/（3D 经验见 lemo TECHNIQUE.md §9）', video='luanjiyuan/versions/v4.mp4', at=165),
]


def thumb(src, dst, w=TW, h=TH):
    """裁成 16:9 再缩到 w×h（解说语法的分镜条只按宽缩放，不裁）。"""
    im = Image.open(src).convert('RGB')
    if h:
        r = w / h
        if im.width / im.height > r:
            nw = round(im.height * r); x = (im.width - nw) // 2; im = im.crop((x, 0, x + nw, im.height))
        else:
            nh = round(im.width / r); y = (im.height - nh) // 2; im = im.crop((0, y, im.width, y + nh))
        im = im.resize((w, h), Image.LANCZOS)
    else:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, quality=86)


def table_rows(md, first_cell):
    """Markdown 表格里第一格匹配 first_cell 的行 → 去掉首尾竖线后的格子列表。"""
    rows = []
    for line in md.splitlines():
        if line.startswith('| ') and re.match(first_cell, line[2:]):
            rows.append([c.strip() for c in line.strip().strip('|').split('|')])
    return rows


def lemo_styles():
    cat = json.loads((LIB / 'styleboard/catalog.json').read_text(encoding='utf-8'))
    out = []
    for s in cat:
        out.append(dict(id=f"lemo/{s['slug']}", source='lemo', cn=s['cn'], en=s['en'], category=s['cat'],
                        uses='、'.join(s.get('uses', [])), film=f"《{s['film']}》{s.get('line_cn', '')}",
                        card=f"~/lemo-opuscar/styles/{s['slug']}/STYLE.md（技法看 DEMO.md）",
                        _src=LIB / 'styleboard/img' / f"{s['slug']}_0.jpg"))
    return out


def huashu_recipes():
    md = (HUASHU / 'references/风格配方/INDEX.md').read_text(encoding='utf-8')
    out, layer = [], ''
    for line in md.splitlines():
        if line.startswith('## 材料层'): layer = '材料层（可盖在任何题材上）'
        elif line.startswith('## 时代标本'): layer = '时代标本（速通、穿越、致敬）'
        m = re.match(r'\| (\d\d_[a-z0-9_]+) \| (.+)', line)
        if not m: continue
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        rid, name, method, motion, _tr, quality, weak = c[:7]
        cn = re.sub(r'（窄用途）', '', name)
        out.append(dict(id=f'huashu/{rid}', source='huashu', cn=cn, en=rid, category=layer,
                        uses=('窄用途；' if '窄用途' in name else '') + f'怎么动：{motion}',
                        method=method, quality=quality.split('（')[0], quality_note=quality, weak=weak,
                        card=f'.claude/skills/huashu-art-motion/references/风格配方/{rid}.md（代码在 scripts/engine/scenes/{rid}.js）',
                        _render=rid))
    return out


def huashu_grammars():
    md = (HUASHU / 'references/09-视频动画语法.md').read_text(encoding='utf-8')
    out = []
    for c in table_rows(md, r'\*\*[yt]\d '):
        gid_name = c[0].strip('*')
        gid, name = gid_name.split(' ', 1)
        slug = re.search(r'动画语法/([a-z0-9_]+)\.md', ' '.join(c)).group(1)
        out.append(dict(id=f'grammar/{slug}', source='grammar', cn=name, en=slug, category='解说动画语法',
                        uses=c[1], method=c[2], card=f'.claude/skills/huashu-art-motion/references/动画语法/{slug}.md（示范 --film demos/{slug}）',
                        _src=HUASHU / f'assets/动画语法/{slug}_总览.jpg', _strip=True))
    return out


def render_recipe(rid, dst):
    eng = HUASHU / 'scripts/engine'
    with tempfile.TemporaryDirectory() as tmp:
        cmd = ['uv', 'run', '--no-project', '--python', sys.executable, '--with', 'playwright', 'python', 'render.py',
               '--film', 'gallery', '--solo', rid, '--stills', '0.6', '--no-counter', '--out', tmp]
        r = subprocess.run(cmd, cwd=eng, capture_output=True, text=True, encoding='utf-8', errors='replace')
        png = Path(tmp) / 't000.60.png'
        if not png.exists():
            print(f'! {rid} 渲染失败：{(r.stderr or r.stdout)[-400:]}'); return False
        thumb(png, dst); return True


def video_frame(video, at, dst):
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / 'f.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(at), '-i', str(video), '-frames:v', '1', str(f)], check=True)
        thumb(f, dst)


def build(refresh):
    items = lemo_styles() + huashu_recipes() + huashu_grammars()
    for h in HOUSE: items.append(dict(h, source='house'))
    for it in items:
        name = it['id'].replace('/', '-') + '.jpg'
        dst = THUMBS / name
        it['thumb'] = f'thumbs/{name}'
        if dst.exists() and not refresh: continue
        if '_src' in it: thumb(it['_src'], dst, 1280 if it.get('_strip') else TW, None if it.get('_strip') else TH)
        elif '_render' in it: print('渲染', it['id']); render_recipe(it['_render'], dst)
        elif 'img' in it: thumb(ROOT / it['img'], dst)
        elif 'video' in it: video_frame(ROOT / it['video'], it['at'], dst)
    for it in items:
        for k in [k for k in it if k.startswith('_') or k in ('img', 'video', 'at')]: del it[k]
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'catalog.json').write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding='utf-8')
    (OUT / 'index.html').write_text(page(items), encoding='utf-8')
    n = {s: sum(i['source'] == s for i in items) for s in ('lemo', 'huashu', 'grammar', 'house')}
    print(f"→ {OUT / 'index.html'}：lemo {n['lemo']}、huashu 配方 {n['huashu']}、解说语法 {n['grammar']}、本项目 {n['house']}")


SOURCES = [('lemo', 'lemo 风格卡'), ('huashu', 'huashu 风格配方'), ('grammar', 'huashu 解说语法'), ('house', '本项目做过的')]


def page(items):
    def card(it):
        e = html.escape
        q = f'<span class="q">{e(it["quality"])}</span>' if it.get('quality') else ''
        rows = ''.join(f'<p><b>{lab}</b>{e(it[k])}</p>' for k, lab in
                       (('uses', '适合'), ('method', '手法'), ('film', '样片'), ('weak', '短板')) if it.get(k))
        wide = ' wide' if it['source'] == 'grammar' else ''
        hay = e(' '.join(str(it.get(k, '')) for k in ('id', 'cn', 'en', 'category', 'uses', 'method')).lower())
        return (f'<article class="c{wide}" data-src="{it["source"]}" data-hay="{hay}">'
                f'<img loading="lazy" src="{it["thumb"]}" alt="">'
                f'<div class="t"><h3>{e(it["cn"])} {q}</h3><code class="id">{e(it["id"])}</code>'
                f'<div class="cat">{e(it["category"])}</div>{rows}<p class="card">{e(it["card"])}</p></div></article>')
    sections = ''
    for src, label in SOURCES:
        group = [i for i in items if i['source'] == src]
        sections += f'<section data-src="{src}"><h2>{label}<span>{len(group)}</span></h2><div class="grid">{"".join(map(card, group))}</div></section>'
    chips = '<button class="on" data-f="all">全部</button>' + ''.join(f'<button data-f="{s}">{l}</button>' for s, l in SOURCES)
    return f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>风格目录</title><style>
:root{{--bg:#f6f4ef;--fg:#1d1d1f;--mute:#6b6b70;--line:#e2ded5;--card:#fff;--acc:#b5532a}}
@media (prefers-color-scheme:dark){{:root{{--bg:#16161a;--fg:#ececee;--mute:#9a9aa2;--line:#2c2c33;--card:#1f1f25;--acc:#e08a5c}}}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--fg);font:14px/1.55 system-ui,"Microsoft YaHei",sans-serif}}
header{{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);padding:14px 24px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}}
header h1{{font-size:18px;margin:0 12px 0 0}} button{{font:inherit;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:99px;padding:4px 12px;cursor:pointer}}
button.on{{background:var(--fg);color:var(--bg);border-color:var(--fg)}} input{{font:inherit;padding:5px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg);min-width:220px}}
main{{padding:8px 24px 48px}} h2{{font-size:16px;margin:28px 0 12px}} h2 span{{color:var(--mute);font-weight:400;margin-left:8px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}}
.c{{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}} .c.wide{{grid-column:1/-1}}
.c img{{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:var(--line)}} .c.wide img{{aspect-ratio:auto}}
.t{{padding:10px 14px 14px}} h3{{font-size:15px;margin:0}} .q{{color:var(--acc);font-weight:400;margin-left:4px}}
.id{{font-size:12px;color:var(--acc)}} .cat{{color:var(--mute);font-size:12px;margin:2px 0 6px}}
.t p{{margin:4px 0;font-size:13px}} .t p b{{color:var(--mute);font-weight:500;margin-right:6px}} .t p.card{{font:11px/1.4 ui-monospace,Consolas,monospace;color:var(--mute);word-break:break-all;margin-top:8px}}
.hide{{display:none!important}}
@media (max-width:600px){{header,main{{padding-left:16px;padding-right:16px}} input{{min-width:0;flex:1}}}}
</style></head><body>
<header><h1>风格目录 · {len(items)} 种</h1>{chips}<input id="q" placeholder="搜名字、用途、手法"></header>
<main>{sections}</main>
<script>
const chips=[...document.querySelectorAll('header button')],q=document.getElementById('q');let f='all';
function apply(){{const s=q.value.trim().toLowerCase();
 document.querySelectorAll('section').forEach(sec=>{{let n=0;sec.querySelectorAll('.c').forEach(c=>{{const ok=(f==='all'||c.dataset.src===f)&&(!s||c.dataset.hay.includes(s));c.classList.toggle('hide',!ok);n+=ok}});sec.classList.toggle('hide',!n)}})}}
chips.forEach(b=>b.onclick=()=>{{chips.forEach(x=>x.classList.toggle('on',x===b));f=b.dataset.f;apply()}});q.oninput=apply;
</script></body></html>'''


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--refresh', action='store_true', help='缩略图全部重做')
    build(ap.parse_args().refresh)
