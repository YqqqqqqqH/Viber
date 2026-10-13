/* lorenz.js — 1961 年洛伦茨的桌子：一台打字机式的打印机、一长条绿条纹连续打印纸（印着一行行数字），
 * 纸上两条墨迹：原来那次（金）和把 0.506127 抄成 0.506 以后重跑的那次（青）。
 * 两条线会从纸上立起来，在三维里绕成洛伦茨吸引子——一只蝴蝶。
 * 洛伦茨 1963 年的三变量模型（σ=10, ρ=28, β=8/3），只用来"示意"他 1961 年 12 变量模型里的那件事。
 * buildLab(r) → { scene, camera, update(s), RUN_A, RUN_B, paperPoint, butterflyPoint, ... }
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { W, H, GOLD, ICE, fbm, canvas2d, radialTex, Ribbon } from './lib.js';

/* ---------- 洛伦茨方程，RK4 ---------- */
export const LZ_DT = .01, LZ_T = 20, LZ_N = Math.round(LZ_T / LZ_DT) + 1;
function lorenz(x0, y0, z0) {
  const out = new Float64Array(LZ_N * 3), f = (x, y, z) => [10 * (y - x), x * (28 - z) - y, x * y - 8 / 3 * z];
  let x = x0, y = y0, z = z0, h = LZ_DT / 10;                                         // 每个输出步里再分 10 小步
  for (let i = 0; i < LZ_N; i++) {
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    for (let k = 0; k < 10; k++) {
      const a = f(x, y, z), b = f(x + h / 2 * a[0], y + h / 2 * a[1], z + h / 2 * a[2]), c = f(x + h / 2 * b[0], y + h / 2 * b[1], z + h / 2 * b[2]), d = f(x + h * c[0], y + h * c[1], z + h * c[2]);
      x += h / 6 * (a[0] + 2 * b[0] + 2 * c[0] + d[0]); y += h / 6 * (a[1] + 2 * b[1] + 2 * c[1] + d[1]); z += h / 6 * (a[2] + 2 * b[2] + 2 * c[2] + d[2]);
    }
  }
  return out;
}
export const RUN_A = lorenz(.506127, 1.248, 18.73), RUN_B = lorenz(.506, 1.248, 18.73);   // 只差 0.000127
export const LZ_DIV = (() => { const d = new Float64Array(LZ_N); for (let i = 0; i < LZ_N; i++) d[i] = Math.hypot(RUN_A[i * 3] - RUN_B[i * 3], RUN_A[i * 3 + 1] - RUN_B[i * 3 + 1], RUN_A[i * 3 + 2] - RUN_B[i * 3 + 2]); return d; })();
export const DAYS_PER_T = 4;                                                          // 示意：模型时间 1 ≈ 4 天

/* ---------- 纸条：平铺在桌上（z 从 +1.5 到 -2.5），最后一段弯上去进打印机 ---------- */
export const PW = .56, L0 = 4.0, BEND = .36, Z_NEAR = 1.5;
const S0 = .12, S1 = L0 - .12;                                                        // 墨迹在纸上占的那一段（时间 0 → 20）
export const sOfT = t => S0 + (S1 - S0) * t / LZ_T;
/* 纸上一点：s 是沿纸的长度，u 是横向（-1..1） → 世界坐标 */
export function paperPos(s, u, lift = 0) {
  if (s <= L0) return [u * PW / 2 * .8, .0012 + lift, Z_NEAR - s];
  const a = Math.min(1, (s - L0) / BEND) * Math.PI / 2, R = BEND / (Math.PI / 2);   // 四分之一圆弧往上弯
  return [u * PW / 2 * .8, .0012 + R * (1 - Math.cos(a)) + lift, Z_NEAR - L0 - R * Math.sin(a)];
}
/* 墨迹：时间 → 纸上的点（x 变量横着画） */
export const paperPoint = (run, i, lift = 0) => paperPos(sOfT(i * LZ_DT), Math.max(-1, Math.min(1, run[i * 3] / 21)), lift);
/* 蝴蝶：时间 → 三维吸引子上的点（x、z 摆成一对翅膀，y 做纵深），悬在桌子上方 */
export const BF_CENTER = [0, .95, -.35], BF_SCALE = .02;
export const butterflyPoint = (run, i) => [BF_CENTER[0] + run[i * 3] * BF_SCALE, BF_CENTER[1] + (run[i * 3 + 2] - 25) * BF_SCALE, BF_CENTER[2] + run[i * 3 + 1] * BF_SCALE * .6];

function paperTexture() {
  const cw = 1024, ch = 8192, [c, g] = canvas2d(cw, ch), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  const pxPerS = ch / (L0 + BEND), Y = s => ch - s * pxPerS;                           // 纸的近端在画布底部
  const draw = () => {
    g.fillStyle = '#F3F0E4'; g.fillRect(0, 0, cw, ch);
    const rowH = (S1 - S0) / (LZ_T / .1) * pxPerS;                                      // 每 0.1 个时间单位印一行
    for (let k = 0, y = Y(S0); y > 0; k++, y -= rowH) if (Math.floor(k / 3) % 2 === 0) { g.fillStyle = '#DCEBD6'; g.fillRect(70, y - rowH, cw - 140, rowH); }   // 绿条纹：三行一道
    for (let y = ch - 40; y > 0; y -= 96) for (const x of [34, cw - 34]) { g.fillStyle = '#C9C4B6'; g.beginPath(); g.arc(x, y, 13, 0, 6.2832); g.fill(); g.fillStyle = '#3A352C'; g.beginPath(); g.arc(x, y, 9, 0, 6.2832); g.fill(); }   // 两边的链孔
    g.strokeStyle = 'rgba(120,110,90,.35)'; g.setLineDash([10, 8]); for (let y = ch - 2100; y > 0; y -= 2100) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); } g.setLineDash([]);   // 折页的虚线
    g.font = '400 22px "VK Type"'; g.textBaseline = 'middle';
    for (let k = 0; k <= LZ_T / .1; k++) {
      const i = Math.round(k * .1 / LZ_DT), y = Y(sOfT(k * .1)) - rowH / 2;
      g.fillStyle = 'rgba(40,38,34,.82)'; g.textAlign = 'left'; g.fillText(String(k).padStart(4, '0'), 96, y);
      const xs = k === 0 ? '0.506127' : RUN_A[i * 3].toFixed(6), ys = RUN_A[i * 3 + 1].toFixed(6), zs = RUN_A[i * 3 + 2].toFixed(6);
      g.textAlign = 'right'; g.fillText(xs, 400, y); g.fillText(ys, 640, y); g.fillText(zs, 900, y);
    }
    /* 页边的小字：模型时间换成"天"（示意） */
    g.fillStyle = 'rgba(90,80,60,.75)'; g.font = '400 18px "VK Type"'; g.textAlign = 'left';
    for (const d of [1, 10, 20, 30, 40, 50, 60, 70]) { const y = Y(sOfT(d / DAYS_PER_T)); g.fillText(`DAY ${d}`, 56, y - 4); }
    tex.needsUpdate = true;
  };
  return { tex, draw };
}

const lerpN = (a, b, k) => a + (b - a) * k;
export function buildLab(r) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0A0907');
  scene.fog = new THREE.Fog('#0A0907', 6, 14);
  const camera = new THREE.PerspectiveCamera(30, W / H, .003, 60);
  const room = [];                                                                    // 会一起暗下去的灯 [对象, 原强度]

  /* 桌子：深色胡桃木 */
  {
    const n = 1024, [c, g] = canvas2d(n, n), im = g.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n, v = y / n, ring = fbm(u * 36 + fbm(u * 3, v * 3, 1, 3) * 6, v * 2, 2, 5), fine = fbm(u * 400, v * 40, 5, 3);
      const k = .55 + .35 * Math.sin(ring * 22) * .5 + .25 * fine, i = (y * n + x) * 4;
      im.data[i] = 66 * k + 20; im.data[i + 1] = 42 * k + 14; im.data[i + 2] = 26 * k + 9; im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.5, 2.5); t.anisotropy = 8;
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ map: t, roughness: .55 })); desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; scene.add(desk);
    room.push([desk.material, 1, 'opacity']); desk.material.transparent = true;
  }
  /* 纸条 */
  const paper = paperTexture();
  const paperMesh = (() => {
    const nS = 480, g = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
    for (let j = 0; j <= nS; j++) { const s = (L0 + BEND) * j / nS; for (const u of [-1, 1]) { const p = paperPos(s, u / .8); pos.push(...p); uv.push((u + 1) / 2, s / (L0 + BEND)); } if (j < nS) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: paper.tex, roughness: .9, side: THREE.DoubleSide, transparent: true })); m.receiveShadow = true; scene.add(m); return m;
  })();
  /* "127" 被划掉、旁边铅笔写的 "0.506"：一张小贴片盖在第一行上 */
  const [nc, ng] = canvas2d(512, 64), noteTex = new THREE.CanvasTexture(nc); noteTex.colorSpace = THREE.SRGBColorSpace; noteTex.anisotropy = 8;
  const note = new THREE.Mesh(new THREE.PlaneGeometry(PW * .5, PW * .5 / 8), new THREE.MeshBasicMaterial({ map: noteTex, transparent: true, depthWrite: false }));
  note.rotation.x = -Math.PI / 2; scene.add(note);
  /* 打印机（Friden Flexowriter 那种打字机式终端）：米灰色机身、一排排键、黑色滚筒 */
  const printer = new THREE.Group(); printer.position.set(0, 0, Z_NEAR - L0 - .62); scene.add(printer);
  {
    const beige = new THREE.MeshStandardMaterial({ color: '#C9BFA8', roughness: .5, metalness: .1 }), dark = new THREE.MeshStandardMaterial({ color: '#2A2724', roughness: .4 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.15, .34, .78, 4, .05), beige); body.position.y = .17; body.castShadow = true; printer.add(body);
    const top = new THREE.Mesh(new RoundedBoxGeometry(1.0, .14, .32, 4, .04), beige); top.position.set(0, .4, -.18); printer.add(top);
    const platen = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, 1.06, 32), dark); platen.rotation.z = Math.PI / 2; platen.position.set(0, .5, -.06); printer.add(platen);
    for (const sx of [-1, 1]) { const knob = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .05, 24), dark); knob.rotation.z = Math.PI / 2; knob.position.set(sx * .56, .5, -.06); printer.add(knob); }
    const keyM = new THREE.MeshStandardMaterial({ color: '#3B3631', roughness: .35 }), capG = new THREE.CylinderGeometry(.026, .028, .02, 16);
    for (let row = 0; row < 4; row++) for (let k = 0; k < 11 - (row === 3 ? 1 : 0); k++) { const key = new THREE.Mesh(capG, keyM); key.position.set(-.38 + k * .07 + row * .02, .35 + row * .012, .3 - row * .065); printer.add(key); }
    const bar = new THREE.Mesh(new RoundedBoxGeometry(.42, .02, .05, 2, .01), keyM); bar.position.set(0, .345, .36); printer.add(bar);
  }
  /* 杯子（开场那个桌上也有一杯咖啡） */
  {
    const pts = []; for (let i = 0; i <= 20; i++) { const k = i / 20; pts.push(new THREE.Vector2(.14 + .01 * Math.sin(k * 3), k * .3)); } pts.push(new THREE.Vector2(.13, .3), new THREE.Vector2(.13, .015), new THREE.Vector2(0, .015));
    const mm = new THREE.MeshStandardMaterial({ color: '#E2DCCF', roughness: .35, side: THREE.DoubleSide }), mug = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mm);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.08, .018, 12, 24, Math.PI), mm); handle.position.set(.145, .15, 0); handle.rotation.z = -Math.PI / 2;
    const g = new THREE.Group(); g.add(mug, handle); g.position.set(.75, 0, .2); g.rotation.y = 2.2; mug.castShadow = true; scene.add(g);
  }
  /* 灯：一盏暖台灯 + 很弱的环境光 */
  const lamp = new THREE.SpotLight('#FFD2A0', 26, 9, .75, .6, 1.6); lamp.position.set(-1.6, 2.6, .6); lamp.target.position.set(0, 0, -.4); lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); scene.add(lamp, lamp.target);
  const fill = new THREE.HemisphereLight('#8090A8', '#2A1C12', .35); scene.add(fill);
  room.push([lamp, lamp.intensity, 'intensity'], [fill, fill.intensity, 'intensity']);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: radialTex([[0, .3], [.4, .1], [1, 0]]), color: '#FFB878', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.set(-.3, .003, -.2); scene.add(glow);
  room.push([glow.material, 1, 'opacity']);

  /* 两条墨迹 / 两条蝴蝶的线：同一条带子，位置在"纸上"和"三维"之间插值 */
  /* 墨迹：在纸上是深色的墨（正常混合），升到暗处以后提亮成发光的金 / 青（交给辉光） */
  const inkMat = r => { r.mat.blending = THREE.NormalBlending; r.mat.depthWrite = false;
    r.mat.fragmentShader = `uniform vec3 uColor; uniform float uA, uTail; varying float vk; varying float vv;
      void main(){ float a = (1. - smoothstep(.5, 1., abs(vv)))*uA*mix(1., pow(vk, 2.), uTail); gl_FragColor = vec4(uColor, a); }`; r.mat.needsUpdate = true; return r; };
  const ribA = inkMat(new Ribbon(LZ_N, GOLD)), ribB = inkMat(new Ribbon(LZ_N, ICE)); ribA.mat.uniforms.uTail.value = 0; ribB.mat.uniforms.uTail.value = 0;
  const WIN = 420, winA = inkMat(new Ribbon(WIN, GOLD)), winB = inkMat(new Ribbon(WIN, ICE)); winA.mat.uniforms.uTail.value = winB.mat.uniforms.uTail.value = 1;   // 跑在翅膀上的两个点身后的一截亮尾巴
  scene.add(ribA.mesh, ribB.mesh, winA.mesh, winB.mesh);
  const INK_A = new THREE.Color('#9A5A18'), INK_B = new THREE.Color('#17677E'), GLOW_A = new THREE.Color(GOLD).multiplyScalar(1.35), GLOW_B = new THREE.Color(ICE).multiplyScalar(1.35), wpts = new Float32Array(WIN * 3);
  const headA = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(3) })), headB = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(ICE).multiplyScalar(3) }));
  scene.add(headA, headB);
  /* 两个点之间的那根白线：量它们隔了多远 */
  const TH = 24, thread = new Ribbon(TH, '#FFFFFF'); thread.mat.uniforms.uTail.value = 0; scene.add(thread.mesh); const tpts = new Float32Array(TH * 3);
  const ptsA = new Float32Array(LZ_N * 3), ptsB = new Float32Array(LZ_N * 3);
  const UPP1 = 2 * Math.tan(15 * Math.PI / 180) / H;
  let drawn = false;

  /* s: { t, room(0..1), lift(0..1 纸→蝴蝶), aEnd/bStart/bEnd（墨迹画到第几个点）, aA/aB（透明度）, noteK, heads:{on, iA, iB, r}, ribPx } */
  function update(s) {
    if (!drawn) { paper.draw(); drawNote(0); drawn = true; }
    for (const [o, v, k] of room) o[k] = v * s.room;
    paperMesh.material.opacity = s.paperA == null ? 1 : s.paperA; scene.background.setRGB(.039 * s.room, .035 * s.room, .027 * s.room); scene.fog.color.copy(scene.background);
    const k = s.lift, kk = k * k * (3 - 2 * k);
    for (const [run, pts] of [[RUN_A, ptsA], [RUN_B, ptsB]]) for (let i = 0; i < LZ_N; i++) {
      const a = paperPoint(run, i, .0006), b = butterflyPoint(run, i), w = Math.min(1, Math.max(0, kk * 1.25 - (i / LZ_N) * .25));   // 先离开纸的先到位
      const arch = Math.sin(Math.PI * w) * .25;                                                                                            // 中途往上拱一下，像从纸上"揭起来"
      pts[i * 3] = a[0] + (b[0] - a[0]) * w; pts[i * 3 + 1] = a[1] + (b[1] - a[1]) * w + arch; pts[i * 3 + 2] = a[2] + (b[2] - a[2]) * w;
    }
    /* 只画到当前那一截：把没画到的点叠在端点上 */
    const clip = (pts, i0, i1) => { const lo = Math.max(0, Math.min(LZ_N - 1, Math.round(i0))), hi = Math.max(lo, Math.min(LZ_N - 1, Math.round(i1))); for (let i = 0; i < LZ_N; i++) { const j = i < lo ? lo : i > hi ? hi : i; if (j !== i) { pts[i * 3] = pts[j * 3]; pts[i * 3 + 1] = pts[j * 3 + 1]; pts[i * 3 + 2] = pts[j * 3 + 2]; } } return [lo, hi]; };
    const [, hiA] = clip(ptsA, 0, s.aEnd), [loB, hiB] = clip(ptsB, s.bStart, s.bEnd);
    ribA.update(ptsA, camera.position, s.ribPx, UPP1, 1); ribB.update(ptsB, camera.position, s.ribPx * (s.glow > .5 ? .85 : .55), UPP1, 1);   // 纸上：青线细一点，金线从两边露出来
    ribA.mat.uniforms.uA.value = s.aA; ribB.mat.uniforms.uA.value = s.aB; ribA.mesh.visible = s.aA > .001; ribB.mesh.visible = s.aB > .001 && hiB > loB;
    ribA.mat.uniforms.uColor.value.copy(INK_A).lerp(GLOW_A, s.glow); ribB.mat.uniforms.uColor.value.copy(INK_B).lerp(GLOW_B, s.glow);
    /* 亮尾巴 */
    const w = s.win; winA.mesh.visible = winB.mesh.visible = !!(w && w.a > .001);
    if (w && w.a > .001) for (const [rib, pts] of [[winA, ptsA], [winB, ptsB]]) {
      for (let j = 0; j < WIN; j++) { const i = Math.max(0, Math.min(LZ_N - 1, Math.round(w.i - (WIN - 1 - j) * w.len / WIN))); wpts[j * 3] = pts[i * 3]; wpts[j * 3 + 1] = pts[i * 3 + 1]; wpts[j * 3 + 2] = pts[i * 3 + 2]; }
      rib.update(wpts, camera.position, s.ribPx * 1.8, UPP1, .2); rib.mat.uniforms.uA.value = w.a; rib.mat.uniforms.uColor.value.copy(rib === winA ? GLOW_A : GLOW_B).multiplyScalar(1.3);
    }
    /* 笔尖 / 跑在翅膀上的两个点 */
    const hd = s.heads; headA.visible = headB.visible = !!(hd && hd.on);
    if (hd && hd.on) { const ia = Math.round(hd.iA) * 3, ib = Math.round(hd.iB) * 3; headA.position.set(ptsA[ia], ptsA[ia + 1], ptsA[ia + 2]); headB.position.set(ptsB[ib], ptsB[ib + 1], ptsB[ib + 2]); headA.scale.setScalar(hd.r); headB.scale.setScalar(hd.r * .9); }
    thread.mesh.visible = !!(hd && hd.on && s.thread > .001);
    if (thread.mesh.visible) { for (let j = 0; j < TH; j++) { const u = j / (TH - 1); tpts[j * 3] = lerpN(headA.position.x, headB.position.x, u); tpts[j * 3 + 1] = lerpN(headA.position.y, headB.position.y, u); tpts[j * 3 + 2] = lerpN(headA.position.z, headB.position.z, u); }
      thread.update(tpts, camera.position, 1.1, UPP1, 1); thread.mat.uniforms.uA.value = .75 * s.thread; }
    if (s.noteK !== note.userData.k) drawNote(s.noteK);
    note.position.set(0, .0021, Z_NEAR - (S0 + (S1 - S0) / (LZ_T / .1) / 2)); note.material.opacity = s.room;
  }
  /* 第一行：0.506127 的后三位被划掉，旁边写 0.506（k 0..1） */
  function drawNote(k) {
    note.userData.k = k; ng.clearRect(0, 0, 512, 64);
    const a1 = Math.min(1, k * 2), a2 = Math.max(0, k * 2 - 1);
    /* 贴片宽 PW*0.5、中心在纸的中线上：画布 1 像素 = PW*0.5/512；第一行的 "127" 在纸上 x ≈ -0.080 … -0.060 */
    const px = x => 256 + x / (PW * .5 / 512);
    if (a1 > 0) { ng.strokeStyle = `rgba(190,50,36,${.9 * a1})`; ng.lineWidth = 5; ng.beginPath(); ng.moveTo(px(-.083), 36); ng.lineTo(px(-.083) + (px(-.058) - px(-.083)) * a1, 30); ng.stroke(); }
    if (a2 > 0) { ng.globalAlpha = a2; ng.fillStyle = '#17677E'; ng.font = 'italic 600 42px "VK Latin"'; ng.textBaseline = 'middle'; ng.fillText('→ 0.506', px(-.05), 34); ng.globalAlpha = 1; }
    noteTex.needsUpdate = true;
  }
  return { scene, camera, update, printer, paperMesh };
}
