/* surface.js — 三体世界的地面（游戏《三体》第 184 号文明）：沙漠平原、三颗太阳、一眼望不到头的士兵方阵在举黑白旗算太阳（人列计算机"秦一号"）。
 * 三日连珠时，三颗太阳排成一串，士兵、石块、青铜大鼎慢慢浮起来。
 * buildSurface(r) → { scene, camera, update(s), stars }
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { W, H, SUN_COL, fbm, sstep, canvas2d, starfield, hexRGB } from './lib.js';

export const HAZE = '#C9A27E';                              // 大气的颜色：从太空钻进来、地面起雾，都是这一种
const NX = 170, NZ = 120, SP = 1.5, Z0 = -40;              // 方阵：170 × 120 人，间距 1.5，中心在 z = -40
const fract = x => x - Math.floor(x);
const hash3 = (a, b, c) => fract(Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453);

/* 天空：地平线发黄的雾、天顶深青；三颗太阳画在天上（中心 HDR，交给辉光）；uDark 把大气变薄、天变黑 */
function skyMat() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uSun: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] }, uSunCol: { value: SUN_COL.map(c => new THREE.Color(c)) }, uDark: { value: 0 }, uHaze: { value: new THREE.Color(HAZE) }, uGlare: { value: 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uSun[3]; uniform vec3 uSunCol[3]; uniform float uDark, uGlare; uniform vec3 uHaze; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 zen = vec3(.035, .13, .2), hor = uHaze*.92;
        vec3 c = mix(hor, zen, smoothstep(-.02, .42, h)); c = mix(c, hor*.55, smoothstep(.0, -.2, h));
        for (int i = 0; i < 3; i++){ float k = dot(d, normalize(uSun[i]));
          c += uSunCol[i]*(.12*pow(max(k, 0.), 10.) + .3*pow(max(k, 0.), 220.))*(1. + uGlare);
          c += uSunCol[i]*smoothstep(.99935, .99952, k)*3.6; }   // 日面：约 1.8° 的圆盘
        c *= 1. - uDark; c += vec3(.0, .004, .01)*(1. - uDark);
        gl_FragColor = vec4(c, 1.); }`,
  });
}
/* 沙地纹理 */
function sandTex() {
  const n = 512, [c, g] = canvas2d(n, n), im = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n, k = .8 + .25 * fbm(u * 16, v * 16, 3, 4) + .12 * fbm(u * 90, v * 90, 7, 2), i = (y * n + x) * 4;
    im.data[i] = 168 * k; im.data[i + 1] = 118 * k; im.data[i + 2] = 72 * k; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(160, 160); t.anisotropy = 8; return t;
}
/* 一个兵：袍子、甲片、头、发髻、举起的手臂和旗杆（顶点色，陶俑的颜色） */
function soldierGeo() {
  const parts = [], col = (g, hex) => { const [r, gg, b] = hexRGB(hex).map(v => v / 255), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([r, gg, b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
  parts.push(col(new THREE.CylinderGeometry(.27, .38, 1.0, 10).translate(0, .5, 0), '#7A5A44'));                       // 袍
  parts.push(col(new THREE.BoxGeometry(.52, .52, .32).translate(0, 1.24, 0), '#4F3F33'));                             // 甲
  parts.push(col(new THREE.BoxGeometry(.62, .12, .36).translate(0, 1.46, 0), '#5E4A3B'));                             // 肩
  parts.push(col(new THREE.SphereGeometry(.16, 10, 8).translate(0, 1.68, .01), '#9C7A5E'));                            // 头
  parts.push(col(new THREE.SphereGeometry(.075, 8, 6).translate(.05, 1.86, -.03), '#2E2620'));                         // 发髻
  parts.push(col(new THREE.BoxGeometry(.11, .58, .11).rotateZ(-.25).translate(.33, 1.62, 0), '#7A5A44'));              // 举起的手臂
  parts.push(col(new THREE.BoxGeometry(.11, .45, .11).rotateZ(.15).translate(-.3, 1.1, 0), '#7A5A44'));                // 垂下的手臂
  parts.push(col(new THREE.CylinderGeometry(.022, .022, 1.7, 6).translate(.4, 1.95, 0), '#5A4330'));                  // 旗杆（顶在 2.8）
  return mergeGeometries(parts);
}
function warriorGeo() {
  const parts = [], col = (g, hex, tint = 0) => {
    const [r, gg, b] = hexRGB(hex).map(v => v / 255), n = g.attributes.position.count, a = new Float32Array(n * 3), m = new Float32Array(n).fill(tint);
    for (let i = 0; i < n; i++) a.set([r, gg, b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.setAttribute('tint', new THREE.BufferAttribute(m, 1)); g.deleteAttribute('uv'); return g; };
  const lathe = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  for (const sx of [-1, 1]) {
    parts.push(col(new THREE.CylinderGeometry(.085, .075, .55, 8).translate(sx * .11, .3, 0), '#5B4A3E'));                 // 腿
    parts.push(col(new THREE.BoxGeometry(.12, .07, .22).translate(sx * .11, .035, .04), '#2A211B'));                        // 靴
  }
  parts.push(col(lathe([[.0, .5], [.37, .5], [.33, .62], [.28, .8], [.26, .96], [.0, .96]], 18), '#E6DED2', 1));          // 袍摆（彩绘）
  parts.push(col(lathe([[.0, .94], [.25, .94], [.27, 1.1], [.25, 1.3], [.2, 1.42], [.0, 1.42]], 14).scale(1, 1, .72), '#3A2E26'));   // 漆甲
  parts.push(col(new THREE.TorusGeometry(.255, .03, 6, 18).rotateX(Math.PI / 2).scale(1, 1, .74).translate(0, .96, 0), '#7A5A34'));   // 腰带
  for (let k = 0; k < 4; k++) parts.push(col(new THREE.BoxGeometry(.4, .025, .02).translate(0, 1.02 + k * .1, .2), '#5C4A3A'));       // 甲片的横纹
  for (const sx of [-1, 1]) parts.push(col(new THREE.SphereGeometry(.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .6, 1.1).translate(sx * .25, 1.38, 0), '#4A3A2E'));   // 披膊
  parts.push(col(new THREE.CylinderGeometry(.06, .07, .12, 8).translate(0, 1.47, 0), '#A88566'));                         // 脖子
  parts.push(col(new THREE.SphereGeometry(.135, 14, 10).scale(.95, 1.08, 1).translate(0, 1.62, .01), '#B08B6B'));        // 头
  parts.push(col(new THREE.SphereGeometry(.14, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.1).translate(0, 1.66, -.01), '#251D18'));   // 头发
  parts.push(col(new THREE.SphereGeometry(.06, 8, 6).translate(.08, 1.8, -.02), '#251D18'));                              // 偏右的发髻
  parts.push(col(new THREE.BoxGeometry(.1, .3, .1).rotateZ(-.9).translate(.36, 1.34, .02), '#E6DED2', 1));                  // 右上臂（袖）
  parts.push(col(new THREE.BoxGeometry(.09, .3, .09).rotateZ(-.1).translate(.48, 1.5, .03), '#E6DED2', 1));                  // 右前臂
  parts.push(col(new THREE.SphereGeometry(.055, 8, 6).translate(.42, 1.66, .03), '#B08B6B'));                              // 握杆的手
  parts.push(col(new THREE.BoxGeometry(.1, .5, .1).rotateZ(.12).translate(-.32, 1.15, 0), '#E6DED2', 1));                  // 左臂
  parts.push(col(new THREE.SphereGeometry(.05, 8, 6).translate(-.35, .88, 0), '#B08B6B'));                                 // 左手
  parts.push(col(new THREE.CylinderGeometry(.022, .022, 1.85, 6).translate(.4, 1.9, .03), '#4E3A28'));                    // 旗杆
  return mergeGeometries(parts);
}
/* 袍子吃实例颜色，其余部分保持顶点色 */
function tintMat() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float tint;')
      .replace('#include <color_vertex>', `#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
        vColor = vec3( 1.0 );
      #endif
      #ifdef USE_COLOR
        vColor *= color;
      #endif
      #ifdef USE_INSTANCING_COLOR
        vColor = mix( vColor, vColor * instanceColor, tint );
      #endif`);
  };
  return m;
}
const ROBES = ['#9E4A3C', '#3F7468', '#4C5C8A', '#A9874C', '#6C4C78', '#8A5A3C'].map(c => new THREE.Color(c));   // 秦俑原本的彩绘：朱红、石绿、靛蓝、赭黄、紫

export function buildSurface(r) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(HAZE, .0045);
  const camera = new THREE.PerspectiveCamera(30, W / H, .1, 4000);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 64, 32), skyMat()); sky.frustumCulled = false; scene.add(sky);
  const starsM = starfield(scene, TB.rng(20261012), 160, 7000); starsM.uniforms.uA.value = 0;   // 和太空场景同一片星（同一个种子），交接时对得上

  /* 地面：方阵那一块是平的，外面是沙丘 */
  {
    const g = new THREE.PlaneGeometry(2400, 2400, 320, 320); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, colA = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), flat = sstep(150, 320, Math.max(Math.abs(x) * 1.0, Math.abs(z - Z0) * 1.3));
      const h = (fbm(x * .004, z * .004, 1, 5) - .5) * 70 * flat + (fbm(x * .03, z * .03, 4, 3) - .5) * (.3 + 4 * flat);
      p.setY(i, h);
      const k = .85 + .3 * fbm(x * .006, z * .006, 9, 4); colA.set([k, k * .96, k * .9], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colA, 3)); g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: sandTex(), vertexColors: true, roughness: .96, metalness: 0 }));
    ground.receiveShadow = true; scene.add(ground);
  }
  /* 三颗太阳的光（各投一个影子：每个兵脚下三道影子） */
  const suns = SUN_COL.map((c, i) => {
    const l = new THREE.DirectionalLight(c, i === 0 ? 1.5 : i === 1 ? 1.1 : .8); l.castShadow = true; l.shadow.mapSize.set(2048, 2048);
    Object.assign(l.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 600 }); l.shadow.bias = -.0006; l.shadow.radius = 2;
    scene.add(l, l.target); return l;
  });
  const hemi = new THREE.HemisphereLight('#B9C9D6', '#7A5638', .55); scene.add(hemi);

  /* 方阵 */
  const N = NX * NZ, sGeo = soldierGeo(), NEAR = (x, z) => Math.abs(x) < 22 && z > -40;
  const nearIdx = [], farIdx = [];
  const soldiers = new THREE.InstancedMesh(sGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 }), N);   // 远处：简模
  soldiers.receiveShadow = true;
  const fGeo = new THREE.PlaneGeometry(.5, .34, 8, 2).translate(.4 + .25, 2.62, 0);   // 旗子小一点：远处一排排之间留得出缝，不连成一道墙
  const flagMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .7 });
  flagMat.onBeforeCompile = sh => {                                                       // 旗子迎风抖；自发光一点，逆光时白旗还是白的
    sh.uniforms.uTime = { value: 0 }; flagMat.userData.sh = sh;
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb*.42;');
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float fx = max(position.x - .4, 0.); transformed.z += sin(fx*7. - uTime*9. + instanceMatrix[3].x*.7 + instanceMatrix[3].z*.5)*.07*fx;`);
  };
  const flags = new THREE.InstancedMesh(fGeo, flagMat, N); flags.castShadow = true;
  const base = []; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, x0 = (i - (NX - 1) / 2) * SP, x = x0 + Math.sign(x0 || 1) * (Math.abs(x0) < 6 ? 1.6 : 0) + (r() - .5) * .18, z = Z0 + (j - (NZ - 1) / 2) * SP + (r() - .5) * .18;   // 正中留一条御道
    base.push({ x, z, yaw: (r() - .5) * .12, ph: r(), lift: r() });
    m4.compose(v3.set(x, 0, z), q.setFromEuler(e.set(0, base[k].yaw, 0)), one); soldiers.setMatrixAt(k, m4); flags.setMatrixAt(k, m4);
    flags.setColorAt(k, new THREE.Color('#EDEBE6'));
  }
  base.forEach((b, k) => (NEAR(b.x, b.z) ? nearIdx : farIdx).push(k));
  const warriors = new THREE.InstancedMesh(warriorGeo(), tintMat(), nearIdx.length); warriors.castShadow = warriors.receiveShadow = true;
  soldiers.count = farIdx.length;
  const place = (mesh, slot, k, h = 0, rot = null) => { const b = base[k]; m4.compose(v3.set(b.x, h, b.z), q.setFromEuler(rot || e.set(0, b.yaw, 0)), one); mesh.setMatrixAt(slot, m4); };
  farIdx.forEach((k, s) => place(soldiers, s, k)); nearIdx.forEach((k, s) => { place(warriors, s, k); warriors.setColorAt(s, ROBES[Math.floor(base[k].ph * ROBES.length)]); });
  const slotOf = new Int32Array(N); farIdx.forEach((k, s) => { slotOf[k] = s; }); nearIdx.forEach((k, s) => { slotOf[k] = -1 - s; });
  scene.add(soldiers, warriors, flags);

  /* 台子 + 青铜大鼎 + 浑天仪（方阵前面，镜头会从旁边掠过） */
  const props = new THREE.Group(); props.position.set(0, 0, 62); scene.add(props);   // 御道入口前的台子
  const stone = new THREE.MeshStandardMaterial({ color: '#8A7560', roughness: .95 });
  for (let s = 0; s < 3; s++) { const b = new THREE.Mesh(new THREE.BoxGeometry(14 - s * 3.2, .6, 10 - s * 2.4), stone); b.position.y = .3 + s * .6; b.castShadow = b.receiveShadow = true; props.add(b); }
  const bronze = new THREE.MeshStandardMaterial({ color: '#6F5A2C', metalness: .75, roughness: .42 });
  const ding = new THREE.Group();
  { const pts = []; for (let i = 0; i <= 16; i++) { const k = i / 16; pts.push(new THREE.Vector2(1.05 + .25 * Math.sin(k * 2.6) - .2 * k * k, k * 1.4)); } pts.push(new THREE.Vector2(.95, 1.4), new THREE.Vector2(.95, .12), new THREE.Vector2(0, .12));
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), bronze); bowl.position.y = .7; ding.add(bowl);
    for (let k = 0; k < 3; k++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.13, .1, .8, 10), bronze); const a = k * 2.094; leg.position.set(Math.cos(a) * .7, .4, Math.sin(a) * .7); ding.add(leg); }
    for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.TorusGeometry(.32, .07, 8, 20, Math.PI), bronze); ear.position.set(sx * .78, 2.1, 0); ear.rotation.y = Math.PI / 2; ding.add(ear); }
    ding.traverse(o => { o.castShadow = true; }); ding.position.set(-3.6, 1.8, 0); props.add(ding); }
  const armil = new THREE.Group();
  { for (let k = 0; k < 3; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, .05, 8, 64), bronze); ring.rotation.set(k === 0 ? Math.PI / 2 : 0, k * .9, k === 2 ? .7 : 0); armil.add(ring); }
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 1.4, 8), bronze); post.position.y = -1.3; armil.add(post); armil.position.set(3.6, 3.3, 0); armil.traverse(o => { o.castShadow = true; }); props.add(armil); }
  /* 碎石 */
  const rockGeo = new THREE.IcosahedronGeometry(1, 1); { const p = rockGeo.attributes.position; for (let i = 0; i < p.count; i++) { const s = .75 + .5 * hash3(p.getX(i) * 3, p.getY(i) * 3, p.getZ(i) * 3); p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * .7, p.getZ(i) * s); } rockGeo.computeVertexNormals(); }
  const NR = 260, rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: '#7E6248', roughness: .95 }), NR); rocks.castShadow = true;
  const rockBase = []; for (let k = 0; k < NR; k++) { const a = r() * 6.2832, d = 6 + 120 * Math.pow(r(), .7); rockBase.push({ x: Math.cos(a) * d, z: 40 + Math.sin(a) * d * .8, s: .2 + 1.1 * Math.pow(r(), 3), rx: r() * 6, ry: r() * 6, lift: r() }); }
  scene.add(rocks);

  /* ---------- 每帧 ----------
   * s: { t, sunDir:[3][x,y,z], glare, dark, fog, stars, starsPos:[x,y,z], float (0..1 三日连珠的升起), camPos } */
  const col = new THREE.Color(), WHITE = new THREE.Color('#FAF8F2'), BLACK = new THREE.Color('#121010');
  function update(s) {
    const u = sky.material.uniforms; s.sunDir.forEach((d, i) => { u.uSun.value[i].set(...d); suns[i].position.set(d[0] * 300, d[1] * 300, d[2] * 300).add(new THREE.Vector3(0, 0, 20)); suns[i].target.position.set(0, 0, 20); suns[i].intensity = [1.5, 1.1, .8][i] * (1 - s.dark) * (1 + s.glare * .8); });
    u.uDark.value = s.dark; u.uGlare.value = s.glare; hemi.intensity = .55 * (1 - s.dark);
    scene.fog.density = s.fog; starsM.uniforms.uA.value = s.stars; starsM.uniforms.uTime.value = s.t; starsM.userData.points.position.set(...s.starsPos);
    if (flagMat.userData.sh) flagMat.userData.sh.uniforms.uTime.value = s.t;
    /* 旗：3×3 一块，一波一波斜着翻（黑 / 白），翻的那一下旗子绕杆转半圈 */
    const fl = s.float, t = s.t;
    for (let j = 0, k = 0; j < NZ; j++) for (let i = 0; i < NX; i++, k++) {
      const b = base[k], p = t * 2.2 - (i * .045 + j * .07), c = Math.floor(p), f = p - c;
      const bit = hash3(i / 3 | 0, j / 3 | 0, c) > .5, prev = hash3(i / 3 | 0, j / 3 | 0, c - 1) > .5, flipping = bit !== prev ? sstep(0, .22, f) : 1;
      flags.setColorAt(k, (flipping > .5 ? bit : prev) ? WHITE : BLACK);
      /* 三日连珠：离镜头近的先飘起来，边升边翻滚 */
      const lt = Math.max(0, fl * 1.6 - b.lift * .6 - Math.hypot(b.x - s.camPos[0], b.z - s.camPos[2]) * .004), h = lt * lt * 26;
      e.set(lt * (b.ph - .5) * 3, b.yaw + lt * b.ph * 4, lt * (b.lift - .5) * 3);
      m4.compose(v3.set(b.x, h, b.z), q.setFromEuler(e), one);
      if (fl > 0) { const sl = slotOf[k]; if (sl >= 0) soldiers.setMatrixAt(sl, m4); else warriors.setMatrixAt(-1 - sl, m4); }
      e.y += (bit !== prev ? (1 - flipping) * Math.PI : 0); m4.compose(v3.set(b.x, h, b.z), q.setFromEuler(e), one); flags.setMatrixAt(k, m4);
    }
    if (fl > 0) { soldiers.instanceMatrix.needsUpdate = true; warriors.instanceMatrix.needsUpdate = true; }
    flags.instanceMatrix.needsUpdate = true; flags.instanceColor.needsUpdate = true;
    rockBase.forEach((b, k) => { const lt = Math.max(0, fl * 1.5 - b.lift * .5), h = b.s * .3 + lt * lt * 30; m4.compose(v3.set(b.x, h, b.z), q.setFromEuler(e.set(b.rx + lt * 2, b.ry + lt * 3, 0)), new THREE.Vector3(b.s, b.s, b.s)); rocks.setMatrixAt(k, m4); });
    rocks.instanceMatrix.needsUpdate = true;
    const ld = Math.max(0, fl * 1.4 - .2); ding.position.y = 1.8 + ld * ld * 16; ding.rotation.set(ld * .6, ld * 1.2, ld * .3); armil.position.y = 3.3 + ld * ld * 20; armil.rotation.set(ld * 2, ld * 1.5, 0);
  }
  return { scene, camera, update };
}
