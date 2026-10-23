// Claude Duet v2《The Ride》：一笔画 × 3D。你的黑线和 Claude 的陶土线是一条过山车轨道的两根轨，轨道就在镜头前一点点被画出来；
// 轨道的走向 = Duet 图标那一笔放大 9 倍。两个圈立起来是两个大回环，沿途每一站画在纸上（都落在图标里的某一块）：
// 起点一堆 app → 爬坡 → 第一个回环（圈里写出晨报）→ 谷底一周、柱状图 → 第二个回环顶上停住（圈里是批准卡，你的线垂下来点 Approve）
// → 俯冲、出口冲上天 → 轨道躺平、升到高空：一整天原来画的是 Duet 图标 → 换成官方图标、字标。全片一趟车，不切镜头。
import { stage, Line, caption, capMetrics, rrect, X, Y, THREE } from './lib/ink3d.js';
import { clamp, lerp, seg, eio, eo, ss, mulberry, vnoise, track } from '/core/lib.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TERRA = '#D97757', CLINE = '#CC6644', INK = '#1D1A17', GREY = '#6b6157', RED = '#E5484D';
const st = await stage({ fonts: [['Hand', 'fonts/Caveat-600.woff'], ['Inter', 'fonts/Inter-var.woff', { weight: '100 900' }]], sky: '#F0EADE', fog: '#F0EADE', fogNear: 600, fogFar: 1600, paperSize: [1020, 600], paperAt: [52, -24] });
st.camera.far = 2500; st.camera.updateProjectionMatrix();
const D2R = Math.PI / 180;
function catmull(P, per) { const o = []; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]; for (let k = i ? 1 : 0; k <= per; k++) { const t = k / per, t2 = t * t, t3 = t2 * t; o.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } } return o; }
function resample(P, n) { const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); const o = []; let j = 0; for (let i = 0; i <= n; i++) { const s = L[L.length - 1] * i / n; while (j < L.length - 2 && L[j + 1] < s) j++; const k = (s - L[j]) / Math.max(1e-6, L[j + 1] - L[j]); o.push([lerp(P[j][0], P[j + 1][0], k), lerp(P[j][1], P[j + 1][1], k)]); } return o; }

// ================= 轨道：官方图标那一笔的中心线（逐点从 SVG 量出来）× 9 =================
const RAW = [[628, 625], [660, 640], [700, 650], [740, 640], [775, 625], [800, 612], [830, 595], [855, 560], [875, 520], [882, 480], [865, 450], [835, 445], [810, 465], [797, 500], [797, 545], [808, 580], [830, 605], [870, 625], [910, 640], [950, 648], [990, 640], [1015, 628], [1040, 610], [1062, 580], [1085, 540], [1095, 500], [1085, 460], [1060, 440], [1030, 440], [1000, 460], [980, 500], [972, 545], [982, 585], [1010, 615], [1045, 640], [1090, 655], [1140, 658], [1190, 650], [1230, 630], [1265, 600], [1290, 570], [1305, 553]]
  .map(([x, y]) => [(x - 420) * 1300 / 1080, y * 1300 / 1080]);
const F = 9, G = [5200, 2400];                                    // SVG (650,650) 落在设计像素 G
const toD = ([x, y]) => [G[0] + (x - 650) * F, G[1] + (y - 650) * F];
const W = (sx, sy, z = 0) => { const d = toD([sx, sy]); return new THREE.Vector3(X(d[0]), Y(d[1]), z); };
const SV = resample(catmull(RAW, 16), 2000), NP = SV.length;
// 立起来的样子：两个圈绕着各自的交叉线竖起来成回环；左边的尾巴是爬坡，右边的尾巴是冲上天的出口
const LOOPS = [{ x0: 440, x1: 572, yc: 724 }, { x0: 650, x1: 825, yc: 742 }], KL = .38;
const loopOf = p => LOOPS.findIndex(L => p[0] > L.x0 && p[0] < L.x1 && p[1] < L.yc);
function standZ(p) {
  const k = loopOf(p); if (k >= 0) return (LOOPS[k].yc - p[1]) * F / 100 * KL;
  if (p[0] < 440) return 4.6 * Math.pow(Math.sin(Math.PI * clamp((p[0] - 250) / 190)), 1.3);
  if (p[0] > 905) return 3.4 * ss((p[0] - 905) / 160);
  return 0;
}
const LP = SV.map(loopOf), SZ = SV.map(standZ);
// 回环脚下保留原来的 y（进出口错开、不拐死弯），越往上越并到回环所在的那一排
function centre(i, up) { const p = SV[i], d = toD(p), k = LP[i]; return [d[0], k >= 0 ? lerp(d[1], G[1] + (LOOPS[k].yc - 650) * F, up * ss(SZ[i] / 1.8)) : d[1], SZ[i] * up]; }
const GAUGE = 34;
function rails(up) {                                              // 两根轨（设计像素 + 高度）和中间的斜撑
  const C = SV.map((_, i) => centre(i, up)), A = [], B = [], T = [];
  for (let i = 0; i < NP; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(NP - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, s = LP[i] >= 0 ? clamp(C[i][2] / .4) : 0;
    let nx = -ty / l * (1 - s), ny = tx / l * (1 - s) + s; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    A.push([C[i][0] + nx * GAUGE, C[i][1] + ny * GAUGE, C[i][2]]); B.push([C[i][0] - nx * GAUGE, C[i][1] - ny * GAUGE, C[i][2]]);
    if (i % 14 === 7) T.push(A[i], B[i]);
  }
  return { A, B, T, C };
}
// 关键点
const range = k => { const ix = LP.map((v, i) => v === k ? i : -1).filter(i => i >= 0); return [ix[0], ix[ix.length - 1]]; };
const [L1a, L1b] = range(0), [L2a, L2b] = range(1);
const argmax = (a, b) => { let m = a; for (let i = a; i <= b; i++) if (SZ[i] > SZ[m]) m = i; return m; };
const HILL = argmax(0, L1a - 1), L1T = argmax(L1a, L1b), L2T = argmax(L2a, L2b);
const nearest = (sx, sy, from = 0) => { let m = from, best = 1e9; for (let i = from; i < NP; i++) { const d = Math.hypot(SV[i][0] - sx, SV[i][1] - sy); if (d < best) { best = d; m = i; } } return m; };
const VAL = nearest(612, 790, L1b), RAMP = nearest(905, 760, L2b);
const U = i => i / (NP - 1);

// ================= 画轨的节奏：笔尖走到哪儿（弧长比例）随时间 =================
const DRAW = track([[0, [0]], [1.3, [0]], [4.0, [U(HILL) * .5]], [8.6, [U(HILL)]], [9.4, [U(L1a)]], [12.0, [U(L1T)]], [14.2, [U(L1b)]], [17.0, [U(VAL)]], [20.6, [U(L2a)]], [24.6, [U(L2T)]],
  [32.6, [U(L2T)]], [34.1, [U(L2b)]], [36.5, [U(RAMP)]], [38.8, [1]]]);
const drawAt = t => DRAW(t)[0];
function timeOf(u) { let a = 0, b = 39; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (drawAt(m) >= u) b = m; else a = m; } return b; }
const TOF = SV.map((_, i) => timeOf(U(i)));
const UP = t => 1 - eio(seg(t, 39.6, 44.2));                       // 回环、坡道躺平
const FATK = t => eio(seg(t, 43.6, 46.0)), PRE = t => lerp(1, 3, eio(seg(t, 39.8, 42.4)));                         // 两根轨加粗、并成图标那一笔（黑线盖住陶土线；粗了以后不再按笔速变粗细）
let RT = rails(1), lastUp = 1;
const railsAt = t => { const u = UP(t); if (u !== lastUp) { RT = rails(u); lastUp = u; } return RT; };
const YOU = new Line(st, { hw: .085 }), CL = new Line(st, { hw: .078, ink: CLINE }), TIE = new Line(st, { hw: .03, ink: '#8d8175' });
RT.A.forEach((p, i) => YOU.P.push({ x: p[0], y: p[1], z: p[2], t: TOF[i], acc: false, tag: 'rail', u: U(i), m: i }));
RT.B.forEach((p, i) => CL.P.push({ x: p[0], y: p[1], z: p[2], t: TOF[i], acc: false, tag: 'rail', u: U(i), m: i }));
RT.T.forEach((p, j) => { const i = Math.floor(j / 2) * 14 + 7; TIE.P.push({ x: p[0], y: p[1], z: p[2], t: TOF[i] + (j % 2) * .001 + .02, acc: false, tag: 'tie', u: 0, m: j }); });
YOU.dyn = (i, p, t) => railsAt(t).A[p.m]; CL.dyn = (i, p, t) => railsAt(t).B[p.m]; TIE.dyn = (i, p, t) => railsAt(t).T[p.m];
const flat = (i, p) => p.pr * (1 + .08 * (vnoise(i * .07) - .5));   // 引擎按笔速、噪声给的粗细，加粗时抵消掉，边才整齐
YOU.wfn = (i, p, t) => lerp(PRE(t), 24 / flat(i, p), FATK(t)); CL.wfn = (i, p, t) => lerp(PRE(t), 17 / flat(i, p), FATK(t));
YOU.build(); CL.build(); TIE.build();
TIE.mesh.material.transparent = true;

// ================= app 圆片 =================
const APPS = [['gmail', '#EA4335'], ['googlecalendar', '#4285F4'], ['googledocs', '#4285F4'], ['github', '#181717'], ['slack', '#4A154B'], ['stripe', '#635BFF'], ['shopify', '#7AB55C']];
const COL = Object.fromEntries(APPS), GLYPH = {};
for (const [id] of APPS) GLYPH[id] = new Path2D((await (await fetch(`assets/apps/${id}.svg`)).text()).match(/<path d="([^"]+)"/)[1]);
const faceCv = {};
function faceFor(id) {
  if (faceCv[id]) return faceCv[id];
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(256, 256, 256, 0, 7); g.fill();
  g.strokeStyle = COL[id]; g.globalAlpha = .9; g.lineWidth = 14; g.beginPath(); g.arc(256, 256, 240, 0, 7); g.stroke(); g.globalAlpha = 1;
  g.save(); g.translate(256, 256); g.scale(10.5, 10.5); g.translate(-12, -12); g.fillStyle = COL[id]; g.fill(GLYPH[id]); g.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.center.set(.5, .5); t.rotation = Math.PI / 2;
  return faceCv[id] = { cv, t };
}
class Token {
  constructor(id, rPx) {
    const R = rPx / 100, h = .14, geo = new THREE.CylinderGeometry(R, R, h, 64); geo.rotateX(Math.PI / 2); geo.translate(0, 0, h / 2);
    const side = new THREE.MeshStandardMaterial({ color: COL[id], roughness: .5 }), top = new THREE.MeshStandardMaterial({ map: faceFor(id).t, roughness: .6 });
    this.mesh = new THREE.Mesh(geo, [side, top, side]); this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.g = new THREE.Group(); this.g.add(this.mesh); st.scene.add(this.g);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; this.bc = cv.getContext('2d');
    this.btex = new THREE.CanvasTexture(cv); this.btex.colorSpace = THREE.SRGBColorSpace;
    this.badge = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.5, R * .75), new THREE.MeshStandardMaterial({ map: this.btex, transparent: true, roughness: .6, depthWrite: false }));
    this.badge.position.set(R * .66, R * .66, h + .012); this.g.add(this.badge); this.btxt = null;
  }
  setBadge(txt, s) {
    this.badge.visible = !!txt && s > .01; if (!this.badge.visible) return; this.badge.scale.setScalar(s);
    if (txt === this.btxt) return; this.btxt = txt; const g = this.bc; g.clearRect(0, 0, 256, 128);
    g.font = '700 74px Inter'; const w = Math.max(112, g.measureText(txt).width + 54);
    g.fillStyle = RED; g.beginPath(); g.roundRect(128 - w / 2, 8, w, 112, 56); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(txt, 128, 90); this.btex.needsUpdate = true;
  }
  place(v, z, s = 1) { this.g.position.set(v.x, v.y, z); this.g.scale.setScalar(Math.max(.001, s)); this.g.visible = s > .01; this.mesh.castShadow = z < .8; }
}
const drop = (t, t0, H = 3) => { const s = t - t0; if (s < 0) return null; const T1 = .34; if (s < T1) return H * (1 - (s / T1) ** 2); return .25 * Math.exp(-7 * (s - T1)) * Math.abs(Math.sin((s - T1) * 14)); };

// ================= 沿途的站：画在纸上的小画，按时间一笔笔画出来 =================
const SKETCHES = [];
function sketch(sx, sy, w, h, ops, t0, t1, o = {}) {
  const d = toD([sx, sy]), sc = o.sc || 1.25, cv = document.createElement('canvas'); cv.width = Math.round(w * sc); cv.height = Math.round(h * sc); const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w / 100, h / 100), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .9, depthWrite: false }));
  m.position.set(X(d[0]), Y(d[1]), .004); m.renderOrder = 6; m.receiveShadow = true; st.scene.add(m);
  const len = op => op.k === 'path' ? op.pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - op.pts[i - 1][0], p[1] - op.pts[i - 1][1]) : 0, 0) : op.k === 'text' ? op.s.length * op.size * .45 : 0;
  const L = ops.map(len), TOT = L.reduce((a, b) => a + b, 0) || 1;
  let last = -1;
  const r = { m, draw(t) {
    const k = clamp((t - t0) / (t1 - t0)), extra = o.extra ? o.extra(t) : null; m.visible = k > 0;
    const key = k + '|' + (extra ?? ''); if (key === last || k <= 0) return; last = key;
    g.setTransform(sc, 0, 0, sc, 0, 0); g.clearRect(0, 0, w, h); g.lineCap = g.lineJoin = 'round';
    let budget = k * TOT;
    ops.forEach((op, i) => {
      if (op.k === 'fill') { if (budget <= 0 && !op.always) return; const a = op.at ? clamp((t - op.at) / .5) : clamp(budget / 200); if (a <= 0) return; g.globalAlpha = (op.a ?? .6) * a; g.fillStyle = op.c; g.beginPath(); op.pts.forEach((p, j) => j ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill(); g.globalAlpha = 1; return; }
      if (budget <= 0) return; const take = Math.min(1, budget / Math.max(1, L[i])); budget -= L[i];
      if (op.k === 'path') {
        g.strokeStyle = op.c || INK; g.lineWidth = op.w || 7; g.beginPath(); let left = take * L[i];
        op.pts.forEach((p, j) => { if (!j) return g.moveTo(...p); const q = op.pts[j - 1], sl = Math.hypot(p[0] - q[0], p[1] - q[1]); if (left <= 0) return; const f = Math.min(1, left / sl); g.lineTo(q[0] + (p[0] - q[0]) * f, q[1] + (p[1] - q[1]) * f); left -= sl; });
        g.stroke();
      }
      if (op.k === 'text') {
        g.save(); g.font = `${op.weight || ''} ${op.size}px ${op.font || 'Hand'}`; const tw = g.measureText(op.s).width, x0 = op.al === 'center' ? op.x - tw / 2 : op.x;
        g.beginPath(); g.rect(x0 - 6, op.y - op.size * 1.1, (tw + 12) * take, op.size * 1.6); g.clip(); g.fillStyle = op.c || INK; g.textAlign = op.al || 'left'; g.fillText(op.s, op.x, op.y); g.restore();
      }
    });
    if (o.after) o.after(g, t);
    tex.needsUpdate = true;
  } };
  SKETCHES.push(r); return r;
}
const rr = (x, y, w, h, r) => rrect(x, y, w, h, r).map(p => [p[0], p[1]]);
const line = (...pts) => pts;
// ② 第一个回环里：晨报（竖着的一张，宽 560）
const BRIEF = { sx: 505, sy: 600 };
sketch(BRIEF.sx, BRIEF.sy, 600, 800, [
  { k: 'fill', pts: rr(14, 14, 572, 772, 44), c: '#FBE3CF', a: .7, at: 11.0 },
  { k: 'path', pts: rr(14, 14, 572, 772, 44), w: 8 },
  { k: 'text', s: 'Morning brief', x: 46, y: 118, size: 82 },
  { k: 'path', pts: line([14, 160], [586, 160]), w: 8, c: CLINE },
  { k: 'text', s: 'Today · 3 things', x: 50, y: 214, size: 40, c: GREY },
  { k: 'text', s: 'Dana: yes on Friday?', x: 140, y: 336, size: 50 },
  { k: 'text', s: 'Invoice #2041 overdue', x: 140, y: 486, size: 50 },
  { k: 'text', s: 'Launch doc edits', x: 140, y: 636, size: 50 }], 10.4, 13.0);
const BRIEF_TOK = [['gmail', 320], ['stripe', 470], ['googledocs', 620]].map(([id, y], k) => ({ tok: new Token(id, 40), at: [BRIEF.sx + (-300 + 82 - 0) / F, BRIEF.sy + (-400 + y) / F], land: 11.2 + k * .4 }));
// ③ 谷底：一周（日历落下，星期四晕成蓝色）
const WEEK = { sx: 612, sy: 872 };
{ const cells = []; for (let i = 0; i < 7; i++) cells.push({ k: 'path', pts: rr(40 + i * 96, 90, 96, 140, 6), w: 7 });
  sketch(WEEK.sx, WEEK.sy, 760, 330, [...cells, ...'MTWTFSS'.split('').map((d, i) => ({ k: 'text', s: d, x: 88 + i * 96, y: 70, size: 48, c: GREY, al: 'center' })),
    { k: 'fill', pts: rr(332, 94, 88, 132, 4), c: '#4285F4', a: .38, at: 16.8 }, { k: 'text', s: 'Thu 2:00 · Dana', x: 190, y: 306, size: 72 }], 15.6, 17.2); }
const WEEK_TOK = { tok: new Token('googlecalendar', 50), at: [WEEK.sx - 450 / F, WEEK.sy - 40 / F], land: 15.5 };
// ④ 第二个回环脚下：柱状图（彩色纸板一根根立起来）
const BARS = { sx: 735, sy: 892 }, BAR_H = [1.1, 1.7, 1.35, 2.5, 2.0, 2.9], BAR_C = ['#A9C99A', '#EED493', '#9CC3EC', '#4285F4', '#E9A486', '#A9C99A'];
const BAR = BAR_H.map((hh, i) => {
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 192; const g = cv.getContext('2d');
  g.fillStyle = BAR_C[i]; g.globalAlpha = i === 3 ? .8 : .7; g.fillRect(0, 0, 96, 192); g.globalAlpha = 1; g.strokeStyle = INK; g.lineWidth = 7; g.strokeRect(4, 4, 88, 184);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.BoxGeometry(.8, .2, 1); geo.translate(0, 0, .5);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: .8 })); const p = W(BARS.sx - 30 + i * 12, BARS.sy); m.position.set(p.x, p.y, 0); m.castShadow = m.receiveShadow = true; st.scene.add(m);
  return { m, h: hh, t0: 18.0 + i * .28 };
});
sketch(BARS.sx, BARS.sy + 34, 700, 140, [{ k: 'path', pts: line([20, 30], [680, 30]), w: 8 }], 17.8, 18.4);
// ⑤ 第二个回环里：批准卡（车倒挂在顶上等你）
const CARD = { sx: 737, sy: 590 }, CW = 880, CH = 540, BTN = { x: 56, y: 400, w: 300, h: 92 };
let approveK = 0;
sketch(CARD.sx, CARD.sy, CW, CH, [
  { k: 'fill', pts: rr(12, 12, CW - 24, CH - 24, 48), c: '#FFFFFF', a: .85, at: 25.2 },
  { k: 'path', pts: rr(12, 12, CW - 24, CH - 24, 48), w: 9, c: CLINE },
  { k: 'text', s: 'Claude Duet', x: 140, y: 104, size: 52, c: GREY },
  { k: 'text', s: 'Reply to Dana?', x: 52, y: 236, size: 118 },
  { k: 'text', s: '“Yes, Friday works. Invoice attached.”', x: 56, y: 330, size: 54, c: '#4a423a' },
  { k: 'path', pts: rr(BTN.x, BTN.y, BTN.w, BTN.h, 46), w: 8, c: CLINE },
  { k: 'text', s: 'Approve', x: BTN.x + BTN.w / 2 + 24, y: BTN.y + 64, size: 62, al: 'center' }], 24.8, 27.2,
  { extra: t => Math.round(clamp((t - 31.3) / .3) * 20) + ':' + Math.round(clamp((t - 31.45) / .5) * 30), after: (g, t) => {
    const a = clamp((t - 31.3) / .3); if (a <= 0) return;
    g.globalAlpha = a; g.fillStyle = TERRA; g.beginPath(); g.roundRect(BTN.x + 4, BTN.y + 4, BTN.w - 8, BTN.h - 8, 42); g.fill(); g.globalAlpha = 1;
    g.font = '62px Hand'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('Approve', BTN.x + BTN.w / 2 + 24, BTN.y + 64); g.textAlign = 'left';
    const b = clamp((t - 31.45) / .5); if (b <= 0) return;                     // 按下以后：Sent 加一个勾（勾是画出来的，不靠字体）
    const x0 = BTN.x + BTN.w + 40, y0 = BTN.y + 74; g.font = '100px Hand'; const tw = g.measureText('Sent').width;
    g.save(); g.beginPath(); g.rect(x0 - 6, y0 - 100, (tw + 12) * clamp(b / .6), 140); g.clip(); g.fillStyle = CLINE; g.fillText('Sent', x0, y0); g.restore();
    const c = clamp((b - .6) / .4); if (c > 0) { const P = [[x0 + tw + 22, y0 - 38], [x0 + tw + 48, y0 - 8], [x0 + tw + 104, y0 - 76]]; g.strokeStyle = CLINE; g.lineWidth = 12; g.lineCap = g.lineJoin = 'round'; g.beginPath(); g.moveTo(...P[0]);
      if (c < .4) g.lineTo(lerp(P[0][0], P[1][0], c / .4), lerp(P[0][1], P[1][1], c / .4)); else { g.lineTo(...P[1]); const k = (c - .4) / .6; g.lineTo(lerp(P[1][0], P[2][0], k), lerp(P[1][1], P[2][1], k)); } g.stroke(); } } });
const CARD_TOK = { tok: new Token('gmail', 42), at: [CARD.sx + (-CW / 2 + 84) / F, CARD.sy + (-CH / 2 + 86) / F], land: 25.1 };
const BTN_SV = [CARD.sx + (-CW / 2 + BTN.x + 50) / F, CARD.sy + (-CH / 2 + BTN.y + BTN.h / 2) / F];
// 你的黑线从圈顶垂下来，点中 Approve，打个勾，再收回去
const DIP = new Line(st, { hw: .11 });
{ const top = RT.A[L2T], b = toD(BTN_SV), pts = [];
  for (let i = 0; i <= 60; i++) { const s = i / 60; pts.push([lerp(top[0], b[0], s), lerp(top[1], b[1], s), top[2] * (1 - ss(clamp(s / .7)))]); }
  const c = [b[0] - 30, b[1] - 6]; pts.push([c[0] + 18, c[1] + 20, 0], [c[0] + 58, c[1] - 34, 0]);
  pts.forEach((p, i) => DIP.P.push({ x: p[0], y: p[1], z: p[2], t: i <= 60 ? 30.5 + .65 * eo(i / 60) : 31.15 + (i - 60) * .12, acc: false, tag: 'dip', u: i / (pts.length - 1), m: i }));
  const T0 = [top[0], top[1], top[2]];
  DIP.dyn = (i, p, t) => { const b = eio(seg(t, 32.1, 32.7)); return b > 0 ? [lerp(p.x, T0[0], b), lerp(p.y, T0[1], b), lerp(p.z, T0[2], b)] : null; };
  DIP.build(); DIP.mesh.material.transparent = true; }
// ⑥ 出口旁：原型（GitHub）
const PROTO = { sx: 840, sy: 858 };
sketch(PROTO.sx, PROTO.sy, 620, 420, [
  { k: 'fill', pts: rr(24, 24, 572, 64, 20), c: '#EED493', a: .8, at: 35.0 }, { k: 'path', pts: rr(20, 20, 580, 380, 30), w: 8, c: CLINE }, { k: 'path', pts: line([20, 90], [600, 90]), w: 7, c: CLINE },
  { k: 'fill', pts: rr(60, 124, 220, 230, 6), c: '#9CC3EC', a: .7, at: 35.3 }, { k: 'path', pts: rr(60, 124, 220, 230, 6), w: 7, c: CLINE },
  { k: 'path', pts: line([320, 150], [560, 150]), w: 7, c: CLINE }, { k: 'path', pts: line([320, 210], [540, 210]), w: 7, c: CLINE }, { k: 'path', pts: line([320, 270], [500, 270]), w: 7, c: CLINE }], 34.6, 36.0);
const PROTO_TOK = { tok: new Token('github', 46), at: [PROTO.sx + (310 - 64) / F, PROTO.sy + (-210 + 54) / F], land: 35.1 };
// 起点：停着的车两边写上谁是谁（右座黑 = you，左座陶土 = Claude）
sketch(243, 784, 300, 150, [{ k: 'text', s: 'you', x: 150, y: 108, size: 120, al: 'center' }], .3, .8);
sketch(268, 716, 460, 150, [{ k: 'text', s: 'Claude', x: 230, y: 108, size: 120, al: 'center', c: CLINE }], .6, 1.3);
// ① 起点：一堆 app 砸下来，角标一路涨；到了各自那一站就消掉
const PILE = { sx: 290, sy: 808 };
const PILE_TOK = APPS.map(([id], k) => { const r = mulberry(11 + k); return { id, tok: new Token(id, 52), at: [PILE.sx + [-18, -6, 6, 18, -12, 0, 12][k] + r() * 3, PILE.sy + (k < 4 ? -6 : 6) + r() * 3], land: -.3 + k * .3, clear: { gmail: 11.6, googlecalendar: 15.2, googledocs: 12.5, github: 34.5, slack: 31.0, stripe: 12.0, shopify: 35.0 }[id] }; });

// ================= 陶土色晕开 + 官方图标（9 倍大） =================
const svgText = await (await fetch('assets/claude-duet-icon.svg')).text();
const PATHS = [...svgText.matchAll(/<path d="([^"]+)"([^>]*)>/g)].map(m => ({ d: new Path2D(m[1]), fill: (m[2].match(/fill="(#[0-9A-Fa-f]{6})"/) || [])[1], rule: /evenodd/.test(m[2]) ? 'evenodd' : 'nonzero' }));
function bigPlane(z, unlit) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1300; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(13 * F, 13 * F), unlit ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }) : new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .95, depthWrite: false }));
  m.position.set(X(G[0]), Y(G[1]), z); st.scene.add(m); return { m, g, tex };
}
const BLOOM0 = 46.4, BLOOM1 = 49.0, SWAP0 = 49.6, SWAP1 = 51.2;
const bloom = bigPlane(.0015, false); bloom.m.renderOrder = 3; let bloomK = -1;
function drawBloom(t) {
  const k = eio(seg(t, BLOOM0, BLOOM1)); bloom.m.visible = k > 0; if (k === bloomK || k <= 0) return; bloomK = k;
  const g = bloom.g; g.clearRect(0, 0, 1300, 1300); g.save(); g.beginPath();
  for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, r = 620 * k * (1 + .05 * Math.sin(a * 5 + 1)); g.lineTo(660 + Math.cos(a) * r, 650 + Math.sin(a) * r); }
  g.clip(); g.globalAlpha = .9; g.fillStyle = PATHS[1].fill; g.fill(PATHS[1].d); g.restore(); bloom.tex.needsUpdate = true;
}
const icon = bigPlane(1.2, true); icon.m.renderOrder = 20;
PATHS.forEach(p => { icon.g.fillStyle = p.fill; icon.g.fill(p.d, p.rule); }); icon.tex.needsUpdate = true;

// ================= 车：两个座位（右边黑 = 你，左边陶土 = Claude），车头就是两支笔，轨道在车头底下现画 =================
const V3 = THREE.Vector3, ZUP = new V3(0, 0, 1);
const R1 = rails(1).C.map(c => new V3(X(c[0]), Y(c[1]), c[2]));
const TT = R1.map((_, i) => R1[Math.min(NP - 1, i + 2)].clone().sub(R1[Math.max(0, i - 2)]).normalize());
const NN = []; { let n = ZUP.clone(); for (let i = 0; i < NP; i++) { n = n.clone().addScaledVector(TT[i], -n.dot(TT[i])); if (LP[i] < 0) n.addScaledVector(ZUP.clone().addScaledVector(TT[i], -TT[i].z), .06); NN.push(n.normalize()); } }
const at = (A, f) => { f = clamp(f, 0, NP - 1); const a = Math.floor(f), b = Math.min(NP - 1, a + 1); return A[a].clone().lerp(A[b], f - a); };
const CAR_OUT = [44.8, 45.8];
const DS = R1.reduce((s, p, i) => i ? s + p.distanceTo(R1[i - 1]) : 0, 0) / (NP - 1);   // 相邻两点的弧长
const carIdx = t => Math.max(0, drawAt(t) * (NP - 1) - 5);
function frameAt(c) {                                          // 轨道上第 c 个点（可以是小数、可以超出两头：沿切线外推）的位置和坐标轴
  const k = clamp(c, 0, NP - 1), T = at(TT, k).normalize(), N = at(NN, k); N.addScaledVector(T, -N.dot(T)).normalize();
  return { p: at(R1, k).addScaledVector(T, (c - k) * DS), T, N, L: new V3().crossVectors(N, T) };
}
const carFrame = t => frameAt(carIdx(t));
const CAR = new THREE.Group(); CAR.matrixAutoUpdate = false; st.scene.add(CAR);
{ const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .42 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.2, .92, .26, 4, .1), mat('#FBF8F2')); body.position.set(-.66, 0, .33);
  const lip = new THREE.Mesh(new RoundedBoxGeometry(.16, .92, .34, 3, .07), mat('#FBF8F2')); lip.position.set(-.1, 0, .4);
  const rider = (c, y) => { const g = new THREE.Group(), m = mat(c);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .16, 6, 16), m); torso.rotation.x = Math.PI / 2; torso.position.set(0, 0, .2);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 20, 14), m); head.position.set(0, 0, .5);
    g.add(torso, head); g.position.set(-.66, y, .38); return g; };
  const pen = (c, y) => { const g = new THREE.Group(), m = mat(c), d = new V3(Math.sin(.6), 0, -Math.cos(.6)), tip = new V3(5 * DS / 1.25, y, .08);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.065, .3, 20), m); cone.quaternion.setFromUnitVectors(new V3(0, -1, 0), d); cone.position.copy(tip).addScaledVector(d, -.15);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .34, 20), m); barrel.quaternion.copy(cone.quaternion); barrel.position.copy(tip).addScaledVector(d, -.47);
    g.add(cone, barrel); return g; };
  CAR.add(body, lip, rider(INK, -.22), rider(TERRA, .22), pen(INK, -.34 / 1.25), pen(CLINE, .34 / 1.25));
  CAR.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); }
const M4 = new THREE.Matrix4();
function liveFrame(c, t) {                                     // 轨道躺平时：按当前的轨道算车的位置和朝向
  const C = railsAt(t).C, i = Math.round(clamp(c, 2, NP - 3)), P = k => new V3(X(C[k][0]), Y(C[k][1]), C[k][2]);
  const p = P(i), T = P(i + 2).sub(P(i - 2)).normalize(), N = ZUP.clone().addScaledVector(T, -T.z).normalize(); return { p, T, N, L: new V3().crossVectors(N, T) };
}
function placeCar(t) {
  const s = 1 - eio(seg(t, ...CAR_OUT)); CAR.visible = s > .01; if (!CAR.visible) return;
  const f = UP(t) < .999 ? liveFrame(carIdx(t), t) : carFrame(t); M4.makeBasis(f.T, f.L, f.N).scale(new V3(s * 1.25, s * 1.25, s * 1.25)).setPosition(f.p); CAR.matrix.copy(M4); CAR.matrixWorldNeedsUpdate = true;
}
// 立柱：爬坡和出口坡道底下，从轨道中线竖直落到纸上（轨道躺平时自己缩没）
const SUP = new Line(st, { hw: .09, ink: '#8d8175' });
{ const ids = []; for (let i = 6; i < L1a - 10; i += 22) if (SZ[i] > .35) ids.push(i); for (let i = RAMP + 10; i < NP; i += 22) if (SZ[i] > .35) ids.push(i);
  ids.forEach((i, j) => { const c = RT.C[i], base = { x: c[0], y: c[1], acc: false, tag: 'sup', u: 0 };
    SUP.P.push({ ...base, z: c[2], t: TOF[i] + .05, m: [i, 1], gap: j > 0 }, { ...base, z: 0, t: TOF[i] + .25, m: [i, 0] }); });
  SUP.dyn = (k, p, t) => { const c = railsAt(t).C[p.m[0]]; return [c[0], c[1], p.m[1] ? c[2] : 0]; };
  SUP.build(); }

// ================= 镜头：一条连续的轨迹 =================
// 每个关键帧（没写的项沿用上一帧）：机位 sp、看点 sg（世界坐标，'car' = 用这一帧的跟车偏移算出来的位置）；
// 跟车偏移 pw、gw（世界坐标）和 pl、gl（车的坐标：[向前, 向车顶, 向左]）；上方向 up；wp、wt 跟车权重；wu 上方向跟车的权重；fov 视角
// 机位 = lerp(sp, 车 + pw + pl, wp)，看点 = lerp(sg, 车 + gw + gl, wt)，上方向 = lerp(up, 车顶, wu)。全部一起插值，从站点到追车连续滑过去。
const Wv = (sx, sy, z = 0) => W(sx, sy, z);
const PILEw = Wv(PILE.sx, PILE.sy), ST0 = R1[0], BRIEFw = Wv(BRIEF.sx, BRIEF.sy), WEEKw = Wv(WEEK.sx, WEEK.sy), BARSw = Wv(BARS.sx, BARS.sy), CARDw = Wv(CARD.sx, CARD.sy), BTNw = Wv(...BTN_SV), PROTOw = Wv(PROTO.sx, PROTO.sy);
const APX1 = R1[L1T], APX2 = R1[L2T], ENDw = R1[NP - 1], CENTER = Wv(655, 732), ICONC = Wv(650, 650), OPEN = PILEw.clone().lerp(ST0, .5);
const L1C = new V3(APX1.x - .4, APX1.y, 3.2), L2C = new V3(APX2.x - .6, APX2.y, 3.6), MID2 = APX2.clone().setZ(0).lerp(BTNw, .5);
const v = (p, dx = 0, dy = 0, dz = 0) => [p.x + dx, p.y + dy, p.z + dz], UZ = [0, 0, 1], UY = [0, 1, 0], O = [0, 0, 0];
function follow(t, pw, pl, gw, gl) {                        // pl、gl 的第一项是沿着轨道往前/往后的距离（转弯时镜头跟着弯，不会穿过轨道）
  const c = carIdx(t), f = frameAt(c), pt = (w, l) => { const g = frameAt(c + l[0] / DS); return g.p.add(new V3(...w)).addScaledVector(g.N, l[1]).addScaledVector(g.L, l[2]); };
  return { pos: pt(pw, pl), tg: pt(gw, gl), f };
}
const CK0 = [
  { t: 0, sp: v(OPEN, -.6, -6.4, 5.4), sg: v(OPEN, 0, -.2, .2), pw: O, gw: O, pl: O, gl: O, up: UZ, wp: 0, wt: 0, wu: 0, fov: 40 },
  { t: 2.4, sp: v(OPEN, -.5, -11.0, 5.0), sg: v(OPEN, 0, -.2, 0) },
  { t: 3.8, sp: 'car', sg: 'car', pw: [-2.6, -5.2, -.3], gw: [1.0, 0, .3], wp: 1, wt: 1, fov: 46 },
  { t: 7.6, pw: [-1.3, -3.9, -1.7], gw: [.8, 0, .2], fov: 54 },
  { t: 8.5, pw: [-.8, -6.0, .3], gw: [1.6, 0, -.5], fov: 50 },                     // 坡顶：侧面平视，车停在边上，前面是空纸
  { t: 9.3, sp: 'car', sg: 'car', pw: [-1.0, -5.0, .6], gw: [1.2, 0, .2] },
  { t: 10.4, sp: v(L1C, -1.0, -7.6, .9), sg: v(L1C, 0, 0, .4), gw: O, wp: 0, wt: .35, fov: 60 },
  { t: 11.8, sp: v(L1C, -.5, -6.2, 1.4), sg: v(L1C, 0, 0, .9), wt: .45 },
  { t: 12.5, sp: v(APX1, 0, -4.0, 8.4), sg: v(BRIEFw, 0, -1.2), wt: 0, fov: 44 },
  { t: 13.4, sp: v(BRIEFw, 0, -3.6, 9.6), sg: v(BRIEFw), up: UY, fov: 34 },
  { t: 14.9, sp: v(BRIEFw, 0, -3.2, 9.0), sg: v(BRIEFw, 0, .1) },
  { t: 15.6, sp: [40.4, -28.8, 10.4], sg: [43.6, -34.4, 0], up: UZ, fov: 40 },   // 从第一个回环顶上高高飞过去（不擦着轨），往下看车在谷底跑
  { t: 16.4, sp: v(WEEKw, -.4, -7.8, 4.4), sg: v(WEEKw, .4, 2.0, .2) },
  { t: 18.0, sp: v(WEEKw, 2.4, -8.0, 4.4), sg: v(WEEKw, 3.4, 2.6, .4) },
  { t: 19.1, sp: v(BARSw, -1.6, -10.4, 5.0), sg: v(BARSw, 0, .4, 1.3) },
  { t: 20.1, sp: v(BARSw, -1.0, -9.6, 4.6), sg: v(BARSw, 0, .8, 1.3) },
  { t: 20.6, sp: v(BARSw, -5.2, -1.0, 3.4), sg: v(L2C, -1, 0, .6) },             // 从柱状图西边绕过去，不穿过柱子
  { t: 21.0, sp: v(L2C, -1.2, -6.0, .3), sg: v(L2C, 0, 0, .8), wt: .5, fov: 70 },
  { t: 24.0, sp: v(L2C, -.4, -5.0, .25), sg: v(L2C, 0, 0, 1.6) },
  { t: 24.7, sp: v(L2C, -.3, -4.9, .3), sg: v(L2C, 0, 0, 2.0), wt: .6 },
  { t: 25.8, sp: v(APX2, 0, -2.6, 2.8), sg: v(CARDw, 0, -1.0), wt: 0, fov: 44 },
  { t: 27.2, sp: v(CARDw, 0, -5.0, 9.4), sg: v(CARDw, 0, -.2), up: UY, fov: 34 },
  { t: 29.5, sp: v(CARDw, 0, -4.6, 8.8) },
  { t: 30.0, sp: v(MID2, 3.6, -5.6, 13.0), sg: v(MID2, 0, .6, 1.0) },   // 从卡片上方高高越过第二个回环再拉开，不擦着轨
  { t: 30.5, sp: v(MID2, 7.0, -13.0, 9.0), sg: v(MID2, 0, 0, 2.0), up: UZ, fov: 44 },   // 拉开：倒挂的车、卡、垂下来的黑线同框
  { t: 32.1, sp: v(MID2, 6.4, -12.2, 8.4), sg: v(MID2, 0, 0, 2.0) },
  { t: 33.1, sp: [53.0, -37.6, .6], sg: [54.0, -32.3, 4.0], wt: .9, fov: 46 },      // 圈脚低机位：车冲着镜头下来
  { t: 34.1, sp: [53.6, -37.8, .7], sg: [57.6, -33.2, .6] },
  { t: 35.0, sp: v(PROTOw, -1.2, -6.8, 5.4), sg: v(PROTOw, 0, .5, .3), wt: 0, fov: 42 },   // 原型在前景一笔笔画出来，车从它后面冲过去
  { t: 36.2, sp: v(PROTOw, .6, -6.6, 5.2), sg: v(PROTOw, 1.2, .9, .4), pw: [-3.4, -1.2, 3.0], gw: [1.2, 0, .4] },
  { t: 37.0, sp: 'car', sg: 'car', wp: 1, wt: 1, fov: 54 },
  { t: 38.0, sp: 'car', sg: 'car', pw: [-1.6, -5.2, .7], gw: [1, 0, .5] },
  { t: 38.8, sp: 'car', sg: 'car', pw: [-.8, -4.8, .3], gw: [.5, 0, .6] },
  { t: 40.0, sp: v(ENDw, -4, -12, 6), sg: v(ENDw, -6, 0, 0), wp: 0, wt: 0, fov: 44 },
  { t: 41.4, sp: v(CENTER, 14, -58, 40), sg: v(CENTER, 8, 0, 0), fov: 30 },
  { t: 46.0, sp: v(CENTER, 0, -2, 110), sg: v(CENTER), up: UY, fov: 28 },
  { t: 47.4, sp: v(ICONC, 0, -2, 136), sg: v(ICONC) },
  { t: 49.0, sp: v(ICONC, 0, -5, 190), sg: v(ICONC, 0, -4) },                     // 晕染和换图标时一路拉远，不跳
  { t: 51.4, sp: v(ICONC, 0, -20, 310), sg: v(ICONC, 0, -18) },
  { t: 53.4, sp: v(ICONC, 0, -28, 400), sg: v(ICONC, 0, -25) },
  { t: 58, sp: v(ICONC, 0, -28, 384) }];
const FIELDS = ['sp', 'sg', 'pw', 'gw', 'pl', 'gl', 'up', 'wp', 'wt', 'wu', 'fov'];
const CK = []; CK0.forEach((k, i) => { const o = { ...(CK[i - 1] || {}), ...k }; if (o.sp === 'car' || o.sg === 'car') { const f = follow(o.t, o.pw, o.pl, o.gw, o.gl); if (o.sp === 'car') o.sp = f.pos.toArray(); if (o.sg === 'car') o.sg = f.tg.toArray(); } CK.push(o); });
const CAMK = track(CK.map(o => [o.t, FIELDS.flatMap(f => [].concat(o[f]))]));
function camAt(t) {
  const k = CAMK(t), g = i => k.slice(i, i + 3), wp = clamp(k[21]), wt = clamp(k[22]), wu = clamp(k[23]);
  const fo = follow(t, g(6), g(12), g(9), g(15));
  const pos = new V3(...g(0)).lerp(fo.pos, wp), tg = new V3(...g(3)).lerp(fo.tg, wt);
  const up = new V3(...g(18)).normalize().lerp(fo.f.N, wu); if (up.lengthSq() < 1e-6) up.set(0, 0, 1);
  return { pos, tg, up: up.normalize(), fov: k[24], focus: lerp(pos.distanceTo(tg), pos.distanceTo(fo.f.p), Math.max(wp, wt * .5)) };
}
const V = new V3();
function apply(c) { if (st.camera.fov !== c.fov) { st.camera.fov = c.fov; st.camera.updateProjectionMatrix(); } st.camera.position.copy(c.pos); st.camera.up.copy(c.up); st.camera.lookAt(c.tg); st.camera.updateMatrixWorld(true); }
function camera(t) {
  const sh = .5 / 30, a = camAt(Math.max(0, t - sh / 2)), b = camAt(t + sh / 2), cur = camAt(t);
  apply(a); V.copy(cur.tg).project(st.camera); const ax = V.x, ay = V.y;
  apply(b); V.copy(cur.tg).project(st.camera); const bx = V.x, by = V.y;
  apply(cur);
  const da = a.pos.distanceTo(a.tg), db = b.pos.distanceTo(b.tg), d = cur.pos.distanceTo(cur.tg);
  st.blur((bx - ax) * .35, (by - ay) * .35, clamp((da / db - 1) * .8, -.2, .2));
  const ext = clamp(d * 1.2, 14, 90); Object.assign(st.sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, far: 300 }); st.sun.shadow.camera.updateProjectionMatrix();
  st.sun.position.set(cur.tg.x - 8, cur.tg.y + 10, cur.tg.z + 40); st.sun.target.position.copy(cur.tg);
  const nr = clamp(d * .015, .05, 6); if (st.camera.near !== nr) { st.camera.near = nr; st.camera.updateProjectionMatrix(); }
  st.post.dof.focus = cur.focus; st.post.dof.aper = d > 40 ? 4 : 22;
  st.scene.fog.near = 40 + 2.2 * Math.max(0, cur.pos.z); st.scene.fog.far = st.scene.fog.near * 4;   // 低机位时远处的纸慢慢融进天色，看不出纸边和地平线
}
window.DBG = { SKETCHES, SV, LP, SZ, R1, NN, TT, HILL, L1a, L1b, L1T, L2a, L2b, L2T, VAL, RAMP, NP, drawAt, camAt, carFrame };

// ================= 字幕和片尾 =================
const CAPS = [[1.0, 5.0, 'Every app wants you.'], [5.2, 8.95, 'Meet Claude Duet.'], [8.98, 13.4, 'Every morning, what matters.'], [15.4, 19.8, 'Meetings. Dashboards.'],
  [24.9, 30.0, 'It asks before it acts.'], [30.3, 33.7, 'You decide.'], [34.1, 38.1, 'It does the rest.'], [43.2, 48.6, 'Your whole day. One line.']];
const END0 = 51.6;
function endCard(t) {
  const k = eo(seg(t, END0, END0 + .7)); if (k <= 0) return null; const u = st.ui, S = st.S;
  const b = new THREE.Vector3(X(G[0]), Y(G[1] + (1162 - 650) * F), 0).project(st.camera), by = (1 - b.y) / 2 * st.H;
  u.save(); u.globalAlpha = k; u.textAlign = 'center';
  const rowY = by + 66 * S, R = 34 * S, gap = 96 * S;
  APPS.forEach(([id], i) => { const a = eo(seg(t, END0 + .9 + i * .14, END0 + 1.3 + i * .14)); if (a <= 0) return;   // 字标之后一排 app 一个个弹出来
    const x = st.W / 2 + (i - 3) * gap, y = rowY + (1 - a) * 14 * S, r = R * (.7 + .3 * a); u.save(); u.globalAlpha = a; u.drawImage(faceFor(id).cv, x - r, y - r, r * 2, r * 2); u.strokeStyle = 'rgba(0,0,0,.08)'; u.lineWidth = 1; u.beginPath(); u.arc(x, y, r, 0, 7); u.stroke(); u.restore(); });
  u.fillStyle = '#2b2622'; u.font = `640 ${92 * S}px Inter`; u.fillText('Claude Duet', st.W / 2, rowY + 140 * S);
  const k2 = eo(seg(t, END0 + .35, END0 + 1.05)); u.globalAlpha = k2; u.fillStyle = '#4a423a'; u.font = `500 ${52 * S}px Inter`; u.fillText('Research preview  ·  Join the waitlist', st.W / 2, rowY + 214 * S);
  u.restore();
  return { wm: [st.W / 2 - 300 * S, rowY + 66 * S, st.W / 2 + 300 * S, rowY + 156 * S], ws: [st.W / 2 - 420 * S, rowY + 168 * S, st.W / 2 + 420 * S, rowY + 222 * S] };
}
window.DUR = 58;
window.EV = [];
window.TEXTS = t => {
  const o = [];
  CAPS.forEach(([a, b, s], i) => { if (t >= a + .2 + .017 * s.length && t < b - .45) o.push({ id: 'cap' + i, text: s, ...capMetrics(st, s) }); });
  if (t >= END0 + .7) o.push({ id: 'wm', text: 'Claude Duet', x0: st.W * .35, y0: st.H * .78, x1: st.W * .65, y1: st.H * .86 });
  if (t >= END0 + 1.05) o.push({ id: 'ws', text: 'Research preview · Join the waitlist', x0: st.W * .28, y0: st.H * .86, x1: st.W * .72, y1: st.H * .91 });
  return o;
};
window.render = t => {
  YOU.update(t); CL.update(t); TIE.update(t); DIP.update(t);
  SUP.update(t); SUP.head.visible = false; placeCar(t); st.sun.shadow.intensity = 1 - eio(seg(t, 39.8, 41.6));   // 升空俯拍时影子收掉，不出重影轨 YOU.mesh.material.roughness = YOU.capI.roughness = lerp(.38, .9, FATK(t));
  TIE.mesh.material.opacity = 1 - eio(seg(t, 41.5, 43.5)); TIE.mesh.visible = TIE.head.visible = TIE.tail.visible = TIE.mesh.material.opacity > 0;
  if (UP(t) < .03) [SUP.mesh, SUP.head, SUP.tail, ...SUP.gapCaps.map(c => c[0])].forEach(m => m.visible = false);
  DIP.mesh.visible = t < 32.8; if (t >= 32.8) DIP.head.visible = DIP.tail.visible = false;
  // app 圆片
  PILE_TOK.forEach(o => { const z = drop(t, o.land); o.tok.place(W(...o.at), z === null ? 0 : z, z === null ? 0 : 1);
    const n = Math.round(1 + 40 * Math.pow(seg(Math.min(t, o.clear), o.land + .3, 11), 1.4) * (1 + (o.id.length % 3) * .4)), s = t < o.clear ? eo(seg(t, o.land + .3, o.land + .5)) : 1 - eio(seg(t, o.clear, o.clear + .25));
    o.tok.setBadge(n > 99 ? '99+' : String(n), s); });
  [...BRIEF_TOK, WEEK_TOK, CARD_TOK, PROTO_TOK].forEach(o => { const z = drop(t, o.land, 2.2); o.tok.place(W(...o.at), z === null ? 0 : z, z === null ? 0 : 1); o.tok.setBadge(null, 0); });
  BAR.forEach(b => { const g = eo(seg(t, b.t0, b.t0 + .6)) * (1 - eio(seg(t, 43.0, 45.0))); b.m.visible = g > .01; b.m.scale.set(1, 1, Math.max(.001, g * b.h)); });
  SKETCHES.forEach(s => s.draw(t)); drawBloom(t);
  const sw = eio(seg(t, SWAP0, SWAP1)); icon.m.material.opacity = sw; icon.m.visible = sw > 0;
  camera(t); st.draw(t);
  CAPS.forEach(([a, b, s]) => caption(st, s, a, t, { t1: b - .45 }));
  endCard(t);
};

await document.fonts.ready;
window.render(0);
window.READY = true;
