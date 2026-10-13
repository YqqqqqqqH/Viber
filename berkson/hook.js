/* 《伯克森悖论》序 + 尾声：六张约会资料卡。
 * 这是什么：六张约会软件上的资料卡，每张一个剪影、一颗金骰（颜值）、一颗冰蓝骰（人品）。
 * 它在干什么：一张张滑进来 → 按颜值重新排队 → 冰蓝骰一级级往下 → 收拢成一个光点，接片名。
 *   尾声里，这六张卡从表里飞回来，落在一张筛网上；网下面是漏下去的人。
 * 观众明白了什么：你约过的人里，越好看的人品越低——先让观众自己看出来，字幕再说。
 * 这六张就是 6×6 表里筛子上留下的六张：(2,6)(3,5)(4,5)(4,4)(5,3)(6,2)。 */
(function () {
'use strict';
const { clamp, lerp, seg, ss, E, hash, mix } = VK;
const B = window.BK, C = B.C;

const W0 = 210, H0 = 290, GAP = 34, X0 = 960 - (6 * W0 + 5 * GAP) / 2, Y0 = 282, ROW_W = 6 * W0 + 5 * GAP;
const ARRIVE = [[5, 3], [2, 6], [6, 2], [4, 5], [3, 5], [4, 4]];                  // 进场顺序是乱的
const SORTED = ARRIVE.slice().sort((p, q) => p[0] - q[0] || q[1] - p[1]);          // 按颜值从小到大
const styleOf = B.styleOf;                                                         // 和表里同一个人同一个发型
const slotX = i => X0 + i * (W0 + GAP);
const FOCUS = [960, 430];

/* 序。T: { in0, sort, glow, dim, col0, col1, flash } */
function hook(fr, t, T) {
  if (t > T.flash + .3) return;
  const push = 1 + .035 * ss(t, T.dim, T.col0), dimK = lerp(1, .6, ss(t, T.dim, T.col0));
  fr.g({ at: [FOCUS[0] * (1 - push), FOCUS[1] * (1 - push)], s: push }, () => {
    ARRIVE.forEach(([g, r], i) => {
      const tin = T.in0 + i * .42, k = seg(t, tin, tin + .6); if (k <= 0) return;
      const e = E.outBack(k, 1.1), j = SORTED.findIndex(p => p[0] === g && p[1] === r);
      const ks = E.io3(seg(t, T.sort + i * .08, T.sort + 1.1 + i * .08)), x = lerp(slotX(i), slotX(j), ks), arc = (j > i ? -1 : 1) * 46 * Math.sin(Math.PI * ks) * (j === i ? 0 : 1);
      let cx = x + W0 / 2 + (1 - e) * 1300, cy = Y0 + H0 / 2 + arc, rot = (1 - e) * .22, s = 1;
      /* 收拢：六张卡一边转一边缩进正中的一个光点 */
      const kc = E.in3(seg(t, T.col0 + j * .04, T.col1));
      cx = lerp(cx, FOCUS[0], kc); cy = lerp(cy, FOCUS[1], kc); s = lerp(1, .04, kc); rot += kc * 1.2 * (j - 2.5) / 2.5;
      const gl = Math.exp(-Math.pow((t - (T.glow + j * .32)) / .22, 2));          // 排好以后，冰蓝骰从左到右依次亮一下
      fr.g({ at: [cx, cy], rot, s, a: ss(k, 0, .25) * lerp(dimK, 1, kc) * (1 - ss(kc, .85, 1)) }, () => B.card(fr, -W0 / 2, -H0 / 2, W0, H0, { big: true, gold: g, ice: r, style: styleOf(g, r), glintIce: .8 * gl }));
      fr.sfx(tin, 'swipe', { gain: .55, pan: .6 }); fr.sfx(tin + .42, 'cardtap', { gain: .7 });
    });
    /* 排好以后底下一行小字：颜值 低 → 高 */
    const la = ss(t, T.sort + .9, T.sort + 1.6) * dimK * (1 - ss(t, T.col0, T.col0 + .4));
    if (la > 0) {
      fr.text('颜值', 960 - 120, Y0 + H0 + 58, { font: 'serifr', size: 24, track: 4, color: C.goldLab, a: la });
      fr.text('低', 960 - 44, Y0 + H0 + 58, { font: 'serifr', size: 24, color: C.label, a: la });
      fr.line(960 - 18, Y0 + H0 + 58, 960 + 64, Y0 + H0 + 58, { w: 1.4, color: C.line, a: .6 * la });
      fr.line(960 + 52, Y0 + H0 + 51, 960 + 64, Y0 + H0 + 58, { w: 1.4, color: C.line, a: .6 * la }); fr.line(960 + 52, Y0 + H0 + 65, 960 + 64, Y0 + H0 + 58, { w: 1.4, color: C.line, a: .6 * la });
      fr.text('高', 960 + 90, Y0 + H0 + 58, { font: 'serifr', size: 24, color: C.label, a: la });
    }
  });
  /* 收拢以后剩下的那个光点，越来越亮，闪一下变成片名 */
  const sa = ss(t, T.col0 + .5, T.col1) * (1 - ss(t, T.flash, T.flash + .25));
  if (sa > 0) fr.spark(FOCUS[0], FOCUS[1], lerp(4, 22, ss(t, T.col0 + .5, T.flash)), '#DCEBFF', sa);
  fr.sfx(T.sort, 'shuffle', { dur: 1.4, gain: .7 });
  SORTED.forEach(([, r], n) => fr.sfx(T.glow + n * .32, 'pluck', { v: r, gain: .7 }));     // 冰蓝骰亮一下就弹一个音：音高就是那颗骰子的点数
  fr.sfx(T.col0, 'whoosh', { dur: T.col1 - T.col0 + .1, dir: 'in', gain: .8 });
}

/* 尾声：表里那六张卡飞出来，排回开头那一排，落在一张筛网上；网下面是漏下去的人。
 * T: { fly0, fly1, mesh, end, from(c, r) → { x, y, s } 这张卡此刻在表上的屏幕位置和缩放 } */
function epilogue(fr, t, T) {
  const a = 1 - ss(t, T.end - .6, T.end); if (a <= 0) return;
  const mk = E.io3(seg(t, T.mesh, T.mesh + 1.1)), MY = Y0 + H0 + 20;
  fr.g({ a }, () => {
    /* 漏到网下面的人：一张张从网上掉下来，落定以后灰着 */
    for (let i = 0; i < 13; i++) {
      const t0 = T.mesh + .5 + hash(i * 4.1) * 1.2, kf = E.in2(seg(t, t0, t0 + .7)); if (kf <= 0) continue;
      const gx = X0 - 40 + (i + .5) / 13 * (ROW_W + 80) + (hash(i * 7.7) - .5) * 40, gy = lerp(MY + 10, MY + 92 + hash(i * 2.3) * 110, kf), rot = (hash(i * 9.3) - .5) * .6 * kf;
      fr.g({ at: [gx, gy], rot, s: .7, a: .5 * ss(kf, 0, .2) }, () => B.card(fr, -66, -43, 132, 86, { gold: 1 + Math.floor(hash(i * 1.9) * 3), ice: 1 + Math.floor(hash(i * 4.3) * 3), style: i % 6, dim: 1 }));
    }
    /* 筛网：一条玫红的线，下面一排网眼 */
    if (mk > 0) {
      const x0 = X0 - 90, x1 = lerp(x0, X0 + ROW_W + 90, mk);
      fr.line(x0, MY, x1, MY, { w: 3.4, color: '#FF9DB8', a: .9, glow: 14, glowColor: C.rose });
      fr.line(x0, MY, x1, MY, { w: 10, color: C.rose, a: .14, add: true });
      for (let x = x0 + 7; x < x1; x += 13) fr.line(x, MY, x - 5, MY + 9, { w: 1.3, color: C.rose, a: .5, cap: 'butt' });
    }
    /* 六张卡从表里飞回来：小卡一路放大，落地前换成开头那种大卡 */
    SORTED.forEach(([g, r], i) => {
      const d = i * .07, k = E.io3(seg(t, T.fly0 + d, T.fly1 + d)), f = T.from(g, r), big = ss(k, .55, 1);
      const cx = lerp(f.x, slotX(i) + W0 / 2, k), cy = lerp(f.y, Y0 + H0 / 2, k) - 70 * Math.sin(Math.PI * k);
      if (big < 1) fr.g({ at: [cx, cy], s: lerp(f.s, 1.45, k), a: 1 - big }, () => B.card(fr, -66, -43, 132, 86, { gold: g, ice: r, style: styleOf(g, r) }));
      if (big > 0) fr.g({ at: [cx, cy], s: lerp(.7, 1, big), a: big }, () => B.card(fr, -W0 / 2, -H0 / 2, W0, H0, { big: true, gold: g, ice: r, style: styleOf(g, r) }));
      fr.sfx(T.fly1 + d - .05, 'cardtap', { gain: .55 });
    });
  });
  fr.sfx(T.fly0, 'whoosh', { dur: T.fly1 - T.fly0 + .3, dir: 'out', gain: .7 });
  fr.sfx(T.mesh, 'draw', { dur: 1.1, kind: 'neon', gain: .6 }); fr.sfx(T.mesh + .5, 'sift', { dur: 1.8, gain: .8 });
}

window.BK = Object.assign(window.BK || {}, { hook, epilogue, HOOK: { SORTED, styleOf } });
})();
