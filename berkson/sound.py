# -*- coding: utf-8 -*-
"""《伯克森悖论》的声音。在引擎 audio.py 的合成器上，加了一批跟画面一一对上的音效（项目自用，不改引擎）。

  python sound.py                    # audio/events.json → audio/score.wav → renders/final.mp4（renders/raw.mp4 + 声音）
  python sound.py --wav-only         # 只出 wav
  python sound.py --check 55 70      # 画这一段的波形 + 频谱图 → review/sound_55-70.png，看有没有断掉、炸掉

事件由 film.js 里的 fr.sfx(时刻, 名字, 参数) 登记，render.py --events 导出。新加的事件和它对应的画面：
  swipe    约会卡从右边滑进来、卡片滑出屏幕     cardtap  卡片落定
  shuffle  卡片重新排队、剪影换成襁褓           flick    发牌时每一张卡、卡片飞回原位
  pluck    平均数一个个出来：音高就是那个数（6 高、4 低，3.5 六声同音）
  dice     骰子翻滚落下：两下弹跳、最后几下细碎的晃动
  draw     线一笔笔画出来：pen 是铅笔（医院、校门、巷子、秤），neon 是筛网那条玫红的亮线
  sift     没过线的卡从筛网上漏下去：一阵细沙声，加一个往下走的滑音
  whoosh   镜头推进 / 拉出（in 由低到高，out 由高到低）        flip  牌子翻面
  boom     "规律在筛子上"那一下的低音                          swell 平均数的水位记号一起发亮
  monitor  医院：心电监护的哔声     bell  校门：两声铃     street  巷子：人声嘈杂和碗碟声
  shutter  卷帘门拉下来             cloth 襁褓放上秤       spring  秤的指针来回摆
  knell    暗下去的襁褓：一声很轻的低钟                    pop / notify  卡片出现、手机屏幕亮起
  grains   片名的点阵聚拢
原来的 hush（之后整段静音）去掉了：它在 1:02 把刚响起的和弦一刀切断，听起来像卡顿。
"""
import importlib.util, json, subprocess, sys
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ENGINE = Path(r"C:/Users/Yqh/.claude/skills/vibe-knowledge-film/engine/audio.py")
_spec = importlib.util.spec_from_file_location("vkaudio", ENGINE); A = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(A)
SR, hz, tone, env_exp, pan, add = A.SR, A.hz, A.tone, A.env_exp, A.pan, A.add
PENTA = A.PENTA
PROJ = Path(__file__).resolve().parent

# ---------- 小工具 ----------
def bp(x, lo, hi, order=2):
    lo = max(20.0, lo); hi = min(SR / 2 * .95, hi)
    return sosfilt(butter(order, [lo / (SR / 2), hi / (SR / 2)], "band", output="sos"), x, axis=0)
def lp(x, fc, order=2): return sosfilt(butter(order, min(fc, SR / 2 * .95) / (SR / 2), "low", output="sos"), x, axis=0)
def hp(x, fc, order=2): return sosfilt(butter(order, fc / (SR / 2), "high", output="sos"), x, axis=0)
def secs(d): return max(1, int(d * SR))
def pan_move(x, p0, p1):                              # 声像从 p0 移到 p1（-1 左 … 1 右）
    p = np.linspace(p0, p1, len(x)); return np.stack([x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)], 1)
def sweep_noise(rng, n, f0, f1, width=.7):            # 一段噪声，带通的中心频率从 f0 滑到 f1
    noise = rng.standard_normal(n); out = np.zeros(n); segs = 16; L = max(1, n // segs); win = np.hanning(2 * L + 1)
    for i in range(segs + 1):
        fc = f0 * (f1 / f0) ** (i / segs); y = bp(noise, fc * (1 - width / 2), fc * (1 + width / 2))
        c = i * L; a, b = max(0, c - L), min(n, c + L + 1); out[a:b] += y[a:b] * win[a - (c - L):b - (c - L)]
    return out
def hump(n, peak=.5):                                 # 先起后落的包络，峰在 peak 处
    t = np.linspace(0, 1, n); return np.where(t < peak, np.sin(np.pi / 2 * t / peak) ** 2, np.cos(np.pi / 2 * (t - peak) / (1 - peak)) ** 2)
def burst(rng, d, lo, hi, tau):
    n = secs(d); return bp(rng.standard_normal(n), lo, hi) * env_exp(n, tau, .0008)

# ---------- 新事件 ----------
def ev_swipe(rng, p):
    n = secs(.32); x = sweep_noise(rng, n, 7000, 1600, .8) * hump(n, .35)
    p0 = p.get("pan", .6); return pan_move(x * .5 * p.get("gain", 1), p0, p0 * .2)
def ev_cardtap(rng, p):
    n = secs(.12); t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * np.cumsum(140 * np.exp(-t * 20) + 85) / SR) * env_exp(n, .035, .001)
    click = np.zeros(n); c = burst(rng, .012, 2000, 6500, .003); click[:len(c)] += c
    return pan((thump * .5 + click * .35) * p.get("gain", 1), p.get("pan", 0))
def ev_flick(rng, p):
    n = secs(.05); x = burst(rng, .05, 2500, 7500, .007) + np.sin(2 * np.pi * rng.uniform(2600, 3400) * np.arange(n) / SR) * env_exp(n, .004) * .2
    return pan(x * .32 * p.get("gain", 1), p.get("pan", rng.uniform(-.4, .4)))
def ev_shuffle(rng, p):
    d = p.get("dur", 1.2); n = secs(d + .1); out = np.zeros((n, 2))
    bed = bp(rng.standard_normal(n), 1500, 5000) * (.5 + .5 * np.sin(2 * np.pi * 24 * np.arange(n) / SR)) * hump(n, .4) * .05
    out += pan(bed, 0)
    for k in range(10): add(out, ev_flick(rng, {"gain": rng.uniform(.5, 1), "pan": rng.uniform(-.5, .5)}), rng.uniform(0, d))
    return out * p.get("gain", 1)
def ev_pluck(rng, p):                                 # 音高 = 数值：v 2→第 1 级 … 6→第 9 级（大调五声）
    v = float(p.get("v", 3.5)); idx = int(np.clip(round((v - 1.5) * 2), 0, len(PENTA) - 1))
    f = hz(PENTA[idx] + 12)
    x = tone(f, 1.2, .5, ((1, 1), (3.99, .22), (9.9, .05)), attack=.003)
    n = secs(.01); x[:n] += hp(rng.standard_normal(n), 3000) * env_exp(n, .002) * .2
    return pan(x * .26 * p.get("gain", 1), p.get("pan", 0))
def impact(rng, amp):                                  # 骰子撞一下桌面：塑料的"嗒" + 一点点低频
    n = secs(.09); t = np.arange(n) / SR
    ping = (np.sin(2 * np.pi * rng.uniform(1800, 2100) * t) * .6 + np.sin(2 * np.pi * rng.uniform(3300, 3700) * t) * .4) * env_exp(n, .018, .0005)
    knock = np.sin(2 * np.pi * 190 * t) * env_exp(n, .025, .001) * .6
    x = ping + knock; c = burst(rng, .01, 2500, 8000, .002); x[:len(c)] += c * .8
    return x * amp
def ev_dice(rng, p):                                  # 和画面同步：k≈.45、.91 两次弹跳，落定前再晃两下
    d = p.get("dur", 1.0); n = secs(d + .2); x = np.zeros(n)
    x += sweep_noise(rng, n, 900, 2500, .9) * hump(n, .4) * .06          # 空中翻滚的风声
    for tt, amp in ((.45, 1), (.91, .8), (.95, .35), (.985, .22)):
        y = impact(rng, amp); i = int(tt * d * SR); x[i:i + len(y)] += y[:max(0, n - i)]
    return pan(x * .45 * p.get("gain", 1), p.get("pan", 0))
def ev_draw(rng, p):
    d = p.get("dur", 1.5); n = secs(d); t = np.arange(n) / SR
    if p.get("kind") == "neon":                       # 筛网那条亮线：电流的嗡声 + 一个往上走的亮音 + 零星的噼啪
        hum = sum(np.sin(2 * np.pi * 100 * k * t) / k for k in (1, 2, 3, 4)) * .03
        f = 420 * 2 ** (t / d * 1.1); glide = np.sin(2 * np.pi * np.cumsum(f) / SR) * .05
        crackle = np.zeros(n)
        for _ in range(int(14 * d)): c = burst(rng, .006, 3000, 9000, .0015); i = rng.integers(0, max(1, n - len(c))); crackle[i:i + len(c)] += c * rng.uniform(.3, 1)
        x = (hum + glide + crackle * .3) * hump(n, .15)
    else:                                             # 铅笔：带通噪声，一笔一笔地起伏
        strokes = lp(rng.standard_normal(n), 9); strokes = np.clip(strokes / (np.abs(strokes).max() + 1e-9), 0, 1) ** .7
        x = bp(rng.standard_normal(n), 1800, 5200) * strokes * hump(n, .1) * .2
    return pan(x * p.get("gain", 1), p.get("pan", 0))
def ev_sift(rng, p):                                  # 细沙漏下去：密的颗粒先多后少，底下一个往下走的滑音
    d = p.get("dur", 2.0); n = secs(d + .3); t = np.arange(n) / SR; x = np.zeros(n)
    for _ in range(int(700 * d)):
        tt = rng.exponential(d / 3.5)
        if tt > d: continue
        g = burst(rng, rng.uniform(.001, .003), 2500, 9000, .0008); i = int(tt * SR); x[i:i + len(g)] += g[:max(0, n - i)] * rng.uniform(.2, 1)
    f = 700 * 2 ** (-t / d * 1.6); glide = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, d * .45, .05) * .05
    fall = sweep_noise(rng, n, 2600, 450, .8) * hump(n, .3) * .06
    return pan_move((x * .22 + glide + fall) * p.get("gain", 1), -.3, .3)
def ev_whoosh(rng, p):
    d = p.get("dur", 1.0); n = secs(d); t = np.arange(n) / SR; inward = p.get("dir", "in") == "in"
    x = sweep_noise(rng, n, 280 if inward else 3200, 3200 if inward else 280, .9) * hump(n, .7 if inward else .3)
    f = (180 * 2 ** (t / d * 1.6)) if inward else (520 * 2 ** (-t / d * 1.6)); body = np.sin(2 * np.pi * np.cumsum(f) / SR) * hump(n, .7 if inward else .3) * .05
    return pan_move((x * .32 + body) * p.get("gain", 1), -.4 if inward else .4, .4 if inward else -.4)
def ev_boom(rng, p):
    n = secs(1.8); t = np.arange(n) / SR; f = 34 + 36 * np.exp(-t * 3)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, .55, .004) + lp(rng.standard_normal(n), 220) * env_exp(n, .08) * .6
    return pan(x * .55 * p.get("gain", 1), 0)
def ev_flip(rng, p):
    n = secs(.25); x = np.zeros(n)
    for tt, amp in ((0, 1), (.085, .7)):
        b = burst(rng, .04, 1200, 4500, .009) * amp; i = int(tt * SR); x[i:i + len(b)] += b
    x += np.sin(2 * np.pi * 300 * np.arange(n) / SR) * env_exp(n, .02) * .25
    return pan(x * .45 * p.get("gain", 1), .35)
def ev_swell(rng, p):
    d = p.get("dur", 2.5); n = secs(d); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * hz(12 + s) * t) * a for s, a in ((0, 1), (7, .6), (12, .4), (16, .25))) * hump(n, .5)
    return pan(x * .045 * p.get("gain", 1), 0)
def ev_monitor(rng, p):                               # 心电监护：每 0.9 秒一声"哔"，底下一点房间的底噪
    d = p.get("dur", 5); n = secs(d); t = np.arange(n) / SR; x = lp(rng.standard_normal(n), 400) * .012
    for k in range(int(d / .9)):
        i = int((.2 + k * .9) * SR); m = secs(.11); tb = np.arange(m) / SR
        b = (np.sin(2 * np.pi * 960 * tb) + .15 * np.sin(2 * np.pi * 1920 * tb)) * np.minimum(1, tb / .006) * np.minimum(1, (.11 - tb) / .02)
        x[i:i + m] += b[:max(0, n - i)] * .09
    return pan(x * hump(n, .1) ** .3 * p.get("gain", 1), .25)
def bell_note(f, d=1.8, amp=1):
    return tone(f, d, .9, ((1, 1), (2.0, .5), (2.76, .35), (5.4, .12)), attack=.002) * amp
def ev_bell(rng, p):
    n = secs(2.5); x = np.zeros(n); a = bell_note(659.3); x[:len(a)] += a; b = bell_note(523.3); i = secs(.45); x[i:i + len(b)] += b[:n - i]
    return pan(x * .1 * p.get("gain", 1), -.2)
def ev_street(rng, p):                                # 巷子：人声嘈杂（棕噪声 + 一张一合的音节）+ 零星的碗碟声
    d = p.get("dur", 6); n = secs(d); t = np.arange(n) / SR
    brown = np.cumsum(rng.standard_normal(n)); brown -= lp(brown, 20); brown /= np.abs(brown).max() + 1e-9
    syll = sum(np.clip(np.sin(2 * np.pi * rng.uniform(2.5, 5.5) * t + rng.uniform(0, 6)), 0, 1) for _ in range(5)) / 5
    crowd = bp(brown, 250, 1300) * (.4 + .6 * syll) * .5
    clink = np.zeros(n)
    for _ in range(int(d * 1.6)):
        m = secs(.25); tb = np.arange(m) / SR; f0 = rng.uniform(2300, 3800)
        c = (np.sin(2 * np.pi * f0 * tb) + .5 * np.sin(2 * np.pi * f0 * 2.7 * tb)) * env_exp(m, .05, .001); i = rng.integers(0, max(1, n - m)); clink[i:i + m] += c * rng.uniform(.2, .6)
    x = (crowd + clink * .12) * hump(n, .25) ** .5
    return np.stack([x, np.roll(x, 900)], 1) * .3 * p.get("gain", 1)
def ev_shutter(rng, p):                               # 卷帘门：一串金属片的哗啦，最后"哐"一声落地
    n = secs(1.1); x = np.zeros(n); tt = 0.0
    while tt < .78:
        m = secs(.03); tb = np.arange(m) / SR; f0 = rng.uniform(1150, 1500)
        c = (np.sin(2 * np.pi * f0 * tb) + .6 * np.sin(2 * np.pi * f0 * 2.71 * tb) + .3 * np.sin(2 * np.pi * f0 * 5.2 * tb)) * env_exp(m, .008, .0005)
        i = int(tt * SR); x[i:i + m] += c * (.5 + .5 * tt / .78); tt += rng.uniform(.022, .038)
    m = secs(.3); tb = np.arange(m) / SR; i = secs(.8)
    clank = (np.sin(2 * np.pi * 210 * tb) + .7 * np.sin(2 * np.pi * 210 * 2.4 * tb) + .4 * np.sin(2 * np.pi * 210 * 4.1 * tb)) * env_exp(m, .09, .001)
    x[i:i + m] += clank * 1.4; c = burst(rng, .05, 300, 3000, .02); x[i:i + len(c)] += c * .8
    return pan(x * .16 * p.get("gain", 1), p.get("pan", 0))
def ev_cloth(rng, p):
    n = secs(.2); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 450) * env_exp(n, .05, .004) + np.sin(2 * np.pi * 110 * t) * env_exp(n, .07, .003) * .5
    return pan(x * .5 * p.get("gain", 1), 0)
def ev_spring(rng, p):                                # 指针来回摆：一个越摆越小的"嘤嘤"声，节奏跟画面的摆动一样
    n = secs(1.6); t = np.arange(n) / SR; f = 520 + 140 * np.exp(-3 * t) * np.cos(8 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, .45, .01) * (.6 + .4 * np.abs(np.cos(8 * t)))
    return pan(x * .07 * p.get("gain", 1), 0)
def ev_knell(rng, p):
    x = tone(hz(0), 3, 1.1, ((1, 1), (2.4, .35), (3.9, .12)), attack=.015)
    return pan(x * .12 * p.get("gain", 1), 0)
def ev_pop(rng, p):
    n = secs(.12); t = np.arange(n) / SR; f = 380 + 440 * np.minimum(1, t / .07)
    return pan(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, .045, .002) * .18 * p.get("gain", 1), 0)
def ev_notify(rng, p):
    out = np.zeros(secs(.5))
    for i0, f, d in ((0, 1318.5, .08), (.09, 1760, .14)):
        m = secs(d); tb = np.arange(m) / SR; b = (np.sin(2 * np.pi * f * tb) + .2 * np.sin(2 * np.pi * 2 * f * tb)) * np.minimum(1, tb / .004) * np.exp(-tb / .06)
        i = secs(i0); out[i:i + m] += b
    return pan(out * .1 * p.get("gain", 1), .2)
def ev_grains(rng, p):                                # 片名的点阵聚拢：一阵高音的细碎亮点，先密后疏
    d = p.get("dur", 2.8); n = secs(d + .3); x = np.zeros(n)
    for _ in range(int(60 * d)):
        tt = d * rng.beta(1.6, 2.4); m = secs(.06); tb = np.arange(m) / SR; f = hz(PENTA[rng.integers(4, 10)] + 24)
        g = np.sin(2 * np.pi * f * tb) * env_exp(m, .012, .001); i = int(tt * SR); x[i:i + m] += g[:max(0, n - i)] * rng.uniform(.3, 1)
    return np.stack([x, np.roll(x, 700)], 1) * .045 * p.get("gain", 1)

NEW = dict(swipe=ev_swipe, cardtap=ev_cardtap, flick=ev_flick, shuffle=ev_shuffle, pluck=ev_pluck, dice=ev_dice, draw=ev_draw, sift=ev_sift,
           whoosh=ev_whoosh, boom=ev_boom, flip=ev_flip, swell=ev_swell, monitor=ev_monitor, bell=ev_bell, street=ev_street, shutter=ev_shutter,
           cloth=ev_cloth, spring=ev_spring, knell=ev_knell, pop=ev_pop, notify=ev_notify, grains=ev_grains)
TONAL = {"chord", "bloom", "soft", "shimmer", "pluck", "bell", "knell", "swell", "grains", "notify", "tick", "rise"}   # 这些进大混响，其余的（拟音）只给一点点

def synth(spec):
    end = spec["end"]; meta = spec.get("meta") or {}; n = int((end + .05) * SR); rng = np.random.default_rng(20261009)
    tonal, foley = np.zeros((n, 2)), np.zeros((n, 2)); t = np.arange(n) / SR; root = meta.get("root", 0)
    for when, name, p in spec["events"]:
        fn = NEW.get(name) or A.EV.get(name)
        if fn is None: continue                        # hush 之类的不再用
        y = fn(rng, dict(p, root=p.get("root", 0) + root) if name in ("chord", "bloom") else p)
        add(tonal if name in TONAL else foley, y, when)
    out = A.reverb(tonal, rng, 3.6, .42) + A.reverb(foley, rng, 1.4, .14)
    lv = .05 * meta.get("drone", 1)                     # 垫底的低频长音（同引擎）
    d = (np.sin(2 * np.pi * hz(root - 24) * t) + .6 * np.sin(2 * np.pi * hz(root - 24 + .08) * 2 * t) + .25 * np.sin(2 * np.pi * hz(root - 12 + 7) * t)) * (.75 + .25 * np.sin(2 * np.pi * t / 11))
    air = A.lowpass(A.highpass(rng.standard_normal(n), 300), 1800) * .012 * (.6 + .4 * np.sin(2 * np.pi * t / 17))
    out += np.stack([d * lv + air, d * lv + np.roll(air, 4000)], 1)
    g = np.clip(t / .6, 0, 1) * np.clip((end - t) / 1.2, 0, 1)
    return out * g[:, None]

def check(x, a, b):                                    # 一段的波形（RMS）+ 频谱图，看有没有断掉或者炸掉
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    seg = x[int(a * SR):int(b * SR)].mean(1); hop = SR // 100
    rms = np.sqrt(np.convolve(seg ** 2, np.ones(hop) / hop, "same"))[::hop]
    fig, ax = plt.subplots(2, 1, figsize=(14, 6), sharex=True)
    ax[0].plot(np.linspace(a, b, len(rms)), 20 * np.log10(rms + 1e-6)); ax[0].set_ylim(-70, 0); ax[0].set_ylabel("RMS dB"); ax[0].grid(alpha=.3)
    ax[1].specgram(seg, NFFT=2048, Fs=SR, noverlap=1536, cmap="magma", xextent=(a, b)); ax[1].set_ylim(0, 9000); ax[1].set_ylabel("Hz")
    out = PROJ / f"review/sound_{a:g}-{b:g}.png"; fig.tight_layout(); fig.savefig(out, dpi=80); print("check:", out)

if __name__ == "__main__":
    args = sys.argv[1:]
    spec = json.load(open(PROJ / "audio/events.json", encoding="utf-8"))
    x = synth(spec); x = x / (np.abs(x).max() or 1) * 10 ** (-3 / 20)
    if "--check" in args:
        i = args.index("--check"); check(x, float(args[i + 1]), float(args[i + 2])); sys.exit()
    wav = PROJ / "audio/score.wav"; A.write_wav(wav, x); print("score:", wav, f"{len(x) / SR:.1f}s", len(spec["events"]), "events")
    if "--wav-only" in args: sys.exit()
    raw, out = PROJ / "renders/raw.mp4", PROJ / "renders/final.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-i", str(wav), "-filter_complex", "[1:a]loudnorm=I=-16:TP=-1.5:LRA=12[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", str(out)], check=True)
    print("done", out)
