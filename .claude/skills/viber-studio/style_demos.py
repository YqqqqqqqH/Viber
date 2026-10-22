"""风格样片（viber-studio 第 2 步）：把 <片>/styles/ 下的候选页面渲成静帧和小样，拼成一张对比图和一条并排视频。

    python .claude/skills/viber-studio/style_demos.py <片>               # 渲静帧 + 小样 + 拼图 + 并排视频
    python .claude/skills/viber-studio/style_demos.py <片> --no-clips    # 只渲静帧和拼图（改稿时快）
    python .claude/skills/viber-studio/style_demos.py <片> --sheet-only  # 不渲，只重拼

<片>/styles/candidates.json：
    {"moment": "所有候选画的同一个时刻（一句话）",
     "candidates": [{"dir": "1-ukiyoe", "id": "lemo/ukiyoe", "name": "浮世绘",
                     "why": "为什么适合这个题材", "risk": "最没把握的地方", "key": 2.5}, …]}
    dir 是 styles/ 下的页面文件夹（new_film.sh <片>/styles/<dir> --page 开的），id 是风格目录里的 id，key 是招牌那一帧的秒数。

输出都在 <片>/styles/：<dir>/key.jpg、<dir>/demo.mp4、styles_sheet.jpg、styles_grid.mp4。
参考缩略图取自 refs/style-catalog（先跑过 style_catalog.py），没有就不画。
"""
import argparse, json, os, shutil, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
LIB = Path(os.environ.get('LIB', Path.home() / 'lemo-opuscar'))
CATALOG = ROOT / 'refs/style-catalog'
CW, CH, CAP, GAP, PAD = 960, 540, 150, 24, 40           # 拼图：每格画面 960×540，下面一条说明（右边放参考缩略图）
RW, RH = 208, 117
BG, FG, MUTE, ACC = (244, 242, 236), (29, 29, 31), (110, 110, 116), (181, 83, 42)
NUM = '①②③④⑤⑥⑦⑧⑨'


def font(size, bold=False):
    for f in (['msyhbd.ttc', 'msyh.ttc'] if bold else ['msyh.ttc']) + ['simhei.ttf']:
        p = Path('C:/Windows/Fonts') / f
        if p.exists(): return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def fit(d, text, f, w):
    """一行放不下就截断加省略号。"""
    if d.textlength(text, font=f) <= w: return text
    while text and d.textlength(text + '…', font=f) > w: text = text[:-1]
    return text + '…'


def node(*args):
    subprocess.run(['node', *map(str, args)], cwd=LIB, check=True)


def render(styles, cands, clips):
    for c in cands:
        d = styles / c['dir']
        node('core/render/still.mjs', d, c['key'], '--out', d, '--prefix', 'key_')
        src = d / f"key_{c['key']}.jpg"
        if not src.exists():                                  # still.mjs 用参数原样当文件名
            src = next(d.glob('key_*.jpg'))
        shutil.move(src, d / 'key.jpg')
        if clips:
            node('core/render/video.mjs', d, '--fps', 30, '--size', '1280x720', '--out', d / 'demo.mp4')


def refs():
    p = CATALOG / 'catalog.json'
    if not p.exists():
        print('! 没有 refs/style-catalog/catalog.json，拼图里不放参考缩略图（先跑 style_catalog.py）'); return {}
    return {i['id']: CATALOG / i['thumb'] for i in json.loads(p.read_text(encoding='utf-8'))}


def sheet(styles, spec, cands):
    ref = refs()
    cols = 1 if len(cands) == 1 else 2
    rows = (len(cands) + cols - 1) // cols
    head = 92
    W = PAD * 2 + cols * CW + (cols - 1) * GAP
    H = head + PAD + rows * (CH + CAP) + (rows - 1) * GAP
    im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
    d.text((PAD, 28), fit(d, '风格样片 · ' + spec.get('moment', ''), font(34, True), W - 2 * PAD), font=font(34, True), fill=FG)
    for i, c in enumerate(cands):
        x = PAD + (i % cols) * (CW + GAP); y = head + PAD + (i // cols) * (CH + CAP + GAP)
        im.paste(Image.open(styles / c['dir'] / 'key.jpg').convert('RGB').resize((CW, CH), Image.LANCZOS), (x, y))
        r = ref.get(c['id']); tw = CW
        if r and r.exists():                                  # 说明栏右边：库里这个风格原本的样子（不压在样片上）
            t = Image.open(r).convert('RGB')
            if t.width / t.height > 2:                        # 解说语法是一条分镜条：取中间一段
                cw = round(t.height * 16 / 9); t = t.crop(((t.width - cw) // 2, 0, (t.width + cw) // 2, t.height))
            im.paste(t.resize((RW, RH), Image.LANCZOS), (x + CW - RW, y + CH + 8))
            d.text((x + CW - RW, y + CH + 8 + RH + 2), '库里的样子', font=font(15), fill=MUTE)
            tw = CW - RW - 20
        ty = y + CH + 12
        n = NUM[i] if i < len(NUM) else f'{i + 1}.'
        d.text((x, ty), f"{n} {c['name']}", font=font(30, True), fill=FG)
        d.text((x + d.textlength(f"{n} {c['name']}", font=font(30, True)) + 14, ty + 9), c['id'], font=font(20), fill=ACC)
        d.text((x, ty + 46), fit(d, c.get('why', ''), font(21), tw), font=font(21), fill=FG)
        d.text((x, ty + 80), fit(d, '风险：' + c.get('risk', ''), font(21), tw), font=font(21), fill=MUTE)
    out = styles / 'styles_sheet.jpg'; im.save(out, quality=90); print('拼图 →', out)


def duration(f):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def grid(styles, cands):
    """所有小样并排放一条视频，左上角标号（不用 drawtext，这台机器上它会崩，标号用 PIL 画成透明 PNG 叠上去）。"""
    clips = [styles / c['dir'] / 'demo.mp4' for c in cands]
    if len(clips) < 2 or not all(f.exists() for f in clips): return
    w, h = CW, CH; cols = 2; rows = (len(clips) + 1) // 2
    tmp = styles / '_labels'; tmp.mkdir(exist_ok=True)
    args, chains = [], []
    for i, (c, f) in enumerate(zip(cands, clips)):
        lab = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(lab)
        text = f"{NUM[i] if i < len(NUM) else i + 1} {c['name']}"
        tw = d.textlength(text, font=font(30, True))
        d.rounded_rectangle((12, 12, 12 + tw + 28, 62), 10, fill=(0, 0, 0, 150))
        d.text((26, 16), text, font=font(30, True), fill=(255, 255, 255))
        lp = tmp / f'{i}.png'; lab.save(lp)
        args += ['-i', str(f), '-i', str(lp)]
        chains.append(f'[{2 * i}:v]scale={w}:{h},tpad=stop_mode=clone:stop_duration=60[s{i}];[s{i}][{2 * i + 1}:v]overlay=0:0[v{i}]')
    n = len(clips)
    if n % 2:                                                  # 单数：补一格底色
        args += ['-f', 'lavfi', '-i', f'color=c=0xf4f2ec:s={w}x{h}:r=30']
        chains.append(f'[{2 * n}:v]null[v{n}]'); n += 1
    layout = '|'.join(f'{(i % cols) * w}_{(i // cols) * h}' for i in range(n))
    fc = ';'.join(chains) + ';' + ''.join(f'[v{i}]' for i in range(n)) + f'xstack=inputs={n}:layout={layout}[out]'
    dur = max(duration(f) for f in clips)
    out = styles / 'styles_grid.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args, '-filter_complex', fc, '-map', '[out]', '-t', f'{dur:.2f}',
                    '-r', '30', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', str(out)], check=True)
    shutil.rmtree(tmp); print('并排视频 →', out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('film')
    ap.add_argument('--no-clips', action='store_true')
    ap.add_argument('--sheet-only', action='store_true')
    a = ap.parse_args()
    styles = Path(a.film).resolve() / 'styles'
    spec = json.loads((styles / 'candidates.json').read_text(encoding='utf-8'))
    cands = spec['candidates']
    if not a.sheet_only: render(styles, cands, not a.no_clips)
    sheet(styles, spec, cands)
    if not a.no_clips: grid(styles, cands)
