/* lib.js — 各个 3D 场景共用的零件：噪声、纹理、材质、轨迹带、星空、星云、尘埃。
 * 随机全部按种子取；纹理载入时算一次。从《三体 · 3D 试拍》的 scene3d.js 拆出来。
 */
import * as THREE from 'three';

export const W = 1920, H = 1080;
export const GOLD = '#F8D893', ICE = '#64E3F6';                   // 金 = 实际那个世界 / 关键词，青 = 只差一点的另一个世界
export const SUN_COL = ['#FFD27A', '#FFB36B', '#FFF1DA'];         // α β γ

/* ---------- CPU 噪声 ---------- */
export const fract = x => x - Math.floor(x);
const h3 = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
export function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let fx = x - xi, fy = y - yi, fz = z - zi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const l = (a, b, k) => a + (b - a) * k;
  return l(l(l(h3(xi, yi, zi), h3(xi + 1, yi, zi), fx), l(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), fx), fy),
           l(l(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), fx), l(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), fx), fy), fz);
}
export function fbm(x, y, z, oct = 5) { let s = 0, a = .5, f = 1; for (let k = 0; k < oct; k++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= .5; } return s / (1 - Math.pow(.5, oct)); }
export const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mixRGB = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const sstep = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const canvas2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

/* ---------- 纹理 ---------- */
export function radialTex(stops, n = 256) {
  const [c, g] = canvas2d(n, n), gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  for (const [p, a] of stops) gr.addColorStop(p, `rgba(255,255,255,${a})`);
  g.fillStyle = gr; g.fillRect(0, 0, n, n); return new THREE.CanvasTexture(c);
}
export function nebulaTex(seed, n = 512) {
  const [c, g] = canvas2d(n, n), im = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n - .5, v = y / n - .5, r = Math.sqrt(u * u + v * v) * 2, i = (y * n + x) * 4;
    const f = fbm(u * 3.2 + seed, v * 3.2 + seed * .7, seed * .3, 6), d = fbm(u * 9 + seed, v * 9, 1 + seed, 4);
    const a = Math.max(0, f - .38) * 1.9 * (1 - sstep(.45, 1, r)) * (.6 + .5 * d);
    im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = 255 * Math.min(1, a);
  }
  g.putImageData(im, 0, 0); return new THREE.CanvasTexture(c);
}
/* 三体行星：沙黄大陆、深青海、两极冰盖、稀疏的云（alphaMap 读绿通道） */
export function planetTextures() {
  const w = 1024, h = 512, [c1, g1] = canvas2d(w, h), [c2, g2] = canvas2d(w, h), [c3, g3] = canvas2d(w, h);
  const im = g1.createImageData(w, h), cl = g2.createImageData(w, h), rg = g3.createImageData(w, h);
  const deep = hexRGB('#071E3A'), shallow = hexRGB('#1A5F80'), sand = hexRGB('#9C6A3A'), rust = hexRGB('#6E3520'), dark = hexRGB('#3E2A1E'), ice = hexRGB('#E4ECF0');
  for (let v = 0; v < h; v++) {
    const lat = (.5 - (v + .5) / h) * Math.PI, cl0 = Math.cos(lat), sy = Math.sin(lat);
    for (let u = 0; u < w; u++) {
      const lon = (u + .5) / w * 2 * Math.PI, x = cl0 * Math.cos(lon), z = cl0 * Math.sin(lon), i = (v * w + u) * 4;
      const e = fbm(x * 1.7 + 11, sy * 1.7 + 3, z * 1.7 + 7) * .72 + fbm(x * 5.3 + 2, sy * 5.3, z * 5.3 + 9, 4) * .28;
      const sea = .56; let col, rough;
      if (e < sea) { col = mixRGB(deep, shallow, Math.pow(sstep(sea - .14, sea, e), 2.2)); rough = .32; }
      else {
        const k = sstep(sea, sea + .2, e), wet = fbm(x * 3.1 + 40, sy * 3.1, z * 3.1, 4), dune = fbm(x * 26, sy * 26, z * 26, 3);
        col = mixRGB(mixRGB(sand, rust, sstep(.4, .68, wet)), dark, sstep(.45, 1, k) * .7);
        col = col.map(c => c * (.82 + .3 * dune)); rough = .95;
        col = mixRGB(col, hexRGB('#D9C08F'), (1 - sstep(sea, sea + .012, e)) * .6);
      }
      const pole = sstep(1.15, 1.3, Math.abs(lat) + (fbm(x * 4, sy * 4, z * 4, 3) - .5) * .3);
      col = mixRGB(col, ice, pole); rough = rough + (.8 - rough) * pole;
      im.data[i] = col[0]; im.data[i + 1] = col[1]; im.data[i + 2] = col[2]; im.data[i + 3] = 255;
      rg.data[i] = rg.data[i + 1] = rg.data[i + 2] = rough * 255; rg.data[i + 3] = 255;
      const cv = fbm(x * 2.2 + 70 + Math.sin(sy * 5) * .4, sy * 7.5 + 20, z * 2.2 + 33);
      const cloud = Math.pow(sstep(.5, .86, cv), 1.6) * (.35 + .65 * fbm(x * 13, sy * 20, z * 13, 4));
      cl.data[i] = cl.data[i + 1] = cl.data[i + 2] = 255 * Math.min(.9, cloud * 1.25); cl.data[i + 3] = 255;
    }
  }
  g1.putImageData(im, 0, 0); g2.putImageData(cl, 0, 0); g3.putImageData(rg, 0, 0);
  const t1 = new THREE.CanvasTexture(c1), t2 = new THREE.CanvasTexture(c2), t3 = new THREE.CanvasTexture(c3);
  t1.colorSpace = THREE.SRGBColorSpace; for (const t of [t1, t2, t3]) t.anisotropy = 8;
  return { surface: t1, clouds: t2, rough: t3 };
}

/* ---------- GLSL ---------- */
export const GLSL_NOISE = `
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float vn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x), f.y), f.z); }
float fbm(vec3 p){ float s=0., a=.5; for(int k=0;k<5;k++){ s+=a*vn(p); p=p*2.07+vec3(1.7,9.2,3.1); a*=.5; } return s; }`;
export const VERT_NV = `varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;

/* 太阳表面：米粒组织翻滚、临边昏暗、中心发白（HDR，交给辉光） */
export const sunMat = (col, seed) => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(col) }, uTime: { value: 0 }, uSeed: { value: seed }, uGain: { value: 1 } },
  vertexShader: VERT_NV,
  fragmentShader: `uniform vec3 uColor; uniform float uTime, uSeed, uGain; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${GLSL_NOISE}
  void main(){ float mu = clamp(dot(normalize(vN), normalize(vV)), 0., 1.);
    vec3 p = normalize(vP)*4.5 + uSeed;
    float g = fbm(p + vec3(0., uTime*.22, uTime*.13)), cells = fbm(p*3.4 - uTime*.35);
    float limb = .28 + .72*pow(mu, .5);
    vec3 col = uColor*(1.1 + 1.5*g + .7*cells)*limb*mix(vec3(1., .62, .38), vec3(1.), pow(mu, .45)) + vec3(1., .95, .85)*pow(mu, 4.)*.9;   // 临边发红
    gl_FragColor = vec4(col*uGain, 1.); }`,
});
/* 只有一圈边的"影子"球（菲涅尔），加法混合 */
export const rimMat = (col, power = 2.6, fill = .05) => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(col) }, uA: { value: 0 } },
  vertexShader: VERT_NV,
  fragmentShader: `uniform vec3 uColor; uniform float uA; varying vec3 vN; varying vec3 vV;
  void main(){ float f = max(1. - abs(dot(normalize(vN), normalize(vV))), 0.); float a = (pow(f, ${power.toFixed(2)})*1.6 + ${fill.toFixed(3)})*uA;
    gl_FragColor = vec4(uColor*a*2.2, 1.); }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
});
/* 大气边缘光：亮度跟着三颗太阳各自照到的那一侧 */
export const atmoMat = (cols = SUN_COL, tint = [.35, .65, 1]) => new THREE.ShaderMaterial({
  uniforms: { uSun: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] }, uSunCol: { value: cols.map(c => new THREE.Color(c)) }, uSunI: { value: [1, 1, 1] }, uTint: { value: new THREE.Vector3(...tint) }, uA: { value: 1 } },
  vertexShader: `varying vec3 vWN; varying vec3 vWP; varying vec3 vV;
    void main(){ vec4 wp = modelMatrix*vec4(position,1.); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
  fragmentShader: `uniform vec3 uSun[3]; uniform vec3 uSunCol[3]; uniform float uSunI[3]; uniform vec3 uTint; uniform float uA; varying vec3 vWN; varying vec3 vWP; varying vec3 vV;
    void main(){ vec3 N = normalize(vWN); float rim = pow(max(1. - abs(dot(N, normalize(vV))), 0.), 3.5);   // max：正对着看时 1-|N·V| 可能是 -0.0000001，pow 出 NaN 会变成一块黑
      vec3 c = vec3(0.);
      for (int i = 0; i < 3; i++){ float d = dot(N, normalize(uSun[i] - vWP)); c += uSunCol[i]*uSunI[i]*smoothstep(-.15, .6, d); }
      gl_FragColor = vec4(c*uTint*rim*1.1*uA, 1.); }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
});

/* 轨迹：每个采样点按相机方向向两侧撑开成一条带子；k 0（尾）…1（头），v −1…1（横向） */
export class Ribbon {
  constructor(n, color) {
    this.n = n; const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3); const k = new Float32Array(n * 2), v = new Float32Array(n * 2), idx = [];
    for (let i = 0; i < n; i++) { k[2 * i] = k[2 * i + 1] = i / (n - 1); v[2 * i] = -1; v[2 * i + 1] = 1; if (i < n - 1) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('k', new THREE.BufferAttribute(k, 1)); g.setAttribute('v', new THREE.BufferAttribute(v, 1)); g.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: 1 }, uTail: { value: 1.7 } },
      vertexShader: `attribute float k; attribute float v; varying float vk; varying float vv; void main(){ vk = k; vv = v; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uA, uTail; varying float vk; varying float vv;
        void main(){ float a = pow(vk, uTail)*(1. - vv*vv)*uA; gl_FragColor = vec4(uColor*a*1.6, 1.); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.g = g;
  }
  /* pts: n*3（尾→头）；cam: 相机位置；px: 头部半宽（像素）；unitsPerPx: 距离 1 处一个像素多少单位；taper: 尾部宽度占头部的比例 */
  update(pts, cam, px, unitsPerPx, taper = .25) {
    const n = this.n, P = this.pos, t = new THREE.Vector3(), vw = new THREE.Vector3(), sd = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      t.set(pts[b * 3] - pts[a * 3], pts[b * 3 + 1] - pts[a * 3 + 1], pts[b * 3 + 2] - pts[a * 3 + 2]);
      p.set(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]); vw.copy(cam).sub(p);
      const dist = vw.length(); sd.crossVectors(t, vw); const L = sd.length() || 1;
      const w = px * (taper + (1 - taper) * i / (n - 1)) * unitsPerPx * dist; sd.multiplyScalar(w / L);
      P[i * 6] = p.x - sd.x; P[i * 6 + 1] = p.y - sd.y; P[i * 6 + 2] = p.z - sd.z;
      P[i * 6 + 3] = p.x + sd.x; P[i * 6 + 4] = p.y + sd.y; P[i * 6 + 5] = p.z + sd.z;
    }
    this.g.attributes.position.needsUpdate = true;
  }
}

/* ---------- 背景件 ---------- */
/* 星空：满天的 + 一条银河带，像素大小固定 */
export function starfield(scene, r, R = 160, N = 7000) {
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N), ph = new Float32Array(N);
  const tint = [new THREE.Color('#CFE0FF'), new THREE.Color('#FFFFFF'), new THREE.Color('#FFE6C2'), new THREE.Color('#9FB4FF')];
  for (let i = 0; i < N; i++) {
    let x, y, z;
    if (i < N * .55) { const u = r() * 2 - 1, a = r() * 6.2832, s = Math.sqrt(1 - u * u); x = s * Math.cos(a); y = u; z = s * Math.sin(a); }
    else { const a = r() * 6.2832, off = (r() + r() + r() - 1.5) * .16; x = Math.cos(a); y = off; z = Math.sin(a); const tilt = .5, yy = y * Math.cos(tilt) - z * Math.sin(tilt), zz = y * Math.sin(tilt) + z * Math.cos(tilt); y = yy; z = zz; const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l; }
    pos.set([x * R, y * R, z * R], i * 3);
    const c = tint[Math.floor(r() * 4)]; col.set([c.r, c.g, c.b], i * 3);
    sz[i] = 1.1 + Math.pow(r(), 6) * 3.6; ph[i] = r() * 6.2832;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.BufferAttribute(sz, 1)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uA: { value: 1 } },
    vertexShader: `attribute float size; attribute float ph; attribute vec3 color; uniform float uTime; varying vec3 vC; varying float vTw;
      void main(){ vC = color; vTw = .75 + .25*sin(uTime*2.3 + ph*7.); gl_PointSize = size; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vC; varying float vTw; uniform float uA; void main(){ vec2 d = gl_PointCoord - .5; float a = smoothstep(.5, .0, length(d)); gl_FragColor = vec4(vC*a*vTw*uA*.9, 1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); m.userData.points = pts; return m;
}
/* 星云：几片远处的云，青、靛、一点琥珀 */
export function nebula(scene, r, R = 120, opacity = .55) {
  const cols = ['#1C6E78', '#2A2F78', '#5A3C8A', '#1C6E78', '#7A4A2A', '#23407A'], dirs = [[1, .15, -.3], [-.4, .3, -1], [-1, -.2, .2], [.3, -.35, 1], [.9, .45, .6], [-.6, .05, .9]], out = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.MeshBasicMaterial({ map: nebulaTex(3.1 + i * 5.7), color: cols[i], transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m), d = new THREE.Vector3(...dirs[i]).normalize().multiplyScalar(R);
    q.position.copy(d); q.lookAt(0, 0, 0); q.scale.setScalar(R * (.92 + .42 * r())); q.rotateZ(r() * 6); scene.add(q); out.push(m);
  }
  return out;
}
/* 尘埃：一团细粒，离焦的变大变淡（手做的景深：弥散圆按 1/焦距放大） */
export function dust(scene, r, unitsPerPx, o = {}) {
  const N = o.n || 2600, R0 = o.r0 || .35, R1 = o.r1 || 6.5, flat = o.flat || .55, pos = new Float32Array(N * 3), ph = new Float32Array(N), sz = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = r() * 2 - 1, a = r() * 6.2832, s = Math.sqrt(1 - u * u), R = R0 + (R1 - R0) * Math.pow(r(), .7);
    pos.set([s * Math.cos(a) * R, u * R * flat, s * Math.sin(a) * R], i * 3); ph[i] = r() * 6.2832; sz[i] = .6 + r() * 1.4;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1)); g.setAttribute('sz', new THREE.BufferAttribute(sz, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFocus: { value: 5 }, uPx: { value: 1 / unitsPerPx }, uA: { value: 1 }, uSize: { value: o.size || .004 }, uDrift: { value: o.drift || .08 }, uColor: { value: new THREE.Color(o.color || '#FFDBA8') } },
    vertexShader: `attribute float ph; attribute float sz; uniform float uTime, uFocus, uPx, uSize, uDrift; varying float vA;
      void main(){ vec3 p = position + vec3(sin(uTime*.07 + ph), sin(uTime*.05 + ph*1.3)*.5, cos(uTime*.06 + ph))*uDrift;
        vec4 mv = modelViewMatrix*vec4(p,1.); float z = -mv.z;
        float coc = abs(z - uFocus)/max(z, .01)*7.*clamp(5./uFocus, 1., 14.);
        float base = sz*uSize*uPx/max(z, .01);
        float s = clamp(base + coc, 1., 140.); gl_PointSize = s;
        vA = clamp(1.6*base*base/(s*s), 0., 1.)*.45*smoothstep(.02, .3*uFocus/5., z);
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; uniform float uA; uniform vec3 uColor; void main(){ float r = length(gl_PointCoord - .5)*2.; float a = smoothstep(1., .8, r)*(.55 + .45*smoothstep(.5, .95, r));
      gl_FragColor = vec4(uColor*a*vA*uA, 1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return m;
}

/* ---------- 理查森的经纬网格（纬度 1.8°、经度 3°）：地球外面和大厅里面共用同一个着色器 ----------
 * uFlip = 1：大厅里面看的地图是左右翻过来贴的（从里面看才是正的），经度要跟着翻。
 * uReveal：从 uCenter 往外铺开的角度（弧度）；uCell：高亮的那一格（纬度下、上，经度左、右）。 */
export const gridMat = (o = {}) => new THREE.ShaderMaterial({
  uniforms: { uA: { value: 0 }, uReveal: { value: 4 }, uCenter: { value: new THREE.Vector3(0, 1, 0) }, uFlip: { value: o.flip ? 1 : 0 }, uColor: { value: new THREE.Color(o.color || GOLD) },
    uCell: { value: new THREE.Vector4(0, 0, 0, 0) }, uCellA: { value: 0 }, uWidth: { value: o.width || 1.2 }, uStep: { value: new THREE.Vector2(1.8, 3) },
    uBulge: { value: new THREE.Vector4(0, 0, 1, 0) }, uBulgeR: { value: 1 } },
  /* uBulge = (轴, k)：把球面绕这根轴往外推成凸面（大厅的凹墙在切点那一帧装成地球的凸面，见 hall.js）；k = 0 时就是原来的球 */
  vertexShader: `uniform vec4 uBulge; uniform float uBulgeR; varying vec3 vObj;
    void main(){ vObj = position; vec3 p = position; if (uBulge.w > 0.) p += uBulge.xyz*uBulge.w*2.*uBulgeR*(1. - dot(normalize(position), uBulge.xyz));
      gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
  fragmentShader: `uniform float uA, uReveal, uFlip, uCellA, uWidth; uniform vec3 uCenter, uColor; uniform vec4 uCell; uniform vec2 uStep; varying vec3 vObj;
    void main(){ vec3 d = normalize(vObj); float lat = degrees(asin(clamp(d.y, -1., 1.)));
      float u = fract(atan(d.z, -d.x)/6.2831853); if (uFlip > .5) u = 1. - u; float lon = u*360. - 180.;
      float a1 = lat/uStep.x, a2 = u*360./uStep.y;
      float w1 = fwidth(a1), w2 = min(fwidth(a2), fwidth(fract(u + .5)*360./uStep.y));   // 经度在 ±180° 处跳变，换一种算法躲开那条缝
      float g1 = abs(fract(a1 - .5) - .5)/max(w1, 1e-6), g2 = abs(fract(a2 - .5) - .5)/max(w2, 1e-6);
      float line = 1. - smoothstep(uWidth*.5, uWidth*.5 + 1., min(g1, g2));
      float c1 = min(1., (uWidth + .5)*w1), c2 = min(1., (uWidth + .5)*w2), cover = 1. - (1. - c1)*(1. - c2);   // 格子比像素还小：线连成一层纱，按覆盖率给亮度
      line = mix(line, cover*.09, smoothstep(.2, .5, max(w1, w2)));
      float ang = acos(clamp(dot(d, normalize(uCenter)), -1., 1.));
      float rev = 1. - smoothstep(uReveal - .06, uReveal, ang), edge = exp(-pow((ang - uReveal)/.035, 2.));
      float inCell = step(uCell.x, lat)*step(lat, uCell.y)*step(uCell.z, lon)*step(lon, uCell.w);
      float a = line*(rev*.6 + edge*.9)*uA*(1. + inCell*uCellA*1.6) + inCell*uCellA*.012*uA*rev;
      gl_FragColor = vec4(uColor*a, 1.); }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: o.side || THREE.FrontSide,
});
/* 墨迹 / 蝴蝶的线：正常混合的带子（和 lorenz.js 里的一样），用来在别的场景里接住那只蝴蝶 */
export function inkRibbon(n, color) {
  const r = new Ribbon(n, color); r.mat.blending = THREE.NormalBlending; r.mat.depthWrite = false;
  r.mat.fragmentShader = `uniform vec3 uColor; uniform float uA, uTail; varying float vk; varying float vv;
    void main(){ float a = (1. - smoothstep(.5, 1., abs(vv)))*uA*mix(1., pow(vk, 2.), uTail); gl_FragColor = vec4(uColor, a); }`;
  r.mat.needsUpdate = true; r.mat.uniforms.uTail.value = 0; return r;
}
/* 台风：一张旋臂云的 alpha 图（绿通道），贴在一个球冠上 */
export function cycloneTex(n = 512) {
  const [c, g] = canvas2d(n, n), im = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + .5) / n * 2 - 1, dy = (y + .5) / n * 2 - 1, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx), i = (y * n + x) * 4;
    const arm = .5 + .5 * Math.sin(2 * th + 7 * Math.log(r + .04)), nz = fbm(dx * 4 + 3, dy * 4 + 1, 2, 5);
    let v = sstep(.25, .85, arm * .8 + nz * .55) * (1 - sstep(.45, 1, r));
    v = Math.max(v, (1 - sstep(.1, .3, r)) * .95) * sstep(.035, .075, r);          // 眼墙一圈最厚，正中间是风眼
    im.data[i] = im.data[i + 1] = im.data[i + 2] = 255 * Math.min(1, v); im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}
