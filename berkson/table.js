/* 《伯克森悖论》那把尺子：一张 6×6 的表。
 * 这是什么：36 张人物卡（一种骰子搭配一个人），列 = 金骰 1→6，行 = 冰蓝骰 1→6（从下往上）。
 * 它在干什么：发满 → 每列算平均（一排 3.5）→ 门槛落下、门外的卡退开 → 重算平均（一级级往下的阶梯）。
 * 观众明白了什么：两颗互不相干的骰子，进了门以后就像此消彼长；规律是门造的。
 * 每章只换：两个轴的名字、门槛牌子、卡上的剪影（04 章换成襁褓）。 */
(function () {
'use strict';
const { clamp, lerp, seg, ss, E, hash, rng, rgba, mix } = VK;
const B = window.BK, C = B.C;

const CW = 132, CH = 86, PX = 146, PY = 98, GX0 = 400, GY0 = 140;
const GX1 = GX0 + 5 * PX + CW, GY1 = GY0 + 5 * PY + CH;          // 1262, 716
const HDR_Y = GY1 + 34, AVG_Y = GY1 + 90, LAB_X = GX0 - 36;
const colX = c => GX0 + (c - 1) * PX + CW / 2;
const rowY = v => GY0 + (6 - v) * PY + CH / 2;                    // v 可以是小数：3.5 落在第 3、4 行之间
const AVG_IN = [null, null, 6, 5.5, 5, 4.5, 4];                   // 门槛"加起来 ≥ 8"之后，每列的平均（第 1 列没人）
const fmt = v => v == null ? '—' : (Math.abs(v - Math.round(v)) < .01 ? String(Math.round(v)) : v.toFixed(1));

/* 36 个人：每人的发型、发牌顺序 */
const CELLS = [];
for (let c = 1; c <= 6; c++) for (let r = 1; r <= 6; r++) CELLS.push({ c, r, sum: c + r, inside: c + r >= 8, style: B.styleOf(c, r), x: GX0 + (c - 1) * PX, y: GY0 + (6 - r) * PY });
const HERO = CELLS.findIndex(o => o.c === 5 && o.r === 3);
const DEAL = (() => {                                              // 发牌时刻：英雄卡 0；其余 35 张先慢后快
  const r = rng(1946), idx = CELLS.map((_, i) => i).filter(i => i !== HERO);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const at = new Array(36).fill(0); idx.forEach((ci, n) => { at[ci] = .55 + 2.7 * Math.pow(n / (idx.length - 1), .75); }); return at;
})();
/* 被筛掉的卡：从筛网上漏下去一截、缩小、变灰 */
const OUT_OFF = [-4, 20], OUT_S = .88;
const PLQ_CX = 1318 + 210;                                         // 牌子的中线（翻牌绕它转）

/* 门槛：一条走在格缝里的阶梯线 */
const GATE = (() => {
  const gx = c => GX0 + (c - 1) * PX - (PX - CW) / 2, gy = r => GY0 + (6 - r) * PY + CH + (PY - CH) / 2, top = GY0 - (PY - CH) / 2;
  const p = [[GX0 - 34, top], [gx(2), top]];
  for (let c = 2; c <= 6; c++) { const y = gy(8 - c); p.push([gx(c), y]); p.push([c < 6 ? gx(c + 1) : GX1 + 34, y]); if (c < 6) p.push([gx(c + 1), gy(8 - c - 1)]); }
  const out = [p[0]]; for (let i = 1; i < p.length; i++) { const q = out[out.length - 1]; if (Math.hypot(p[i][0] - q[0], p[i][1] - q[1]) > 1) out.push(p[i]); }
  return out;
})();
/* 按长度取前 k 的折线（fr.poly 的 k 是按顶点数算的，这里按长度，画线速度才均匀） */
function polyK(pts, k) {
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
  let rem = clamp(k) * tot; const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { if (rem >= L[i - 1]) { out.push(pts[i]); rem -= L[i - 1]; } else { const u = rem / L[i - 1]; out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]); break; } }
  return out;
}

/* st：这一帧表的状态（每章自己按时间算好传进来）
 *  a 整体透明度；at / s 整体平移缩放（拉远镜头）
 *  xl yl avgL 轴名；hdr 表头透明度
 *  dealT 发牌的本地时间（null = 已经发满）；hero { k, cx, cy, s } 英雄卡从正中缩回自己格子的进度
 *  gate 筛网（那条阶梯线）画到哪 0..1；gateA 线的透明度；gateHi 线发亮 0..1；plaque { … } 牌子
 *  out 被筛掉的卡漏下去 0..1；shut 门外的卡变成卷帘门 0..1；baby 剪影变成襁褓 0..1；ret 门外的人走回来 0..1
 *  exit 门外的卡漂走 0..1，exitTo(cell) 给出漂到哪
 *  avgShow 平均数那一排出现 0..1；avgMode 从"一排 3.5"变成阶梯 0..1；avgRet 阶梯退回一排 3.5 0..1
 *  glint 骰子闪一下的本地时间；hlCols { cols:[…], k } 某几列的冰蓝骰亮起来；t 全局时间
 *  prev { xl, yl, avgL, xNote, yNote } + labK：轴名从上一章的换成这一章的（旧的往上淡出，新的往下落定）
 *  plaqueFlip { k, next }：牌子像翻卡片一样翻到下一章的内容；hide：不画的格子（Set） */
function axisLabels(fr, L, a, dy) {
  if (a <= .004) return;
  fr.text(L.xl || '颜值', LAB_X, HDR_Y + dy, { font: 'serifr', size: 26, track: 2, color: C.goldLab, a, align: 'r', glow: 6, glowA: .25 });
  const yw = fr.text(L.yl || '人品', LAB_X - 16, GY0 - 34 + dy, { font: 'serifr', size: 26, track: 2, color: C.iceLab, a, glow: 6, glowA: .25, align: 'l' });   // 左对齐，避开章节标的细线
  if (L.xNote) fr.text(L.xNote, GX1, HDR_Y + 2 + dy, { font: 'serifr', size: 19, track: 2, color: C.label, a: a * .9, align: 'l' });
  if (L.yNote) fr.text(L.yNote, LAB_X - 16 + yw + 16, GY0 - 33 + dy, { font: 'serifr', size: 19, track: 2, color: C.label, a: a * .9, align: 'l' });
}
function draw(fr, st) {
  const a = st.a == null ? 1 : st.a; if (a <= .004) return;
  const t = st.t || 0;
  const avgShow = st.avgShow || 0, mode = st.avgMode || 0, back = st.avgRet || 0;
  const body = () => {
    /* 表头和轴名 */
    const hdr = st.hdr == null ? 1 : st.hdr;
    if (hdr > 0) {
      for (let c = 1; c <= 6; c++) B.die(fr, colX(c), HDR_Y, 14, c, { tone: 'gold', a: .85 * hdr });
      for (let r = 1; r <= 6; r++) B.die(fr, LAB_X, rowY(r), 14, r, { tone: 'ice', a: .85 * hdr });
      const lk = st.prev ? ss(st.labK == null ? 1 : st.labK, 0, 1) : 1;
      if (st.prev) axisLabels(fr, st.prev, hdr * (1 - ss(lk, 0, .6)), -16 * lk);
      axisLabels(fr, st, hdr * ss(lk, .4, 1), 16 * (1 - lk));
    }
    /* 卡片 */
    const cardDim = 1 - .28 * avgShow;
    const order = CELLS.map((o, i) => i).sort((i, j) => (CELLS[i].inside ? 1 : 0) - (CELLS[j].inside ? 1 : 0));   // 门外的先画，压在下面
    for (const i of order) {
      if (st.hide && st.hide.has(i)) continue;
      const o = CELLS[i];
      let cx = o.x + CW / 2, cy = o.y + CH / 2, s = 1, al = 1, dim = 0;
      if (st.dealT != null) {
        if (i === HERO && st.hero) { const k = E.io3(clamp(st.hero.k)); cx = lerp(st.hero.cx, cx, k); cy = lerp(st.hero.cy, cy, k); s = lerp(st.hero.s, 1, k); }
        else { const k = seg(st.dealT, DEAL[i], DEAL[i] + .42); if (k <= 0) continue; const e = E.out3(k); cx = lerp(960, cx, e); cy = lerp(430, cy, e); s = lerp(.55, 1, e); al = ss(k, 0, .35); }
      }
      let shut = 0;
      if (!o.inside) {
        const d = (7 - o.sum) / 5, ko = E.io3(seg(st.out || 0, d * .45, d * .45 + .55)), kr = E.io3(seg(st.ret || 0, (1 - d) * .45, (1 - d) * .45 + .55));
        const k = ko * (1 - kr);
        cx += OUT_OFF[0] * k; cy += OUT_OFF[1] * k; s *= lerp(1, OUT_S, k); al *= lerp(1, .55, k); dim = k;
        shut = (st.shut || 0) * k;
        if (st.exit && st.exitTo) { const kx = E.io3(seg(st.exit, hash(i * 3.7) * .35, hash(i * 3.7) * .35 + .65)) * (1 - kr), to = st.exitTo(o, i); cx = lerp(cx, to[0], kx); cy = lerp(cy, to[1], kx); s *= lerp(1, to[2] || 1, kx); al = lerp(al, .85, kx); }   // 漂到屏幕外面以后亮一点：他们还在
      }
      let glint = 0;
      if (st.glint != null && st.glint >= 0) { const sweep = st.glint * 1500 - (cx - GX0); glint = Math.exp(-Math.pow(sweep / 140, 2)); }
      let glintIce = glint;
      if (st.hlCols && st.hlCols.cols.includes(o.c) && o.inside) glintIce = Math.max(glint, st.hlCols.k * (.55 + .25 * Math.sin(t * 5)));
      fr.g({ at: [cx, cy], s }, () => B.card(fr, -CW / 2, -CH / 2, CW, CH, { gold: o.c, ice: o.r, style: o.style, a: al * cardDim, dim, glint, glintIce, babyK: st.baby || 0, shut }));
    }
    /* 门槛 */
    const gk = st.gate || 0, ga = (st.gateA == null ? 1 : st.gateA), ghi = st.gateHi || 0;
    if (gk > 0 && ga > 0) {
      const pts = polyK(GATE, gk);
      fr.poly(pts, { color: C.rose, w: 9 + 10 * ghi, a: (.12 + .2 * ghi) * ga, add: true });
      fr.poly(pts, { color: mix(C.rose, '#FFE0E8', .25 + .5 * ghi), w: 3 + 1.5 * ghi, a: ga, glow: 12 + 16 * ghi, glowColor: C.rose });
      for (let j = 1; j < pts.length; j++) {                // 筛网：线的外侧（被筛掉的那一侧）一排斜着的短网眼
        const p = pts[j - 1], q = pts[j], len = Math.hypot(q[0] - p[0], q[1] - p[1]); if (len < 2) continue;
        const ux = (q[0] - p[0]) / len, uy = (q[1] - p[1]) / len, nx = -uy, ny = ux;
        for (let d = 7; d < len; d += 13) { const x0 = p[0] + ux * d, y0 = p[1] + uy * d; fr.line(x0, y0, x0 + nx * 9 - ux * 5, y0 + ny * 9 - uy * 5, { w: 1.3, color: C.rose, a: .5 * ga, cap: 'butt' }); }
      }
      if (gk < 1) { const p = pts[pts.length - 1]; fr.spark(p[0], p[1], 9, C.rose, ga); }
    }
    if (st.plaque) {
      const pf = st.plaqueFlip, k = pf ? clamp(pf.k) : 0;
      if (k > 0) {                                           // 翻牌：牌子先微微抬起、放大，绕中线翻过去，再落回原位
        const sx = Math.max(.02, Math.abs(Math.cos(Math.PI * k))), lift = Math.sin(Math.PI * k), sc = 1 + .1 * lift, P = k < .5 ? st.plaque : Object.assign({}, st.plaque, pf.next), cy = 272 - 14 * lift;
        fr.g({ at: [PLQ_CX * (1 - sx * sc), cy - 272 * sc], s: [sx * sc, sc] }, () => B.plaque(fr, 1318, 210, Object.assign({}, P, { hi: Math.max(P.hi || 0, .6 * lift) })));
      }
      else B.plaque(fr, 1318, 210, st.plaque);
    }
    /* 每列的平均：一个数，加一根画在平均高度上的水位条 */
    if (avgShow > 0) {
      const lk = st.prev ? (st.labK == null ? 1 : st.labK) : 1;
      if (st.prev && lk < 1) fr.text(st.prev.avgL || '平均人品', GX0 - 14, AVG_Y - 14 * lk, { font: 'serifr', size: 22, track: 3, color: C.iceLab, a: .85 * avgShow * (1 - ss(lk, 0, .6)), align: 'r' });
      fr.text(st.avgL || '平均人品', GX0 - 14, AVG_Y + 14 * (1 - lk), { font: 'serifr', size: 22, track: 3, color: C.iceLab, a: .85 * avgShow * ss(lk, .4, 1), align: 'r' });
      for (let c = 1; c <= 6; c++) {
        const ka = ss(avgShow, (c - 1) * .1, (c - 1) * .1 + .45);
        const km = E.io3(seg(mode, (c - 1) * .1, (c - 1) * .1 + .5)) * (1 - E.io3(seg(back, (6 - c) * .08, (6 - c) * .08 + .55)));
        const tgt = AVG_IN[c], v = tgt == null ? 3.5 : lerp(3.5, tgt, km), barA = ka * (tgt == null ? 1 - km : 1);
        const col = mix(C.ice, C.rose, km);
        if (barA > .004) {                                   // 水位记号：卡片两侧格缝里两截亮线，卡面上只留一条很淡的虚线
          const y = rowY(v), xl = colX(c) - CW / 2, xr = colX(c) + CW / 2, pulse = (st.barPulse || 0) * (.5 + .5 * Math.sin(t * 4 - c * .7));
          const hot = mix(col, '#FFFFFF', .2 + .35 * pulse), o = { w: 4.5, color: hot, a: barA, glow: 12 + 12 * pulse, glowColor: col, cap: 'butt' };
          fr.line(xl + 2, y, xr - 2, y, { w: 1.6, color: col, a: .5 * barA, dash: [7, 6], cap: 'butt' });
          fr.line(xl - 7, y, xl + 10, y, o); fr.line(xr - 10, y, xr + 7, y, o);
        }
        /* 数字：旧的（3.5）往上淡出，新的往下落定 */
        const oldA = ka * (1 - ss(km, .15, .55)), newA = ka * ss(km, .4, .85);
        if (oldA > .004) fr.text('3.5', colX(c), AVG_Y - 14 * ss(km, .15, .55), { font: 'latin', size: 46, color: C.iceLab, a: oldA, glow: 8, glowA: .25 });
        if (newA > .004) fr.text(fmt(tgt), colX(c), AVG_Y + 12 * (1 - ss(km, .4, .85)), { font: 'latin', size: 46, color: tgt == null ? C.dim : '#FF8FAE', a: newA, glow: 10, glowColor: C.rose, glowA: .35 });
      }
    }
  };
  /* 镜头推拉时整张表一起虚掉（景深），不推拉时直接画 */
  if ((st.blur || 0) > .3) fr.layer({ a, blur: st.blur }, () => fr.g({ at: st.at, s: st.s }, body));
  else fr.g({ a, at: st.at, s: st.s }, body);
}

/* 镜头：推进门槛牌子上的图标（换场的时候钻进牌子），或者从图标里拉出来回到这张表。k 0..1 */
const ICON = [1382, 272], LN7 = Math.log(7);
const camAt = S => ({ at: [ICON[0] * (1 - S), ICON[1] * (1 - S)], s: S });
function camIn(k) { const S = Math.exp(LN7 * E.io3(clamp(k))); return Object.assign(camAt(S), { a: 1 - ss(k, .45, .9), blur: 9 * ss(k, .15, .8) }); }
function camOut(k) { const S = Math.exp(LN7 * (1 - E.io3(clamp(k)))); return Object.assign(camAt(S), { a: ss(k, .1, .55), blur: 9 * (1 - ss(k, .2, .85)) }); }

window.BK = Object.assign(window.BK || {}, { TABLE: { draw, camIn, camOut, ICON, CELLS, HERO, GATE, colX, rowY, CW, CH, PX, PY, GX0, GY0, GX1, GY1, AVG_IN, DEAL } });
})();
