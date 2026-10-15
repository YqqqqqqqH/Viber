"""《八毫米的楼》声音：拟音 + 轻配乐，没有人声。读 events.json（页面的 window.EV），写 renders/mix.wav。

拟音：lemo core/audio/sfx.py 的积木（click、clack、whoosh、thump、ding、rumble）加几样自己合成的
（屏幕亮起、线圈电流、磁感线、解胶、像素、红外）。每个事件对应镜头表里的一个画面动作。
配乐：numpy 合成，84 BPM，C 小调低频铺底 + 稀疏的钢片琴拨音，按 brief 的声音表分段；
结尾铺底落在主音上自然衰减，不用硬静音。响度交给 build.sh 的 mux.sh（-14 LUFS）。
"""
import json, os, pathlib, sys

import numpy as np
import soundfile as sf

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, os.path.join(os.environ['LIB'], 'core', 'audio'))
import sfx  # noqa: E402

SR = sfx.SR
ev = json.loads((HERE / 'events.json').read_text(encoding='utf-8'))
DUR = ev['dur'] + 2.0
buf = np.zeros((int(DUR * SR), 2), np.float32)
rng = np.random.default_rng(18)


def t_(d):
    return np.arange(int(round(d * SR))) / SR


def env(d, a, r):
    """线性起音 a 秒、余弦释放 r 秒的包络"""
    tt = t_(d)
    e = np.minimum(1, tt / max(a, 1e-4))
    rel = np.clip((d - tt) / max(r, 1e-4), 0, 1)
    return e * (0.5 - 0.5 * np.cos(np.pi * rel))


# ---------------------------------------------------------------- 自己合成的几样
def wake(v=1.0):
    d = .32; tt = t_(d); f = 1250 + 650 * tt / d
    return sfx.norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, .01, .25) + .3 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * env(d, .01, .15)) * v


def hum(v=1.0):
    d = 1.4; tt = t_(d)
    x = np.sin(2 * np.pi * 120 * tt) + .45 * np.sin(2 * np.pi * 240 * tt) + .2 * np.sin(2 * np.pi * 360 * tt)
    return sfx.norm(x * env(d, .25, .6)) * v


def shimmer(v=1.0):
    d = 3.2
    x = sfx.bp(sfx.noise(d), 2500, 7000) * env(d, 1.0, 1.4)
    return sfx.norm(x) * v


def peel(v=1.0):
    d = 1.6; tt = t_(d)
    x = sfx.hp(sfx.noise(d), 3200) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 7 * tt))) * env(d, .15, .5)
    return sfx.norm(x) * v


def sparkle(v=1.0):
    d = 3.8; out = np.zeros(int(d * SR))
    for i in range(46):
        s = int((i / 46) * (d - .1) * SR + rng.integers(0, 2400))
        c = sfx.click(2.4 + rng.random() * .8, .3 + rng.random() * .3)
        out[s:s + len(c)] += c[:len(out) - s]
    return sfx.norm(out) * v


def ping(v=1.0):
    d = 1.2; tt = t_(d)
    x = np.sin(2 * np.pi * 1760 * tt) * np.exp(-tt / .35) + .3 * np.sin(2 * np.pi * 3520 * tt) * np.exp(-tt / .18)
    return sfx.norm(x) * v


def swell(v=1.0):
    d = 6.5; tt = t_(d)
    x = sfx.lp(sfx.brown(d), 260) * np.minimum(1, tt / 4.5) * np.clip((d - tt) / 1.5, 0, 1)
    x += .4 * np.sin(2 * np.pi * 55 * tt) * np.minimum(1, tt / 5) * np.clip((d - tt) / 1.5, 0, 1)
    return sfx.norm(x) * v


def boom(v=1.0):
    d = 5.0; tt = t_(d)
    x = sfx.lp(sfx.brown(d), 160) * np.exp(-tt / 1.6) + .8 * np.sin(2 * np.pi * 42 * tt * (1 - .08 * tt)) * np.exp(-tt / 1.2)
    x[: int(.01 * SR)] *= np.linspace(0, 1, int(.01 * SR))
    return sfx.norm(x) * v


def mix2(*parts):
    n = max(len(p) for p in parts); out = np.zeros(n)
    for p in parts: out[: len(p)] += p
    return out


# 事件类型 → (声音, 音量, 声像)；没登记的类型直接报错，免得漏音
FOLEY = {
    'wake': lambda e: (wake(.55), .7, 0),
    'rise': lambda e: (mix2(sfx.click(.75 + .12 * e.get('n', 0), .6), sfx.whoosh(.55, .28)), .55, -.2 + .12 * e.get('n', 0)),
    'settle': lambda e: (sfx.thump(.5, 62), .5, 0),
    'hum': lambda e: (hum(.5), .45, -.1),
    'snap': lambda e: (sfx.clack(1.5, .8), .55, -.1),
    'shimmer': lambda e: (shimmer(.35), .3, 0),
    'tap': lambda e: (sfx.clack(1.9 * e.get('pitch', 1), .5), .45, .2),
    'whoosh': lambda e: (sfx.whoosh(.7, .6), .45, .1),
    'blade': lambda e: (sfx.click(2.3 * e.get('pitch', 1), .6), .5, .05),
    'seat': lambda e: (sfx.thump(.45, 95), .45, 0),
    'ding': lambda e: (sfx.ding(.5), .35, 0),
    'peel': lambda e: (peel(.5), .35, -.15),
    'drop': lambda e: (mix2(sfx.thump(.55, 82), sfx.click(.7, .4)), .55, -.1),
    'tick': lambda e: (sfx.click(2.6, .3 if e.get('soft') else .5), .35 if e.get('soft') else .45, .1),
    'swell': lambda e: (swell(.6), .45, 0),
    'sparkle': lambda e: (sparkle(.3), .28, .15),
    'ping': lambda e: (ping(.45), .35, -.2),
    'land': lambda e: (mix2(sfx.thump(.55, 64 + 5 * e.get('n', 0)), sfx.click(.6, .35)), .55, -.2 + .1 * e.get('n', 0)),
    'boom': lambda e: (boom(.8), .6, 0),
}


def put(x, at, gain, pan):
    sfx.add(buf, x.astype(np.float32), at, gain=gain, pan=pan)


for e in ev['ev']:
    if e['type'] not in FOLEY:
        sys.exit(f"mix.py：事件类型 {e['type']!r}（{e['t']}s）没有对应的声音，在 FOLEY 里加一行")
    x, g, pan = FOLEY[e['type']](e)
    put(x, e['t'], g * e.get('gain', 1.0), pan)

# ---------------------------------------------------------------- 配乐：84 BPM，C 小调
BEAT = 60 / 84
BAR = 4 * BEAT
NOTE = lambda midi: 440 * 2 ** ((midi - 69) / 12)


def pad_note(midi, t0, t1, amp):
    d = t1 - t0; tt = t_(d); f = NOTE(midi)
    x = np.zeros_like(tt)
    for det, a in [(-0.06, .5), (0.0, 1.0), (0.07, .5)]:
        x += a * np.sin(2 * np.pi * f * (1 + det / 100) * tt + rng.random() * 6)
    x += .18 * np.sin(2 * np.pi * 2 * f * tt)
    x *= (0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * tt))
    x = sfx.lp(x, 900) * env(d, 2.5, 3.5) * amp
    s = int(t0 * SR)
    seg = buf[s:s + len(x)]
    seg[:, 0] += x[:len(seg)] * .95
    seg[:, 1] += x[:len(seg)] * 1.0


def celesta(midi, t0, amp, pan):
    d = 2.2; tt = t_(d); f = NOTE(midi)
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / .9) + .35 * np.sin(2 * np.pi * 4 * f * tt) * np.exp(-tt / .25) + .12 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt / .5)
    x[: int(.004 * SR)] *= np.linspace(0, 1, int(.004 * SR))
    put(x * amp, t0, 1.0, pan)


# 铺底：C2 + G2 + Eb3，五楼开始加一个 G3，结尾落在 C
pad_note(36, 5.2, 131.0, .055)
pad_note(43, 5.6, 131.0, .045)
pad_note(51, 6.0, 129.0, .03)
pad_note(55, 94.0, 129.0, .025)
pad_note(36, 128.0, 143.5, .06)
pad_note(48, 128.5, 143.0, .035)

# 钢片琴：C 小调五声（C Eb F G Bb），一楼和二楼每两小节一个音，三楼每小节一个音，之后回到两小节
scale = [72, 75, 77, 79, 82, 84]
melody = [0, 2, 3, 1, 4, 3, 2, 0, 5, 3, 1, 2]
k = 0
segments = [(12.0, 40.0, 2), (40.0, 72.0, 1), (72.0, 129.0, 2)]
for a, b, bars in segments:
    t = a
    while t < b:
        celesta(scale[melody[k % len(melody)]], t, .09, .25 * np.sin(k))
        k += 1
        t += bars * BAR

(HERE / 'renders').mkdir(exist_ok=True)
out = np.stack([sfx.limit(buf[:, 0], .6), sfx.limit(buf[:, 1], .6)], axis=1)   # lower ceiling: -14 LUFS without hot peaks
sf.write(HERE / 'renders' / 'mix.wav', out, SR)
print(f"mix.py：{len(ev['ev'])} 个音效 + 配乐 → renders/mix.wav（{DUR:.1f}s）")
