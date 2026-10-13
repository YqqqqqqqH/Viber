/* 《伯克森悖论》每一章的地方：医院、高中、街口和巷子、婴儿秤、手机屏幕。都是线描 + 暗色的面，原点在画的中心。
 * k 是"画出来"的进度 0..1：轮廓先一笔笔长出来，然后窗、灯、字、细节依次亮起。
 * 画法：后面的东西先画，前面的东西用深色填满再描边，挡住后面的线（不会出现线穿过东西的情况）。 */
(function () {
'use strict';
const { clamp, lerp, seg, ss, E, hash, rgba, mix } = VK;
const B = window.BK, C = B.C;
const LINE = '#9FB6C8', HI = '#C9D3DC', WARM = '#FFD9A0', FILL = '#0F1C2E', FILL2 = '#14243A', DARK = '#0A121D';
const L = (o) => Object.assign({ color: LINE, w: 1.8, a: .8 }, o);
const box = (x0, y0, x1, y1) => [[x0, y1], [x0, y0], [x1, y0], [x1, y1], [x0, y1]];
/* 一块实心的面：深色填满 + 描边（a 是整体透明度） */
const solid = (fr, x0, y0, x1, y1, a, o = {}) => fr.rect(x0, y0, x1 - x0, y1 - y0, Object.assign({ fill: o.fill || FILL, fa: (o.fa == null ? .96 : o.fa) * a, color: o.color || LINE, w: o.w || 1.8, a: (o.la == null ? .85 : o.la) * a, r: o.r || 0 }, o.glow ? { glow: o.glow } : {}));
/* 一扇窗：窗框、十字窗棂，亮着的窗是暖色的、下面一点窗帘 */
function windowAt(fr, x, y, w, h, lit, a, seed) {
  if (a <= 0) return;
  fr.rect(x, y, w, h, { fill: lit ? fr.grad(x, y, x, y + h, [[0, WARM, .55 * a], [1, '#C99A5E', .35 * a]]) : DARK, fa: lit ? 1 : .9 * a, color: LINE, w: 1.2, a: .7 * a });
  fr.line(x + w / 2, y, x + w / 2, y + h, { w: 1, color: LINE, a: .45 * a, cap: 'butt' }); fr.line(x, y + h * .42, x + w, y + h * .42, { w: 1, color: LINE, a: .45 * a, cap: 'butt' });
  if (lit && hash(seed * 2.7) > .5) fr.rect(x + 1, y + 1, w - 2, h * .22, { fill: '#7A5A3A', fa: .5 * a });          // 半拉的窗帘
  fr.line(x - 2, y + h + 2, x + w + 2, y + h + 2, { w: 2, color: LINE, a: .5 * a, cap: 'butt' });                         // 窗台
}
function tree(fr, x, y, s, a) {
  if (a <= 0) return;
  fr.line(x, y, x, y - s * .55, { w: 3, color: '#6E7F8F', a: .8 * a });
  for (const [dx, dy, r] of [[0, -.9, .42], [-.32, -.68, .32], [.32, -.7, .34], [0, -.62, .36]]) fr.circle(x + dx * s, y + dy * s, r * s, { fill: '#1B2B2E', fa: .95 * a, color: '#7E9A8E', w: 1.4, a: .6 * a });
}

/* ---------- 医院：主楼 + 两翼、楼顶"医院"灯牌、雨棚下的"住院部"、门口停着一辆救护车、两边的树 ---------- */
function hospital(fr, k, t) {
  const kk = (a, b) => ss(k, a, b);
  fr.line(-580, 232, lerp(-580, 580, kk(0, .25)), 232, L({ w: 1.6, a: .6 })); fr.line(-580, 246, lerp(-580, 580, kk(.05, .3)), 246, L({ w: 1, a: .25 }));
  const kw = kk(.05, .3);
  for (const [x0, x1] of [[-500, -330], [330, 500]]) { solid(fr, x0, -70, x1, 232, kw); fr.line(x0 - 8, -70, x1 + 8, -70, L({ w: 2.6, a: .85 * kw })); }
  const km = kk(.08, .35);
  solid(fr, -330, -182, 330, 232, km, { fill: FILL2 });
  fr.line(-346, -182, 346, -182, L({ w: 3, a: .9 * km })); fr.line(-338, -173, 338, -173, L({ w: 1, a: .35 * km }));
  for (const y of [-112, -50, 12, 74]) fr.line(-330, y, 330, y, L({ w: 1, a: .16 * km }));
  /* 楼顶的灯牌：一个十字 + "医院" */
  const ks = kk(.55, .8);
  fr.line(-96, -192, -96, -182, L({ a: ks })); fr.line(96, -192, 96, -182, L({ a: ks }));
  solid(fr, -132, -252, 132, -192, ks, { fill: '#13233A', color: HI, r: 6, glow: 10 });
  fr.rect(-112, -236, 30, 30, { r: 5, fill: '#E8EEF4', fa: .9 * ks });
  fr.rect(-101, -232, 8, 22, { fill: '#13233A', fa: ks }); fr.rect(-108, -225, 22, 8, { fill: '#13233A', fa: ks });
  fr.text('医  院', 26, -221, { font: 'serifm', size: 34, track: 12, color: C.ink, a: ks, glow: 10, glowA: .35 });
  /* 窗：主楼 4 行 × 8 列，两翼 4 行 × 2 列，全部落在墙里面 */
  let n = 0;
  const kwin = (i) => ss(k, .32 + i * .004, .5 + i * .004);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const x = -300 + c * 76, y = -160 + r * 62; if (r === 3 && (c === 3 || c === 4)) { n++; continue; } windowAt(fr, x, y, 46, 40, hash(n * 3.3 + 1) > .52, kwin(n), n); n++; }
  for (let r = 0; r < 4; r++) for (const x of [-478, -406, 360, 432]) { windowAt(fr, x, -46 + r * 62, 46, 40, hash(n * 3.3 + 1) > .55, kwin(n), n); n++; }
  /* 正门：雨棚（写着住院部）、两根柱子、三扇玻璃门、两级台阶 */
  const kd = kk(.45, .75);
  solid(fr, -176, 96, 176, 130, kd, { fill: '#13233A', color: HI });
  fr.text('住 院 部', 0, 113, { font: 'serifm', size: 25, track: 10, color: C.ink, a: kk(.65, .85), glow: 8, glowA: .3 });
  for (const xc of [-160, 160]) solid(fr, xc - 8, 130, xc + 8, 232, kd);
  for (let i = 0; i < 3; i++) {
    const x0 = -84 + i * 56;
    fr.rect(x0, 146, 56, 86, { fill: fr.grad(0, 146, 0, 232, [[0, '#64E3F6', .1 * kd], [1, '#9FD8E8', .03 * kd]]), color: HI, w: 1.4, a: .8 * kd });
    fr.line(x0 + 10, 160, x0 + 30, 140 + 60, { w: 1.4, color: '#E8F6FF', a: .25 * kd }); fr.line(x0 + 22, 160, x0 + 40, 196, { w: 1, color: '#E8F6FF', a: .18 * kd });
  }
  fr.line(-124, 239, 124, 239, L({ w: 1.4, a: .6 * kd })); fr.line(-138, 246, 138, 246, L({ w: 1.4, a: .5 * kd }));
  /* 救护车：停在右边，车身挡住后面的线 */
  const ka = kk(.6, .9);
  if (ka > 0) {
    fr.rect(296, 168, 136, 56, { r: 8, fill: '#1B2A3D', fa: .98 * ka, color: HI, w: 1.8, a: .85 * ka });
    fr.poly([[432, 224], [432, 176], [456, 176], [478, 202], [478, 224]], { close: true, fill: '#1B2A3D', fa: .98 * ka, color: HI, w: 1.8, a: .85 * ka });
    fr.poly([[438, 182], [454, 182], [470, 200], [438, 200]], { close: true, fill: '#64E3F6', fa: .12 * ka, color: HI, w: 1.2, a: .6 * ka });
    fr.line(296, 204, 478, 204, { w: 4, color: '#E8EEF4', a: .45 * ka, cap: 'butt' });
    fr.rect(354, 178, 22, 6, { fill: '#E8EEF4', fa: .85 * ka }); fr.rect(362, 170, 6, 22, { fill: '#E8EEF4', fa: .85 * ka });
    const blink = .5 + .5 * Math.sin((t || 0) * 7);
    fr.rect(318, 159, 26, 9, { r: 3, fill: '#E8EEF4', fa: (.5 + .4 * blink) * ka }); fr.glow(331, 163, 34, '#DCEBFF', .35 * blink * ka);
    for (const wx of [330, 446]) { fr.circle(wx, 226, 14, { fill: DARK, fa: ka, color: HI, w: 1.8, a: .85 * ka }); fr.circle(wx, 226, 5, { fill: '#5E6B77', fa: ka }); }
  }
  tree(fr, -540, 232, 120, kk(.5, .8)); tree(fr, 535, 232, 90, kk(.55, .85));
}

/* ---------- 高中：后面一栋教学楼（楼顶一面钟）、旗杆、校门的两根门柱和一道横梁"第一高级中学"、半开的伸缩门、门卫室、两边的围栏和树 ---------- */
function school(fr, k, t) {
  const kk = (a, b) => ss(k, a, b);
  fr.line(-600, 212, lerp(-600, 600, kk(0, .25)), 212, L({ w: 1.6, a: .6 }));
  /* 教学楼 */
  const kb = kk(.05, .35);
  fr.poly([[-80, -252], [0, -300], [80, -252]], { close: true, fill: FILL2, fa: .96 * kb, color: LINE, w: 1.8, a: .8 * kb });
  solid(fr, -380, -252, 380, 120, kb, { fill: FILL2 });
  fr.line(-394, -252, 394, -252, L({ w: 2.6, a: .85 * kb }));
  const kc = kk(.5, .75);
  fr.circle(0, -266, 22, { fill: '#E8EEF4', fa: .85 * kc, color: HI, w: 1.6, a: kc });
  const hr = ((t || 0) * .03) % 1, mn = ((t || 0) * .4) % 1;
  fr.line(0, -266, Math.cos(-Math.PI / 2 + hr * 6.28) * 11, -266 + Math.sin(-Math.PI / 2 + hr * 6.28) * 11, { w: 2.4, color: '#13233A', a: kc });
  fr.line(0, -266, Math.cos(-Math.PI / 2 + mn * 6.28) * 17, -266 + Math.sin(-Math.PI / 2 + mn * 6.28) * 17, { w: 1.6, color: '#13233A', a: kc });
  let n = 0;
  for (const y of [-238, -194, -44, 12]) for (let c = 0; c < 11; c++) { const x = -352 + c * 66; windowAt(fr, x, y, 40, 34, hash(n * 5.1 + 2) > .45, ss(k, .3 + n * .003, .48 + n * .003), n + 100); n++; }   // 窗避开校门横梁
  /* 旗杆和旗 */
  const kf = kk(.4, .7), wave = Math.sin((t || 0) * 2.2);
  fr.line(-480, 212, -480, lerp(212, -310, kf), L({ w: 2.4, a: .9 }));
  if (kf > .9) fr.path(`M-478,-306 Q-450,${-312 + wave * 6} -420,-304 Q-392,${-296 - wave * 6} -366,-304 L-366,-262 Q-392,${-254 - wave * 6} -420,-262 Q-450,${-270 + wave * 6} -478,-264 Z`, { fill: '#C9D3DC', a: .28 * ss(kf, .9, 1), color: HI, w: 1.4 });
  /* 围栏（两边） */
  const kr = kk(.3, .6);
  for (const s of [-1, 1]) {
    const xa = s * 330, xb = s * 600;
    solid(fr, Math.min(xa, xb), 150, Math.max(xa, xb), 212, kr);
    fr.line(xa, 66, lerp(xa, xb, kr), 66, L({ w: 1.4, a: .6 }));
    for (let x = 18; x < 270; x += 20) if (x / 270 < kr) { fr.line(s * (330 + x), 58, s * (330 + x), 150, L({ w: 1.2, a: .55 })); fr.circle(s * (330 + x), 56, 2.5, { fill: LINE, a: .6 }); }
  }
  tree(fr, 470, 150, 130, kk(.55, .85));
  /* 门卫室 */
  const kg = kk(.45, .75);
  solid(fr, -560, 72, -392, 212, kg, { fill: FILL2 });
  fr.rect(-574, 60, 196, 14, { fill: '#1A2A3E', fa: .98 * kg, color: HI, w: 1.6, a: .85 * kg });
  fr.rect(-540, 100, 92, 56, { fill: WARM, fa: .32 * kg, color: LINE, w: 1.4, a: .8 * kg }); fr.line(-494, 100, -494, 156, L({ w: 1, a: .5 * kg }));
  fr.rect(-436, 110, 30, 102, { fill: DARK, fa: .9 * kg, color: LINE, w: 1.4, a: .8 * kg });
  fr.text('门 卫', -494, 86, { font: 'serifr', size: 15, track: 4, color: HI, a: kg });
  /* 两根门柱 + 横梁 */
  const kp = kk(.1, .45);
  for (const [x0, x1] of [[-330, -246], [246, 330]]) { solid(fr, x0, -72, x1, 212, kp, { fill: '#162740' }); fr.rect(x0 - 8, -82, x1 - x0 + 16, 12, { fill: '#1C2E48', fa: .98 * kp, color: HI, w: 1.4, a: .8 * kp }); }
  const kl = kk(.35, .62);
  solid(fr, -372, -150, 372, -72, kl, { fill: '#13233A', color: HI, w: 2.2 });
  fr.line(-360, -140, 360, -140, L({ w: 1, a: .35 * kl })); fr.line(-360, -82, 360, -82, L({ w: 1, a: .35 * kl }));
  fr.text('第一高级中学', 0, -114, { font: 'serifm', size: 40, track: 14, color: C.ink, a: kk(.55, .8), glow: 10, glowA: .3 });
  fr.text('NO.1  SENIOR  HIGH  SCHOOL', 0, -88, { font: 'mono', size: 11, track: 4, color: C.label, a: kk(.6, .85) });
  /* 半开的伸缩门：一排交叉的格子，右头一个机箱 */
  const kt = kk(.55, .85), gx1 = lerp(-246, 120, kt);
  if (kt > 0) {
    fr.line(-246, 150, gx1, 150, L({ w: 2, a: .85 })); fr.line(-246, 204, gx1, 204, L({ w: 2, a: .85 }));
    for (let x = -246; x + 26 <= gx1; x += 26) { fr.line(x, 150, x + 26, 204, L({ w: 1.2, a: .6 })); fr.line(x + 26, 150, x, 204, L({ w: 1.2, a: .6 })); fr.circle(x + 13, 208, 3, { fill: LINE, a: .6 }); }
    solid(fr, gx1, 138, gx1 + 34, 210, 1, { fill: '#1C2E48', color: HI, r: 4 });
    fr.circle(gx1 + 17, 152, 3, { fill: '#9FE8A8', a: .8 });
  }
}

/* ---------- 街口和巷子 ----------
 * 左边路口一家两层的饭店：亮着的招牌、两盏灯笼、条纹遮阳篷、玻璃里看得见桌椅和吊灯、门口一块菜单牌；
 * 右边一条窄巷：砖墙、头顶的电线和一串灯笼，两边的店拉着卷帘门（贴着"转让"），最深处一家老字号亮着灯，门口排着队。 */
function wallPt(A, Bq, Cq, D, u, v) { const t = [lerp(A[0], Cq[0], u), lerp(A[1], Cq[1], u)], b = [lerp(Bq[0], D[0], u), lerp(Bq[1], D[1], u)]; return [lerp(t[0], b[0], v), lerp(t[1], b[1], v)]; }
function wallShutter(fr, A, Bq, Cq, D, u0, u1, v0, v1, a, sign) {
  const P = (u, v) => wallPt(A, Bq, Cq, D, u, v);
  fr.poly([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], { close: true, fill: '#1E252E', fa: a, color: '#4A5664', w: 1.2, a });
  for (let i = 1; i < 10; i++) { const v = lerp(v0 + .06, v1, i / 10); const p = P(u0, v), q = P(u1, v); fr.line(p[0], p[1], q[0], q[1], { w: 1, color: '#4A5664', a: .9 * a, cap: 'butt' }); }
  const p0 = P(u0 - .01, v0 - .07), p1 = P(u1 + .01, v0 - .07); fr.line(p0[0], p0[1], p1[0], p1[1], { w: 4, color: '#3A4654', a, cap: 'butt' });
  if (sign) { const c = P((u0 + u1) / 2, lerp(v0, v1, .45)), w = Math.abs(P(u1, .5)[0] - P(u0, .5)[0]) * .32; fr.rect(c[0] - w / 2, c[1] - w * .6, w, w * 1.2, { fill: '#D9D2C2', fa: .75 * a, color: '#8A8478', w: 1, a: .8 * a }); if (w > 14) fr.text('转让', c[0], c[1], { font: 'serifm', size: Math.max(8, w * .32), color: '#5A2A2A', a: .9 * a }); }
}
function alley(fr, k, t) {
  const kk = (a, b) => ss(k, a, b);
  /* ---- 路口的饭店 ---- */
  const ka = kk(0, .4);
  fr.line(-740, 232, lerp(-740, -150, ka), 232, L({ w: 1.6, a: .6 }));
  solid(fr, -660, -300, -250, 232, ka, { fill: FILL2 });
  for (const x of [-628, -400]) { windowAt(fr, x, -282, 120, 70, x > -500, kk(.3, .5), x); solid(fr, x + 30, -206, x + 90, -186, kk(.35, .55), { fill: '#1A2738', r: 3 }); }   // 二楼的窗和空调外机
  const sg = kk(.3, .6), flick = .92 + .08 * Math.sin((t || 0) * 9) * Math.sin((t || 0) * 3.1);
  fr.rect(-640, -174, 370, 84, { r: 8, color: WARM, w: 2.2, a: .95 * sg, fill: fr.grad(0, -174, 0, -90, [[0, '#5A3A1C', .9 * sg], [1, '#3A2412', .9 * sg]]), glow: 20 });
  fr.text('饭    店', -455, -131, { font: 'serifm', size: 48, track: 10, color: '#FFF1D8', a: sg * flick, glow: 18, glowColor: WARM, glowA: .7 });
  for (const lx of [-650, -260]) { const ky = kk(.45, .7); fr.line(lx, -90, lx, -70, L({ a: ky })); fr.glow(lx, -48, 46, '#F2A65A', .45 * ky); fr.ellipse(lx, -48, 15, 20, { fill: '#E07B3C', fa: .9 * ky, color: '#FFD9A0', w: 1.4, a: ky }); fr.line(lx - 10, -68, lx + 10, -68, { w: 3, color: '#3A2412', a: ky }); fr.line(lx - 10, -28, lx + 10, -28, { w: 3, color: '#3A2412', a: ky }); }
  const kw = kk(.35, .6);
  for (let i = 0; i < 8; i++) { const x0 = -654 + i * 50; fr.poly([[x0, -84], [x0 + 50, -84], [x0 + 50, -48], [x0, -48]], { close: true, fill: i % 2 ? '#2A3B52' : '#C9D3DC', fa: (i % 2 ? .95 : .3) * kw, color: LINE, w: 1, a: .5 * kw }); fr.arc(x0 + 25, -48, 25, 0, Math.PI, { fill: i % 2 ? '#2A3B52' : '#C9D3DC', fa: (i % 2 ? .95 : .3) * kw, color: LINE, w: 1, a: .5 * kw }); }
  /* 玻璃橱窗：里面的吊灯、桌椅 */
  const kg = kk(.45, .75);
  fr.rect(-626, -10, 342, 242, { fill: fr.grad(0, -10, 0, 232, [[0, WARM, .16 * kg], [1, '#C99A5E', .08 * kg]]), color: HI, w: 1.6, a: .8 * kg });
  for (const lx of [-560, -455, -350]) { fr.line(lx, -10, lx, 40, L({ w: 1, a: .5 * kg })); fr.path(`M${lx - 16},52 Q${lx},30 ${lx + 16},52 Z`, { fill: WARM, a: .7 * kg }); fr.glow(lx, 60, 60, WARM, .3 * kg); }
  for (const tx of [-560, -400]) {
    fr.line(tx - 50, 160, tx + 50, 160, { w: 4, color: '#8A6E52', a: .9 * kg }); fr.line(tx - 40, 160, tx - 40, 214, { w: 2, color: '#8A6E52', a: .8 * kg }); fr.line(tx + 40, 160, tx + 40, 214, { w: 2, color: '#8A6E52', a: .8 * kg });
    for (const s of [-1, 1]) { const cxh = tx + s * 72; fr.line(cxh, 140, cxh, 214, { w: 2, color: '#6E5A48', a: .8 * kg }); fr.line(cxh, 176, cxh - s * 26, 176, { w: 2, color: '#6E5A48', a: .8 * kg }); fr.line(cxh - s * 26, 176, cxh - s * 26, 214, { w: 2, color: '#6E5A48', a: .8 * kg }); }
    fr.circle(tx - 12, 152, 7, { fill: '#E8EEF4', fa: .5 * kg }); fr.circle(tx + 14, 152, 7, { fill: '#E8EEF4', fa: .5 * kg });
  }
  fr.rect(-342, 4, 46, 18, { r: 3, fill: '#13233A', fa: .9 * kg, color: HI, w: 1, a: .7 * kg }); fr.text('营业中', -319, 13, { font: 'serifr', size: 11, color: '#9FE8A8', a: kg });
  const km = kk(.55, .8);                                                                // 门口的菜单牌
  fr.poly([[-226, 232], [-206, 150], [-170, 150], [-150, 232]], { close: true, fill: '#1A2738', fa: .95 * km, color: HI, w: 1.4, a: .8 * km });
  for (let i = 0; i < 4; i++) fr.line(-200 + i * 1.5, 170 + i * 14, -176 - i * 1.5, 170 + i * 14, { w: 1.4, color: '#E8EEF4', a: .45 * km });
  /* ---- 巷子：两面墙往远处收拢 ---- */
  const kb = kk(.15, .55);
  const LA = [-120, -280], LB = [-120, 300], LC = [150, -50], LD = [150, 96], RA = [560, -280], RB = [560, 300], RC = [262, -50], RD = [262, 96];
  fr.poly([LA, LC, LD, LB], { close: true, fill: '#111C2B', fa: .95 * kb }); fr.poly([RA, RC, RD, RB], { close: true, fill: '#111C2B', fa: .95 * kb });
  fr.poly([LB, LD, RD, RB], { close: true, fill: '#0C1520', fa: .95 * kb });
  for (const [p, q] of [[LA, LC], [LB, LD], [RA, RC], [RB, RD]]) fr.line(p[0], p[1], lerp(p[0], q[0], kb), lerp(p[1], q[1], kb), L({ w: 1.8 }));
  fr.line(LA[0], LA[1], LB[0], LB[1], L({ w: 1.4, a: .6 * kb })); fr.line(RA[0], RA[1], RB[0], RB[1], L({ w: 1.4, a: .6 * kb }));
  const kbr = kk(.3, .6);                                                                 // 砖缝
  for (const W of [[LA, LB, LC, LD], [RA, RB, RC, RD]]) for (let i = 1; i < 12; i++) { const v = i / 12, p = wallPt(...W, 0, v), q = wallPt(...W, 1, v); fr.line(p[0], p[1], q[0], q[1], { w: 1, color: LINE, a: .1 * kbr, cap: 'butt' }); }
  for (let i = 1; i < 7; i++) { const u = 1 - Math.pow(1 - i / 7, 1.6), p = wallPt(LB, LB, RB, RB, 0, 0), q = [lerp(LB[0], LD[0], u), lerp(LB[1], LD[1], u)], r = [lerp(RB[0], RD[0], u), lerp(RB[1], RD[1], u)]; fr.line(q[0], q[1], r[0], r[1], { w: 1, color: LINE, a: .12 * kbr, cap: 'butt' }); }   // 地上的石板缝
  const kc = kk(.45, .75);
  if (kc > 0) { wallShutter(fr, LA, LB, LC, LD, .08, .42, .38, 1, kc, true); wallShutter(fr, LA, LB, LC, LD, .55, .78, .4, 1, kc, false); wallShutter(fr, RA, RB, RC, RD, .12, .45, .38, 1, kc, true); }
  /* 头顶的电线和一串灯笼 */
  const ke = kk(.5, .8);
  if (ke > 0) {
    for (const [u, sag] of [[.18, 40], [.5, 22]]) { const p = wallPt(LA, LB, LC, LD, u, .06), q = wallPt(RA, RB, RC, RD, u, .06); fr.path(`M${p[0]},${p[1]} Q${(p[0] + q[0]) / 2},${(p[1] + q[1]) / 2 + sag} ${q[0]},${q[1]}`, { color: '#4A5664', w: 1.2, a: .8 * ke }); }
    const p = wallPt(LA, LB, LC, LD, .32, .1), q = wallPt(RA, RB, RC, RD, .32, .1);
    for (let i = 1; i <= 3; i++) { const f = i / 4, x = lerp(p[0], q[0], f), y = lerp(p[1], q[1], f) + 30 * Math.sin(Math.PI * f) + 14, r = 9; fr.glow(x, y, 38, '#F2A65A', .4 * ke); fr.ellipse(x, y, r, r * 1.25, { fill: '#E07B3C', fa: .9 * ke, color: '#FFD9A0', w: 1.2, a: ke }); }
  }
  /* 最深处：一家老字号，亮着灯，门口排着四个人 */
  const kd = kk(.55, .9);
  fr.rect(162, -30, 88, 126, { color: LINE, w: 1.4, a: .8 * kd, fill: WARM, fa: .22 * kd });
  fr.rect(168, -46, 76, 16, { r: 3, fill: '#3A2412', fa: .9 * kd, color: WARM, w: 1, a: .8 * kd }); fr.text('老字号', 206, -38, { font: 'serifm', size: 11, track: 2, color: '#FFE3B8', a: kd });
  fr.glow(206, 20, 80, WARM, .45 * kd);
  [[184, 70, 30], [158, 96, 40], [122, 132, 54], [76, 182, 70]].forEach(([px, py, s], i) => B.avatar(fr, px, py, s, [1, 0, 3, 4][i], { a: kd * ss(k, .7 + i * .05, .9 + i * .02), shade: .45 }));
}

/* ---------- 婴儿秤：上面一个带外圈的大表盘（0–5 千克，2.5 千克处一道玫红刻度、指针带配重尾巴），下面颈柱、带厚度的弧形托盘（里面垫着一条毛巾）、圆角底座和小脚 ---------- */
const ANG = kg => (-210 + 48 * kg) * Math.PI / 180;
function scale(fr, k, kg, baby) {
  const DY = -120, R = 140;
  const ka = ss(k, 0, .4);
  /* 颈柱、底座、托盘（先画，表盘压在上面） */
  const kb = ss(k, .3, .7);
  fr.rect(-18, DY + R - 6, 36, 92, { fill: '#1A2738', fa: .95 * kb, color: LINE, w: 1.6, a: .8 * kb }); fr.rect(-28, 66, 56, 12, { r: 4, fill: '#1F3048', fa: .95 * kb, color: HI, w: 1.2, a: .8 * kb });
  fr.rect(-236, 150, 472, 96, { r: 22, fill: fr.grad(0, 150, 0, 246, [[0, '#1F3048', .95 * kb], [1, '#111C2B', .95 * kb]]), color: HI, w: 1.8, a: .85 * kb });
  fr.line(-200, 196, 200, 196, L({ w: 1, a: .3 * kb })); fr.rect(-40, 212, 80, 18, { r: 4, color: LINE, w: 1, a: .5 * kb }); fr.text('BABY SCALE', 0, 221, { font: 'mono', size: 9, track: 2, color: C.label, a: kb });
  for (const fx of [-190, 190]) fr.rect(fx - 22, 246, 44, 10, { r: 4, fill: '#1A2738', fa: .95 * kb, color: LINE, w: 1.2, a: .7 * kb });
  fr.path('M-284,78 Q0,214 284,78 L270,78 Q0,190 -270,78 Z', { fill: '#1F3048', a: .95 * kb, color: HI, w: 2 });
  fr.line(-290, 78, 290, 78, { w: 3, color: HI, a: .9 * kb });
  fr.path('M-230,86 Q-160,108 -90,98 T50,104 T190,94 L230,86', { color: '#E8EEF4', w: 1.6, a: .35 * kb });     // 毛巾的边
  if (baby) B.baby(fr, baby.x, baby.y, 150, { a: baby.a, rot: -Math.PI / 2 });
  /* 表盘 */
  fr.circle(0, DY, R + 12, { fill: '#1A2738', fa: .95 * ka, color: HI, w: 2.4, a: .9 * ka });
  fr.arc(0, DY, R + 6, -Math.PI * 1.5, -Math.PI * 1.5 + Math.PI * 2 * ka, { color: '#5E6B77', w: 1, a: .8 });
  fr.circle(0, DY, R - 4, { fill: fr.rgrad(0, DY - 40, 10, R, [[0, '#1E3350', .95 * ka], [1, '#0C1626', .95 * ka]]), color: LINE, w: 1, a: .5 * ka });
  for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283 + .4; fr.circle(Math.cos(an) * (R + 6), DY + Math.sin(an) * (R + 6), 2.2, { fill: '#8FA3B5', a: .7 * ka }); }   // 外圈的螺丝
  const kt = ss(k, .2, .55);
  for (let i = 0; i <= 20; i++) { const an = ANG(i / 4), r0 = i % 4 === 0 ? R - 34 : R - 22; if (i / 20 > kt) break; fr.line(Math.cos(an) * r0, DY + Math.sin(an) * r0, Math.cos(an) * (R - 10), DY + Math.sin(an) * (R - 10), { w: i % 4 === 0 ? 2.2 : 1.2, color: '#C9D3DC', a: .8, cap: 'butt' }); }
  for (let v = 0; v <= 5; v++) { const an = ANG(v); fr.text(String(v), Math.cos(an) * (R - 56), DY + Math.sin(an) * (R - 56), { font: 'latin', size: 30, color: '#E1E8EE', a: ss(k, .35 + v * .03, .6 + v * .03) }); }
  fr.text('千克', 0, DY + 50, { font: 'serifr', size: 17, track: 4, color: C.label, a: ss(k, .5, .7) });
  fr.text('婴 儿 秤', 0, DY + 76, { font: 'serifr', size: 14, track: 6, color: '#5E6B77', a: ss(k, .55, .75) });
  const km = ss(k, .55, .8), am = ANG(2.5);
  fr.line(Math.cos(am) * (R - 40), DY + Math.sin(am) * (R - 40), Math.cos(am) * (R + 12), DY + Math.sin(am) * (R + 12), { w: 4, color: C.rose, a: km, glow: 12, glowColor: C.rose, cap: 'butt' });
  fr.text('2500 克', 0, DY - R - 40, { font: 'serifr', size: 28, track: 3, color: C.rose, a: km, glow: 8, glowColor: C.rose, glowA: .4 });
  /* 指针：一头尖、一头带配重 */
  const an = ANG(kg), ca = Math.cos(an), sa = Math.sin(an);
  fr.poly([[ca * (R - 26), DY + sa * (R - 26)], [-sa * 4, DY + ca * 4], [-ca * 26 - sa * 6, DY - sa * 26 + ca * 6], [-ca * 26 + sa * 6, DY - sa * 26 - ca * 6], [sa * 4, DY - ca * 4]], { close: true, fill: '#F2F5F8', a: .95 * ka, glow: 8 });
  fr.circle(0, DY, 11, { fill: '#C9D3DC', a: ka }); fr.circle(-3, DY - 3, 4, { fill: '#FFFFFF', a: .6 * ka });
}

/* ---------- 一部横着拿的手机（或平板）：大圆角、前置摄像头、侧键 ---------- */
function phone(fr, x0, y0, x1, y1, k) {
  if (k <= 0) return;
  const a = ss(k, 0, .6), s = lerp(1.03, 1, E.out3(k)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  fr.g({ a, at: [cx * (1 - s), cy * (1 - s)], s }, () => {
    fr.rect(x0, y0, x1 - x0, y1 - y0, { r: 72, color: '#C9D3DC', w: 3, a: .75, glow: 10, glowColor: '#BFD9F2' });
    fr.rect(x0 + 30, y0 + 30, x1 - x0 - 60, y1 - y0 - 60, { r: 44, color: '#8FA3B5', w: 1.2, a: .35 });
    fr.circle(x0 + 15, cy, 7, { color: '#C9D3DC', w: 1.6, a: .7 });
    fr.line(x1 - 330, y0 - 5, x1 - 250, y0 - 5, { w: 5, color: '#8FA3B5', a: .6 }); fr.line(x1 - 220, y0 - 5, x1 - 180, y0 - 5, { w: 5, color: '#8FA3B5', a: .6 });
  });
}

window.BK = Object.assign(window.BK || {}, { PLACES: { hospital, school, alley, scale, phone } });
})();
