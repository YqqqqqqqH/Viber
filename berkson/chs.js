/* 《伯克森悖论》02 院 · 03 门 · 04 秤 · 05 你。
 * 换场的语法（全片一致）：上一章结尾，筛子牌子像卡片一样翻到下一章的图标 → 镜头钻进牌子 → 下一章的地方从这个图标里长出来；
 * 讲完一句，地方缩回牌子上的图标，镜头从图标里拉出来，回到那张表（轴名已经换成这一章的）。
 * 02 院  一栋医院 / 从牌子里长出来、再缩回去 / 住院也是一道筛子；阶梯再出现一次；命名。
 * 03 门  校门 → 表（数学 × 语文）；街口和巷子 → 表（地段 × 味道），被筛掉的店拉下卷帘门。
 * 04 秤  婴儿秤，指针停在 2500 克左边 / 两排襁褓，暗两个对暗一个 / 表（抽烟 × 更凶的病因），留下的里最左两列病因都是 5、6。
 * 05 你  表不动，牌子上的手机图标长成一块屏幕把表框住 / 被筛掉的卡滑出屏幕 / 拉远 / 他们回来，平均数退回一排 3.5。 */
(function () {
'use strict';
const { clamp, lerp, seg, ss, E, fade, hash, mix } = VK;
const B = window.BK, C = B.C, TB = B.TABLE, PL = B.PLACES, ICON = TB.ICON;

/* 一章的地方：从牌子的图标里长出来（kIn），讲完以后缩回图标（kOut）。at = [x, y, 缩放] */
function grow(kIn, kOut, at) {
  const e = E.io3(clamp(kIn)) * (1 - E.io3(clamp(kOut))), s1 = at[2] || 1;
  const s = Math.exp(lerp(Math.log(.08), Math.log(s1), e)), w = (s - .08) / (s1 - .08);
  const ax = lerp(ICON[0], at[0], w), ay = lerp(ICON[1], at[1], w);
  return { at: [ax - at[0] * s / s1, ay - at[1] * s / s1], s: s / s1, a: ss(kIn, 0, .3) * (1 - ss(kOut, .75, 1)), blur: 8 * (1 - ss(e, .35, .95)) };
}
/* 长出来的时候，先是牌子上那个图标本身放大成一幅大线稿（ic = [图标名, x, y, 尺寸]），细节再一笔笔画进去、盖掉它 */
function place(fr, fn, at, kIn, kOut, k, extra, ic) {
  if (kIn <= 0 || kOut >= 1) return;
  const g = grow(kIn, kOut, at);
  const wrap = g.blur > .3 ? (fn2) => fr.layer({ a: g.a, blur: g.blur }, () => fr.g({ at: g.at, s: g.s }, fn2)) : (fn2) => fr.g({ at: g.at, s: g.s, a: g.a }, fn2);
  wrap(() => fr.g({ at: [at[0], at[1]], s: at[2] || 1 }, () => {
    const ia = 1 - ss(k, .2, .6);
    if (ic && ia > 0) B.ICONS[ic[0]](fr, ic[1], ic[2], ic[3], { color: '#C9D3DC', a: .75 * ia });
    fn(fr, k, extra);
  }));
}
const note = (fr, str, a) => fr.text(str, 1528, 398, { font: 'serifr', size: 22, track: 2, color: C.label, a });
const top = (fr, str, a) => fr.text(str, 960, 128, { font: 'serifr', size: 26, track: 6, color: '#AEB8C2', a });
/* 平均数一个个出来时弹的音：音高就是那个数 */
const plucks = (fr, t0, span, gain = .75) => { for (let c = 2; c <= 6; c++) fr.sfx(t0 + span * ((c - 1) * .1 + .25), 'pluck', { v: TB.AVG_IN[c], gain, pan: (c - 3.5) / 3 }); };

/* ---------- 02 院 ---------- */
function ch2(fr, t) {
  place(fr, PL.hospital, [960, 430], seg(t, 67.0, 68.0), seg(t, 73.8, 74.7), ss(t, 67.45, 70.3), t, ['hospital', 0, -10, 770]);
  top(fr, '1946  ·  JOSEPH BERKSON  ·  MAYO CLINIC', fade(t, 68.6, 73.8, .6, .5));
  if (t >= 73.8) {
    const cam = t < 85 ? TB.camOut(seg(t, 73.8, 74.8)) : TB.camIn(seg(t, 90.05, 91.05));
    const dim = 1 - .82 * (ss(t, 84.8, 85.6) - ss(t, 89.0, 89.6));
    TB.draw(fr, {
      t, a: cam.a * dim, at: cam.at, s: cam.s, blur: cam.blur, xl: '胆囊炎', yl: '糖尿病', avgL: '平均 · 糖尿病',
      plaque: { icon: 'hospital', title: '筛子', rule: '病得够重 · 才住院' },
      plaqueFlip: { k: seg(t, 89.6, 90.05), next: { icon: 'school', rule: '总分过线 · 才录取' } },
      gate: E.io3(seg(t, 75.2, 76.4)), out: seg(t, 76.4, 78.4),
      avgShow: ss(t, 79.6, 80.8), avgMode: 1,
    });
  }
  note(fr, '伯克森的例子：胆囊炎 × 糖尿病', fade(t, 80.4, 84.8, .5, .4));
  /* 命名：表暗下去，正中浮出名字 */
  const na = ss(t, 85.2, 86.2) * (1 - ss(t, 89.0, 89.5));
  if (na > 0) {
    fr.chars('伯克森悖论', 960, 410, { font: 'serifl', size: 110, track: 38, color: C.ink, a: na, glow: 16, glowColor: '#BFD9F2', glowA: .35 }, i => ({ blur: (1 - ss(t, 85.2 + i * .1, 85.9 + i * .1)) * 8, color: i >= 3 ? '#FF8FAE' : null, glowColor: i >= 3 ? C.rose : null }));
    fr.text('BERKSON’S   PARADOX', 960, 510, { font: 'mono', size: 18, track: 8, color: C.label, a: na * ss(t, 86.0, 86.8) });
  }
  fr.sfx(67.3, 'draw', { dur: 3, kind: 'pen', gain: .6 }); fr.sfx(67.9, 'chord', { root: 2, gain: .45 }); fr.sfx(68.4, 'monitor', { dur: 5.2, gain: .55 });
  fr.sfx(73.8, 'whoosh', { dur: 1, dir: 'out', gain: .6 });
  fr.sfx(75.2, 'draw', { dur: 1.2, kind: 'neon', gain: .6 }); fr.sfx(76.4, 'sift', { dur: 2, gain: .8 });
  plucks(fr, 79.6, 1.2);
  fr.sfx(85.2, 'bloom', { gain: .8 });
  fr.sfx(89.6, 'flip', { gain: .8 }); fr.sfx(90.05, 'whoosh', { dur: 1.1, dir: 'in', gain: .8 });
}

/* ---------- 03 门 ---------- */
function ch3(fr, t) {
  place(fr, PL.school, [960, 440], seg(t, 90.35, 91.3), seg(t, 93.0, 93.9), ss(t, 90.7, 92.3), t, ['school', 0, -30, 760]);
  if (t >= 93.0 && t < 101.4) {
    const cam = t < 97 ? TB.camOut(seg(t, 93.0, 94.0)) : TB.camIn(seg(t, 100.35, 101.3));
    const hi = Math.max(0, Math.sin(Math.PI * seg(t, 96.5, 99.3)));
    TB.draw(fr, {
      t, a: cam.a, at: cam.at, s: cam.s, blur: cam.blur, xl: '数学', yl: '语文', avgL: '平均 · 语文',
      plaque: { icon: 'school', title: '筛子', rule: '总分过线 · 才录取', hi },
      plaqueFlip: { k: seg(t, 99.9, 100.35), next: { icon: 'lantern', rule: '三年后还开着' } },
      gate: 1, gateHi: .7 * hi, out: 1, avgShow: ss(t, 94.0, 94.9), avgMode: 1,
    });
  }
  place(fr, PL.alley, [1040, 450], seg(t, 100.65, 101.6), seg(t, 107.0, 107.9), ss(t, 101.0, 103.6), t, ['lantern', 120, 0, 520]);
  if (t >= 107.0) {
    const cam = t < 110 ? TB.camOut(seg(t, 107.0, 108.0)) : TB.camIn(seg(t, 111.95, 112.9));
    TB.draw(fr, {
      t, a: cam.a, at: cam.at, s: cam.s, blur: cam.blur, xl: '地段', yl: '味道', avgL: '平均 · 味道', xNote: '1 巷子深 · 6 路口',
      plaque: { icon: 'lantern', title: '筛子', rule: '三年后还开着' },
      plaqueFlip: { k: seg(t, 111.5, 111.95), next: { icon: 'scale', rule: '出生不到 2500 克', ruleSize: 28 } },
      gate: 1, out: 1, shut: ss(t, 108.4, 109.9), avgShow: ss(t, 108.1, 109.0), avgMode: 1,
    });
  }
  fr.sfx(90.5, 'draw', { dur: 1.5, kind: 'pen', gain: .55 }); fr.sfx(91.2, 'chord', { root: 7, gain: .45 }); fr.sfx(91.5, 'bell', { gain: .6 });
  fr.sfx(93.0, 'whoosh', { dur: 1, dir: 'out', gain: .6 }); plucks(fr, 94.0, .9);
  fr.sfx(96.6, 'swell', { dur: 2.4, gain: .45 });
  fr.sfx(99.9, 'flip', { gain: .8 }); fr.sfx(100.35, 'whoosh', { dur: 1.1, dir: 'in', gain: .8 });
  fr.sfx(100.8, 'draw', { dur: 2.6, kind: 'pen', gain: .55 }); fr.sfx(101.2, 'street', { dur: 6, gain: .7 });
  fr.sfx(107.0, 'whoosh', { dur: 1, dir: 'out', gain: .6 }); plucks(fr, 108.1, .9, .6);
  [108.4, 108.8, 109.2, 109.6].forEach((x, i) => fr.sfx(x, 'shutter', { gain: .75, pan: [-.6, .2, -.2, .6][i] }));
  fr.sfx(111.5, 'flip', { gain: .8 }); fr.sfx(111.95, 'whoosh', { dur: 1.1, dir: 'in', gain: .8 });
}

/* ---------- 04 秤 ---------- */
const DIM_A = [3, 8], DIM_B = [6];
function babyGroup(fr, cx, cy, label, dims, kd, a) {
  fr.text(label, cx, cy - 150, { font: 'serifr', size: 30, track: 4, color: C.ink, a });
  for (let i = 0; i < 10; i++) {
    const x = cx + ((i % 5) - 2) * 88, y = cy + (i < 5 ? -50 : 54), d = dims.includes(i) ? kd : 0;
    B.baby(fr, x, y, 86, { a: a * lerp(1, .55, d), dim: d, wrap: mix('#8396AE', '#262D36', d), face: mix('#E2C2A6', '#302D2A', d) });
  }
}
/* 镜 20–22：秤 + 两排襁褓（整幅从牌子里长出来，讲完缩回去） */
function scaleScene(fr, k, t) {
  const mv = E.io3(seg(t, 118.9, 119.9)), x = lerp(960, 330, mv), y = lerp(480, 470, mv), s = lerp(1, .56, mv);
  const land = 115.3, drop = E.out3(seg(t, 114.5, land)), dt = t - land;
  const kg = t < land ? 0 : 2.2 - 2.2 * Math.exp(-3 * dt) * Math.cos(8 * dt);
  fr.g({ at: [x, y], s }, () => PL.scale(fr, k, kg, { x: 0, y: lerp(-420, 98, drop), a: ss(t, 114.5, 114.8) }));
  top(fr, '1971  ·  J. YERUSHALMY', fade(t, 113.8, 118.8, .6, .5));
  const ga = ss(t, 119.3, 120.1);
  if (ga > 0) {
    babyGroup(fr, 880, 450, '妈妈不抽烟', DIM_A, ss(t, 120.8, 121.5), ga);
    babyGroup(fr, 1440, 450, '妈妈抽烟', DIM_B, ss(t, 121.7, 122.4), ga);
    fr.text('暗下去的，是没能活下来的  ·  比例示意', 1160, 660, { font: 'serifr', size: 22, track: 3, color: C.label, a: ga * ss(t, 121.0, 121.6) });
  }
}
function ch4(fr, t) {
  if (t < 129.6) {                                            // 整幅画以 (960,480) 为锚，从牌子图标里长出来、再缩回去
    const g = grow(seg(t, 112.25, 113.2), seg(t, 128.6, 129.5), [960, 480, 1]);
    const k = ss(t, 112.6, 114.6), ia = 1 - ss(k, .2, .6);
    const draw4 = () => { if (ia > 0) B.ICONS.scale(fr, 960, 398, 470, { color: '#C9D3DC', a: .75 * ia }); scaleScene(fr, k, t); };
    if (g.a > 0) { if (g.blur > .3) fr.layer({ a: g.a, blur: g.blur }, () => fr.g({ at: g.at, s: g.s }, draw4)); else fr.g({ at: g.at, s: g.s, a: g.a }, draw4); }
  }
  if (t >= 128.6 && t < 150.9) {
    const cam = TB.camOut(seg(t, 128.6, 129.6));
    TB.draw(fr, {
      t, a: cam.a, at: cam.at, s: cam.s, blur: cam.blur, xl: '妈妈抽烟', yl: '更凶的病因', xNote: '少 → 多', yNote: '早产、先天缺陷……', avgL: '平均 · 病因',
      baby: ss(t, 130.0, 131.4),
      plaque: { icon: 'scale', title: '筛子', rule: '出生不到 2500 克', ruleSize: 28, hi: Math.max(0, Math.sin(Math.PI * seg(t, 135.0, 136.4))) },
      plaqueFlip: { k: seg(t, 150.0, 150.45), next: { icon: 'phone', rule: '算法推荐' } },
      gate: E.io3(seg(t, 135.6, 136.8)), out: seg(t, 136.9, 139.0),
      avgShow: ss(t, 140.3, 141.1), avgMode: 1,
      hlCols: { cols: [2, 3], k: ss(t, 142.0, 142.8) * (1 - ss(t, 149.6, 150.4)) },
    });
  }
  note(fr, 'Hernández-Díaz 等 2006 · 一种主流解释', fade(t, 145.6, 150.4, .5, .4));
  fr.sfx(112.5, 'draw', { dur: 2, kind: 'pen', gain: .5 }); fr.sfx(113.1, 'chord', { root: -3, gain: .45 });
  fr.sfx(115.3, 'cloth', { gain: .8 }); fr.sfx(115.32, 'spring', { gain: .7 });
  fr.sfx(118.9, 'whoosh', { dur: 1, dir: 'out', gain: .4 }); fr.sfx(119.4, 'pop', { gain: .45 });
  fr.sfx(120.9, 'knell', { gain: .6 }); fr.sfx(121.8, 'knell', { gain: .5 });
  fr.sfx(128.6, 'whoosh', { dur: 1, dir: 'out', gain: .6 }); fr.sfx(130.0, 'shuffle', { dur: 1.4, gain: .55 });
  fr.sfx(135.0, 'tick', { pitch: 7, gain: .6 }); fr.sfx(135.6, 'draw', { dur: 1.2, kind: 'neon', gain: .6 }); fr.sfx(136.9, 'sift', { dur: 2.1, gain: .8 });
  plucks(fr, 140.3, .8); fr.sfx(142.0, 'shimmer', { gain: .55 });
  fr.sfx(150.0, 'flip', { gain: .8 });
}

/* ---------- 05 你 ---------- */
const PH = [212, 58, 1300, 868], PC = [756, 463], SC = [960, 440];
const PHICON = [ICON[0] - 35, ICON[1] - 21, ICON[0] + 35, ICON[1] + 21];      // 牌子上手机图标那个小框
const SIX = new Set(TB.CELLS.map((o, i) => B.HOOK.SORTED.some(([g, r]) => g === o.c && r === o.r) ? i : -1).filter(i => i >= 0));
function exitTo(o, i) {                                          // 被筛掉的卡漂到屏幕外面的暗处（表的坐标）
  const left = hash(i * 1.7) < .5;
  return left ? [-560 + hash(i * 2.3) * 520, -80 + hash(i * 3.1) * 1040, .95] : [1480 + hash(i * 2.3) * 560, 400 + hash(i * 3.1) * 600, .95];
}
function cam5(t) {
  const k5 = E.io3(seg(t, 150.9, 152.3)), s0 = lerp(1, .84, k5), s1 = lerp(s0, .56, E.io3(seg(t, 167.4, 169.4))), s = lerp(s1, .84, E.io3(seg(t, 173.6, 175.6)));
  return { s, at: [lerp(0, SC[0] - PC[0] * s, k5), lerp(0, SC[1] - PC[1] * s, k5)] };
}
/* 手机外框：从牌子上的小图标一路长到把整张表框住 */
function phoneFrame(fr, k, a) {
  if (k <= 0 || a <= 0) return;
  const r = PHICON.map((v, i) => lerp(v, PH[i], k)), rad = lerp(7, 72, k), cy = (r[1] + r[3]) / 2;
  fr.g({ a }, () => {
    fr.rect(r[0], r[1], r[2] - r[0], r[3] - r[1], { r: rad, color: '#C9D3DC', w: lerp(2, 3, k), a: .8, glow: 10, glowColor: '#BFD9F2' });
    const d = ss(k, .7, 1);
    if (d > 0) {
      fr.rect(r[0] + 30, r[1] + 30, r[2] - r[0] - 60, r[3] - r[1] - 60, { r: 44, color: '#8FA3B5', w: 1.2, a: .35 * d });
      fr.circle(r[0] + 15, cy, 7, { color: '#C9D3DC', w: 1.6, a: .7 * d });
      fr.line(r[2] - 330, r[1] - 5, r[2] - 250, r[1] - 5, { w: 5, color: '#8FA3B5', a: .6 * d }); fr.line(r[2] - 220, r[1] - 5, r[2] - 180, r[1] - 5, { w: 5, color: '#8FA3B5', a: .6 * d });
    }
  });
}
function ch5(fr, t) {
  if (t < 150.9 || t > 179.3) return;
  const c = cam5(t), fadeOut = 1 - ss(t, 178.4, 179.2);
  fr.g({ at: c.at, s: c.s }, () => {
    phoneFrame(fr, E.io3(seg(t, 151.0, 152.5)), fadeOut);
    TB.draw(fr, {
      t, a: fadeOut, xl: '颜值', yl: '内容', avgL: '平均 · 内容',
      prev: { xl: '妈妈抽烟', yl: '更凶的病因', xNote: '少 → 多', yNote: '早产、先天缺陷……', avgL: '平均 · 病因' }, labK: seg(t, 150.9, 151.8),
      baby: 1 - ss(t, 150.9, 151.9),
      plaque: { icon: 'phone', title: '筛子', rule: '算法推荐' },
      gate: 1, gateA: 1 - ss(t, 174.0, 175.2), out: 1,
      avgShow: 1, avgMode: 1, avgRet: seg(t, 175.8, 177.6), barPulse: ss(t, 157.0, 157.8) * (1 - ss(t, 161.4, 162.2)),
      exit: seg(t, 162.6, 165.8), exitTo, ret: seg(t, 173.8, 176.6),
      hide: t >= 178.45 ? SIX : null,
    });
  });
  fr.sfx(150.9, 'shuffle', { dur: 1.2, gain: .5 }); fr.sfx(151.0, 'whoosh', { dur: 1.5, dir: 'out', gain: .6 }); fr.sfx(152.4, 'notify', { gain: .6 });
  for (let n = 2; n <= 6; n++) fr.sfx(157.2 + (n - 2) * .32, 'pluck', { v: TB.AVG_IN[n], gain: .7, pan: (n - 3.5) / 3 });
  [162.6, 162.95, 163.35, 163.8, 164.35, 164.9].forEach((x, i) => fr.sfx(x, 'swipe', { gain: .5, pan: i % 2 ? .6 : -.6 }));
  fr.sfx(167.4, 'whoosh', { dur: 2.1, dir: 'out', gain: .6 });
  fr.sfx(173.6, 'whoosh', { dur: 2.1, dir: 'in', gain: .6 });
  for (let i = 0; i < 12; i++) fr.sfx(174.3 + i * .19, 'flick', { gain: .4, pan: (hash(i * 3.3) - .5) * 1.2 });
  for (let c = 6; c >= 1; c--) fr.sfx(175.9 + (6 - c) * .2, 'pluck', { v: 3.5, gain: .6, pan: (c - 3.5) / 3 });
  fr.sfx(177.6, 'chord', { root: 5, gain: .8 });
}
/* 尾声要知道：表里某一格此刻在屏幕上的位置 */
function cell5(cg, r, t) { const c = cam5(t); return { x: c.at[0] + c.s * TB.colX(cg), y: c.at[1] + c.s * TB.rowY(r), s: c.s }; }

window.CH = Object.assign(window.CH || {}, { ch2, ch3, ch4, ch5, cell5 });
})();
