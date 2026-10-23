// Claude Duet《Two Lines》第二版分镜：一笔画 × 3D，干净、看得到画成了什么、有颜色、用真实 app。
// 你 = 墨黑的线，Claude = 陶土色的线。A 区：你绕着「you」越跑越快、越升越高；7 个 app 圆片落下、未读数往上涨 → Claude 画出一个轮子把它们一个个连到你 →
// 冲进中心换到 B 区：晨报、日历→柱状图、原型 → 甩到 C 区：批准卡，你补上那一笔 → 两根线绞着升起，app 圆片绕着转 → 落成官方 Duet 图标。
// 唯一一次换场景在 TCUT：A 的潜入点和 B 的落点正好差一个纸纹周期（3400px），两边画面一样。
import { stage, Line, writing, penShadow, caption, capMetrics, bez, poly, rrect, lineTo, near, rot, X, Y, THREE } from './lib/ink3d.js';
import { clamp, lerp, seg, eio, eo, ss, vnoise, mulberry, track } from '/core/lib.js';

const TERRA = '#D97757', CLINE = '#CC6644', GREY = '#6b6157', RED = '#E5484D';
const st = await stage({ fonts: [['Hand', 'fonts/Caveat-600.woff'], ['Inter', 'fonts/Inter-var.woff', { weight: '100 900' }]], sky: '#F0EADE', fog: '#F0EADE', fogNear: 32, fogFar: 75 });   // 远景镜头离纸 20–25 单位，雾要从更远处才开始，不然线和颜色都发灰
const YOU = new Line(st, { hw: .036 }), CL = new Line(st, { hw: .03, ink: CLINE });
const D2R = Math.PI / 180;
function circ(cx, cy, r, a0, a1, n = 48) { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]); } return o; }
function catmull(P, per = 10) {
  const o = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = i ? 1 : 0; k <= per; k++) { const t = k / per, t2 = t * t, t3 = t2 * t;
      o.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)).concat([0])); }
  }
  return o;
}
function resample(P, n) {
  const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const o = []; let j = 0;
  for (let i = 0; i <= n; i++) { const s = L[L.length - 1] * i / n; while (j < L.length - 2 && L[j + 1] < s) j++; const k = (s - L[j]) / Math.max(1e-6, L[j + 1] - L[j]); o.push([lerp(P[j][0], P[j + 1][0], k), lerp(P[j][1], P[j + 1][1], k), 0]); }
  return o;
}

// ================= app 圆片：白面 + 品牌色侧边 + Simple Icons 官方字形 + 红色未读角标 =================
const APPS = [['gmail', '#EA4335'], ['googlecalendar', '#4285F4'], ['googledocs', '#4285F4'], ['github', '#181717'], ['slack', '#4A154B'], ['stripe', '#635BFF'], ['shopify', '#7AB55C']];
const GLYPH = {};
for (const [id] of APPS) { const s = await (await fetch(`assets/apps/${id}.svg`)).text(); GLYPH[id] = new Path2D(s.match(/<path d="([^"]+)"/)[1]); }
const COL = Object.fromEntries(APPS);
const faceTex = {};
function faceFor(id) {
  if (faceTex[id]) return faceTex[id];
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(256, 256, 256, 0, 7); g.fill();
  g.strokeStyle = COL[id]; g.globalAlpha = .9; g.lineWidth = 14; g.beginPath(); g.arc(256, 256, 240, 0, 7); g.stroke(); g.globalAlpha = 1;
  g.save(); g.translate(256, 256); g.scale(10.5, 10.5); g.translate(-12, -12); g.fillStyle = COL[id]; g.fill(GLYPH[id]); g.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.center.set(.5, .5); t.rotation = Math.PI / 2;   // 圆柱顶面的 UV 是横着的，转正
  return faceTex[id] = t;
}
class Token {
  constructor(id, rPx) {
    this.id = id; this.r = rPx;
    const R = rPx / 100, h = .13, geo = new THREE.CylinderGeometry(R, R, h, 64); geo.rotateX(Math.PI / 2); geo.translate(0, 0, h / 2);
    const side = new THREE.MeshStandardMaterial({ color: COL[id], roughness: .5 }), top = new THREE.MeshStandardMaterial({ map: faceFor(id), roughness: .6 });
    this.mesh = new THREE.Mesh(geo, [side, top, side]); this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.g = new THREE.Group(); this.g.add(this.mesh); st.scene.add(this.g);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; this.bc = cv.getContext('2d');
    this.btex = new THREE.CanvasTexture(cv); this.btex.colorSpace = THREE.SRGBColorSpace;
    this.badge = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.5, R * .75), new THREE.MeshStandardMaterial({ map: this.btex, transparent: true, roughness: .6, depthWrite: false }));
    this.badge.position.set(R * .66, R * .66, h + .012); this.g.add(this.badge); this.btxt = null;
  }
  setBadge(txt, s) {                                             // txt = 未读数（null = 没有），s = 角标缩放（弹出/消掉）
    this.badge.visible = !!txt && s > .01; if (!this.badge.visible) return; this.badge.scale.setScalar(s);
    if (txt === this.btxt) return; this.btxt = txt; const g = this.bc; g.clearRect(0, 0, 256, 128);
    g.font = '700 74px Inter'; const w = Math.max(112, g.measureText(txt).width + 54);
    g.fillStyle = RED; g.beginPath(); g.roundRect(128 - w / 2, 8, w, 112, 56); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(txt, 128, 90); this.btex.needsUpdate = true;
  }
  place(x, y, z, s = 1, tilt = 0) { this.g.position.set(X(x), Y(y), z); this.g.scale.setScalar(Math.max(.001, s)); this.g.rotation.set(tilt, 0, 0); this.g.visible = s > .01; this.mesh.castShadow = z < .6; }   // tilt：绕 X 轴把正面转向镜头   // 飞得高时不投影（地上一团团灰影太脏）
}
const drop = (t, t0, H = 2.4) => {                                // 从空中落下、弹两下（高度，世界单位）
  const s = t - t0; if (s < 0) return null; const T1 = .32;
  if (s < T1) return H * (1 - (s / T1) ** 2);
  return .22 * Math.exp(-7 * (s - T1)) * Math.abs(Math.sin((s - T1) * 14));
};

// ================= 水彩：画完的形状里晕开一层淡色 =================
const WASHES = [];
function wash(poly2, color, alpha, seed, t0, t1, o = {}) {
  const xs = poly2.map(p => p[0]), ys = poly2.map(p => p[1]), x0 = Math.min(...xs) - 20, y0 = Math.min(...ys) - 20, w = Math.max(...xs) + 20 - x0, h = Math.max(...ys) + 20 - y0;
  const sc = Math.min(1, 900 / Math.max(w, h)), cv = document.createElement('canvas'); cv.width = Math.ceil(w * sc); cv.height = Math.ceil(h * sc); const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w / 100, h / 100), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .95, depthWrite: false }));
  m.position.set(X(x0 + w / 2), Y(y0 + h / 2), o.z ?? .0012); m.receiveShadow = true; m.renderOrder = 5; st.scene.add(m);
  const rnd = mulberry(Math.round(seed[0] * 7 + seed[1])), grains = []; for (let i = 0; i < 260; i++) grains.push([rnd() * w, rnd() * h, rnd()]);
  const rmax = Math.hypot(Math.max(seed[0] - x0, x0 + w - seed[0]), Math.max(seed[1] - y0, y0 + h - seed[1]));
  let last = -1;
  const r = { m, draw(t) {
    const k = eio(seg(t, t0, t1)), out = o.out ? 1 - eio(seg(t, o.out, o.out + .5)) : 1; m.visible = k > 0 && out > 0; m.material.opacity = out;
    if (!m.visible || k === last) return; last = k;
    g.setTransform(sc, 0, 0, sc, 0, 0); g.clearRect(0, 0, w, h); g.save(); g.translate(-x0, -y0);
    g.beginPath(); for (let i = 0; i <= 90; i++) { const a = i / 90 * Math.PI * 2, rr = rmax * k * (1 + .05 * Math.sin(a * 5 + seed[0]) + .03 * Math.sin(a * 11)); g.lineTo(seed[0] + Math.cos(a) * rr, seed[1] + Math.sin(a) * rr); } g.clip();
    g.beginPath(); poly2.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    g.globalAlpha = alpha; g.fillStyle = color; g.filter = 'blur(1.5px)'; g.fill(); g.filter = 'none';
    g.clip(); g.globalAlpha = alpha * .35; g.fillStyle = color; grains.forEach(([gx, gy, s]) => { g.beginPath(); g.arc(x0 + gx, y0 + gy, 2 + s * 5, 0, 7); g.fill(); });   // 颜料颗粒
    g.restore(); tex.needsUpdate = true;
  } };
  WASHES.push(r); return r;
}

// ================= A 区：你绕圈 → app 落下 → Claude 画轮子 =================
const C = [960, 560], RT = 440, TR = 70, FR = 10.6, SET0 = 15.3, SET1 = 16.8;
const A_TOK = APPS.map(([id], k) => { const a = (-90 + k * 360 / 7) * D2R; return { id, a, c: [C[0] + Math.cos(a) * RT, C[1] + Math.sin(a) * RT], land: .3 + .3 * k, tok: new Token(id, TR) }; });
// 你：落笔，然后绕着中心跑 9 圈，一圈比一圈快、一圈比一圈高（整齐的线圈）
const LAPS = 9, R0 = 120;
{
  YOU.piece([[C[0] - R0, C[1], 0], [C[0] - R0 - 1, C[1], 0]], 0, .05);
  const pts = [];
  for (let i = 0; i <= LAPS * 120; i++) { const q = i / 120, th = Math.PI + q * Math.PI * 2, r = R0 + 6 * q; pts.push([C[0] + Math.cos(th) * r, C[1] + Math.sin(th) * r * .97, 1.6 * ss((q - 1.6) / 7.4), q]); }
  YOU.piece(pts, .15, FR, { warp: u => Math.pow(u, .55), tag: 'laps' });
}
// Claude：从右上角出发，沿外圈走；到每个 app：绕它一圈半 → 拉一根辐条到你那圈的外沿再回来 → 再绕半圈回到外侧 → 去下一个
const Q0 = [1560, 170], RA = RT + TR + 18, RL = TR + 16, HUB = R0 + 10 * LAPS + 22;
const ORDER = [1, 2, 3, 4, 5, 6, 0], CLEAR = {};
{
  CL.piece([[Q0[0], Q0[1], 0], [Q0[0] + 1, Q0[1], 0]], 0, .05);
  const first = A_TOK[ORDER[0]], outer = tk => [C[0] + Math.cos(tk.a) * RA, C[1] + Math.sin(tk.a) * RA, 0], o1 = outer(first);
  CL.piece(bez(Q0, [Q0[0] - 30, Q0[1] + 90], [o1[0] + 60, o1[1] - 40], o1, 30), 11.0, 11.4);
  let tt = 11.4;
  ORDER.forEach((k, j) => {
    const tk = A_TOK[k], a = tk.a;
    CLEAR[k] = tt;
    CL.piece(circ(tk.c[0], tk.c[1], RL, a, a + Math.PI * 3, 72), tt, tt + .28); tt += .28;            // 绕一圈半，停在内侧
    const inner = [C[0] + Math.cos(a) * (RT - RL), C[1] + Math.sin(a) * (RT - RL), 0], hub = [C[0] + Math.cos(a) * HUB, C[1] + Math.sin(a) * HUB, 0];
    CL.piece(lineTo(inner, hub, 20), tt, tt + .07); tt += .07; CL.piece(lineTo(hub, inner, 20), tt, tt + .07); tt += .07;   // 辐条：进去再出来
    CL.piece(circ(tk.c[0], tk.c[1], RL, a + Math.PI, a + Math.PI * 2, 36), tt, tt + .1); tt += .1;    // 回到外侧
    if (j < 6) { const nx = A_TOK[ORDER[j + 1]]; let a1 = nx.a; while (a1 < a) a1 += Math.PI * 2; CL.piece(circ(C[0], C[1], RA, a, a1, 40), tt, tt + .09); tt += .09; }
  });
}
const CL_A_END = CL.P.length - 1;

// ================= B 区：晨报 → 一周 → 柱状图 → 原型 =================
const PA = (-90 + 11.0) * D2R, P_DIVE = [C[0] + Math.cos(PA) * 320, C[1] + Math.sin(PA) * 320], TCUT = 23.4;   // 离 Gmail 那根辐条 62px 的白纸：辐条一直留在画里，只有最后两三帧是纯白纸
const B_DIVE = [P_DIVE[0] + 3400, P_DIVE[1]];
const BS = [B_DIVE[0] + 380, B_DIVE[1] + 140];                   // 晨报边框的起笔点就在落点右边 60px
const SH = { x: BS[0] - 320, y: BS[1] - 280, w: 640, h: 560, r: 46 }, UL = SH.y + 140;
{
  const r = rrect(SH.x, SH.y, SH.w, SH.h, SH.r), i = near(r, SH.x, UL);
  CL.gapTo(r[i], TCUT);
  CL.piece(rot(r, i), TCUT, TCUT + .7, { warp: q => 1 - Math.pow(1 - q, 1.8) });   // 起笔就快：换场景后马上有东西
  CL.piece(lineTo([SH.x, UL], [SH.x + SH.w, UL], 40), 24.45, 24.8);   // 陶土色的标题下划线，正好穿出右边框
}
const ROWS = [UL + 90, UL + 195, UL + 300], BX = SH.x + 74;
const B_TOK = [['gmail', 'Dana needs a yes on Friday'], ['stripe', 'Invoice #2041 is overdue'], ['googledocs', 'Launch doc needs your edits']].map(([id, txt], k) => ({ id, txt, tok: new Token(id, 36), land: 25.0 + .35 * k, c: [BX, ROWS[k]] }));
const SX = BS[0] + 560, SW = 88, STOP = BS[1] - 60, SBOT = BS[1] + 60;
{
  const strip = [[SX, STOP], [SX + 7 * SW, STOP], [SX + 7 * SW, SBOT], [SX, SBOT], [SX, STOP]];
  for (let i = 1; i < 7; i++) { const x = SX + i * SW; strip.push(i % 2 ? [x, STOP] : [x, SBOT], i % 2 ? [x, SBOT] : [x, STOP]); }
  CL.piece(bez(CL.last(), [SH.x + SH.w + 120, UL], [SX - 120, STOP - 30], [SX, STOP], 40), 28.2, 28.6);
  CL.piece(poly(strip, 14), 28.6, 29.5, { tag: 'strip' });
}
const TH = 3, FOLD0 = 30.9, FOLD1 = 31.6, GROW1 = 32.4, BARH = [.95, 1.4, 1.1, 2.15, 1.65, 2.45, 2.0];
const BAR_COL = ['#A9C99A', '#EED493', '#9CC3EC', '#4285F4', '#E9A486', '#A9C99A', '#EED493'];
const CAL_TOK = { tok: new Token('googlecalendar', 44), land: 28.5, c: [SX - 70, BS[1]] };
const WF = { x: SX + 7 * SW + 400, y: BS[1] - 150, w: 440, h: 300 };
{
  CL.piece(bez(CL.last(), [SX + 7 * SW - 60, SBOT + 80], [WF.x - 120, WF.y + WF.h + 30], [WF.x, WF.y + WF.h - 40], 40), 31.7, 32.2);
  const r = rrect(WF.x, WF.y, WF.w, WF.h, 24), i = near(r, WF.x, WF.y + WF.h - 40);
  CL.piece(rot(r, i), 32.2, 32.7);
  CL.piece(poly([[WF.x, WF.y + WF.h - 40], [WF.x, WF.y + 56], [WF.x + WF.w, WF.y + 56]], 14), 32.7, 32.85);   // 沿左边框回到上面，画标题栏
  const ix = WF.x + 30, iy = WF.y + 84, iw = 170, ih = 180;
  CL.piece(poly([[WF.x + WF.w, WF.y + 56], [ix + iw, WF.y + 56], [ix + iw, iy], [ix, iy], [ix, iy + ih], [ix + iw, iy + ih], [ix + iw, iy]], 12), 32.85, 33.15);
  const tx0 = ix + 214, tx1 = WF.x + WF.w - 34, s = [[ix + iw, iy], [tx0, iy + 14]];
  [[tx0, tx1], [tx1, tx0], [tx0, tx1 - 40]].forEach(([a, b], j) => { const y = iy + 14 + j * 52; s.push([a, y], [b, y]); if (j < 2) s.push([b + (b > a ? 18 : -18), y + 26], [b, y + 52]); });
  CL.piece(catmull(s, 6), 33.15, 33.7);
}
const GH_TOK = { tok: new Token('github', 36), land: 32.9, c: [WF.x + WF.w - 46, WF.y + 30] };

// ================= C 区：批准卡 =================
const CC = [WF.x + WF.w + 720, BS[1] + 40];
const CARD = { x: CC[0] - 350, y: CC[1] - 235, w: 700, h: 470, r: 44 };
const BTN = { x: CARD.x + 60, y: CARD.y + 340, w: 250, h: 76 };
{
  const r = rrect(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r), i = near(r, CARD.x, BTN.y + 38);
  CL.piece(bez(CL.last(), [WF.x + WF.w + 300, WF.y + WF.h + 120], [CARD.x - 300, BTN.y + 120], r[i], 90), 34.6, 36.2, { warp: q => eio(q) });
  CL.piece(rot(r, i), 36.2, 37.0, { warp: q => eio(q) * .85 + q * .15 });
  const b = rrect(BTN.x, BTN.y, BTN.w, BTN.h, 38), j = near(b, BTN.x, BTN.y + 38);
  CL.piece(lineTo(r[i], b[j], 10), 37.0, 37.08);
  CL.piece(rot(b, j), 37.08, 37.45);
}
const HOVER = [BTN.x + BTN.w + 40, BTN.y + 38];
CL.piece(bez(CL.last(), [BTN.x + 20, BTN.y + 104], [BTN.x + BTN.w + 20, BTN.y + 104], HOVER, 30), 37.45, 37.7);
const GM_TOK = { tok: new Token('gmail', 36), land: 36.9, c: [CARD.x + 74, CARD.y + 72] };
const CK = [BTN.x + 30, BTN.y + 38];
YOU.gapTo([CK[0] - 160, CARD.y + CARD.h + 360, 0], 40.2);
YOU.piece(bez(YOU.last(), [CK[0] - 120, CARD.y + CARD.h + 140], [CK[0] - 40, CK[1] + 110], CK, 50), 40.2, 40.95, { warp: q => eio(q) });   // 从左下进来，勾完往右下出去：一个 V，不并成两道
YOU.piece(poly([CK, [CK[0] + 18, CK[1] + 20], [CK[0] + 58, CK[1] - 30]], 16), 41.0, 41.3);
const Q = [CC[0] + 1100, CC[1] + 150], HR = 27, TURNS = 2.6, ZTOP = 3.8, H0 = 44.0, H1 = 47.6;
YOU.piece(lineTo([CK[0] + 58, CK[1] - 30], [CK[0] + 18, CK[1] + 20], 12), 41.32, 41.42);
YOU.piece(bez(YOU.last(), [CK[0] + 18, CARD.y + CARD.h + 200], [Q[0] - 560, CARD.y + CARD.h + 220], [Q[0] - HR, Q[1]], 70), 41.5, 43.9, { warp: q => eio(q) });   // 勾完往下穿出卡片底边，走卡片下面
CL.piece(bez(HOVER, [HOVER[0] + 240, HOVER[1] - 60], [Q[0] - 380, Q[1] - 70], [Q[0] + HR, Q[1]], 60), 42.9, 43.9, { warp: q => eio(q) });
function helix(phase) { const o = []; for (let i = 0; i <= 900; i++) { const s = i / 900, a = phase + s * TURNS * Math.PI * 2, r = HR * (1 - .2 * s); o.push([Q[0] + 40 * Math.sin(s * 2.2) + Math.cos(a) * r, Q[1] + 20 * Math.sin(s * 1.7) + Math.sin(a) * r, s * ZTOP]); } return o; }
YOU.piece(helix(Math.PI), H0, H1, { warp: s => s * .9 + .1 * s * s, tag: 'helix' });
CL.piece(helix(0), H0, H1, { warp: s => s * .9 + .1 * s * s, tag: 'helix' });

// ================= D：官方 Duet 图标 =================
const TS = 640, KK = TS / 1024;
const LOGO_RAW = [[628, 625], [660, 640], [700, 650], [740, 640], [775, 625], [800, 612], [830, 595], [855, 560], [875, 520], [882, 480], [865, 450], [835, 445], [810, 465], [797, 500], [797, 545], [808, 580], [830, 605], [870, 625], [910, 640], [950, 648], [990, 640], [1015, 628], [1040, 610], [1062, 580], [1085, 540], [1095, 500], [1085, 460], [1060, 440], [1030, 440], [1000, 460], [980, 500], [972, 545], [982, 585], [1010, 615], [1045, 640], [1090, 655], [1140, 658], [1190, 650], [1230, 630], [1265, 600], [1290, 570], [1305, 553]]
  .map(([x, y]) => [(x - 420) * 1300 / 1080, y * 1300 / 1080]);
const D = [Q[0] - (LOGO_RAW[0][0] - 650) * KK, Q[1] - (LOGO_RAW[0][1] - 650) * KK];
const LOGO = resample(catmull(LOGO_RAW.map(([x, y]) => [D[0] + (x - 650) * KK, D[1] + (y - 650) * KK]), 12), 900);
const LN = LOGO.map((p, i) => { const a = LOGO[Math.max(0, i - 1)], b = LOGO[Math.min(LOGO.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
const LAY0 = 48.0, LAY1 = 49.7, MERGE1 = 50.6;
// 结尾那 7 个 app：绕着绞线转，最后落成一排，在字标下面
const ORBIT = APPS.map(([id], k) => ({ id, tok: new Token(id, 46), k }));
const ROW_Y = D[1] + TS / 2 + 95;

// ---------- 动态 ----------
function layDown(p, t, off) {                                     // 两股并排落成图标那一笔：黑的正好在线上，陶土色的在旁边，然后渗进纸里
  const b = eio(seg(t, LAY0, LAY1)); if (b <= 0) return null;
  const j = Math.round(p.u * 900), L = LOGO[j], n = LN[j];
  return [lerp(p.x, L[0] + n[0] * off, b), lerp(p.y, L[1] + n[1] * off, b), lerp(p.z, 0, b) + Math.sin(Math.PI * b) * .9 * (1 - p.u * .3)];
}
YOU.dyn = (i, p, t) => {
  if (p.tag === 'laps') {                                        // 冻住以后放平，摊成一圈圈整齐的同心圈
    const b = eio(seg(t, SET0, SET1)); if (b <= 0) return null;
    const q = p.m ?? 0, th = Math.PI + q * Math.PI * 2, r = R0 + 10 * q;
    return [lerp(p.x, C[0] + Math.cos(th) * r, b), lerp(p.y, C[1] + Math.sin(th) * r, b), lerp(p.z, 0, b)];
  }
  if (p.tag === 'helix') return layDown(p, t, 0);
  return null;
};
CL.dyn = (i, p, t) => {
  if (p.tag === 'strip') {
    const th = eio(seg(t, FOLD0, FOLD1)) * Math.PI / 2; if (th <= 0) return null;
    const box = clamp(Math.floor((p.x - SX - .01) / SW), 0, 6), d = SBOT - p.y, gr = lerp(1, BARH[box] / 1.2, eio(seg(t, FOLD1 - .1, GROW1)));
    return [p.x, SBOT - d * Math.cos(th), d / 100 * Math.sin(th) * gr];
  }
  if (p.tag === 'helix') return layDown(p, t, -14);
  return null;
};
YOU.wfn = (i, p, t) => p.tag === 'helix' ? lerp(1.4, 1.85, eio(seg(t, LAY1, MERGE1))) : 1;
CL.wfn = (i, p, t) => p.tag === 'helix' ? 1.4 : 1;
YOU.build(); CL.build();
CL.mesh.material.transparent = true; CL.capI.transparent = true;   // Claude 的陶土线在结尾渗进纸里
YOU.mesh.material.transparent = true; YOU.capI.transparent = true;   // 你的线在换成官方图标时收掉

// ---------- 水彩 ----------
const rr2 = (x, y, w, h, r) => rrect(x, y, w, h, r).map(p => [p[0], p[1]]);
wash(circ(C[0], C[1], HUB - 12, 0, Math.PI * 2, 90), '#F3C3AE', .55, C, SET1 - .3, SET1 + .9);
wash(rr2(SH.x + 6, SH.y + 6, SH.w - 12, SH.h - 12, SH.r - 6), '#FBE3CF', .5, [SH.x + SH.w / 2, UL - 60], TCUT + .7, TCUT + 1.6);
wash(rr2(SX + TH * SW + 4, STOP + 4, SW - 8, 112, 4), '#4285F4', .32, [SX + TH * SW + 44, BS[1]], 29.5, 29.9, { out: FOLD0 - .15 });
wash(rr2(WF.x + 6, WF.y + 6, WF.w - 12, 46, 18), '#EED493', .6, [WF.x + 20, WF.y + 30], 32.8, 33.4);
wash(rr2(WF.x + 30, WF.y + 84, 170, 180, 4), '#9CC3EC', .55, [WF.x + 115, WF.y + 174], 33.15, 33.7);
wash(rr2(CARD.x + 6, CARD.y + 6, CARD.w - 12, CARD.h - 12, CARD.r - 6), '#FFFFFF', .75, [CARD.x + 80, CARD.y + 80], 36.9, 37.9);
wash(rr2(BTN.x + 3, BTN.y + 3, BTN.w - 6, BTN.h - 6, 35), TERRA, .85, [CK[0] + 30, CK[1]], 41.3, 41.9, { z: .0016 });
// 柱子立起来以后的颜色：每根柱子一块竖着的色板，跟着柱子长高
const BARS = BARH.map((h, i) => {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; const g = cv.getContext('2d'); g.fillStyle = BAR_COL[i]; g.globalAlpha = i === TH ? .7 : .55; g.fillRect(0, 0, 64, 128);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry((SW - 6) / 100, 1); geo.rotateX(Math.PI / 2); geo.translate(0, 0, .5);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, roughness: .9, depthWrite: false }));
  m.position.set(X(SX + i * SW + SW / 2), Y(SBOT) - .002, 0); st.scene.add(m); return m;
});

// ---------- 纸上的字 ----------
writing(st, 'you', C[0], C[1] + 26, 86, 0, { align: 'center', dur: .3 });
writing(st, 'Claude', Q0[0] + 50, Q0[1] - 40, 80, .08, { align: 'right', color: CLINE, dur: .35 });
writing(st, 'Morning brief', SH.x + 50, UL - 22, 78, 24.25);
writing(st, 'Today · 3 things', SH.x + 54, UL + 44, 38, 24.7, { color: GREY });
B_TOK.forEach((b, k) => writing(st, b.txt, BX + 52, ROWS[k] + 17, 50, b.land + .15));
'MTWTFSS'.split('').forEach((d, i) => writing(st, d, SX + i * SW + SW / 2, STOP - 18, 40, 28.75 + i * .05, { align: 'center', color: GREY, t1: FOLD0, fade: .4 }));
writing(st, 'Thu 2:00 · Dana', SX + TH * SW - 50, SBOT + 80, 52, 29.65, { color: '#4a423a' });
writing(st, 'Claude Duet', CARD.x + 120, CARD.y + 88, 44, 36.95, { color: GREY });
writing(st, 'Reply to Dana?', CARD.x + 48, CARD.y + 196, 100, 36.95);
writing(st, '“Yes, Friday works. Invoice attached.”', CARD.x + 52, CARD.y + 278, 48, 37.15, { color: '#4a423a' });
writing(st, 'Approve', BTN.x + BTN.w / 2 + 26, BTN.y + 54, 52, 37.4, { align: 'center' });
writing(st, 'Claude Duet', D[0], D[1] + TS / 2 + 265, 100, 52.4, { align: 'center', font: 'Inter', weight: 640, dur: .5 });
writing(st, 'Research preview  ·  Join the waitlist', D[0], D[1] + TS / 2 + 345, 52, 52.6, { align: 'center', font: 'Inter', weight: 500, color: '#4a423a', dur: .5 });

// ---------- 陶土色晕开 + 官方图标 ----------
const svgText = await (await fetch('assets/claude-duet-icon.svg')).text();
const PATHS = [...svgText.matchAll(/<path d="([^"]+)"([^>]*)>/g)].map(m => ({ d: new Path2D(m[1]), fill: (m[2].match(/fill="(#[0-9A-Fa-f]{6})"/) || [])[1], rule: /evenodd/.test(m[2]) ? 'evenodd' : 'nonzero' }));
const SVG_PX = 1300 * KK;
function texPlane(size, z, unlit = false) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1300; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size / 100, size / 100), unlit ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .9, depthWrite: false }));
  m.position.set(X(D[0]), Y(D[1]), z); m.receiveShadow = !unlit; st.scene.add(m);
  return { m, g, tex };
}
const BLOOM0 = 49.7, BLOOM1 = 51.3, SWAP0 = 51.3, SWAP1 = 52.1;
const bloom = texPlane(SVG_PX, .0015); let bloomK = -1;
function drawBloom(t) {                                           // 色块从陶土那股线上晕开
  const k = eio(seg(t, BLOOM0, BLOOM1)); bloom.m.visible = k > 0 && t < SWAP1 + .1; if (k === bloomK || k <= 0) return; bloomK = k;
  const g = bloom.g; g.clearRect(0, 0, 1300, 1300); g.save(); g.beginPath();
  for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, r = (30 + 540 * k) * (1 + .06 * (vnoise(a * 3 + 7) - .5) + .04 * Math.sin(a * 5 + k * 3)); g.lineTo(660 + Math.cos(a) * r, 640 + Math.sin(a) * r * .9); }
  g.clip(); g.fillStyle = PATHS[1].fill; g.fill(PATHS[1].d); g.restore(); bloom.tex.needsUpdate = true;
}
const tileShape = new THREE.Shape(); { const h = TS / 200, r = 230 * KK / 100; tileShape.moveTo(-h + r, -h); tileShape.lineTo(h - r, -h); tileShape.quadraticCurveTo(h, -h, h, -h + r); tileShape.lineTo(h, h - r); tileShape.quadraticCurveTo(h, h, h - r, h); tileShape.lineTo(-h + r, h); tileShape.quadraticCurveTo(-h, h, -h, h - r); tileShape.lineTo(-h, -h + r); tileShape.quadraticCurveTo(-h, -h, -h + r, -h); }
const tile = new THREE.Mesh(new THREE.ExtrudeGeometry(tileShape, { depth: .05, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 24 }),
  new THREE.MeshStandardMaterial({ color: PATHS[0].fill, roughness: .7, transparent: true, opacity: 0 }));
tile.position.set(X(D[0]), Y(D[1]), 0); tile.castShadow = true; tile.receiveShadow = true; st.scene.add(tile);
const face = texPlane(SVG_PX, .066, true);
{ const g = face.g; PATHS.slice(1).forEach(p => { g.fillStyle = p.fill; g.fill(p.d, p.rule); }); face.tex.needsUpdate = true; }
// 方块的边：一根细墨线，在绞线落下的同时沿方块画一圈（换成官方图标时正好是那块板的边）
const TILE_LINE = new Line(st, { hw: .012 });
{ const r = rrect(D[0] - TS / 2, D[1] - TS / 2, TS, TS, 230 * KK), i = near(r, D[0] - TS / 2, D[1]); TILE_LINE.piece(rot(r, i), 48.6, 50.0, { warp: q => eio(q) }); TILE_LINE.build(); }

// ================= app 圆片的动画 =================
const badgeText = n => n <= 0 ? null : n > 99 ? '99+' : String(n);
function tokens(t) {
  A_TOK.forEach((a, k) => {
    const z = drop(t, a.land), hop = t < FR ? .13 * Math.max(0, Math.sin((t - a.land) * (6 + k) * (1 + seg(t, 3, FR) * 1.5))) * seg(t, 2.5, 6) : 0;
    a.tok.place(a.c[0], a.c[1], z === null ? 0 : z + hop, z === null ? 0 : 1);
    const tt = Math.min(t, FR), n = Math.round(1 + (8 + k * 13) * Math.pow(seg(tt, a.land + .3, FR), 1.5) * (k % 2 ? 1.6 : 1.2));
    const cl = CLEAR[k], s = t < cl ? eo(seg(t, a.land + .25, a.land + .45)) : 1 - eio(seg(t, cl, cl + .2));
    a.tok.setBadge(badgeText(n), s);
  });
  const land = (o, H = 1.8) => { const z = drop(t, o.land, H); o.tok.place(o.c[0], o.c[1], z === null ? 0 : z, z === null ? 0 : 1); o.tok.setBadge(null, 0); };
  B_TOK.forEach(b => land(b)); land(CAL_TOK); land(GH_TOK); land(GM_TOK);
  ORBIT.forEach(o => {                                            // 结尾：从画外飞进来绕着绞线转，再落成一排
    const k = o.k, t0 = 42.9 + k * .14; if (t < t0) { o.tok.place(0, 0, 0, 0); return; }
    const ang = k / 7 * Math.PI * 2 + (t - 44) * 1.2, rad = 340 + 40 * Math.sin(k * 1.7), zz = .6 + ((k * 3) % 7) * .42 + .12 * Math.sin(t * 2 + k);
    const inK = eo(seg(t, t0, t0 + .9)), far = 1 + 2.2 * (1 - inK), orb = [Q[0] + Math.cos(ang) * rad * far, Q[1] + Math.sin(ang) * rad * .8 * far, zz];
    const row = [D[0] + (k - 3) * 108, ROW_Y], f = eio(seg(t, 48.2 + k * .06, 49.9 + k * .06));
    o.tok.place(lerp(orb[0], row[0], f), lerp(orb[1], row[1], f), lerp(orb[2], 0, f) + Math.sin(Math.PI * f) * .8, lerp(.85, .8, f), lerp(1.05, 0, f));
    o.tok.setBadge(null, 0);
  });
}

// ================= 镜头 =================
// [cx, cy, 距离, 仰角°, 方位角°, 跟随权重（这一版不跟笔）, 目标高度z]：都比上一版拉开，画完的东西完整在画面里
const camA = track([
  [0, [C[0] + 150, C[1] - 150, 14.5, 66, -90, 0, 0]], [3.0, [C[0], C[1] + 80, 21.8, 62, -92, 0, 0]], [7.2, [C[0], C[1] + 75, 22.2, 48, -84, 0, .35]],
  [FR, [C[0], C[1] + 40, 21.4, 34, -66, 0, .55]], [13.0, [C[0], C[1] + 40, 22.0, 44, -76, 0, .3]], [SET0, [C[0], C[1] + 70, 23.0, 60, -86, 0, .05]],
  [17.8, [C[0], C[1] + 95, 25.0, 70, -90, 0, 0]], [19.6, [C[0], C[1] + 90, 25.2, 74, -90, 0, 0]], [21.0, [C[0], C[1] + 85, 24.8, 76, -90, 0, 0]], [21.8, [P_DIVE[0], P_DIVE[1] + 120, 17.5, 82, -90, 0, 0]],
  [22.5, [P_DIVE[0], P_DIVE[1], 7.5, 86, -90, 0, 0]], [TCUT, [P_DIVE[0], P_DIVE[1], .8, 89.5, -90, 0, 0]]]);
const camB = track([
  [TCUT, [B_DIVE[0], B_DIVE[1], .8, 89.5, -90, 0, 0]], [TCUT + .45, [B_DIVE[0] + 160, B_DIVE[1] + 60, 6.5, 80, -90, 0, 0]], [24.8, [BS[0], BS[1] + 40, 13.6, 72, -90, 0, 0]], [28.0, [BS[0], BS[1] + 50, 13.2, 70, -90, 0, 0]],
  [28.7, [SX + 300, BS[1] + 40, 12.4, 62, -90, 0, 0]], [30.7, [SX + 308, BS[1] + 40, 12.2, 60, -89, 0, 0]], [31.6, [SX + 308, BS[1] + 10, 12.4, 40, -82, 0, .6]], [32.1, [SX + 330, BS[1] + 20, 12.8, 38, -80, 0, .65]],
  [32.7, [WF.x + WF.w / 2, BS[1] + 40, 11.4, 60, -90, 0, .05]], [34.6, [WF.x + WF.w / 2 + 30, BS[1] + 40, 11.6, 61, -90, 0, 0]],
  [36.3, [CC[0], CC[1] + 70, 13.0, 62, -90, 0, 0]], [40.0, [CC[0], CC[1] + 80, 12.4, 63, -90, 0, 0]], [41.4, [CC[0] - 40, CC[1] + 70, 11.4, 61, -91, 0, 0]],
  [43.6, [Q[0] - 300, Q[1] - 20, 12.6, 46, -84, 0, .3]], [45.6, [Q[0], Q[1], 10.6, 24, -70, 0, 1.6]], [47.6, [Q[0] + 40, Q[1], 11.0, 15, -58, 0, 2.1]],
  [49.9, [D[0], D[1] + 100, 17.4, 74, -90, 0, .1]], [52.2, [D[0], D[1] + 185, 23.0, 80, -90, 0, 0]], [58, [D[0], D[1] + 190, 22.2, 78, -90, 0, 0]]]);
const V = new THREE.Vector3(), TGT = new THREE.Vector3();
const PUNCH = [[FR, .1], [41.05, .09]];
const punch = t => PUNCH.reduce((s, [t0, A]) => s + (t < t0 ? 0 : A * eo(Math.min(1, (t - t0) / .18)) * Math.exp(-Math.max(0, t - t0 - .18) / .55)), 0);
function camAt(t) {
  let [cx, cy, d, el, az, , kz] = (t < TCUT ? camA : camB)(t);
  d *= 1 - punch(t);
  const e = el * D2R, a = az * D2R, tg = [X(cx), Y(cy), kz];
  return { tg, pos: [tg[0] + d * Math.cos(e) * Math.cos(a), tg[1] + d * Math.cos(e) * Math.sin(a), tg[2] + d * Math.sin(e)], d };
}
function applyCam(c) { st.camera.position.set(...c.pos); st.camera.lookAt(TGT.set(...c.tg)); st.camera.updateMatrixWorld(true); }
function cam(t) {                                                 // 运动模糊：同一条镜头曲线上前后半个快门的差分（跨过 TCUT 时只取这一侧）
  const sh = .5 / 30, lo = t < TCUT ? 0 : TCUT, hi = t < TCUT ? TCUT - 1e-4 : window.DUR;
  const ta = Math.max(lo, t - sh / 2), tb = Math.min(hi, t + sh / 2), k = sh / Math.max(1e-4, tb - ta);
  const pa = camAt(ta), pb = camAt(tb), cur = camAt(t);
  applyCam(pa); V.set(...cur.tg).project(st.camera); const ax = V.x, ay = V.y;
  applyCam(pb); V.set(...cur.tg).project(st.camera); const bx = V.x, by = V.y;
  applyCam(cur);
  st.blur((bx - ax) / 2 * k * .7, (by - ay) / 2 * k * .7, clamp((pa.d / pb.d - 1) * k, -.25, .25));
  const sb = eio(seg(t, 42.4, 44.0)) * (1 - eio(seg(t, 48.6, 50.2)));   // 绞线那几秒太阳挪到镜头这一侧，影子往后倒
  st.sun.position.set(cur.tg[0] - 5, cur.tg[1] + lerp(6, -7, sb), 10); st.sun.target.position.set(...cur.tg);
  st.post.dof.focus = cur.d; st.post.dof.aper = t > 43.5 && t < 48.5 ? 60 : 30;
}

// ================= 字幕 =================
const CAPS = [[5.2, 8.9, 'Every app wants you.'], [13.9, 18.95, 'Claude Duet connects every app.'], [19.0, 22.7, '6,000+ connectors.'], [24.15, 28.65, 'Every morning, what matters.'],
  [28.7, 33.6, 'Meetings. Dashboards. Prototypes.'], [37.8, 41.65, 'It asks before it acts.'], [41.7, 44.95, 'You decide.'], [45.0, 48.7, 'Two lines. One duet.']];
window.DUR = 58;
window.EV = [];
window.TEXTS = t => {
  const o = [];
  CAPS.forEach(([a, b, s], i) => { if (t >= a + .2 + .017 * s.length && t < b - .45) o.push({ id: 'cap' + i, text: s, ...capMetrics(st, s) }); });
  if (t >= 52.9) o.push({ id: 'wm', text: 'Claude Duet', x0: st.W * .3, y0: st.H * .62, x1: st.W * .7, y1: st.H * .72 });
  if (t >= 53.1) o.push({ id: 'ws', text: 'Research preview · Join the waitlist', x0: st.W * .25, y0: st.H * .72, x1: st.W * .75, y1: st.H * .78 });
  return o;
};
window.render = t => {
  YOU.update(t); CL.update(t, t >= TCUT ? CL_A_END + 1 : 0); TILE_LINE.update(t);
  const fade = 1 - eio(seg(t, BLOOM0 + .2, BLOOM1)); CL.mesh.material.opacity = fade; CL.capI.opacity = fade; CL.mesh.visible = fade > 0;
  const yf = 1 - eio(seg(t, SWAP0, SWAP1 + .3)); YOU.mesh.material.opacity = yf; YOU.capI.opacity = yf; YOU.mesh.visible = yf > 0;
  tokens(t); WASHES.forEach(w => w.draw(t)); drawBloom(t);
  BARS.forEach((m, i) => { const th = eio(seg(t, FOLD0, FOLD1)), g = lerp(1.2, BARH[i], eio(seg(t, FOLD1 - .1, GROW1))); m.visible = th > .05; m.scale.set(1, 1, Math.max(.001, th * g)); });
  const sw = eio(seg(t, SWAP0, SWAP1)); tile.material.opacity = sw; face.m.material.opacity = sw; tile.visible = face.m.visible = sw > 0;
  cam(t); st.draw(t);
  const off = 1 - seg(t, H1 - .2, H1 + .3);
  penShadow(st, YOU.nibAt(t), (t < FR + .3 ? 1 : t > 40.2 ? 1 : 0) * off);
  const hov = t > 37.7 && t < 42.9 ? .12 + .05 * Math.sin((t - 37.7) * 3) : 0;
  penShadow(st, CL.nibAt(t), (t > TCUT - 1.2 && t < TCUT + .4 ? 0 : 1) * off, hov);
  CAPS.forEach(([a, b, s]) => caption(st, s, a, t, { t1: b - .45 }));
};

await document.fonts.ready;
window.render(0);
window.READY = true;
