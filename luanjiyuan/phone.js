/* phone.js — 夜里书桌上一部横放的 iPhone 17 Pro（宇宙橙铝合金边框、黑色玻璃、灵动岛），屏幕上是"15 日天气"。
 * 三张浮在屏幕上方的玻璃卡片数"10 次对几次"；第 10–15 天的图标变成 3D 硬币弹起、翻转（一面太阳，一面雨）。
 * 第 15 枚硬币不落下：越升越高、转正对着镜头、鼓成一颗球、表面沸腾成太阳；房间暗下去，星空亮起来。
 * buildPhone(r, renderer) → { scene, camera, update(s), cellWorld(i, y), coinWorld(), ... }
 */
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { W, H, GOLD, SUN_COL, fbm, sstep, canvas2d, radialTex, starfield, GLSL_NOISE } from './lib.js';

/* 15 天（明天 10 月 13 日起）：图标、最高、最低。第 15 天是晴。 */
export const DAYS = (() => {
  const icons = ['sun', 'sun', 'part', 'cloud', 'rain', 'rain', 'cloud', 'sun', 'sun', 'part', 'rain', 'cloud', 'part', 'sun', 'sun'];
  const hi = [22, 23, 21, 19, 16, 15, 17, 19, 20, 18, 17, 16, 18, 19, 20], lo = [11, 12, 11, 10, 9, 8, 8, 9, 10, 9, 8, 7, 8, 9, 10];
  const wk = ['二', '三', '四', '五', '六', '日', '一'];
  return icons.map((ic, i) => ({ icon: ic, hi: hi[i], lo: lo[i], date: `10/${13 + i}`, wd: i === 0 ? '明天' : '周' + wk[i % 7] }));
})();

/* iPhone 17 Pro：150 × 71.9 × 8.75 mm，横放。1 mm = MM 个单位 */
const MM = 1.6 / 150;
const PW = 150 * MM, PD = 71.9 * MM, PT = 8.75 * MM, PR = 10.5 * MM;          // 机身：长（x）、宽（z）、厚（y）、圆角
const BEZ = 1.6 * MM, SW = PW - 2 * BEZ - 2 * MM, SD = PD - 2 * BEZ - 2 * MM, SR = 8.6 * MM;   // 屏幕（显示区）
const TOP = PT, SY = TOP + .0012;
const UIW = 2048, UIH = Math.round(UIW * SD / SW);
const SAFE_L = 190, SAFE_R = 84, COLW = (UIW - SAFE_L - SAFE_R) / 15;           // 左边留出灵动岛
export const COIN_R = .04;

/* ---------- 形状工具 ---------- */
function rrShape(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
/* 平铺在 xz 面上的圆角矩形，uv 按外接框 0..1 */
function rrPlane(w, h, r, seg = 24) {
  const g = new THREE.ShapeGeometry(rrShape(w, h, r), seg), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
  g.rotateX(-Math.PI / 2); return g;
}
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

/* ---------- 天气图标（2D） ---------- */
function drawSun(g, x, y, s, a = 1) {
  g.save(); g.globalAlpha *= a; g.translate(x, y);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * .62); gr.addColorStop(0, '#FFF6C8'); gr.addColorStop(.55, '#FFD45E'); gr.addColorStop(1, 'rgba(255,190,60,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * .62, 0, 6.2832); g.fill();
  g.fillStyle = '#FFCB45'; g.beginPath(); g.arc(0, 0, s * .27, 0, 6.2832); g.fill();
  g.strokeStyle = '#FFCB45'; g.lineWidth = s * .07; g.lineCap = 'round';
  for (let k = 0; k < 8; k++) { const an = k * .7854; g.beginPath(); g.moveTo(Math.cos(an) * s * .38, Math.sin(an) * s * .38); g.lineTo(Math.cos(an) * s * .5, Math.sin(an) * s * .5); g.stroke(); }
  g.restore();
}
function cloudPath(g, x, y, s) {
  g.beginPath(); g.moveTo(x - s * .42, y + s * .18);
  g.arc(x - s * .2, y + s * .02, s * .2, Math.PI * .75, Math.PI * 1.6); g.arc(x + s * .05, y - s * .08, s * .26, Math.PI * 1.15, Math.PI * 1.95);
  g.arc(x + s * .3, y + s * .06, s * .17, Math.PI * 1.5, Math.PI * .45); g.closePath();
}
function drawCloud(g, x, y, s, col = '#C9D4E3', a = 1) { g.save(); g.globalAlpha *= a; cloudPath(g, x, y, s); g.fillStyle = col; g.fill(); g.restore(); }
function drawRain(g, x, y, s, a = 1, cloud = '#9FB0C6', drop = '#6FB6FF') {
  drawCloud(g, x, y - s * .1, s, cloud, a);
  g.save(); g.globalAlpha *= a; g.strokeStyle = drop; g.lineWidth = s * .065; g.lineCap = 'round';
  for (let k = 0; k < 3; k++) { const dx = (k - 1) * s * .2; g.beginPath(); g.moveTo(x + dx, y + s * .2); g.lineTo(x + dx - s * .07, y + s * .38); g.stroke(); }
  g.restore();
}
function drawFan(g, x, y, s, a = 1) {
  g.save(); g.globalAlpha *= a; g.translate(x - s * .32, y + s * .22); g.lineCap = 'round';
  for (let k = 0; k < 7; k++) { const an = -.95 + k * .16, L = s * (.62 + .08 * Math.sin(k * 2.1)); g.strokeStyle = k === 3 ? '#F8D893' : 'rgba(150,215,240,.85)'; g.lineWidth = k === 3 ? s * .06 : s * .035;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * .5 * Math.cos(an + .25), L * .5 * Math.sin(an + .25), L * Math.cos(an), L * Math.sin(an)); g.stroke(); }
  g.fillStyle = '#F2F5FA'; g.beginPath(); g.arc(0, 0, s * .08, 0, 6.2832); g.fill(); g.restore();
}
function drawIcon(g, kind, x, y, s, a = 1) {
  if (kind === 'sun') drawSun(g, x, y, s, a);
  else if (kind === 'part') { drawSun(g, x + s * .14, y - s * .14, s * .82, a); drawCloud(g, x - s * .06, y + s * .08, s * .9, '#D7E0EC', a); }
  else if (kind === 'cloud') drawCloud(g, x, y, s, '#B9C5D6', a);
  else drawRain(g, x, y, s, a);
}

/* ---------- 硬币的两面 ----------
 * 圆柱盖子的贴图在 three 里是转了 90° 贴上去的（u 沿 z，v 沿 x）：顶面要逆时针转 90° 画，底面翻过来以后要顺时针转 90° 画，
 * 镜头从手机下沿看过去时图案才是正的。太阳面：金底 + 暖黄珐琅；雨面：金底 + 深蓝珐琅。 */
function coinFace(kind, rot) {
  const n = 512, [c, g] = canvas2d(n, n), [ce, ge] = canvas2d(n, n);
  const gr = g.createRadialGradient(n * .4, n * .35, n * .05, n / 2, n / 2, n / 2);
  gr.addColorStop(0, '#FFE9A8'); gr.addColorStop(.6, '#D9A441'); gr.addColorStop(.92, '#9C6B1E'); gr.addColorStop(1, '#6E4813');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  g.strokeStyle = 'rgba(90,55,10,.7)'; g.lineWidth = 12; g.beginPath(); g.arc(n / 2, n / 2, n * .45, 0, 6.2832); g.stroke();
  /* 珐琅底 */
  const en = g.createRadialGradient(n / 2, n * .45, 0, n / 2, n / 2, n * .38);
  if (kind === 'sun') { en.addColorStop(0, '#FFB347'); en.addColorStop(1, '#C8641C'); } else { en.addColorStop(0, '#2E5FA8'); en.addColorStop(1, '#15294F'); }
  g.fillStyle = en; g.beginPath(); g.arc(n / 2, n / 2, n * .38, 0, 6.2832); g.fill();
  g.strokeStyle = 'rgba(255,236,190,.55)'; g.lineWidth = 5; g.stroke();
  g.save(); g.translate(n / 2, n / 2); g.rotate(rot); g.translate(-n / 2, -n / 2);
  if (kind === 'sun') drawSun(g, n / 2, n / 2, n * .58); else drawRain(g, n / 2, n / 2 + n * .02, n * .62, 1, '#F2F5FA', '#9FD3FF');
  g.restore();
  ge.fillStyle = '#000'; ge.fillRect(0, 0, n, n); if (kind === 'sun') { ge.save(); ge.translate(n / 2, n / 2); ge.rotate(rot); ge.translate(-n / 2, -n / 2); drawSun(ge, n / 2, n / 2, n * .58); ge.restore(); }
  const t = new THREE.CanvasTexture(c), te = new THREE.CanvasTexture(ce); t.colorSpace = te.colorSpace = THREE.SRGBColorSpace; t.anisotropy = te.anisotropy = 8;
  return { map: t, emissive: te, canvas: c };
}

/* ---------- 浮在屏幕上方的玻璃卡片："第 N 天 · 10 次对 k 次" ---------- */
function makeCard(title, k, tag, src) {
  const cw = 760, ch = 300, [c, g] = canvas2d(cw, ch), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const draw = fill => {
    g.clearRect(0, 0, cw, ch);
    rr(g, 6, 6, cw - 12, ch - 12, 34); g.fillStyle = 'rgba(16,24,40,.78)'; g.fill(); g.strokeStyle = 'rgba(248,216,147,.55)'; g.lineWidth = 3; g.stroke();
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#E9EEF6'; g.font = '600 50px "VK Sans"'; g.fillText(title, 44, 66);
    g.textAlign = 'right'; g.fillStyle = 'rgba(200,210,226,.75)'; g.font = '400 30px "VK Sans"'; g.fillText('过去 10 次预报', cw - 44, 68);
    const n = Math.round(fill * 10);
    for (let i = 0; i < 10; i++) {
      const x = 74 + i * 68, y = 150, right = i < k, on = i < n;
      g.beginPath(); g.arc(x, y, 24, 0, 6.2832);
      if (on && right) { g.fillStyle = GOLD; g.fill(); g.fillStyle = '#5A3F12'; g.font = '700 30px "VK Sans"'; g.textAlign = 'center'; g.fillText('✓', x, y + 1); }
      else if (on) { g.strokeStyle = '#8A93A3'; g.lineWidth = 4; g.stroke(); g.strokeStyle = '#8A93A3'; g.beginPath(); g.moveTo(x - 10, y - 10); g.lineTo(x + 10, y + 10); g.moveTo(x + 10, y - 10); g.lineTo(x - 10, y + 10); g.stroke(); }
      else { g.strokeStyle = 'rgba(138,147,163,.35)'; g.lineWidth = 3; g.stroke(); }
    }
    g.textAlign = 'left'; g.globalAlpha = sstep(.85, 1, fill); g.fillStyle = GOLD; g.font = '700 54px "VK Sans"'; g.fillText(`对 ${k} 次`, 44, 240);
    g.fillStyle = 'rgba(220,226,236,.85)'; g.font = '400 34px "VK Sans"'; g.fillText(tag, 250, 242);
    if (src) { g.textAlign = 'right'; g.fillStyle = 'rgba(170,180,196,.7)'; g.font = '400 24px "VK Sans"'; g.fillText(src, cw - 44, 246); }
    g.globalAlpha = 1;
    tex.needsUpdate = true;
  };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.3, .3 * ch / cw), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: new THREE.Color(.95, .95, .95) }));
  return { mesh, draw, last: -1 };
}

/* ---------- 硬币鼓成太阳：压扁的球，正面就是硬币那块面（同一个受光材质、同一张图），慢慢鼓起来、表面开始沸腾 ----------
   换下硬币的那一帧，两者打光一模一样（不会突然变亮）；太阳的颜色在光照算完之后再一点点混进来 */
const morphMat = face => {
  const m = face.clone(), u = { uMorph: { value: 0 }, uTime: { value: 0 }, uGain: { value: .42 }, uHeat: { value: 1 }, uSunCol: { value: new THREE.Color(SUN_COL[0]) } };
  m.userData.u = u;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vPm;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vPm = position;');
    sh.fragmentShader = 'uniform float uMorph, uTime, uGain, uHeat; uniform vec3 uSunCol; varying vec3 vPm;\n' + sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_NOISE)
      .replace('#include <opaque_fragment>', `{
        float mu = clamp(dot(normalize(normal), normalize(vViewPosition)), 0., 1.);
        vec3 p = normalize(vPm)*4.5;
        float g = fbm(p + vec3(0., uTime*.22, uTime*.13)), cells = fbm(p*3.4 - uTime*.35);
        float limb = .28 + .72*pow(mu, .5);
        vec3 sun = uSunCol*(1.1 + 1.5*g + .7*cells)*limb*mix(vec3(1., .62, .38), vec3(1.), pow(mu, .45)) + vec3(1., .95, .85)*pow(mu, 4.)*.9;
        sun *= mix(vec3(1., .4, .1), vec3(1.), uHeat);          // 刚鼓起来时像烧红的铁：暗的时候橙红，越亮越白（uHeat = 1 时和太空里的 α 星一样）
        outgoingLight = mix(outgoingLight, sun*uGain, smoothstep(0., 1., uMorph)); }
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'coinMorph';
  return m;
};
/* 球的贴图坐标：和圆柱顶面同一种贴法（从上往下投影） */
function morphGeo() {
  const g = new THREE.SphereGeometry(1, 128, 96), P = g.attributes.position, UV = g.attributes.uv;
  for (let i = 0; i < P.count; i++) UV.setXY(i, P.getZ(i) * .5 + .5, P.getX(i) * .5 + .5);
  return g;
}

/* 反射用的环境：一间夜里的屋子——上暗下更暗的渐变，左后方一团暖台灯，右后方一片冷窗光，都是软的（不要硬边的灯箱，否则玻璃上会反出白方块） */
function nightRoomEnv() {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vD; void main(){ float h = vD.y*.5 + .5; vec3 c = mix(vec3(.012,.012,.016), vec3(.05,.06,.09), smoothstep(.3, 1., h));
      c += vec3(1., .62, .3)*1.6*pow(max(0., dot(vD, normalize(vec3(-.7, .45, -.55)))), 18.);
      c += vec3(.45, .6, 1.)*.7*pow(max(0., dot(vD, normalize(vec3(.6, .35, -.7)))), 6.);
      gl_FragColor = vec4(c, 1.); }` }));
  env.add(room); return env;
}

export function buildPhone(r, renderer) {
  RectAreaLightUniformsLib.init();
  const envTex = new THREE.PMREMGenerator(renderer).fromScene(nightRoomEnv(), .02).texture;   // 只给金属、玻璃用的反射环境
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#06070A');
  scene.fog = new THREE.Fog('#06070A', 7, 18);
  const BG0 = new THREE.Color('#06070A'), BG1 = new THREE.Color('#02040A');
  const camera = new THREE.PerspectiveCamera(30, W / H, .004, 80);
  const stars = starfield(scene, TB.rng(4242), 40, 5000); stars.uniforms.uA.value = 0;

  /* 书桌：胡桃木 */
  const lit = [];                                         // 房间里会一起暗下去的东西：[对象, 原始强度/透明度, 属性]
  {
    const n = 1024, [c, g] = canvas2d(n, n), im = g.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = x / n, v = y / n, ring = fbm(u * 2, v * 36 + fbm(u * 3, v * 3, 1, 3) * 6, 2, 5), fine = fbm(u * 40, v * 400, 5, 3);
      const k = .55 + .35 * Math.sin(ring * 22) * .5 + .25 * fine, i = (y * n + x) * 4;
      im.data[i] = 70 * k + 22; im.data[i + 1] = 44 * k + 15; im.data[i + 2] = 28 * k + 10; im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 8;
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ map: t, roughness: .5, metalness: 0, envMap: envTex, envMapIntensity: .08 }));
    desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; scene.add(desk); lit.push([desk.material, .08, 'envMapIntensity']);
  }

  /* ---------- 手机 ---------- */
  const phone = new THREE.Group(); phone.rotation.y = -.06; scene.add(phone);
  /* 机身：圆角矩形挤出，边缘倒圆；宇宙橙阳极氧化铝 */
  {
    const bev = 1.6 * MM, geo = new THREE.ExtrudeGeometry(rrShape(PW - 2 * bev, PD - 2 * bev, PR - bev), { depth: PT - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 6, curveSegments: 32 });
    geo.translate(0, 0, bev); geo.rotateX(-Math.PI / 2);   // 挤出方向朝上
    const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#F27A36', metalness: .4, roughness: .36, envMap: envTex, envMapIntensity: 1.6 }));
    body.castShadow = true; phone.add(body);
    /* 正面玻璃：几乎盖满，黑色亮面 */
    const glass = new THREE.Mesh(rrPlane(PW - 1.2 * MM, PD - 1.2 * MM, PR - .6 * MM, 32), new THREE.MeshPhysicalMaterial({ color: '#040506', roughness: .32, metalness: 0, clearcoat: .6, clearcoatRoughness: .28, envMap: envTex, envMapIntensity: .8 })   /* 太光滑的话，台灯在玻璃上的高光亮到上千，辉光会把它放大成一块白方块 */);
    glass.position.y = TOP + .0004; phone.add(glass);
    /* 侧键：竖拿时左边的操作按钮、音量键 → 横放后在靠近镜头的长边；右边的电源键、相机控制 → 远处的长边 */
    const btnMat = new THREE.MeshStandardMaterial({ color: '#D9642A', metalness: .45, roughness: .35, envMap: envTex, envMapIntensity: 1.6 });
    const ccMat = new THREE.MeshStandardMaterial({ color: '#2A2C30', metalness: .3, roughness: .15, envMap: envTex, envMapIntensity: .8 });
    const btn = (x, side, len, mat = btnMat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(len, 2.6 * MM, 1.4 * MM), mat); b.position.set(x, PT * .5, side * (PD / 2 + .4 * MM)); phone.add(b); };
    btn(-48 * MM, 1, 6.5 * MM); btn(-33 * MM, 1, 10 * MM); btn(-20 * MM, 1, 10 * MM);
    btn(-30 * MM, -1, 16 * MM); btn(22 * MM, -1, 17 * MM, ccMat);
  }
  let sheenMesh = null;
  /* 屏幕 */
  const [uiC, ui] = canvas2d(UIW, UIH), uiTex = new THREE.CanvasTexture(uiC); uiTex.colorSpace = THREE.SRGBColorSpace; uiTex.anisotropy = 16;
  const screenMat = new THREE.MeshBasicMaterial({ map: uiTex, color: new THREE.Color(.95, .95, .95) });
  const screen = new THREE.Mesh(rrPlane(SW, SD, SR, 32), screenMat); screen.position.y = SY; phone.add(screen);
  /* 灵动岛：竖拿时在顶上，横放后在左边 */
  { const isl = new THREE.Mesh(rrPlane(6.6 * MM, 20.5 * MM, 3.29 * MM, 16), new THREE.MeshBasicMaterial({ color: '#000' })); isl.position.set(-SW / 2 + 7.3 * MM, SY + .0003, 0); phone.add(isl); }
  /* 玻璃上的一道斜反光 */
  {
    const [c, g] = canvas2d(512, 256), gr = g.createLinearGradient(0, 0, 512, 256);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.4, 'rgba(255,255,255,0)'); gr.addColorStop(.47, 'rgba(255,255,255,.07)'); gr.addColorStop(.55, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
    sheenMesh = new THREE.Mesh(rrPlane(SW, SD, SR, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sheenMesh.position.y = SY + .0006; phone.add(sheenMesh);
  }
  /* 屏幕的光：一盏很弱的点光挂在屏幕上方（面光会在玻璃和倒角上反出一块硬白方块，不用） */
  const screenLight = new THREE.PointLight('#AFC6FF', .6, 3, 1.5); screenLight.position.set(0, .45, .1); phone.add(screenLight);
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), new THREE.MeshBasicMaterial({ map: radialTex([[0, .55], [.35, .18], [.7, .04], [1, 0]]), color: '#5F7BB8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  spill.rotation.x = -Math.PI / 2; spill.position.y = .002; phone.add(spill);

  /* 杯子、本子和笔、一张 10 月 27 日的登机牌 */
  let drawPass = null, passDrawn = false;
  {
    const pts = []; for (let i = 0; i <= 20; i++) { const k = i / 20; pts.push(new THREE.Vector2(.2 + .015 * Math.sin(k * 3), k * .42)); }
    pts.push(new THREE.Vector2(.185, .42), new THREE.Vector2(.185, .02), new THREE.Vector2(0, .02));
    const mugM = new THREE.MeshStandardMaterial({ color: '#E8E4DC', roughness: .3, side: THREE.DoubleSide, envMap: envTex, envMapIntensity: .25 });
    const mug = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), mugM);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.11, .025, 16, 32, Math.PI), mugM); handle.position.set(.205, .22, 0); handle.rotation.z = -Math.PI / 2;
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(.186, 48), new THREE.MeshStandardMaterial({ color: '#2A160C', roughness: .12 })); coffee.rotation.x = -Math.PI / 2; coffee.position.y = .36;
    const g = new THREE.Group(); g.add(mug, handle, coffee); g.position.set(-1.35, 0, -.62); g.rotation.y = .9; mug.castShadow = true; scene.add(g);
    const nb = new THREE.Mesh(new THREE.BoxGeometry(1.0, .035, 1.35), new THREE.MeshStandardMaterial({ color: '#2B3442', roughness: .8 })); nb.position.set(1.55, .0175, -.75); nb.rotation.y = .32; nb.castShadow = nb.receiveShadow = true; scene.add(nb);
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .9, 16), new THREE.MeshStandardMaterial({ color: '#B89B63', metalness: .8, roughness: .3, envMap: envTex })); pen.rotation.z = Math.PI / 2; pen.rotation.y = .5; pen.position.set(1.45, .05, -.3); scene.add(pen);
    const [c, gg] = canvas2d(1024, 400), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    drawPass = () => {                               // 字体要等引擎加载完才能画：第一次 update 时画
      gg.fillStyle = '#EDEAE3'; gg.fillRect(0, 0, 1024, 400); gg.fillStyle = '#3B5BA5'; gg.fillRect(0, 0, 1024, 70);
      gg.fillStyle = '#fff'; gg.font = '700 40px "VK Sans"'; gg.fillText('登机牌  BOARDING PASS', 30, 50);
      gg.fillStyle = '#222'; gg.font = '700 90px "VK Mono"'; gg.fillText('PEK → CTU', 40, 190); gg.font = '400 44px "VK Sans"'; gg.fillText('10月27日  08:35   座位 32A', 40, 290);
      tex.needsUpdate = true;
    };
    const pass = new THREE.Mesh(new THREE.PlaneGeometry(.9, .35), new THREE.MeshStandardMaterial({ map: tex, roughness: .9 })); pass.rotation.x = -Math.PI / 2; pass.rotation.z = .18; pass.position.set(-.6, .002, .82); pass.receiveShadow = true; scene.add(pass);
  }
  /* 灯光：窗外冷月光 + 左后方一盏暖台灯 + 很弱的环境光；它们会随 s.room 一起暗下去 */
  const moon = new THREE.DirectionalLight('#7C93C8', .85); moon.position.set(-3, 5, -4); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .5, far: 15 }); moon.shadow.radius = 6; scene.add(moon);
  const lamp = new THREE.PointLight('#FFB066', 3.2, 0, 1.4); lamp.position.set(-3.2, 2.4, -2.6); scene.add(lamp);
  const amb = new THREE.AmbientLight('#202A3C', .55); scene.add(amb);
  const fill = new THREE.PointLight('#FFC9A0', 1.4, 0, 1.2); fill.position.set(-1.2, 1.1, 2.6); scene.add(fill);   // 镜头这一侧的一点暖补光：照亮朝向镜头的橙色边框
  lit.push([moon, moon.intensity, 'intensity'], [lamp, lamp.intensity, 'intensity'], [amb, amb.intensity, 'intensity'], [fill, fill.intensity, 'intensity']);
  /* 窗外城市的光斑（虚焦） */
  const bokeh = [];
  {
    const tex = radialTex([[0, 1], [.55, .7], [.75, .25], [1, 0]]);
    for (let i = 0; i < 46; i++) {
      const warm = r() < .55, s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: warm ? '#FFB46A' : '#8FB2FF', transparent: true, opacity: .1 + .22 * r(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.position.set(-7 + 14 * r(), .6 + 3.2 * r(), -8 - 3 * r()); s.scale.setScalar(.25 + .6 * r()); scene.add(s); bokeh.push([s, s.material.opacity]);
    }
  }

  /* ---------- 卡片 ---------- */
  const cards = [makeCard('第 5 天', 9, '≈ 九成'), makeCard('第 7 天', 8, '≈ 八成'), makeCard('第 10 天以后', 5, '≈ 抛硬币', '数据：NOAA')];
  const cardCols = [4, 6, 12];
  cards.forEach(c => phone.add(c.mesh));

  /* ---------- 硬币 ---------- */
  const sunFace = coinFace('sun', -Math.PI / 2), rainFace = coinFace('rain', Math.PI / 2);
  const edge = new THREE.MeshStandardMaterial({ color: '#C8963A', metalness: 1, roughness: .3, envMap: envTex, envMapIntensity: 1.1 });
  const faceSun = new THREE.MeshStandardMaterial({ map: sunFace.map, metalness: .55, roughness: .35, envMap: envTex, envMapIntensity: .9, emissive: '#FFD27A', emissiveMap: sunFace.emissive, emissiveIntensity: 0 });
  const faceRain = new THREE.MeshStandardMaterial({ map: rainFace.map, metalness: .55, roughness: .35, envMap: envTex, envMapIntensity: .9 });
  const coins = []; for (let i = 9; i < 15; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(COIN_R, COIN_R, .007, 64), [edge, faceSun, faceRain]); m.castShadow = true;
    const g = new THREE.Group(); g.add(m); phone.add(g); g.visible = false; coins.push({ i, g, m });
  }
  const LAND = { 9: 'rain', 10: 'sun', 11: 'rain', 12: 'rain', 13: 'sun' };      // 第 15 枚不落下
  /* 鼓成太阳的那颗球（单位球，缩放成硬币大小） + 日冕 */
  const morph = new THREE.Mesh(morphGeo(), morphMat(faceSun)); morph.visible = false; morph.castShadow = true; phone.add(morph);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, 1], [.12, .75], [.3, .22], [.6, .05], [1, 0]]), color: SUN_COL[0], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
  corona.scale.setScalar(COIN_R * 7.5); phone.add(corona);

  const colX = i => -SW / 2 + (SAFE_L + COLW * (i + .5)) / UIW * SW;
  const ICON_Y = 300, iconZ = -SD / 2 + ICON_Y / UIH * SD, CARD_Z = -SD / 2 + 820 / UIH * SD;

  /* ---------- 每帧：画屏幕 ---------- */
  function drawWeather(g, s, ox, oy) {
    g.save(); g.translate(ox, 0);
    const bg = g.createLinearGradient(0, 0, 0, UIH); bg.addColorStop(0, '#13213A'); bg.addColorStop(1, '#0B1322'); g.fillStyle = bg; g.fillRect(0, 0, UIW, UIH);
    const on = s.screenOn; g.globalAlpha = on; g.textBaseline = 'middle'; g.textAlign = 'left';
    /* 下拉刷新：内容往下坠，顶上一个转圈 */
    const pull = s.pull || 0;
    if (pull > 0) { g.save(); g.translate(UIW / 2, 60 * pull); g.rotate((s.t || 0) * 7); g.strokeStyle = 'rgba(200,215,235,.9)'; g.lineWidth = 7; g.lineCap = 'round';
      for (let k = 0; k < 10; k++) { g.globalAlpha = on * pull * (.25 + .75 * k / 9); g.beginPath(); g.moveTo(0, -30); g.lineTo(0, -44); g.stroke(); g.rotate(.628); } g.restore(); g.globalAlpha = on; }
    g.translate(0, oy + 120 * pull);
    g.fillStyle = '#E9EEF6'; g.font = '700 54px "VK Sans"'; g.fillText('15 日天气', SAFE_L, 86);
    g.fillStyle = (s.updated || 0) > .5 ? '#F8D893' : '#7E8DA6'; g.font = '400 30px "VK Sans"'; g.fillText((s.updated || 0) > .5 ? '10 月 12 日 周一 21:31 更新' : '10 月 12 日 周一 21:30 更新', SAFE_L + 290, 90);
    g.textAlign = 'right'; g.fillStyle = '#E9EEF6'; g.font = '300 74px "VK Sans"'; g.fillText('17°', UIW - SAFE_R, 86);
    g.fillStyle = '#7E8DA6'; g.font = '400 30px "VK Sans"'; g.fillText('现在 · 晴', UIW - SAFE_R - 130, 90); g.textAlign = 'center';
    g.strokeStyle = 'rgba(160,180,210,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(SAFE_L, 150); g.lineTo(UIW - SAFE_R, 150); g.stroke();
    const yHi = h => 470 - (h - 14) * 12, yLo = l => 610 - (l - 6) * 12;
    const ICON2 = { 12: 'rain', 14: 'part' }, upd = s.updated || 0;                          // 刷新以后，第 13 天和第 15 天变了
    /* 一周内：金色的底；十天以后：浅青色的底 */
    if ((s.trust7 || 0) > 0) { g.globalAlpha = on * s.trust7; g.fillStyle = 'rgba(248,216,147,.12)'; rr(g, SAFE_L + 8, 168, COLW * 7 - 16, 720, 26); g.fill(); g.strokeStyle = 'rgba(248,216,147,.75)'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#F8D893'; g.font = '600 40px "VK Sans"'; g.fillText('一周内 · 放心信', SAFE_L + COLW * 3.5, 836); }
    if ((s.fan || 0) > 0) { g.globalAlpha = on * s.fan; g.fillStyle = 'rgba(100,227,246,.08)'; rr(g, SAFE_L + COLW * 9 + 8, 168, COLW * 6 - 16, 720, 26); g.fill(); g.strokeStyle = 'rgba(100,227,246,.6)'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#9FE8F6'; g.font = '600 40px "VK Sans"'; g.fillText('十天以后 · 当趋势看', SAFE_L + COLW * 12, 836); }
    g.globalAlpha = on;
    for (let i = 0; i < 15; i++) {
      const d = DAYS[i], x = SAFE_L + COLW * (i + .5), k = s.cellIn[i];
      if (k <= 0) continue;
      g.globalAlpha = on * k; const dy = (1 - k) * 30;
      g.fillStyle = i === 0 ? '#E9EEF6' : '#AEB9CB'; g.font = '500 34px "VK Sans"'; g.fillText(d.wd, x, 196 + dy);
      g.fillStyle = '#7E8DA6'; g.font = '400 28px "VK Mono"'; g.fillText(d.date, x, 240 + dy);
      const fanK = i >= 9 ? (s.fan || 0) : 0, icon = upd > .5 && ICON2[i] ? ICON2[i] : d.icon, flipK = ICON2[i] ? Math.abs(Math.cos(Math.PI * upd)) : 1;   // 换图标时先压扁再展开
      if (s.iconHide[i] < 1) { g.save(); g.translate(x, ICON_Y + dy); g.scale(1, Math.max(.05, flipK)); g.translate(-x, -(ICON_Y + dy));
        if (fanK < 1) drawIcon(g, icon, x, ICON_Y + dy, 92, (1 - s.iconHide[i]) * (1 - fanK)); if (fanK > 0) drawFan(g, x, ICON_Y + dy, 92, fanK); g.restore(); }
      g.fillStyle = '#F2D59A'; g.font = '500 36px "VK Sans"'; g.fillText(d.hi + '°', x, yHi(d.hi) + 36 + dy);          // 最高温写在线的下面（写在上面会被前两天的图标挡住）
      g.fillStyle = '#8FB8E8'; g.fillText(d.lo + '°', x, yLo(d.lo) + 36 + dy);
    }
    const n = s.cellIn.reduce((a, k) => a + (k > .5 ? 1 : 0), 0);
    for (const [key, col, f] of [['hi', '#F2C46D', yHi], ['lo', '#6FA8E8', yLo]]) {
      g.globalAlpha = on; g.strokeStyle = col; g.lineWidth = 4; g.beginPath();
      for (let i = 0; i < n; i++) { const x = SAFE_L + COLW * (i + .5), y = f(DAYS[i][key]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke(); g.fillStyle = col; for (let i = 0; i < n; i++) { g.beginPath(); g.arc(SAFE_L + COLW * (i + .5), f(DAYS[i][key]), 7, 0, 6.2832); g.fill(); }
    }
    if (s.hl15 > 0) {
      const x = SAFE_L + COLW * 14, k = s.hl15; g.globalAlpha = on * k; g.strokeStyle = GOLD; g.lineWidth = 6; g.shadowColor = GOLD; g.shadowBlur = 24;
      rr(g, x + 6, 160, COLW - 12, 640, 22); g.stroke(); g.shadowBlur = 0;
    }
    g.restore(); g.globalAlpha = 1;
  }
  function drawUI(s) {
    const g = ui; g.clearRect(0, 0, UIW, UIH);
    if (s.page == null) drawWeather(g, s, 0, 0);
    else {
      const p = s.page;
      if (p < 1 && s.snap) { g.save(); g.fillStyle = '#000'; g.fillRect(-p * UIW, 0, UIW, UIH); const sc = UIH / s.snap.height, w = s.snap.width * sc; g.drawImage(s.snap, -p * UIW + (UIW - w) / 2, 0, w, UIH); g.restore(); }
      if (p > 0) drawWeather(g, s, (1 - p) * UIW, 0);
    }
    /* 熄屏：黑玻璃上倒映出三颗太阳 */
    if ((s.off || 0) > 0) { g.globalAlpha = s.off; g.fillStyle = '#000'; g.fillRect(0, 0, UIW, UIH); g.globalAlpha = 1; }
    if (s.refl) for (const r of s.refl) { if (r.a <= 0) continue; const gr = g.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r); gr.addColorStop(0, `rgba(255,246,226,${r.a})`); gr.addColorStop(.25, `rgba(255,214,150,${.6 * r.a})`); gr.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 6.2832); g.fill(); }
    g.globalAlpha = 1; uiTex.needsUpdate = true;
  }

  const tmpV = new THREE.Vector3(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), eul = new THREE.Euler(), up = new THREE.Vector3(0, 1, 0);
  /* 硬币朝向：翻转（绕 x）+ 偏航；faceW > 0 时往"正面对着镜头"转 */
  function coinQuat(st, out) {
    eul.set(0, st.yaw, 0); qA.setFromEuler(eul); qB.setFromEuler(eul.set(st.flip, 0, 0)); qA.multiply(qB);
    if (st.faceW > 0) { phone.updateMatrixWorld(); tmpV.copy(camera.position); phone.worldToLocal(tmpV); tmpV.sub(st.posV).normalize(); qB.setFromUnitVectors(up, tmpV); qA.slerp(qB, st.faceW); }
    return out.copy(qA);
  }
  function update(s) {
    if (!s.dry) { if (!passDrawn) { drawPass(); passDrawn = true; } drawUI(s); }   // dry：只摆位置不画字（字体还没加载时用）
    for (const [o, v, k] of lit) o[k] = v * s.room;
    scene.background.copy(BG0).lerp(BG1, 1 - s.room); scene.fog.color.copy(scene.background);   // 房间暗到和太空一样黑，桌子边缘不留一道灰
    for (const [o, v] of bokeh) o.material.opacity = v * s.room;
    screenLight.intensity = .6 * s.screenOn * s.room; spill.material.opacity = s.screenOn * s.room * (1 - (s.off || 0));
    const raw = !!s.raw; if (screenMat.toneMapped === raw) { screenMat.toneMapped = !raw; screenMat.needsUpdate = true; }
    screenMat.color.setScalar(raw ? 1 : .95 * (.25 + .75 * s.room)); sheenMesh.material.opacity = s.sheen == null ? 1 : s.sheen;
    stars.uniforms.uA.value = s.stars; stars.uniforms.uTime.value = s.t;
    /* 卡片 */
    cards.forEach((c, j) => {
      const st = s.cards[j], vis = st.a > .001; c.mesh.visible = vis; if (!vis) return;
      const fq = Math.round(st.fill * 40) / 40; if (fq !== c.last) { c.draw(fq); c.last = fq; }
      const x = j < 2 ? colX(cardCols[j]) : (colX(9) + colX(14)) / 2, h = .035 + .055 * st.a;
      c.mesh.position.set(x + (j === 0 ? -.11 : j === 1 ? .02 : 0), SY + h, CARD_Z + .04); c.mesh.rotation.set(-Math.PI / 2 + .62, 0, 0);
      c.mesh.material.opacity = st.a; c.mesh.scale.setScalar(.92 + .08 * st.a);
    });
    /* 硬币 */
    for (const c of coins) {
      const st = s.coins[c.i]; c.g.visible = st.vis > 0 && !(c.i === 14 && s.morph.on);
      if (!st.vis) continue;
      st.posV = new THREE.Vector3(colX(c.i), SY + .004 + st.h, iconZ + (st.dz || 0));
      c.g.position.copy(st.posV); c.g.rotation.set(0, 0, 0); coinQuat(st, c.m.quaternion);
    }
    faceSun.emissiveIntensity = s.coinGlow;
    /* 鼓起来的太阳 */
    const mo = s.morph; morph.visible = mo.on;
    if (mo.on) {
      const st = s.coins[14]; morph.position.copy(st.posV); coinQuat(st, morph.quaternion);
      morph.scale.set(COIN_R, Math.max(.0035, COIN_R * mo.k), COIN_R);
      const u = morph.material.userData.u; u.uMorph.value = mo.mix == null ? mo.k : mo.mix; u.uTime.value = s.t; u.uGain.value = mo.gain; u.uHeat.value = mo.heat == null ? 1 : mo.heat; morph.material.emissiveIntensity = s.coinGlow;
      corona.position.copy(st.posV); corona.material.opacity = mo.corona;
    } else corona.material.opacity = 0;
  }
  const cellWorld = (i, y = SY) => { phone.updateMatrixWorld(); return phone.localToWorld(new THREE.Vector3(colX(i), y, iconZ)); };
  /* 屏幕正中的世界坐标、屏幕"上方"（UI 画布顶边那一侧）的世界方向、屏幕高度（给结尾那一刀用） */
  const screenFrame = () => { phone.updateMatrixWorld(); const c = phone.localToWorld(new THREE.Vector3(0, SY, 0)), up = new THREE.Vector3(0, 0, -1).transformDirection(phone.matrixWorld);
    return { c: c.toArray(), up: up.toArray(), SD, SW, UIW, UIH }; };
  return { scene, camera, update, cellWorld, LAND, SY, iconZ, colX, phone, COIN_R, screenFrame };
}
