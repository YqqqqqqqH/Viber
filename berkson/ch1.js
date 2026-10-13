/* 《伯克森悖论》01 骰：两颗骰子 → 36 个人的表 → 门槛 → 阶梯。
 * 镜 4  这是什么：一张人物卡和两颗骰子 / 在干什么：骰子翻滚着落到卡上 / 明白了：长相和人品是两颗各掷各的骰子。
 * 镜 5  一张 6×6 的表 / 发满 36 张 / 每种搭配不多不少都有一个人。
 * 镜 6  每列底下的平均数和水位条 / 一排一样高 / 长相和人品毫无关系。
 * 镜 7  一条玫红的阶梯线（筛子）/ 切过去，没过线的 21 张漏下去 / 被筛掉的人你从来没见过。
 * 镜 8  同样的平均数 / 重算成 6 → 4 的阶梯 / 门里出现了"越好看人品越差"。
 * 镜 10 所有骰子 / 闪一下 / 骰子没变。镜 11 筛网 / 亮到最亮 / 规律在筛子上。 */
(function () {
'use strict';
const { clamp, lerp, seg, ss, E, hash, mix } = VK;
const K = VKit, B = window.BK, C = B.C, TB = B.TABLE;

/* 英雄卡：表里 (5,3) 那一张，先放大摆在正中 */
const HS = 3.4, HX = 960, HY = 450;
const heroDie = (gold) => [HX + (gold ? -TB.CW / 2 + 73 : -TB.CW / 2 + 110) * HS, HY];   // 卡上两个骰子格的屏幕位置

/* 一颗翻滚着落下的骰子：从屏幕外飞进来，弹两下，停在格子里 */
function rollingDie(fr, t, t0, from, to, s, tone, final, seed) {
  const k = seg(t, t0, t0 + 1.0); if (k <= 0) return;
  const kx = E.out3(k), bounce = Math.abs(Math.sin(k * Math.PI * 2.2)) * Math.pow(1 - k, 1.6) * 160;
  const x = lerp(from[0], to[0], kx), y = lerp(from[1], to[1], E.out2(k)) - bounce, rot = (1 - E.out3(k)) * 9 * (tone === 'ice' ? -1 : 1);
  const face = k >= .82 ? final : 1 + Math.floor(hash(seed + Math.floor(t * 14)) * 6);
  B.die(fr, x, y, s, face, { tone, rot, a: ss(k, 0, .1) });
}

function ch1(fr, t, T) {
  const lt = t - T.c1; if (t < T.heroIn - .1) return;
  const land = [T.c1 + 1.95, T.c1 + 2.35];
  const heroK = seg(t, T.deal - .3, T.deal + .5);
  /* 镜 4：片名线上那个光点升上来，在正中展开成英雄卡；两颗骰子落下来 */
  if (heroK <= 0) {
    const kg = seg(t, T.heroIn, T.heroIn + .8), gs = HS * Math.max(.02, E.outBack(kg, 1.2)), ca = ss(kg, 0, .35), da = ss(t, land[1] + .15, land[1] + .3);
    fr.glow(HX, HY, 260, '#BFD9F2', .35 * (1 - kg) * ss(kg, 0, .15));
    fr.g({ at: [HX, HY], s: gs, a: ca }, () => B.card(fr, -TB.CW / 2, -TB.CH / 2, TB.CW, TB.CH, { gold: 5, ice: 3, style: TB.CELLS[TB.HERO].style, dieA: da }));
    if (da < 1) { rollingDie(fr, t, land[0] - 1, [420, -120], heroDie(true), 17 * HS, 'gold', 5, 11); rollingDie(fr, t, land[1] - 1, [1560, -140], heroDie(false), 17 * HS, 'ice', 3, 37); }
    const la = ss(t, land[0] + .1, land[0] + .5), lb = ss(t, land[1] + .1, land[1] + .5), lo = 1 - ss(t, T.deal - .6, T.deal - .3);
    const ly = HY - TB.CH * HS / 2 - 40;                   // 标签挂在卡片上沿外面
    fr.text('颜值', heroDie(true)[0], ly, { font: 'serifr', size: 36, track: 6, color: C.goldLab, a: la * lo, glow: 8, glowA: .3 });
    fr.text('人品', heroDie(false)[0], ly, { font: 'serifr', size: 36, track: 6, color: C.iceLab, a: lb * lo, glow: 8, glowA: .3 });
    fr.line(heroDie(true)[0], ly + 22, heroDie(true)[0], ly + 34, { w: 1.4, color: C.goldLab, a: .5 * la * lo }); fr.line(heroDie(false)[0], ly + 22, heroDie(false)[0], ly + 34, { w: 1.4, color: C.iceLab, a: .5 * lb * lo });
  }
  /* 镜 5 起：那张表。结尾牌子翻成医院，镜头钻进牌子 */
  if (heroK > 0) {
    const cam = TB.camIn(seg(t, T.push1, T.push1 + 1.0));
    TB.draw(fr, {
      t, a: cam.a, at: cam.at, s: cam.s, blur: cam.blur, xl: '颜值', yl: '人品', avgL: '平均人品',
      hdr: ss(t, T.deal + .8, T.deal + 2.0),
      dealT: t - T.deal, hero: { k: heroK, cx: HX, cy: HY, s: HS },
      avgShow: ss(t, T.avg, T.avg + 1.6),
      gate: E.io3(seg(t, T.gate, T.gate + 1.3)), gateHi: ss(t, T.law, T.law + .35) * (1 - .55 * ss(t, T.law + 1.6, T.law + 3)),
      plaque: { icon: 'sieve', title: '筛子', rule: '两颗加起来 ≥ 8', a: ss(t, T.gate + .9, T.gate + 1.5) },
      plaqueFlip: { k: seg(t, T.flip1, T.flip1 + .45), next: { icon: 'hospital', rule: '病得够重 · 才住院' } },
      out: seg(t, T.gate + 1.4, T.gate + 3.6),
      avgMode: seg(t, T.recalc + .3, T.recalc + 2.6),
      barPulse: ss(t, T.recalc + 4.9, T.recalc + 5.6) * (1 - ss(t, T.glint - .2, T.glint + .4)),
      glint: t >= T.glint ? t - T.glint : null,
    });
  }
  /* 镜 11：定理落地 —— 筛网最亮的那一下，一圈细环 */
  K.ripple(fr, t, T.law, 840, 420, { r0: 30, r1: 760, dur: 1.4, color: '#FFC2D2' });
  /* 声音：每一下都对着屏上的动作 */
  fr.sfx(T.heroIn, 'pop', { gain: .7 });
  fr.sfx(land[0] - 1, 'dice', { dur: 1, gain: .9, pan: -.5 }); fr.sfx(land[1] - 1, 'dice', { dur: 1, gain: .9, pan: .5 });
  fr.sfx(T.deal - .3, 'whoosh', { dur: .8, dir: 'out', gain: .5 });
  TB.DEAL.forEach((d, i) => { if (i !== TB.HERO) fr.sfx(T.deal + d, 'flick', { gain: .45, pan: (TB.CELLS[i].c - 3.5) / 3 }); });
  for (let c = 1; c <= 6; c++) fr.sfx(T.avg + 1.6 * ((c - 1) * .1 + .25), 'pluck', { v: 3.5, gain: .65, pan: (c - 3.5) / 3 });
  fr.sfx(T.gate, 'draw', { dur: 1.3, kind: 'neon', gain: .7 }); fr.sfx(T.gate + 1.4, 'sift', { dur: 2.4, gain: .9 });
  for (let c = 2; c <= 6; c++) fr.sfx(T.recalc + .3 + 2.3 * ((c - 1) * .1 + .3), 'pluck', { v: TB.AVG_IN[c], gain: .8, pan: (c - 3.5) / 3 });
  fr.sfx(T.recalc + 4.9, 'swell', { dur: 3, gain: .5 });
  fr.sfx(T.glint, 'shimmer', { gain: .7 });
  fr.sfx(T.law, 'bloom', { gain: .65 }); fr.sfx(T.law, 'boom', { gain: .6 });
  fr.sfx(T.flip1, 'flip', { gain: .8 }); fr.sfx(T.push1, 'whoosh', { dur: 1.1, dir: 'in', gain: .8 });
}

window.CH = Object.assign(window.CH || {}, { ch1 });
})();
