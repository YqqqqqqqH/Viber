/* hall.js — 理查森 1922 年书里设想的"预报工厂"：一座球形大厅，墙上画满世界地图（北极在穹顶，南极在池座），
 * 一圈圈楼座上坐着 6.4 万个"计算员"，各算自己座位所在那一块地图的天气；池座中央立柱顶上是讲台，指挥用玫瑰色的光
 * 照算快了的区域、蓝色的光照落后的区域。其中一张桌子（欧洲那一格）做成细模：台灯、计算表、铅笔、计算尺、一只气压计。
 * buildHall(map) → { scene, camera, update(s), HR, hallDir, hero, needleTips() }
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { W, H, GOLD, canvas2d, radialTex, gridMat, fract } from './lib.js';

export const HR = 40;
const D2R = Math.PI / 180;
/* 大厅内壁上（纬度，经度）那一点的方向：贴图左右翻过（从里面看才是正的），所以 u = 1 − 经度比例 */
export const hallDir = (lat, lon) => { const u = 1 - (lon + 180) / 360, p = lat * D2R; return [-Math.cos(2 * Math.PI * u) * Math.cos(p), Math.sin(p), Math.sin(2 * Math.PI * u) * Math.cos(p)]; };
const RINGS = []; for (let la = -65; la <= 65; la += 10) RINGS.push(la);      // 楼座在 ±5°、±15°… 上，躲开要钻进来的那一格（北纬 41.4–43.2°）
const ROWS = 4, ROW0 = .3, ROWD = .35, NDESK = 64000;
export const HERO = { lat: 45, lon: 10 };                                         // 欧洲那一格：理查森自己那张桌子
const hash = (a, b, c) => fract(Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453);

/* 计算表：一张米色的表格纸，手写的数 */
function formTexture(rng) {
  const cw = 1024, ch = 768, [c, g] = canvas2d(cw, ch), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  const draw = () => {
    g.fillStyle = '#EFE6CF'; g.fillRect(0, 0, cw, ch);
    g.fillStyle = '#4A3B2A'; g.font = '700 30px "VK Type"'; g.textBaseline = 'middle'; g.fillText('COMPUTING FORM  —  PRESSURE', 40, 44);
    g.font = '400 24px "VK Type"'; g.fillText('20 MAY 1910   07h → 13h', 640, 44);
    g.strokeStyle = 'rgba(80,60,40,.6)'; g.lineWidth = 2;
    for (let r = 0; r <= 12; r++) { g.beginPath(); g.moveTo(40, 90 + r * 54); g.lineTo(cw - 40, 90 + r * 54); g.stroke(); }
    for (let k = 0; k <= 7; k++) { g.beginPath(); g.moveTo(40 + k * 135, 90); g.lineTo(40 + k * 135, 90 + 12 * 54); g.stroke(); }
    g.fillStyle = '#2B3A66'; g.font = 'italic 500 30px "VK Latin"'; g.textAlign = 'right';
    for (let r = 0; r < 12; r++) for (let k = 0; k < 7; k++) if (rng() < .85) g.fillText((rng() * 2000 - 1000).toFixed(1), 40 + (k + 1) * 135 - 14, 90 + r * 54 + 30);
    g.textAlign = 'left'; t.needsUpdate = true;
  };
  return { t, draw };
}
/* 气压计的表盘：960–1060 百帕，270° */
export const BARO = { v0: 960, v1: 1060, a0: -135, a1: 135 };
export const baroAngle = v => (BARO.a0 + (BARO.a1 - BARO.a0) * (v - BARO.v0) / (BARO.v1 - BARO.v0)) * D2R;   // 从 12 点钟方向顺时针
function dialTexture() {
  const n = 1024, [c, g] = canvas2d(n, n), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  const draw = () => {
    const cx = n / 2, R = n * .47;
    const gr = g.createRadialGradient(cx, cx * .9, 0, cx, cx, R); gr.addColorStop(0, '#FBF6EA'); gr.addColorStop(1, '#E6DCC6'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, R, 0, 6.2832); g.fill();
    g.strokeStyle = '#3A2E22'; g.lineCap = 'round';
    for (let v = BARO.v0; v <= BARO.v1; v += 2) {
      const a = baroAngle(v) - Math.PI / 2, major = v % 10 === 0, r1 = R * .9, r0 = R * (major ? .78 : .84);
      g.lineWidth = major ? 6 : 2.5; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cx + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cx + Math.sin(a) * r1); g.stroke();
      if (v % 20 === 0) { g.fillStyle = '#2A2118'; g.font = '600 52px "VK Latin"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(v), cx + Math.cos(a) * R * .64, cx + Math.sin(a) * R * .64); }
    }
    g.fillStyle = '#4A3B2A'; g.font = '500 40px "VK Sans"'; g.textAlign = 'center'; g.fillText('百帕  hPa', cx, cx + R * .42);
    g.font = 'italic 400 34px "VK Latin"'; g.fillText('Barometer', cx, cx - R * .34);
    /* 两头的止针 */
    for (const v of [BARO.v0 - 4, BARO.v1 + 4]) { const a = baroAngle(v) - Math.PI / 2; g.fillStyle = '#6B5A3C'; g.beginPath(); g.arc(cx + Math.cos(a) * R * .87, cx + Math.sin(a) * R * .87, 10, 0, 6.2832); g.fill(); }
    t.needsUpdate = true;
  };
  return { t, draw };
}

export function buildHall(map, rough) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#000000');
  const camera = new THREE.PerspectiveCamera(30, W / H, .0005, 300);
  const UPX = H / (2 * Math.tan(15 * D2R));

  /* 墙：世界地图贴在球的内壁上（左右翻过来）；网格是同一个着色器 */
  const flipT = t0 => { const t = t0.clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; t.needsUpdate = true; return t; };
  /* 墙的材质和地球的地表一模一样（同一张图、同一张粗糙度图），再用一盏和"太阳"同角度的平行光照它：切点那一帧两边是同一幅画 */
  const wall = new THREE.Mesh(new THREE.SphereGeometry(HR, 256, 128), new THREE.MeshStandardMaterial({ map: flipT(map), roughnessMap: flipT(rough), roughness: 1, metalness: 0, side: THREE.BackSide })); scene.add(wall);
  /* 墙是凹的、地球是凸的：同一个屏幕位置，两边的法线往相反方向歪，太阳在海面上的反光就落在不同地方。
     切点附近把墙的法线绕"那一格的法线"镜像一下（uMirK），墙就按凸面受光，反光和地球落在同一处 */
  /* 光镜像法线还不够：凹面边上离镜头近、凸面边上离镜头远，画面边上的格线差 0.5%。所以切点附近再把墙绕那一格的轴往外推成凸面（uBulge，k 和法线镜像一起走） */
  const mirU = { uMirAxis: { value: new THREE.Vector3(0, 0, 1) }, uMirK: { value: 0 }, uBulge: { value: new THREE.Vector4(0, 0, 1, 0) } };
  wall.material.onBeforeCompile = sh => { Object.assign(sh.uniforms, mirU);
    sh.vertexShader = 'uniform vec4 uBulge;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n if (uBulge.w > 0.) transformed += uBulge.xyz*uBulge.w*' + (2 * HR).toFixed(1) + '*(1. - dot(normalize(position), uBulge.xyz));');
    sh.fragmentShader = 'uniform vec3 uMirAxis; uniform float uMirK;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>',
      '#include <normal_fragment_maps>\n if (uMirK > 0.) normal = normalize(mix(normal, 2.*dot(normal, uMirAxis)*uMirAxis - normal, uMirK));'); };
  const sun = new THREE.DirectionalLight('#FFF4E2', 0); scene.add(sun, sun.target);
  scene.add(new THREE.AmbientLight('#1A2333', .03));                                       // 和太空场景里那盏一样
  const grid = new THREE.Mesh(new THREE.SphereGeometry(HR * .998, 256, 128), gridMat({ flip: true, side: THREE.BackSide })); scene.add(grid);

  /* 楼座：木地板、前沿、铜栏杆 */
  const wood = new THREE.MeshStandardMaterial({ color: '#3B2A1E', roughness: .75 }), fasc = new THREE.MeshStandardMaterial({ color: '#25190F', roughness: .6 }), brass = new THREE.MeshStandardMaterial({ color: '#B08A4A', metalness: .8, roughness: .35 });
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFB86A').multiplyScalar(.35), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const la of RINGS) {
    const y = HR * Math.sin(la * D2R), rw = HR * Math.cos(la * D2R), ri = rw - 1.65;
    const floor = new THREE.Mesh(new THREE.RingGeometry(ri, rw + .1, 256, 1), wood); floor.rotation.x = -Math.PI / 2; floor.position.y = y; scene.add(floor);
    const front = new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, .3, 256, 1, true), fasc); front.position.y = y - .15; scene.add(front);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(ri + .02, .022, 6, 256), brass); rail.rotation.x = Math.PI / 2; rail.position.y = y + .42; scene.add(rail);
    /* 楼座底下一圈暖光（台灯从下面看过去连成的光带） */
    const glowStrip = new THREE.Mesh(new THREE.CylinderGeometry(ri - .02, ri - .25, .5, 256, 1, true), stripMat); glowStrip.position.y = y - .32; scene.add(glowStrip);   // 挂在楼座前沿下面：镜头钻进桌子时不会穿过它
  }
  /* 桌子和台灯：一共 6.4 万张，按每一圈的周长平分 */
  let total = 0; for (const la of RINGS) for (let r = 0; r < ROWS; r++) total += 2 * Math.PI * (HR * Math.cos(la * D2R) - ROW0 - r * ROWD);
  const sp = total / NDESK;
  const leg = (x, z) => new THREE.BoxGeometry(sp * .035, sp * .5, sp * .035).translate(x, sp * .25, z);   // 桌面 + 四条腿：一张张书桌，不是箱子
  const deskGeo = mergeGeometries([new THREE.BoxGeometry(sp * .7, sp * .05, sp * .42).translate(0, sp * .5, 0), leg(-sp * .32, -sp * .18), leg(sp * .32, -sp * .18), leg(-sp * .32, sp * .18), leg(sp * .32, sp * .18)]);
  const slots = [];
  RINGS.forEach((la, ri) => { for (let r = 0; r < ROWS; r++) { const rr = HR * Math.cos(la * D2R) - ROW0 - r * ROWD, n = Math.round(2 * Math.PI * rr / sp); for (let k = 0; k < n; k++) slots.push({ la, ri, r, rr, lon: (k + .5) / n * 360 - 180, y: HR * Math.sin(la * D2R) }); } });
  const heroIdx = (() => { let best = -1, bd = 1e9; slots.forEach((s, i) => { if (s.la !== HERO.lat || s.r !== ROWS - 1) return; const d = Math.abs(s.lon - HERO.lon); if (d < bd) { bd = d; best = i; } }); return best; })();
  const desks = new THREE.InstancedMesh(deskGeo, new THREE.MeshStandardMaterial({ color: '#4A3526', roughness: .7 }), slots.length);
  const lampPos = new Float32Array(slots.length * 3), lampSeed = new Float32Array(slots.length * 3);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
  const slotFrame = s => { const d = hallDir(0, s.lon), pos = new THREE.Vector3(d[0] * s.rr, s.y, d[2] * s.rr), yaw = Math.atan2(-d[0], -d[2]); return { pos, yaw }; };   // 桌子正面朝着大厅中心
  slots.forEach((s, i) => {
    const { pos, yaw } = slotFrame(s); q.setFromAxisAngle(Y, yaw); m4.compose(pos, q, i === heroIdx ? new THREE.Vector3(0, 0, 0) : one); desks.setMatrixAt(i, m4);
    v.set(-sp * .25, sp * .78, -sp * .1).applyQuaternion(q).add(pos); lampPos.set([v.x, v.y, v.z], i * 3);
    lampSeed.set([i === heroIdx ? -1 : hash(i, 1, 2), s.ri, (s.lon + 180) / 360], i * 3);
  });
  scene.add(desks);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lampPos, 3)); lg.setAttribute('seed', new THREE.BufferAttribute(lampSeed, 3));
  const lampMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFlick: { value: 0 }, uA: { value: 0 }, uPx: { value: UPX }, uSize: { value: sp * 1.1 } },
    vertexShader: `attribute vec3 seed; uniform float uTime, uFlick, uPx, uSize; varying float vB;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); float z = -mv.z;
        float p = uTime*2.2 - (seed.z*36. + seed.y*.9), c = floor(p);                          // 一波一波斜着翻，像人列计算机的旗
        float bit = step(.45, h3(vec3(floor(seed.z*360.), seed.y, c))), prev = step(.45, h3(vec3(floor(seed.z*360.), seed.y, c - 1.)));
        float on = mix(prev, bit, smoothstep(0., .15, fract(p)));
        vB = seed.x < 0. ? 0. : mix(1., .08 + .92*on, uFlick)*(.75 + .25*seed.x);
        gl_PointSize = clamp(uSize*uPx/max(z, .01), 2.2, 26.); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vB; uniform float uA; void main(){ float r = length(gl_PointCoord - .5)*2.; if (vB <= 0.) discard; float a = smoothstep(1., .2, r);
      gl_FragColor = vec4(vec3(1., .78, .45)*a*vB*uA*2.2, 1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const lamps = new THREE.Points(lg, lampMat); lamps.frustumCulled = false; scene.add(lamps);

  /* 立柱、讲台、指挥、两束光 */
  const stone = new THREE.MeshStandardMaterial({ color: '#6A5E52', roughness: .9 });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.5, HR, 40), stone); pillar.position.y = -HR / 2; scene.add(pillar);
  const pulpit = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.0, 1.3, 48), new THREE.MeshStandardMaterial({ color: '#4A3526', roughness: .6 })); pulpit.position.y = .65; scene.add(pulpit);
  const prail = new THREE.Mesh(new THREE.TorusGeometry(2.4, .06, 8, 64), brass); prail.rotation.x = Math.PI / 2; prail.position.y = 1.32; scene.add(prail);
  const coat = new THREE.MeshStandardMaterial({ color: '#1E1A18', roughness: .8 }), skin = new THREE.MeshStandardMaterial({ color: '#B8907A', roughness: .7 });
  const man = new THREE.Group(); man.position.set(0, 1.3, 0); scene.add(man);
  man.add(new THREE.Mesh(new THREE.CylinderGeometry(.28, .42, 1.3, 16).translate(0, .65, 0), coat), new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 12).translate(0, 1.5, 0), skin));
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .8, 8).translate(0, .4, 0), coat); arm.position.set(.25, 1.15, 0); arm.rotation.z = -.9; man.add(arm);
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE2C0').multiplyScalar(3) })); lantern.position.set(.86, 1.6, 0); man.add(lantern);
  const beamGeo = new THREE.ConeGeometry(1, 1, 48, 1, true).translate(0, -.5, 0).rotateX(Math.PI);   // 尖在原点，往 +y 张开
  const beamMat = col => new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(col) }, uA: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uA; varying vec2 vUv; void main(){ float a = pow(1. - vUv.y, .6)*.22*uA; gl_FragColor = vec4(uColor*a, 1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beams = ['#FF9AAE', '#86B4FF'].map(c => { const m = new THREE.Mesh(beamGeo, beamMat(c)); m.frustumCulled = false; scene.add(m); return m; });
  const spots = ['#FF9AAE', '#86B4FF'].map(c => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ map: radialTex([[0, .9], [.5, .4], [1, 0]]), color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(m); return m; });

  /* 光：昏暗的环境光；理查森那张桌子上的台灯 */
  const amb = new THREE.AmbientLight('#6A5A4C', 1.1); scene.add(amb);
  const pulpitL = new THREE.PointLight('#FFD6A8', 0, 30, 1.2); pulpitL.position.set(0, 7, 0); scene.add(pulpitL);   // 讲台上方一盏灯：照出立柱、讲台和指挥   // 大厅自己的灯：切点时为 0，之后亮起来
  const hemi = new THREE.HemisphereLight('#8E8070', '#2A2018', .5); scene.add(hemi);

  /* ---------- 理查森的桌子（细模，尺寸按 sp） ---------- */
  const hs = slots[heroIdx], hf = slotFrame(hs), hero = new THREE.Group(); hero.position.copy(hf.pos); hero.rotation.y = hf.yaw; scene.add(hero);
  const heroDesk = new THREE.Mesh(deskGeo, new THREE.MeshStandardMaterial({ color: '#5A3E28', roughness: .55 })); hero.add(heroDesk);
  const top = sp * .525;
  const lampL = new THREE.PointLight('#FFD39A', 0, sp * 6, 2); lampL.position.set(-sp * .22, sp * .78, -sp * .05); hero.add(lampL);
  { const g = new THREE.Group(); g.position.set(-sp * .25, top, -sp * .1); hero.add(g);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(sp * .05, sp * .06, sp * .02, 24).translate(0, sp * .01, 0), brass), new THREE.Mesh(new THREE.CylinderGeometry(sp * .008, sp * .008, sp * .2, 8).translate(0, sp * .11, 0), brass));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(sp * .07, sp * .07, sp * .16, 24, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1E5A3A', roughness: .3, side: THREE.DoubleSide, emissive: '#0A2A1A' }));
    shade.position.set(0, sp * .23, sp * .03); g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(sp * .025, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE6B0').multiplyScalar(2.5) })); bulb.position.set(0, sp * .2, sp * .03); g.add(bulb); }
  /* 计算表：一摞纸，越摞越高；最上面一张是表格 */
  const form = formTexture(TB.rng(1910)), stackMat = new THREE.MeshStandardMaterial({ color: '#E8DEC4', roughness: .9 });
  const stack = new THREE.Mesh(new THREE.BoxGeometry(sp * .3, 1, sp * .22), stackMat); hero.add(stack);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(sp * .3, sp * .225), new THREE.MeshStandardMaterial({ map: form.t, roughness: .9 })); sheet.rotation.x = -Math.PI / 2; hero.add(sheet);
  const sx = sp * .02, sz = sp * .05;
  { const pencil = new THREE.Mesh(new THREE.CylinderGeometry(sp * .004, sp * .004, sp * .17, 6), new THREE.MeshStandardMaterial({ color: '#D9A520', roughness: .5 })); pencil.rotation.set(0, .4, Math.PI / 2); pencil.position.set(sp * .02, top + sp * .006, sp * .14); hero.add(pencil);
    const rule = new THREE.Mesh(new THREE.BoxGeometry(sp * .42, sp * .008, sp * .035), new THREE.MeshStandardMaterial({ color: '#E8E2D2', roughness: .5 })); rule.position.set(-sp * .02, top + sp * .004, sp * .17); rule.rotation.y = -.08; hero.add(rule); }
  /* 气压计：立在桌子右后方，表盘朝着大厅中心 */
  const RB = sp * .1, baro = new THREE.Group(); baro.position.set(sp * .22, top + RB * 1.08, -sp * .05); baro.rotation.x = -.18; hero.add(baro);
  const dial = dialTexture();
  baro.add(new THREE.Mesh(new THREE.CylinderGeometry(RB, RB, RB * .32, 64).rotateX(Math.PI / 2), brass));
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(RB * .97, RB * .07, 12, 64), brass); bezel.position.z = RB * .16; baro.add(bezel);
  const face = new THREE.Mesh(new THREE.CircleGeometry(RB * .92, 64), new THREE.MeshStandardMaterial({ map: dial.t, roughness: .6 })); face.position.z = RB * .161; baro.add(face);
  const needle = (len, w, col, back) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, len + back, RB * .006).translate(0, (len - back) / 2, 0), new THREE.MeshStandardMaterial({ color: col, roughness: .4, metalness: .3 })); g.add(m); g.position.z = RB * .17; baro.add(g); return g; };
  const nCalc = needle(RB * .8, RB * .035, '#C8281E', RB * .2), nReal = needle(RB * .68, RB * .05, '#D8B256', RB * .12); nReal.position.z = RB * .165;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(RB * .06, RB * .06, RB * .02, 16).rotateX(Math.PI / 2), brass); cap.position.z = RB * .18; baro.add(cap);
  baro.add(new THREE.Mesh(new THREE.BoxGeometry(RB * .5, RB * .12, RB * .3).translate(0, -RB * 1.02, 0), brass));
  let drawn = false;

  /* s: { t, sunK, sunDir, aim(太阳照的那一点), room, gridA, cell:[latMin,latMax,lonMin,lonMax], cellA, lampA, flick, beamA, heroLamp, pages(0..1), calc(hPa), real(hPa) } */
  const Yv = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  function update(s) {
    if (!drawn) { form.draw(); dial.draw(); drawn = true; }
    sun.intensity = 3.2 * s.sunK; sun.target.position.set(...s.aim); sun.position.set(s.aim[0] + s.sunDir[0] * 10, s.aim[1] + s.sunDir[1] * 10, s.aim[2] + s.sunDir[2] * 10);
    grid.scale.setScalar((HR - (s.gridLift == null ? HR * .002 : s.gridLift)) / (HR * .998));   // 镜头贴着墙时网格也贴着墙画（同一套网格划分，面互相平行）
    const bk = s.mirror ? s.mirror.k : 0, ba = s.mirror ? s.mirror.out : [0, 0, 1]; mirU.uBulge.value.set(...ba, bk); grid.material.uniforms.uBulge.value.set(...ba, bk); grid.material.uniforms.uBulgeR.value = HR * .998;
    mirU.uMirK.value = s.mirror ? s.mirror.k : 0; if (s.mirror) mirU.uMirAxis.value.set(...s.mirror.axis).transformDirection(camera.matrixWorldInverse);   // 轴换到相机空间（法线在相机空间里）
    const gu = grid.material.uniforms; gu.uA.value = s.gridA; gu.uReveal.value = 4; gu.uCell.value.set(...s.cell); gu.uCellA.value = s.cellA; grid.visible = s.gridA > .001;
    lampMat.uniforms.uTime.value = s.t; lampMat.uniforms.uFlick.value = s.flick; lampMat.uniforms.uA.value = s.lampA;
    amb.intensity = 1.1 * s.room; hemi.intensity = .6 * s.room; pulpitL.intensity = 60 * s.room; stripMat.opacity = s.lampA;
    /* 两束光：从指挥手里的灯，扫向墙上两块区域 */
    lantern.updateWorldMatrix(true, false); const src = lantern.getWorldPosition(new THREE.Vector3());
    [[25 + 12 * Math.sin(s.t * .35), -30 + 50 * Math.sin(s.t * .22)], [-10 + 15 * Math.sin(s.t * .3 + 2), 60 + 40 * Math.sin(s.t * .18 + 1)]].forEach(([la, lo], j) => {
      const d = hallDir(la, lo), tgt = new THREE.Vector3(d[0] * HR * .99, d[1] * HR * .99, d[2] * HR * .99), dir = tgt.clone().sub(src), L = dir.length();
      const b = beams[j]; b.position.copy(src); b.quaternion.setFromUnitVectors(Yv, dir.clone().normalize()); b.scale.set(L * .07, L, L * .07); b.material.uniforms.uA.value = s.beamA; b.visible = s.beamA > .001;
      const sp2 = spots[j]; sp2.position.copy(tgt.clone().multiplyScalar(.995)); sp2.lookAt(0, 0, 0); sp2.scale.setScalar(L * .07 * 1.1); sp2.material.opacity = s.beamA * .8; sp2.visible = b.visible;
    });
    lampL.intensity = s.heroLamp * .0016;   // 桌子只有 0.13 宽，灯离桌面约 0.03：强度要很小
    const h = sp * (.008 + .045 * s.pages); stack.scale.y = h; stack.position.set(-sx, top + h / 2, sz); sheet.position.set(-sx, top + h + .0002, sz);
    nCalc.rotation.z = -baroAngle(s.calc); nReal.rotation.z = -baroAngle(s.real);
  }
  /* 两根指针针尖的世界坐标（给叠层的标注用） */
  function needleTips() {
    const out = []; for (const [n, len] of [[nCalc, RB * .8], [nReal, RB * .68]]) { n.updateWorldMatrix(true, false); out.push(new THREE.Vector3(0, len, 0).applyMatrix4(n.matrixWorld).toArray()); } return out;
  }
  const heroWorld = (x, y, z) => { hero.updateWorldMatrix(true, false); return new THREE.Vector3(x, y, z).applyMatrix4(hero.matrixWorld).toArray(); };
  const baroWorld = () => { baro.updateWorldMatrix(true, false); const c = new THREE.Vector3(0, 0, RB * .17).applyMatrix4(baro.matrixWorld), n = new THREE.Vector3(0, 0, 1).transformDirection(baro.matrixWorld); return { c: c.toArray(), n: n.toArray(), r: RB }; };
  return { scene, camera, update, needleTips, heroWorld, baroWorld, sp, heroYaw: hf.yaw, heroPos: hf.pos.toArray(), top };
}
