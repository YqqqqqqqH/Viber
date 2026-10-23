// ink3d：一笔画 × 3D 的共用引擎（Three.js r170，lemo 服务器托管：/node_modules/three、/core/…）
// 纸是 XY 平面上的一张真纸（Z 朝上）；墨线是有体积的管子：在纸上截面扁、离开纸面变圆，会投影子。
// 坐标一律用「设计像素」（1920×1080 的纸面坐标，y 向下）+ 高度 z（世界单位）；1 世界单位 = 100 设计像素。
// 页面用法：
//   const st = await stage();  const L = new Line(st); L.piece(pts, t0, t1, {…}); …; L.build();
//   const cam = camRig(st, keys, t => L.nibAt(t));
//   window.render = t => { L.update(t); cam(t); st.draw(t); penShadow(st, L.nibAt(t), a); caption(st, '…', t0, t); };
import * as THREE from 'three';
import { makePost } from '/core/three/post.js';
import { clamp, lerp, seg, mulberry, vnoise, track } from '/core/lib.js';
export { THREE };

export const X = x => x / 100, Y = y => -y / 100;
export const INK = '#1D1A17', ACC = '#E2622E', PAPER = '#F8F6F1';

// ---------- 几何小工具（都在设计像素里） ----------
export const lineTo = (a, b, n = 30) => { const o = []; for (let i = 0; i <= n; i++) o.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n), lerp(a[2] || 0, b[2] || 0, i / n)]); return o; };
export function bezAt(c, t) { const v = 1 - t; return c[0].map((_, k) => v * v * v * c[0][k] + 3 * v * v * t * c[1][k] + 3 * v * t * t * c[2][k] + t * t * t * c[3][k]); }
export function bez(p0, p1, p2, p3, n = 60) { const c = [p0, p1, p2, p3].map(p => [p[0], p[1], p[2] || 0]), o = []; for (let i = 0; i <= n; i++) o.push(bezAt(c, i / n)); return o; }
export function poly(list, n = 20) { let o = []; for (let i = 1; i < list.length; i++) o = o.concat(lineTo(list[i - 1], list[i], n).slice(i > 1 ? 1 : 0)); return o; }
export function rrect(x, y, w, h, r) {                        // 闭合圆角矩形，从上边左端顺时针
  const o = [], arc = (cx, cy, a0) => { for (let i = 0; i <= 12; i++) { const a = a0 + i / 12 * Math.PI / 2; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]); } };
  o.push(...lineTo([x + r, y], [x + w - r, y])); arc(x + w - r, y + r, -Math.PI / 2);
  o.push(...lineTo([x + w, y + r], [x + w, y + h - r])); arc(x + w - r, y + h - r, 0);
  o.push(...lineTo([x + w - r, y + h], [x + r, y + h])); arc(x + r, y + h - r, Math.PI / 2);
  o.push(...lineTo([x, y + h - r], [x, y + r])); arc(x + r, y + r, Math.PI);
  return o;
}
export const near = (pts, x, y) => pts.reduce((bi, p, i) => Math.hypot(p[0] - x, p[1] - y) < Math.hypot(pts[bi][0] - x, pts[bi][1] - y) ? i : bi, 0);
export const rot = (pts, i) => pts.slice(i).concat(pts.slice(1, i + 1));       // 闭合路径换个起点

// ---------- 舞台：渲染器、纸、光、景深、屏幕层 ----------
export async function stage(o = {}) {
  const paperCol = o.paper || PAPER;
  const W = innerWidth, H = innerHeight, S = W / 1920;
  for (const [fam, url] of o.fonts || [['Hand', 'fonts/Caveat-600.woff']]) await new FontFace(fam, `url(${url})`).load().then(f => document.fonts.add(f));
  const mk = id => { let c = document.getElementById(id); if (!c) { c = document.createElement('canvas'); c.id = id; document.body.appendChild(c); } Object.assign(c.style, { position: 'absolute', left: 0, top: 0, display: 'block' }); return c; };
  const gl = mk('gl'), uiC = mk('ui'); uiC.width = W; uiC.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = o.exposure || 1.22; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(paperCol); scene.fog = new THREE.Fog(paperCol, 16, 36);
  const camera = new THREE.PerspectiveCamera(o.fov || 28, W / H, .05, 90); camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight('#ffffff', '#ebe6dc', 1.5));
  const sun = new THREE.DirectionalLight('#fffaf2', 2.3); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: .5, far: 44 });
  sun.shadow.radius = 3; sun.shadow.bias = -.0004; sun.shadow.normalBias = .01; scene.add(sun, sun.target);
  const post = makePost(renderer, scene, camera, W, H, { ssaa: 1 });
  post.dof.maxCoc = 12; post.vig.material.uniforms.amt.value = .16;
  // 纸：斑驳、纤维、纸齿，铺到地平线
  {
    const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 1200; const x = cv.getContext('2d'), r = mulberry(9);
    x.fillStyle = paperCol; x.fillRect(0, 0, 2048, 1200);
    for (let i = 0; i < 1600; i++) { const v = vnoise(i * .13) - .5; x.fillStyle = `rgba(${v > 0 ? '255,252,244' : '170,150,120'},${Math.abs(v) * .03})`; x.beginPath(); x.arc(r() * 2048, r() * 1200, 20 + r() * 50, 0, 7); x.fill(); }
    for (let i = 0; i < 900; i++) { x.strokeStyle = `rgba(150,130,100,${.03 + r() * .05})`; x.lineWidth = .6; x.beginPath(); const a = r() * 6.3, px = r() * 2048, py = r() * 1200; x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * 14 + r() * 6, py + Math.sin(a) * 14, px + Math.cos(a) * 28, py + Math.sin(a) * 28); x.stroke(); }
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(90,70,40,${.03 + r() * .06})`; x.fillRect(r() * 2048, r() * 1200, 1.2, 1.2); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(160 / 34, 120 / 20);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), new THREE.MeshStandardMaterial({ map: t, roughness: .95 }));
    paper.position.set(9.6, -5.4, 0); paper.receiveShadow = true; scene.add(paper);
  }
  const st = { W, H, S, renderer, scene, camera, sun, post, paperCol, ui: uiC.getContext('2d'), texts: [],
    draw(t) { st.texts.forEach(x => x.draw(t)); post.composer.render(); st.ui.clearRect(0, 0, W, H); },
    toScreen(x, y, z = 0) { const v = new THREE.Vector3(X(x), Y(y), z).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; } };
  return st;
}

// ---------- 墨线 ----------
const TMP = { T: new THREE.Vector3(), UP: new THREE.Vector3(), B: new THREE.Vector3(), Z: new THREE.Vector3(0, 0, 1) };
export class Line {
  constructor(st, o = {}) { this.st = st; this.P = []; this.ink = o.ink || INK; this.acc = o.acc || ACC; this.hw = o.hw || .03; this.rs = 8; this.dyn = null; this.nibOverride = null; }
  // pts: [[x, y, z?]…]；t0..t1 这段时间画完；o.warp 改时间分布，o.acc 用强调色，o.tag 给动态变形用
  piece(pts, t0, t1, o = {}) {
    const P = this.P, L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = L[L.length - 1] || 1, warp = o.warp || (q => q);
    if (P.length && t0 > P[P.length - 1].t + 1e-6) P.push({ ...P[P.length - 1], t: t0, acc: !!o.acc, tag: o.tag || null, u: 1 });   // 停笔
    const i0 = P.length ? 1 : 0, s = P.length;
    for (let i = i0; i < pts.length; i++) P.push({ x: pts[i][0], y: pts[i][1], z: pts[i][2] || 0, t: t0 + (t1 - t0) * warp(L[i] / tot), acc: !!o.acc, tag: o.tag || null, u: L[i] / tot });
    return [s, P.length - 1];
  }
  jump(pt, t) { this.P.push({ x: pt[0], y: pt[1], z: pt[2] || 0, t, acc: false, tag: null, u: 1 }); }   // 一段不出墨就到位（拉线等）
  last() { const p = this.P[this.P.length - 1]; return [p.x, p.y, p.z]; }
  get tEnd() { return this.P[this.P.length - 1].t; }
  build() {
    const P = this.P, NP = this.NP = P.length, RS = this.rs;
    const v = P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(NP - 1, i + 1)]; return Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1e-3, b.t - a.t); });
    P.forEach((p, i) => { let s = 0, n = 0; for (let j = -4; j <= 4; j++) { const k = i + j; if (k >= 0 && k < NP) { s += .66 + .8 * Math.exp(-v[k] / 300); n++; } } p.pr = s / n; });
    this.pos = new Float32Array(NP * RS * 3); this.nor = new Float32Array(NP * RS * 3); const col = new Float32Array(NP * RS * 3);
    const idx = []; for (let i = 0; i < NP - 1; i++) for (let k = 0; k < RS; k++) { const a = i * RS + k, b = i * RS + (k + 1) % RS, c = a + RS, d = b + RS; idx.push(a, c, b, b, c, d); }
    const geo = this.geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    const ci = new THREE.Color(this.ink), ca = new THREE.Color(this.acc);
    P.forEach((p, i) => { const c = p.acc ? ca : ci; for (let k = 0; k < RS; k++) col.set([c.r, c.g, c.b], (i * RS + k) * 3); });
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .38 })); this.mesh.castShadow = this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.capI = new THREE.MeshStandardMaterial({ color: this.ink, roughness: .38 }); this.capA = new THREE.MeshStandardMaterial({ color: this.acc, roughness: .38 });
    this.head = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), this.capI); this.tail = new THREE.Mesh(this.head.geometry, this.capI);
    this.head.castShadow = this.tail.castShadow = true;
    this.st.scene.add(this.mesh, this.head, this.tail);
    this.W3 = P.map(() => [0, 0, 0]);
    return this;
  }
  pointAt(i, t) { const p = this.P[i]; if (this.dyn) { const r = this.dyn(i, p, t); if (r) return r; } return [p.x, p.y, p.z]; }
  index(t) { const P = this.P; let lo = 0, hi = P.length - 1; if (t <= P[0].t) return [0, 0, 0]; if (t >= P[hi].t) return [hi, hi, 0]; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m].t <= t) lo = m; else hi = m; } return [lo, hi, (t - P[lo].t) / Math.max(1e-6, P[hi].t - P[lo].t)]; }
  nibAt(t) {
    if (this.nibOverride) { const r = this.nibOverride(t); if (r) return r; }
    const [lo, hi, k] = this.index(t), a = this.pointAt(lo, t), b = this.pointAt(hi, t);
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  }
  update(t, from = 0) {                                      // from：从第几个点开始画（之前的部分算没画过）
    const P = this.P, NP = this.NP, RS = this.rs, pos = this.pos, nor = this.nor, W3 = this.W3, { T, UP, B, Z } = TMP;
    let n = 0; while (n < NP && P[n].t <= t) n++;
    for (let i = 0; i < NP; i++) { const [x, y, z] = this.pointAt(i, t); W3[i][0] = X(x); W3[i][1] = Y(y); W3[i][2] = z; }
    for (let i = 0; i < NP; i++) {
      const a = W3[Math.max(0, i - 1)], b = W3[Math.min(NP - 1, i + 1)];
      T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (T.lengthSq() < 1e-12) T.set(1, 0, 0); T.normalize();
      UP.copy(Z).addScaledVector(T, -T.dot(Z)); if (UP.lengthSq() < 1e-6) UP.set(0, 1, 0); UP.normalize();
      B.crossVectors(T, UP).normalize();
      const p = W3[i], w = this.hw * P[i].pr * (1 + .08 * (vnoise(i * .07) - .5)), h = w * lerp(.22, 1, clamp(p[2] / .12)), zc = p[2] + h;
      for (let k = 0; k < RS; k++) {
        const ang = k / RS * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang), j = (i * RS + k) * 3;
        pos[j] = p[0] + B.x * cs * w + UP.x * sn * h; pos[j + 1] = p[1] + B.y * cs * w + UP.y * sn * h; pos[j + 2] = zc + B.z * cs * w + UP.z * sn * h;
        const nx = B.x * cs * h + UP.x * sn * w, ny = B.y * cs * h + UP.y * sn * w, nz = B.z * cs * h + UP.z * sn * w, l = Math.hypot(nx, ny, nz) || 1;
        nor[j] = nx / l; nor[j + 1] = ny / l; nor[j + 2] = nz / l;
      }
    }
    this.geo.attributes.position.needsUpdate = this.geo.attributes.normal.needsUpdate = true;
    const s = Math.min(from, Math.max(0, n - 1));
    this.geo.setDrawRange(s * RS * 6, Math.max(0, n - 1 - s) * RS * 6);
    const cap = (m, q, i) => { const w = this.hw * P[i].pr, h = w * lerp(.22, 1, clamp(q[2] / .12)); m.position.set(X(q[0]), Y(q[1]), q[2] + h); m.scale.set(w, w, h); m.material = P[i].acc ? this.capA : this.capI; };
    const hi = Math.max(0, n - 1); cap(this.head, this.nibAt(Math.min(t, this.tEnd)), hi); this.head.visible = n > 0;
    cap(this.tail, this.pointAt(s, t), s); this.tail.visible = n > 0;
  }
}

// ---------- 纸上的手写字：一段字一块透明板，从左往右写出来 ----------
export function writing(st, txt, x, y, size, t0, o = {}) {
  const color = o.color || INK, align = o.align || 'left', font = o.font || 'Hand', sc = 3;
  const m = document.createElement('canvas').getContext('2d'); m.font = `${size}px ${font}`;
  const w = Math.ceil(m.measureText(txt).width + 40), h = Math.ceil(size * 1.6);
  const cv = document.createElement('canvas'); cv.width = w * sc; cv.height = h * sc; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w / 100, h / 100), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .9, depthWrite: false }));
  const x0 = align === 'center' ? x - (w - 40) / 2 : align === 'right' ? x - (w - 40) : x;
  mesh.position.set(X(x0 - 20 + w / 2), Y(y - size * 1.05 + h / 2), .004 + (o.z || 0)); mesh.receiveShadow = true; st.scene.add(mesh);
  const dur = o.dur || .2 + .017 * txt.length, t1 = o.t1 ?? Infinity;
  const r = { mesh, last: -1, draw(t) {
    const k = clamp((t - t0) / dur), out = o.fade ? 1 - clamp((t - t1) / o.fade) : (t < t1 ? 1 : 0);
    mesh.visible = k > 0 && out > 0; mesh.material.opacity = out; if (k === r.last) return; r.last = k;
    g.setTransform(sc, 0, 0, sc, 0, 0); g.clearRect(0, 0, w, h); g.save(); g.beginPath(); g.rect(0, 0, 20 + (w - 20) * k, h); g.clip();
    g.font = `${size}px ${font}`; g.lineJoin = 'round'; g.lineWidth = Math.max(6, size * .1); g.strokeStyle = st.paperCol; g.strokeText(txt, 20, size * 1.05);
    g.globalAlpha = .88; g.fillStyle = color; g.fillText(txt, 20, size * 1.05); g.restore(); tex.needsUpdate = true;
  } };
  st.texts.push(r); return r;
}

// ---------- 镜头：构图中心 + 跟笔尖（前后取平均：有滞后也有预判），距离、仰角、方位角按关键帧连续变 ----------
// keys: [[t, [cx, cy, 距离, 仰角°, 方位角°, 跟随权重, 目标高度z?]] …]（第 7 个值可省，所有关键帧要一致）；方位角 -90 = 从纸的下边看过去
export function camRig(st, keys, nib, o = {}) {
  const K = track(keys), tEnd = o.tEnd ?? Infinity, V = new THREE.Vector3();
  return t => {
    const [cx, cy, d, el, az, fw, kz] = K(t);
    let sx = 0, sy = 0, sz = 0; const n = 10;
    for (let i = 0; i < n; i++) { const [x, y, z] = nib(clamp(t - .5 + .9 * i / (n - 1), 0, tEnd)); sx += x; sy += y; sz += z; }
    const tx = lerp(cx, sx / n, fw), ty = lerp(cy, sy / n, fw), tz = lerp(kz ?? (o.tz || 0), sz / n * .6, fw);
    const tgt = V.set(X(tx), Y(ty), tz), e = el * Math.PI / 180, a = az * Math.PI / 180;
    st.camera.position.set(tgt.x + d * Math.cos(e) * Math.cos(a), tgt.y + d * Math.cos(e) * Math.sin(a), tgt.z + d * Math.sin(e));
    st.camera.lookAt(tgt);
    st.sun.position.set(tgt.x - 5, tgt.y + 6, 10); st.sun.target.position.copy(tgt);
    const [nx, ny, nz] = nib(Math.min(t, tEnd)), fd = st.camera.position.distanceTo(new THREE.Vector3(X(nx), Y(ny), nz));
    const focusNib = o.focusNib ? o.focusNib(t) : 1;
    st.post.dof.focus = lerp(st.camera.position.distanceTo(tgt), fd, focusNib); st.post.dof.aper = o.aper ? o.aper(t) : 55;
  };
}

// ---------- 屏幕层：笔影、手写字幕 ----------
export function penShadow(st, nib, a = 1, lift = 0) {        // 笔不画出来，只在笔尖旁边留一片柔和的楔形影子
  if (a <= 0) return; const u = st.ui, S = st.S, [sx, sy] = st.toScreen(nib[0], nib[1], 0), l = ((nib[2] || 0) + lift) * 60 * S;
  u.save(); u.globalAlpha = a; u.filter = `blur(${(12 + l * .3) * S}px)`; u.fillStyle = 'rgba(60,45,30,.16)';
  u.beginPath(); u.moveTo(sx + 8 * S + l, sy + 5 * S + l * .4); u.lineTo(sx + 260 * S + l, sy - 170 * S); u.lineTo(sx + 290 * S + l, sy - 130 * S); u.closePath(); u.fill(); u.restore();
}
export function capMetrics(st, txt, size = 62) { const u = st.ui; u.font = `${size * st.S}px Hand`; const w = u.measureText(txt).width; return { x0: (st.W - w) / 2, y0: (1012 - size * .85) * st.S, x1: (st.W + w) / 2, y1: (1012 + size * .25) * st.S, w }; }
export function caption(st, txt, t0, t, o = {}) {           // 屏幕底部手写出来，字后面垫一圈纸色；o.t1 之后淡出
  if (t < t0) return; const u = st.ui, S = st.S, size = o.size || 62, y = (o.y || 1012) * S;
  const out = o.t1 ? 1 - clamp((t - o.t1) / .45) : 1; if (out <= 0) return;
  u.save(); u.globalAlpha = out; u.font = `${size * S}px Hand`; u.textAlign = 'center';
  const w = u.measureText(txt).width, k = clamp((t - t0) / (.2 + .017 * txt.length));
  u.beginPath(); u.rect(st.W / 2 - w / 2 - 10 * S, y - size * 1.1 * S, (w + 20 * S) * k, size * 1.6 * S); u.clip();
  u.lineJoin = 'round'; u.lineWidth = 12 * S; u.strokeStyle = 'rgba(248,246,241,.9)'; u.strokeText(txt, st.W / 2, y);
  u.fillStyle = INK; u.globalAlpha = .86 * out; u.fillText(txt, st.W / 2, y); u.restore();
}
