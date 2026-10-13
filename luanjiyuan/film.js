/* film.js — 《乱纪元》：时间线、机位、标注、字幕（这条片只要画面，不做声音）。
 * 每一帧：按时间选一个 3D 场景（phone / space / …），算好它的状态和机位，渲到离屏 WebGL 画布，
 * 再画进引擎的 look.under 层；字幕、小字、片名卡照常用引擎画。画面仍然是 t 的纯函数。
 *
 * 转场的规矩（见 skill：visual-grammar.md 第五节"丝滑转场"）：
 *   机位是一条连续的曲线（目标、距离、方位、仰角各一条 Catmull-Rom），不停、不猛冲；
 *   从手机到太空：第 15 枚硬币一直在画面中心，转正、鼓成球、沸腾成太阳；房间暗下去、星空亮起来；
 *   换场景的那一帧两边一模一样（同一个大小、同一个位置、同一片米粒组织），距离统一写成"主体半径的倍数" U(t)。
 */
import * as THREE from 'three';
import { createCore, unitsPerPx, aim } from './core.js';
import { W, H, GOLD, ICE, Ribbon } from './lib.js';
import { buildPhone, DAYS, COIN_R } from './phone.js';
import { buildSpace, TRN, SUN_R } from './space.js';
import { buildSurface, HAZE } from './surface.js';
import { buildHall, hallDir, HR, baroAngle } from './hall.js';
import { buildLab, RUN_A, RUN_B, LZ_N, LZ_DT, LZ_T, LZ_DIV, sOfT, paperPos, paperPoint, butterflyPoint, BF_CENTER, Z_NEAR } from './lorenz.js';
const { lerp, seg, ss, E, fade, clamp } = VK;
const aimUp = (cam, pos, target, up) => { cam.position.set(...pos); cam.up.set(...up); cam.lookAt(...target); cam.updateMatrixWorld(); };
const norm3 = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); }, dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const slerp3 = (a, b, k) => { const c = clamp(dot3(a, b), -1, 1), om = Math.acos(c); if (om < 1e-6) return a.slice(); const s0 = Math.sin((1 - k) * om) / Math.sin(om), s1 = Math.sin(k * om) / Math.sin(om); return a.map((v, i) => v * s0 + b[i] * s1); };
const K = VKit, PAL = K.PAL.night;
const TMAX = 240;                                  // 表格的长度；片长 DUR 在后面按物理量出来的时刻定

/* ---------- 小工具 ---------- */
const trk = (keys, t) => K.track(keys, t);
const lerpV = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const sph = (az, el, d) => [d * Math.cos(el) * Math.cos(az), d * Math.sin(el), d * Math.cos(el) * Math.sin(az)];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const logLerp = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));

/* ---------- 3D ---------- */
const core = createCore(), R = TB.rng(20261012), UPP = unitsPerPx(30);
const loadTex = url => new Promise((ok, no) => new THREE.TextureLoader().load(url, ok, undefined, no));
const [E_MAP, E_CLOUD, E_ROUGH] = await Promise.all(['assets/world.topo.bathy.200412.3x5400x2700.jpg', 'assets/cloud_combined_2048.jpg', 'assets/earth_rough.png'].map(loadTex));
E_MAP.colorSpace = THREE.SRGBColorSpace; for (const t of [E_MAP, E_CLOUD, E_ROUGH]) t.anisotropy = 16;
const PH = buildPhone(TB.rng(7), core.renderer), SP = buildSpace(R, UPP, { map: E_MAP, clouds: E_CLOUD, rough: E_ROUGH }), SF = buildSurface(TB.rng(184)), LB = buildLab(TB.rng(1961)), HL = buildHall(E_MAP, E_ROUGH);

/* ---------- 物理：两套三体世界，整场算完（种子 1130 + 试拍挑好的行星轨道） ---------- */
const SEED = 1130, DELTA = 1e-5, PLANET = { rp: .26, th: 5.68, tilt: -.347, retro: true, vf: .921 };
const SIM_T = 16, ic = TB.initial(SEED, PLANET);
const RA = TB.run(ic.s, ic.m, SIM_T, 1e-4, 50), RB = TB.run(TB.perturb(ic.s, 1, DELTA), ic.m, SIM_T, 1e-4, 50), SD = RA.dtSample;
function at(Rr, sim, out = new Float32Array(12)) {
  const f = clamp(sim / SD, 0, Rr.n - 1.0001), k = Math.floor(f), u = f - k;
  for (let i = 0; i < 12; i++) out[i] = Rr.pos[k * 12 + i] * (1 - u) + Rr.pos[(k + 1) * 12 + i] * u;
  return out;
}
const TRAIL = 1.8;
function trail(Rr, sim, b) {
  const out = new Float32Array(TRN * 3);
  for (let j = 0; j < TRN; j++) {
    const s = Math.max(0, sim - TRAIL * (1 - j / (TRN - 1))), f = clamp(s / SD, 0, Rr.n - 1.0001), k = Math.floor(f), u = f - k;
    for (let c = 0; c < 3; c++) out[j * 3 + c] = Rr.pos[k * 12 + b * 3 + c] * (1 - u) + Rr.pos[(k + 1) * 12 + b * 3 + c] * u;
  }
  return out;
}
const T_CUT = 17.6;                               // 手机 → 太空：看不出来的切点
const T_DIVE = 33.6;                              // 太空 → 地面：钻进行星的大气（整幅同一种雾色时交接）
const T_UP = 43.6;                                // 地面 → 太空：升空、抬头看星，两边同一片星空时交接
const T_REW0 = 44.8, T_REW1 = 46.1;               // 倒回模拟的开头：再算一遍
let REW_A = 0, FREEZE_T = 1e9;
const speed = t => t < T_CUT ? 0
  : t < T_DIVE ? .12 + .22 * ss(t, 23.5, 25.5) - .26 * ss(t, 27.5, 30)       // 片名时慢放，全景时快一点，靠近行星时再放慢
  : t < T_UP ? 0                                                              // 在地面上：天上的三体冻住
  : t < T_REW0 ? .35 * ss(t, T_UP, T_UP + .6)
  : t < T_REW1 ? -REW_A * Math.sin(Math.PI * (t - T_REW0) / (T_REW1 - T_REW0))   // 倒带：正好倒回 0
  : 2.1 * ss(t, T_REW1, T_REW1 + .5) - 1.1 * ss(t, T_REW1 + 2.2, T_REW1 + 5.2) - .55 * ss(t, T_REW1 + 8.5, T_REW1 + 10.1) - .45 * ss(t, FREEZE_T, FREEZE_T + 1);   // 重跑：前几圈快进，分开之前放慢；追上行星时停下
const buildSim = () => { const n = TMAX * 1000, a = new Float64Array(n + 1); for (let i = 1; i <= n; i++) { const t = (i - .5) / 1000; a[i] = a[i - 1] + speed(t) / 1000; if (i === Math.round(T_REW1 * 1000)) a[i] = 0; } return a; };
let SIMOF = buildSim(); REW_A = SIMOF[Math.round(T_REW0 * 1000)] * Math.PI / (2 * (T_REW1 - T_REW0)); SIMOF = buildSim();
const simOf = t => { const f = clamp(t, 0, TMAX) * 1000, k = Math.min(TMAX * 1000 - 1, Math.floor(f)); return SIMOF[k] + (SIMOF[k + 1] - SIMOF[k]) * (f - k); };
/* 两个世界的距离、分开和甩出去的时刻：都从物理里量出来 */
const DIV = new Float32Array(RA.n);
for (let k = 0; k < RA.n; k++) for (let i = 0; i < 3; i++) DIV[k] = Math.max(DIV[k], Math.hypot(RA.pos[k * 12 + i * 3] - RB.pos[k * 12 + i * 3], RA.pos[k * 12 + i * 3 + 1] - RB.pos[k * 12 + i * 3 + 1], RA.pos[k * 12 + i * 3 + 2] - RB.pos[k * 12 + i * 3 + 2]));
const divAt = sim => DIV[Math.min(RA.n - 1, Math.max(0, Math.round(sim / SD)))];
const SIM_SPLIT = (() => { for (let k = 0; k < RA.n; k++) if (DIV[k] > .04) return k * SD; return 99; })();
const SIM_EJECT = (() => { const p = new Float32Array(12); for (let s = 11; s < SIM_T; s += .01) { at(RB, s, p); let d = 9; for (let i = 0; i < 3; i++) d = Math.min(d, Math.hypot(p[9] - p[i * 3], p[10] - p[i * 3 + 1], p[11] - p[i * 3 + 2])); if (d > .6) return s; } return 99; })();
const firstAfter = (t0, sim) => { for (let t = t0; t < TMAX; t += .001) if (simOf(t) >= sim) return t; return TMAX; };
const T_SPLIT = firstAfter(T_REW1, SIM_SPLIT), T_EJECT = firstAfter(T_REW1, SIM_EJECT);
const T_E0 = T_EJECT + 3.6;                       // 镜头开始追那颗被甩出去的行星
const T_LAB = T_E0 + 7.7;                         // 钻进地球的云（整幅白色时）交接到 1961 年的打印纸
FREEZE_T = T_E0 + 1.0; SIMOF = buildSim();        // 追上时让模拟停下（只影响 T_EJECT 之后）
const T_RC = T_LAB + 40.6;                        // 蝴蝶 → 地球：两边画面一样的那一帧（黑底上同一只蝴蝶）
const T_HC = T_RC + 8.0;                          // 地球 → 大厅：钻进同一格海面
const T_EX = T_HC + 32.6;                         // 大厅 → 地球：从理查森算的那一格钻出去（两边画面一样的那一帧）
const E0 = T_EX, T_PH2 = E0 + 39.6;                 // 地球 → 手机屏幕：屏幕上就是这一帧
const DUR = Math.round((T_PH2 + 24.6) * 10) / 10;   // 原来的片尾时刻（chart 的横轴按它定，不动）
const END = DUR + 2.0;                              // 片尾标题多停 2 秒，副标题看得清
/* 开头片名多停 2 秒：片子的时间 tf → 内部时间 t。21–27 秒之间内部时间放慢（最慢半速，平滑地慢下来再快回去），
   片名本身按片子时间走，所以它在屏幕上清楚地多待 2 秒；后面所有东西整体往后挪 2 秒 */
const WARP = { A: 21.0, B: 27.0, D: 2.0 };
const tIn = tf => tf - WARP.D * VK.smooth(clamp((tf - WARP.A) / (WARP.B - WARP.A)));
const DUR_FILM = Math.round((END + WARP.D) * 10) / 10;
window.TIMELINE = { T_SPLIT, T_EJECT, DUR: DUR_FILM, SIM_SPLIT, SIM_EJECT, T_HC, T_EX, WARP_D: WARP.D };   // T_HC / T_EX 是内部时间；成片时间 = 内部 + WARP_D

/* ---------- 距离曲线 U(t)：相机到"主体"的距离 ÷ 主体半径。手机段主体是硬币（半径 COIN_R），太空段是 α 星（半径 SUN_R） ---------- */
const U_KEYS = [[0, 80], [4.5, 38], [5.4, 35], [8.2, 19], [9.4, 37], [12.6, 35], [14.2, 17], [15.2, 8.5], [16.3, 4.6], [17.6, 6.2], [19.0, 16], [20.6, 45], [22.4, 90]].map(([t, u]) => [t, Math.log(u)]);
const U = t => Math.exp(trk(U_KEYS, t));

/* ---------- 第一段：手机（0 – T_CUT） ---------- */
const COIN_T0 = 11.0, COIN_DT = .13, COIN_FLY = 1.6, T15 = COIN_T0 + 5 * COIN_DT;
function coinState(i, t) {
  if (i < 14) {
    const tl = COIN_T0 + (i - 9) * COIN_DT, u = seg(t, tl, tl + COIN_FLY), turns = PH.LAND[i] === 'sun' ? 6 : 7;   // 落下时转过 6π（太阳朝上）或 7π（雨朝上）
    const dt = t - tl - COIN_FLY, after = dt > 0;
    return { vis: t >= tl - .04 ? 1 : 0, h: .24 * 4 * u * (1 - u) + (after ? .012 * Math.abs(Math.sin(dt * 14)) * Math.exp(-dt * 6) : 0),
      flip: turns * Math.PI * E.out2(u) + (after ? .12 * Math.sin(dt * 18) * Math.exp(-dt * 5) : 0), yaw: (i - 12) * .07, faceW: 0 };
  }
  /* 第 15 枚：弹起来以后不落下，越升越高，越转越慢，最后转正对着镜头 */
  const u1 = seg(t, T15, T15 + .85), h = .17 * E.out3(u1) + .27 * E.io3(seg(t, T15 + .85, 16.6));
  const w0 = 26, w = tt => w0 * Math.exp(-(tt - T15) * 1.1) + 1.2;                       // 角速度：先快后慢
  const spin = t <= T15 ? 0 : w0 / 1.1 * (1 - Math.exp(-(t - T15) * 1.1)) + 1.2 * (t - T15);
  return { vis: t >= T15 - .04 ? 1 : 0, h, flip: spin, yaw: .1, faceW: E.io3(seg(t, 14.2, 15.4)), dz: .05 * E.io3(seg(t, 13, 16.6)) };
}
const coinWorld = t => { const st = coinState(14, t); PH.phone.updateMatrixWorld(); return PH.phone.localToWorld(new THREE.Vector3(PH.colX(14), PH.SY + .004 + st.h, PH.iconZ + (st.dz || 0))); };
/* 机位：目标点一条曲线（12.2 秒以后渐渐交给硬币），方位、仰角各一条曲线，距离 = U(t)·COIN_R */
const c15 = PH.cellWorld(14);
const TX = [[0, 0], [4.5, 0], [5.4, .05], [8.2, c15.x], [9.4, .1], [12.6, .08]], TY = [[0, .05], [4.5, .08], [8.2, .08], [12.6, .1]], TZ = [[0, 0], [4.5, -.02], [5.4, -.03], [8.2, c15.z + .02], [9.4, .17], [12.6, .17]];
const AZ = [[0, 1.14], [4.5, 1.54], [8.2, 1.41], [9.4, 1.44], [12.6, 1.47], [14.4, 1.52], [16.0, 1.6], [17.6, 1.66], [19, 1.7]];
const EL = [[0, .73], [4.5, 1.16], [8.2, 1.07], [9.4, 1.08], [12.6, 1.04], [14.4, .7], [16.0, .24], [17.6, .14], [19, .12]];
function camPhone(t) {
  const kc = ss(t, 12.2, 13.9), cw = coinWorld(t);
  const target = lerpV([trk(TX, t), trk(TY, t), trk(TZ, t)], [cw.x, cw.y, cw.z], kc);
  return { pos: add3(target, sph(trk(AZ, t), trk(EL, t), U(t) * COIN_R)), target };
}
const sunGainAt = dc => .42 + .58 * Math.min(1, Math.max(0, (dc - .3) / 1.5)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (dc - .3) / 1.5)));   // 和 space.js 里 α 星的收光一样
const coronaAt = dc => .9 * (.12 + .88 * VK.smooth(clamp((dc - .5) / 2.1)));
/* 硬币 → 太阳的亮度：形状（k）、颜色（mix）、增益（gain）、日冕、泛光各走各的时间窗，让画面中心的亮度一路平滑地爬到切点 */
const MO = Object.assign({ cg0: 13.8, cg1: 16.4, k0: 15.3, k1: 16.8, mx0: 14.9, mx1: 16.3, co0: 16.0, co1: 17.4, bl0: 15.0, bl1: 17.4, h0: 15.4, h1: 17.4,
  gk: [[14.6, .11], [15.2, .11], [15.6, .17], [16.0, .33], [16.4, .49], [16.8, .76], [17.0, .9], [17.2, .97], [17.4, 1], [17.6, 1], [18.0, 1]] }, window.__opt || {});
const GK = MO.gk.map(([t, v]) => [t, Math.log(v)]);            // 太阳增益 = 切点那边的增益 × 这条曲线（对数空间里插值，到 17.4 秒正好是 1）
function phoneState(t) {
  const coins = {}; for (let i = 9; i < 15; i++) coins[i] = coinState(i, t);
  const iconHide = DAYS.map((_, i) => i >= 9 ? ss(t, COIN_T0 + (i - 9) * COIN_DT - .06, COIN_T0 + (i - 9) * COIN_DT + .02) : 0);
  const out = 1 - ss(t, 13.0, 13.8), dcEq = U(t) * SUN_R;
  return {
    t, screenOn: ss(t, .1, .5), room: 1 - ss(t, 14.8, 16.9), stars: .3 * ss(t, 15.4, 17.4),
    cellIn: DAYS.map((_, i) => ss(t, .8 + i * .13, 1.35 + i * .13)), iconHide, hl15: fade(t, 5.2, 9.0, .6, .6), coins,
    cards: [{ a: ss(t, 9.0, 9.6) * out, fill: seg(t, 9.3, 10.1) }, { a: ss(t, 9.4, 10.0) * out, fill: seg(t, 9.7, 10.5) }, { a: ss(t, 9.8, 10.4) * out, fill: seg(t, 10.1, 10.9) }],
    coinGlow: 1.6 * ss(t, MO.cg0, MO.cg1),
    morph: { on: t >= Math.min(MO.k0, MO.mx0) - .05, k: E.io3(seg(t, MO.k0, MO.k1)), mix: ss(t, MO.mx0, MO.mx1), heat: ss(t, MO.h0, MO.h1), gain: sunGainAt(dcEq) * Math.exp(trk(GK, t)), corona: coronaAt(dcEq) * ss(t, MO.co0, MO.co1) },
  };
}
function phoneFrame(t) {
  const c = camPhone(t); aim(PH.camera, c.pos, c.target);               // 先摆相机：硬币"转正对着镜头"要用这一帧的相机位置
  PH.update(phoneState(t));
  core.render(PH.scene, PH.camera, { fade: ss(t, 0, .5), bloom: lerp(.55, .72, ss(t, MO.bl0, MO.bl1)) });
}

/* ---------- 第二段：太空（T_CUT –） ---------- */
const PA = new Float32Array(12), PB = new Float32Array(12);
const OPT = Object.assign({ azOff: -.15, pAzOff: -.35, pEl: .5, upEl: .5 }, window.__opt || {});   // 机位的几个偏移量（probe.py 用来搜索）
const AZP = (() => { const p = at(RA, simOf(30.5)); return Math.atan2(p[11] - p[2], p[9] - p[0]) + OPT.pAzOff; })();   // 从 α 星看行星的方向，偏一点
const AZD = (() => { const p = at(RA, simOf(T_DIVE)); return Math.atan2(p[2] - p[11], p[0] - p[9]) + .45; })();   // 从行星看 α 星的方向：镜头在这一侧，看到的是白天
const AZ0 = (() => { const p = at(RA, 0); return Math.atan2(p[11] - p[2], p[9] - p[0]) + Math.PI + OPT.azOff; })();   // 切点时相机在 α 星背对行星的一侧：行星藏在太阳后面，拉远时才露出来
function camSpace(t, A) {
  /* 从 α 星拉出来，退到能看见三颗星；再飞向行星。距离前半段和手机段共用 U(t) */
  const sun = [A[0], A[1], A[2]], pl = [A[9], A[10], A[11]];
  const k1 = E.io3(seg(t, T_CUT + .4, 22.4)), k2 = E.io3(seg(t, 25.4, 31.2)), kU = E.io3(seg(t, 23.4, 26.5)), k3 = seg(t, 31.0, T_DIVE);
  const target = lerpV(lerpV(sun, [0, .42 * (1 - kU), 0], k1), pl, k2);
  const dist = logLerp(logLerp(t < 22.4 ? U(t) * SUN_R : 90 * SUN_R, .42, k2), .042, E.in2(k3));          // 最后一段加速冲进大气
  const az0 = AZ0 + .5 * k1 + .03 * (t - T_CUT), el0 = lerp(.05, .1, k1) + OPT.upEl * Math.sin(Math.PI * k1) + .4 * kU;
  const kd = E.io3(k3);                                                                                   // 一边下降一边绕到行星有太阳照着的那一面
  return { pos: add3(target, sph(lerp(lerp(az0, AZP, k2), AZD, kd), lerp(lerp(el0, OPT.pEl, k2), .14, kd), dist)), target };
}
/* 切点那一帧：把 α 星的球面转到和硬币鼓成的球同一个朝向（相对各自的相机），米粒组织就接得上 */
{
  const cp = camPhone(T_CUT); aim(PH.camera, cp.pos, cp.target); PH.update({ ...phoneState(T_CUT), dry: true });
  at(RA, simOf(T_CUT), PA); const cs = camSpace(T_CUT, PA); aim(SP.camera, cs.pos, cs.target);
  const morph = PH.phone.children.find(o => o.isMesh && o.geometry.type === 'SphereGeometry');
  morph.updateMatrixWorld(); const qM = new THREE.Quaternion(); morph.getWorldQuaternion(qM);
  const qP = PH.camera.quaternion.clone(), qS = SP.camera.quaternion.clone();
  SP.sunsA[0].body.quaternion.copy(qS.multiply(qP.invert()).multiply(qM));
}
/* ---------- 第三段：地面（T_DIVE – T_UP） ---------- */
const dirOf = (az, el) => [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
const UPDIR = [0, Math.sin(75 * Math.PI / 180), -Math.cos(75 * Math.PI / 180)];                       // 交接时两边都朝这个方向抬头看
const SPACE_UP_POS = [0, 3, 0];
const SF_POS = [[T_DIVE, [-40, 150, 190]], [35.3, [-18, 42, 118]], [36.9, [-1.5, 8, 82]], [38.3, [0, 2.4, 50]], [39.6, [0, 2.3, 34]], [40.9, [0, 2.6, 25]], [41.8, [0, 6, 19]], [42.6, [0, 28, 10]], [T_UP, [0, 110, 0]], [T_UP + 1, [0, 200, -4]]];   // 从高空降下来，沿着御道贴着人头往前飞，三日连珠时停低处看，再拔地而起   // 从高空降下来，沿着御道贴着人头往前飞，再拔地而起
const SF_TGT = [[T_DIVE, [0, 0, -20]], [35.3, [0, 0, -10]], [36.9, [0, 2, 30]], [38.3, [0, 3.5, 0]], [39.6, [0, 7, -40]], [40.9, [0, 9, -50]], [41.8, [0, 28, -50]], [42.6, [0, 110, -45]], [T_UP, add3([0, 110, 0], UPDIR.map(v => v * 100))], [T_UP + 1, add3([0, 200, -4], UPDIR.map(v => v * 100))]];
const camSurface = t => ({ pos: [0, 1, 2].map(c => trk(SF_POS.map(k => [k[0], k[1][c]]), t)), target: [0, 1, 2].map(c => trk(SF_TGT.map(k => [k[0], k[1][c]]), t)) });
/* 三颗太阳在天上：各自慢慢挪，三日连珠时排成一串 */
const SKY0 = [[-.3, .15], [.13, .22], [.34, .1]], SKY1 = [[.02, .12], [.02, .165], [.02, .21]];   // 都在镜头前方的天上；三日连珠时排成竖着的一串
const sunDirAt = t => SKY0.map(([az, el], i) => { const k = E.io3(seg(t, 38.4, 40.2)), d = .025 * (t - T_DIVE) * (i - 1); return dirOf(lerp(az + d, SKY1[i][0], k), lerp(el, SKY1[i][1], k)); });
function surfaceFrame(t) {
  const c = camSurface(t); aim(SF.camera, c.pos, c.target);
  const up = camSurface(T_UP).pos;
  SF.update({ t, sunDir: sunDirAt(t), glare: .2 * ss(t, 39.6, 41) * (1 - ss(t, 42.4, 44)), dark: ss(t, 42.1, 43.3), fog: lerp(.008, .0026, ss(t, T_DIVE, 34.4)) * (1 - ss(t, 41.6, 43.2)),
    stars: ss(t, 42.3, 43.4), starsPos: [up[0] - SPACE_UP_POS[0], up[1] - SPACE_UP_POS[1], up[2] - SPACE_UP_POS[2]], float: seg(t, 39.9, T_UP), camPos: c.pos });
  core.render(SF.scene, SF.camera, { haze: 1 - ss(t, T_DIVE, 34.0), bloom: .72 });
}

/* ---------- 第四段：回到太空，倒回去、两个世界一起重跑（T_UP –） ---------- */
const AZB = OPT.azB == null ? .9 : OPT.azB;
const orbitPos = t => sph(AZB + .035 * (t - (T_UP + 1.4)), .42, 4.9 + .7 * ss(t, T_EJECT - .5, T_EJECT + 3));
const SP2_POS = [[T_UP, SPACE_UP_POS], [T_UP + .6, [0, 3.4, 2.0]], [T_UP + 1.4, orbitPos(T_UP + 1.4)], [T_UP + 2.2, orbitPos(T_UP + 2.2)]];
const SP2_TGT = [[T_UP, add3(SPACE_UP_POS, UPDIR.map(v => v * 10))], [T_UP + .6, [0, 2.5, -2.5]], [T_UP + 1.4, [0, 0, 0]], [T_UP + 2.2, [0, 0, 0]]];
const camSpace2 = t => t >= T_UP + 2.2 ? { pos: orbitPos(t), target: [0, 0, 0] }
  : { pos: [0, 1, 2].map(c => trk(SP2_POS.map(k => [k[0], k[1][c]]), t)), target: [0, 1, 2].map(c => trk(SP2_TGT.map(k => [k[0], k[1][c]]), t)) };
const pBAt = t => { const p = at(RB, simOf(t)); return [p[9], p[10], p[11]]; };
const E_P0 = pBAt(T_E0), E_C0 = orbitPos(T_E0), E_D0 = Math.hypot(E_C0[0] - E_P0[0], E_C0[1] - E_P0[1], E_C0[2] - E_P0[2]);
const E_AZ1 = Math.atan2(E_C0[2] - E_P0[2], E_C0[0] - E_P0[0]), E_EL1 = Math.asin((E_C0[1] - E_P0[1]) / E_D0);
const E_AZS = E_AZ1 + Math.PI + .3, E_ELS = -E_EL1 + .12;   // 太阳在地球背后偏上一点：和镜头的视线差十几度，第一眼就在画面里                                     // 地球的太阳：在地球后面偏一点，第一眼能看见它
const E_AZ2 = (() => { let a = E_AZS + .62, d = a - E_AZ1; d = Math.atan2(Math.sin(d), Math.cos(d)); return E_AZ1 + d; })();   // 再绕到白天那一面
const E_SUN = sph(E_AZS, E_ELS, 1);
const E_LON = (() => { const ph = 2 * Math.PI * (115 + 180) / 360; return Math.atan2(Math.sin(ph), -Math.cos(ph)); })();   // 东经 115°（中国、西太平洋）
const E_DK = [[T_E0 - 1, Math.log(E_D0 * 1.05)], [T_E0, Math.log(E_D0)], [T_E0 + 1.5, Math.log(1.0)], [T_E0 + 3.2, Math.log(.42)], [T_E0 + 5.9, Math.log(.14)], [T_LAB, Math.log(.0322)], [T_LAB + 1, Math.log(.031)]];
function camEarth(t) {
  const pB = pBAt(t), kT = E.io3(seg(t, T_E0 - .1, T_E0 + 1.0)), ks = E.io3(seg(t, T_E0 + 3.3, T_E0 + 6.0));
  const az = lerp(E_AZ1, E_AZ2, ks), el = lerp(E_EL1, .22, ks) - .1 * E.in2(seg(t, T_E0 + 6, T_LAB)), d = Math.exp(trk(E_DK, t));
  return { pos: add3(pB, sph(az, el, d)), target: lerpV([0, 0, 0], pB, kT) };
}
const earthState = t => ({ on: t >= T_E0 + 1.5, pos: pBAt(t), reveal: ss(t, T_E0 + 1.9, T_E0 + 3.6), ringK: ss(t, T_E0 + 1.8, T_E0 + 3.4),
  spin: E_LON - E_AZ2 - .03 * (T_E0 + 6 - t), cloudSpin: .05 * (t - T_E0), sunDir: E_SUN, sunK: ss(t, T_E0 + 2.0, T_E0 + 3.4) });
const camAny = (t, A) => t < T_UP ? camSpace(t, A) : t < T_E0 ? camSpace2(t) : camEarth(t);
function spaceFrame(t) {
  if (SP.camera.near !== .004 || SP.camera.far !== 400) { SP.camera.near = .004; SP.camera.far = 400; SP.camera.updateProjectionMatrix(); }
  const sim = simOf(t); at(RA, sim, PA); at(RB, sim, PB);
  const c = camAny(t, PA); aim(SP.camera, c.pos, c.target);
  const late = t >= T_UP;
  SP.update({
    t, target: c.target, A: PA, B: PB, bA: late ? ss(t, T_REW1 - .15, T_REW1 + .6) : 0, bSplit: late ? ss(t, T_SPLIT - .6, T_SPLIT + .8) : 0,
    planetSpin: t * .12, trailVis: late ? 1 : ss(t, 18.5, 21), planetTrail: late ? 1 : ss(t, 24, 26),
    trailA: [0, 1, 2, 3].map(b => trail(RA, sim, b)), trailB: [0, 1, 2, 3].map(b => trail(RB, sim, b)),
    bgA: late ? 1 : lerp(.3, 1, ss(t, T_CUT, 19.6)), nebA: late ? ss(t, T_UP + .3, T_UP + 2) : ss(t, T_CUT + .2, 20), dustA: late ? ss(t, T_UP + .3, T_UP + 1.6) * (1 - ss(t, T_E0 + 4, T_E0 + 6)) : ss(t, T_CUT + .2, 19.5),
    sysK: 1 - ss(t, T_E0 + .8, T_E0 + 2.4), earth: t >= T_E0 ? earthState(t) : null,
  });
  const white = Math.pow(ss(t, T_LAB - .7, T_LAB), 1.4);                                   // 钻进云顶：整幅变成云的白
  core.render(SP.scene, SP.camera, { fade: 1, bloom: .72, haze: late ? white : Math.pow(ss(t, 33.25, T_DIVE), 1.5), hazeCol: late ? '#EEF1F4' : null });
}

/* ---------- 第五段：1961 年洛伦茨的桌子（T_LAB –） ---------- */
const L = t => t - T_LAB;                                                                  // 实验室段的本地时间
const B_KEYS = [[8.0, 0], [8.4, 40], [9.8, 560], [12.4, 1120], [14.0, 1900], [14.4, LZ_N - 1], [14.6, LZ_N - 1]];   // 重跑的那条墨迹画到第几个点：两条线开始分开（第 700–1100 个点）那一段走慢
const B_I = lt => lt <= 8 ? 0 : lt >= 14.4 ? LZ_N - 1 : Math.max(0, Math.min(LZ_N - 1, trk(B_KEYS, lt)));
const headPos = lt => paperPoint(RUN_B, Math.round(B_I(lt)));
const LAB_KEYS = (() => {
  const k = [[0, [-.012, .05, Z_NEAR - .06], [0, 0, Z_NEAR - .2]], [1.4, [.08, .3, Z_NEAR + .22], [0, 0, Z_NEAR - .45]], [3.2, [.95, 1.15, Z_NEAR + 1.1], [0, .1, Z_NEAR - 1.4]],
    [4.8, [.3, .5, Z_NEAR + .45], [-.04, 0, Z_NEAR - .4]], [6.2, [-.03, .17, Z_NEAR + .07], [-.05, 0, Z_NEAR - .13]], [7.6, [-.02, .19, Z_NEAR + .1], [-.03, 0, Z_NEAR - .16]]];
  for (const lt of [8.8, 10.0, 11.2, 12.4, 13.4]) { const h = headPos(lt); k.push([lt, [h[0] * .3 + .03, .62, h[2] + .5], [h[0] * .3, 0, h[2] + .1]]); }   // 在笔尖斜上方跟着走：笔尖在画面上半，身后已经画出来的两条线在下半
  k.push([14.1, [.05, 1.15, Z_NEAR - 1.0 + .75], [0, 0, Z_NEAR - 2.0]], [14.9, [.05, 1.2, Z_NEAR - 1.0 + .7], [0, 0, Z_NEAR - 2.05]]);                     // 抬高：整段分开的两条线一眼看全
  k.push([16.4, [.5, .95, Z_NEAR - .9], [BF_CENTER[0], BF_CENTER[1] * .6, BF_CENTER[2] - .2]], [18.6, [.45, 1.3, BF_CENTER[2] + 2.9], BF_CENTER]);
  const AZL = { 20.5: 1.651, 23: 1.876, 25.5: 2.101, 28: 2.326, 30.5: 2.44, 33: 2.4, 35.6: 2.32, 38.2: 2.24, 40.5: 2.24 };   // 最后停住不转：切点前后蝴蝶都不转
  for (const lt of [20.5, 23, 25.5, 28, 30.5, 33, 35.6, 38.2, 40.5]) { const up = lt > 19.8 && lt < 25.4 ? .14 : 0; k.push([lt, add3(BF_CENTER, sph(AZL[lt], .16, 3.0)), add3(BF_CENTER, [0, up, 0])]); }   // 绕着蝴蝶慢慢转（转到偏 40° 左右就慢慢回来，不转到侧面）；引文时把蝴蝶压到画面下半部
  return k;
})();
const BF_A = lt => 1 - .45 * ss(lt, 17.2, 18.6) - .3 * ss(lt, 20.0, 20.8) + .1 * ss(lt, 25.0, 25.6);   // 纸上 1 → 蝴蝶 .55 → 引文时 .25 → 两个点 .35（之后一直保持，图在旁边不压它）
const camLab = t => {
  const lt = L(t); let pos = [0, 1, 2].map(c => trk(LAB_KEYS.map(k => [k[0], k[1][c]]), lt)), target = [0, 1, 2].map(c => trk(LAB_KEYS.map(k => [k[0], k[2][c]]), lt));
  const sh = ss(lt, 29.6, 32.2) * (1 - ss(lt, 37.8, 40.2));                                // 往右挪、稍稍退后：蝴蝶让到画面左边三分之一，右边留给图；图退场后回到正中
  if (sh > 0) { const f = [target[0] - pos[0], 0, target[2] - pos[2]], fl = Math.hypot(f[0], f[2]), right = [-f[2] / fl, 0, f[0] / fl];
    pos = add3(target, pos.map((v, i) => (v - target[i]) * (1 + .12 * sh))); pos = add3(pos, right.map(v => v * .66 * sh)); target = add3(target, right.map(v => v * .66 * sh)); }
  const g = PULL(t); if (g > 0) pos = add3(target, pos.map((v, i) => (v - target[i]) * Math.exp(g)));   // 往后拉：和切过去以后的地球那一段是同一条曲线
  return { pos, target };
};
/* 往后拉的曲线（按绝对时间）：蝴蝶 → 地球那一刀切在它的中间，两边速度连续 */
const PULL_END = 10;                                                                        // 拉到原来距离的 10 倍
const PULL = t => Math.log(PULL_END) * VK.smooth(seg(t, T_LAB + 38.0, T_RC + 3.0));
const I_R = lt => Math.max(0, Math.min(LZ_N - 1, trk([[31.0, 0], [31.4, 30], [33.6, 900], [35.6, 1750], [36.4, LZ_N - 1], [37, LZ_N - 1]], lt)));   // 重新出发的两个点跑到第几个点：分开的那一段走慢
function labFrame(t) {
  const lt = L(t), c = camLab(t); aim(LB.camera, c.pos, c.target);
  const room = 1 - ss(lt, 15.4, 18.2), lift = seg(lt, 15.2, 18.6), iH = 380 + (1340 - 380) * E.io3(seg(lt, 25.3, 30.2));   // 停在第 1340 个点：从第 1075 个点起两个点一直在不同的翅膀上
  LB.update({ t, room, paperA: 1 - ss(lt, 16.2, 18.4), lift, aEnd: LZ_N, bStart: 0, bEnd: B_I(lt), aA: BF_A(lt), aB: (lt >= 8 ? 1 : 0) * BF_A(lt),
    noteK: seg(lt, 6.2, 7.6), glow: ss(lt, 15.6, 18.2), ribPx: lerp(1.6, 1.0, ss(lt, 15.5, 18.5)),
    heads: { on: (lt > 7.9 && lt < 14.6) || (lt > 25.2 && lt < 30.6) || (lt > 31.0 && lt < 39.2), iA: lt < 20 ? B_I(lt) : lt < 30.8 ? iH : I_R(lt), iB: lt < 20 ? B_I(lt) : lt < 30.8 ? iH : I_R(lt), r: lt < 20 ? .0045 : .012 * (1 - ss(lt, 38.4, 39.2)) + 1e-5 },
    win: lt < 30.8 ? { a: fade(lt, 25.2, 30.6, .4, .5), i: iH, len: 380 } : { a: ss(lt, 31.1, 31.6) * (1 - ss(lt, 38.2, 39.2)), i: I_R(lt), len: 240 }, thread: ss(lt, 31.6, 32.4) * (1 - ss(lt, 38.2, 39.0)) });
  core.render(LB.scene, LB.camera, { haze: 1 - ss(lt, 0, .5), hazeCol: '#EEF1F4', bloom: lerp(.4, .55, ss(lt, 15.5, 18)), threshold: lerp(.95, .82, ss(lt, 15.5, 18)) });
}

/* ---------- 第六段：理查森（T_RC –） ---------- */
const D2R = Math.PI / 180, R_E = .03, E_PR = pBAt(T_E0 + 4), TILT = .41;
const rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
const rotZ = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
const localDir = (lat, lon) => { const u = (lon + 180) / 360, p = lat * D2R; return [-Math.cos(2 * Math.PI * u) * Math.cos(p), Math.sin(p), Math.sin(2 * Math.PI * u) * Math.cos(p)]; };
const earthDirW = (lat, lon, spin = 0) => rotZ(rotY(localDir(lat, lon), spin), TILT);     // 理查森那一段地球不转（spin = 0）；最后一段会转
const NP = rotZ([0, 1, 0], TILT), northAt = a => norm3(a.map((v, i) => NP[i] - v * dot3(NP, a)));
const CYC = [22, -55], CELL = [42.3, -34.5], CELLBOX = [41.4, 43.2, -36, -33];              // 大西洋上的一个飓风；钻进去的那一格：亚速尔群岛西北的一格海面
const N_CYC = earthDirW(...CYC), N_CELL = earthDirW(...CELL);
const SUN_RC = norm3(N_CELL.map((v, i) => v * Math.cos(.785) + norm3(N_CYC.map((w, j) => w - v * dot3(N_CYC, N_CELL)))[i] * Math.sin(.785)));   // 太阳在那一格头顶偏 45°，偏向飓风那边
/* 蝴蝶 → 地球：用切点那一帧实验室相机的朝向，搭一个从"实验室"到"地球上空"的变换 */
const LABCUT = (() => { const c = camLab(T_RC), f = norm3(c.pos.map((v, i) => v - BF_CENTER[i])), r = norm3(cross3([0, 1, 0], f)), u = cross3(f, r), D = Math.hypot(...c.pos.map((v, i) => v - BF_CENTER[i])); return { f, r, u, Dbase: D / Math.exp(PULL(T_RC)) }; })();
const SPCUT = (() => { const f = N_CYC, u = northAt(N_CYC), r = cross3(u, f); return { f, r, u }; })();
const K_BF = .1 / (LABCUT.Dbase * PULL_END);                                                // 拉到头时，相机在蝴蝶上方 0.1（约 3.3 个地球半径）
const O_ALT = t => lerp(.003, .0004, ss(t, T_RC + .9, T_RC + 2.6));                       // 蝴蝶在云顶上方多高
const bflyPts = (run, t) => {
  const out = new Float32Array(LZ_N * 3), kk = K_BF * (1 - .65 * ss(t, T_RC + .9, T_RC + 2.6)), O = add3(E_PR, N_CYC.map(v => v * (R_E + O_ALT(t))));
  for (let i = 0; i < LZ_N; i++) { const p = butterflyPoint(run, i), d = [p[0] - BF_CENTER[0], p[1] - BF_CENTER[1], p[2] - BF_CENTER[2]], a = dot3(d, LABCUT.r), b = dot3(d, LABCUT.u), c = dot3(d, LABCUT.f);
    for (let k = 0; k < 3; k++) out[i * 3 + k] = O[k] + (SPCUT.r[k] * a + SPCUT.u[k] * b + SPCUT.f[k] * c) * kk; }
  return out;
};
/* 地球上空的机位：锚点（在哪一块上空）× 高度；一直正对着下面看，北在上 */
const H_PULL = t => .003 + K_BF * LABCUT.Dbase * Math.exp(PULL(t));
const H_DIVE = [[T_RC + 3.0, Math.log(.103)], [T_RC + 5.0, Math.log(.096)], [T_RC + 6.4, Math.log(.03)], [T_HC - .5, Math.log(.0022)], [T_HC, Math.log(.0018)]];
/* 最后一段匀减速：从俯冲曲线上某一刻 t0 起，ln(高度) 按二次曲线落到切点那一帧的高度、速度正好减到 0（t0 用二分法解出来：值和速度都和原曲线接上） */
const H_BRAKE = (() => { const L = t => trk(H_DIVE, t), dL = t => (L(t + 1e-4) - L(t - 1e-4)) / 2e-4, lnE = Math.log(.0018), f = t => L(t) - lnE + dL(t) * (T_HC - t) / 2;
  let a = T_HC - 1.5, b = T_HC - .3; for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (f(m) > 0) a = m; else b = m; }
  return { t0: a, r: -dL(a), lnE }; })();
const altRC = t => t <= T_RC + 3.0 ? H_PULL(t) : t < H_BRAKE.t0 ? Math.exp(trk(H_DIVE, t))
  : Math.exp(H_BRAKE.lnE + H_BRAKE.r * (T_HC - H_BRAKE.t0) / 2 * (1 - seg(t, H_BRAKE.t0, T_HC)) ** 2);   // 切进大厅那一帧正好停住
const anchorRC = t => norm3(slerp3(N_CYC, N_CELL, E.io3(seg(t, T_RC + 4.2, T_HC - .4))));
/* 网格离地多高（地球半径的倍数）：镜头贴近地面时几乎贴地（格子和地图上那一格一样大，切到大厅墙上对得上），高了以后再罩到云上面 */
const gridLift = h => lerp(1e-5, .009, VK.smooth(clamp((h - .0025) / (.04 - .0025))));
/* 镜头在切点停稳：前一段的速度一路降到 0（easeEnd）、后一段从 0 起步（easeStart），首尾和原来那条曲线速度相接 */
const easeEnd = u => -u * u * u + u * u + u, easeStart = u => 1 - easeEnd(1 - u);
function camRC(t) { const a = anchorRC(t), h = altRC(t); return { pos: add3(E_PR, a.map(v => v * (R_E + h))), target: add3(E_PR, a.map(v => v * R_E)), up: northAt(a), h }; }
function spaceFrameRC(t) {
  const c = camRC(t); SP.camera.near = clamp(c.h * .25, .00002, .004); SP.camera.far = c.h < .02 ? 3 : 400; SP.camera.updateProjectionMatrix(); aimUp(SP.camera, c.pos, c.target, c.up);
  const lc = localDir(...CYC);
  SP.update({
    t, target: c.target, A: PA, B: PB, bA: 0, bSplit: 0, planetSpin: 0, trailVis: 0, planetTrail: 0, trailA: [0, 1, 2, 3].map(() => new Float32Array(TRN * 3)), trailB: [0, 1, 2, 3].map(() => new Float32Array(TRN * 3)),
    bgA: ss(t, T_RC + .6, T_RC + 2.6), nebA: .5 * ss(t, T_RC + 1, T_RC + 3), dustA: 0, sysK: 0, bg: ss(t, T_RC + .4, T_RC + 2.4),
    earth: { on: true, pos: E_PR, reveal: 1, ringK: 1, spin: 0, cloudSpin: 0, sunDir: SUN_RC, sunK: ss(t, T_RC + .3, T_RC + 2.4), cloudA: VK.smooth(clamp((c.h - .004) / .016)),
      grid: { a: ss(t, T_RC + 2.3, T_RC + 2.8), reveal: 3.4 * E.io3(seg(t, T_RC + 2.4, T_RC + 5.4)), center: lc, lift: gridLift(c.h), cell: CELLBOX, cellA: ss(t, T_RC + 5.4, T_RC + 6.6) }, cyc: { a: ss(t, T_RC + .9, T_RC + 2.6), dir: lc } },
    bfly: { a: .35 * (1 - ss(t, T_RC + 1.2, T_RC + 2.6)), A: bflyPts(RUN_A, t), B: bflyPts(RUN_B, t), px: 1.0 },
  });
  core.render(SP.scene, SP.camera, { bloom: lerp(.55, .72, ss(t, T_RC, T_RC + 1.5)), threshold: lerp(.82, .85, ss(t, T_RC, T_RC + 1.5)) });
}
/* ---------- 大厅 ---------- */
const N_H = hallDir(...CELL), P_H = N_H.map(v => v * HR), NORTH_H = (() => { const a = hallDir(CELL[0] + .01, CELL[1]); return norm3(a.map((v, i) => v - N_H[i])); })();
const HZ = norm3([N_H[0], 0, N_H[2]]), SIDE = norm3(cross3([0, 1, 0], HZ));
/* 大厅里那盏"太阳"：把地球那一格上空的太阳方向，按（法线、北、东）换到大厅那一格上 */
const mapSun = (sunE, nE, nHall, northHall) => { const uS = northAt(nE), eS = cross3(uS, nE), a = dot3(sunE, nE), b = dot3(sunE, uS), c = dot3(sunE, eS);
  const nH = nHall.map(v => -v), uH = norm3(northHall.map((v, i) => v - nHall[i] * dot3(northHall, nHall))), eH = cross3(uH, nH);
  return norm3(nH.map((v, i) => v * a + uH[i] * b + eH[i] * c)); };
const SUN_H = mapSun(SUN_RC, N_CELL, N_H, NORTH_H);
/* 出口：理查森算的那一格的北边一格（德国中部），楼座之间，墙上没有挡东西 */
const EXIT = [51.3, 10.5], EXITBOX = [50.4, 52.2, 9, 12];
const N_X = hallDir(...EXIT), P_X = N_X.map(v => v * HR), NORTH_X = (() => { const a = hallDir(EXIT[0] + .01, EXIT[1]); return norm3(a.map((v, i) => v - N_X[i])); })();
const A_EXIT = earthDirW(...EXIT), SUN_X = norm3(A_EXIT.map((v, i) => v * Math.cos(.785) - northAt(A_EXIT)[i] * Math.sin(.785)));   // 太阳在那一格头顶偏 45°，偏南
const SUN_H2 = mapSun(SUN_X, A_EXIT, N_X, NORTH_X);
const hallPos = d => P_H.map((v, i) => v - N_H[i] * d);                                   // 离墙 d 的那一点（朝着墙看）
const HK = [[0, hallPos(2.4)], [.6, hallPos(2.7)], [1.4, hallPos(4.2)], [2.2, hallPos(7.5)], [3.0, hallPos(12.5)], [3.8, hallPos(18)],
  [5.4, add3(HZ.map(v => v * 4), [0, 8, 0])], [7.2, add3(HZ.map(v => v * -8), [0, 5, 0])], [8.8, add3(HZ.map(v => v * -13), [0, 3.6, 0])], [12.8, add3(add3(HZ.map(v => v * -14), [0, 3.6, 0]), SIDE.map(v => v * 1.6))]];
const HT = [[0, P_H], [2.8, P_H], [4.6, add3(HZ.map(v => v * 28), [0, 30, 0])], [7.2, add3(HZ.map(v => v * 30), [0, 7, 0])], [8.8, add3(HZ.map(v => v * 30), [0, 5.5, 0])], [12.8, add3(add3(HZ.map(v => v * 30), [0, 5.5, 0]), SIDE.map(v => v * 1.6))]];
const hallKey = (keys, h) => [0, 1, 2].map(c => trk(keys.map(k => [k[0], k[1][c]]), h));
/* 推近：目标点和距离各走各的（距离按对数），方向慢慢转过去 */
function approach(h, h0, h1, A, B) {
  const k = E.io3(seg(h, h0, h1)), kt = E.io3(seg(h, h0, h0 + (h1 - h0) * .7));
  const dA = A.pos.map((v, i) => v - A.target[i]), dB = B.pos.map((v, i) => v - B.target[i]), LA = Math.hypot(...dA), LB2 = Math.hypot(...dB);
  const dir = norm3(slerp3(norm3(dA), norm3(dB), k)), target = lerpV(A.target, B.target, kt);
  return { pos: add3(target, dir.map(v => v * logLerp(LA, LB2, k))), target };
}
const heroPose = (cam, tgt) => ({ pos: HL.heroWorld(...cam), target: HL.heroWorld(...tgt) });
function camHall(t) {
  const h = t - T_HC, sp = HL.sp, top = HL.top;
  const hk = h < .6 ? .6 * easeStart(seg(h, 0, .6)) : h;                                // 从切点那一帧的静止慢慢退出来
  const wide = h <= 12.8 ? { pos: hallKey(HK, hk), target: hallKey(HT, hk) } : { pos: hallKey(HK, 12.8), target: hallKey(HT, 12.8) };
  if (h < 12.9) return { ...wide, up: h < 3.6 ? norm3(lerpV(NORTH_H, [0, 1, 0], ss(h, 1.6, 3.6))) : [0, 1, 0] };
  const desk = heroPose([sp * .05, sp * 1.5, sp * 2.3], [0, top, -sp * .02]), papers = heroPose([-sp * .1, sp * 1.0, sp * .8], [-sp * .02, top, sp * .05]);
  const b = HL.baroWorld(), baro = { pos: add3(add3(b.c, b.n.map(v => v * b.r * 4.6)), [0, b.r * .6, 0]), target: b.c };
  let c;
  const drift = hh => SIDE.map(v => v * .02 * sp * Math.max(0, hh - 23));
  if (h < 17.4) c = approach(h, 12.9, 17.0, wide, desk);
  else if (h < 21.6) c = approach(h, 17.4, 19.6, desk, papers);
  else if (h < 29.6) { c = approach(h, 21.6, 23.0, papers, baro); c.pos = add3(c.pos, drift(h)); }
  else { const A = { pos: add3(baro.pos, drift(29.6)), target: baro.target }, X = { pos: P_X.map((v, i) => v - N_X[i] * 2.4), target: P_X };
    /* 先从气压计上方升起来，再转身朝墙上那一格滑过去：不隔着气压计看墙，也不贴着墙走 */
    const W2 = add3(add3(b.c, b.n.map(v => v * .35)), [0, .45, 0]);
    const PK = [[29.6, A.pos], [29.65, A.pos], [30.8, W2], [32.6, X.pos]], TK = [[29.6, A.target], [29.65, A.target], [30.6, add3(b.c, [0, .15, 0])], [31.9, X.target], [32.6, X.target]];
    const hp = h < 30.8 ? h : 30.8 + 1.8 * easeEnd(seg(h, 30.8, 32.6));                  // 贴近墙那一段一路减速，切点那一帧正好停住（原来在最后几帧冲过头再弹回来）
    c = { pos: hallKey(PK, hp), target: hallKey(TK, h) }; return { ...c, up: norm3(lerpV([0, 1, 0], NORTH_X, ss(h, 30.6, 32.6))) }; }
  return { ...c, up: [0, 1, 0] };
}
function hallFrame(t) {
  const h = t - T_HC, c = camHall(t); aimUp(HL.camera, c.pos, c.target, c.up);
  const near = h < 3.8 || h > 31 ? .05 : .0005; if (HL.camera.near !== near) { HL.camera.near = near; HL.camera.updateProjectionMatrix(); }   // 两头镜头对着空墙：近平面放远，深度精度够网格贴墙画
  const dWall = HR - Math.hypot(...c.pos), gridLift = lerp(.002, .08, VK.smooth(clamp((dWall - 3) / 9)));
  const k = E.out3(seg(h, 22.4, 23.3)), calcRaw = 1004 + 145 * k, hit = calcRaw >= 1064;
  const tHit = T_HC + 22.4 + .9 * (1 - Math.cbrt(1 - 60 / 145)), calc = hit ? 1064 - 3.5 * Math.abs(Math.sin((t - tHit) * 16)) * Math.exp(-(t - tHit) * 5) : calcRaw;   // 撞到止针，弹两下
  /* 出口那一刀：大厅的灯灭掉、墙像被太阳照着，网格亮回来，和外面的地球一模一样 */
  const ex = ss(h, 30.2, 32.4);
  HL.update({ t, sunK: lerp(lerp(1, .3, ss(h, .4, 3.4)), 1, ex), sunDir: norm3(slerp3(SUN_H, SUN_H2, ss(h, 24, 29))), aim: P_H, room: ss(h, .3, 3.0) * (1 - ss(h, 30.2, 32.2)),
    gridA: lerp(1, .22, ss(h, 1.8, 5)) + .78 * ss(h, 30.8, 32.4), gridLift,
    mirror: { axis: (h < 16 ? N_H : N_X).map(v => -v), out: h < 16 ? N_H : N_X, k: h < 16 ? 1 - ss(h, .2, 1.6) : ss(h, 31.6, 32.5) },   /* 切点附近墙按凸面受光（见 hall.js） */ cell: h < 20 ? CELLBOX : EXITBOX, cellA: 1 - ss(h, .8, 3) + ss(h, 31.0, 32.4), lampA: ss(h, .8, 4) * (1 - ss(h, 30.6, 32.2)), flick: ss(h, 9.2, 10.2) * (1 - ss(h, 12.8, 14)),
    beamA: ss(h, 5.4, 7) * (1 - ss(h, 13.4, 15)), heroLamp: ss(h, 13.2, 15) * (1 - ss(h, 30.4, 31.6)), pages: E.io3(seg(h, 17.6, 21.2)), calc, real: lerp(1004, 1003.1, k) });
  core.render(HL.scene, HL.camera, { bloom: .72, threshold: .85 });
}

/* ---------- 第七段：今天（E0 – T_PH2） ---------- */
const ORG = [40, 145], TYPH = [15, 135];                                                    // 误差洇开的起点（日本以东）；台风（菲律宾以东）
const S1 = (() => { let best = 0, bd = -2; for (let k = 0; k < 720; k++) { const sp = -Math.PI + k * Math.PI / 360, d = dot3(earthDirW(...ORG, sp), A_EXIT); if (d > bd) { bd = d; best = sp; } } return best; })();   // 转多少，日本以东就到了镜头底下
const spinF = t => S1 * E.io3(seg(t, E0 + 5.0, E0 + 7.6));
const A_TY = earthDirW(25, 138.5, S1);
const ALT_K = [[E0, .0018], [E0 + 3.8, .1], [E0 + 18.4, .1], [E0 + 21.0, .04], [E0 + 37.0, .04], [E0 + 39.6, .1]];
const altF = t => { for (let i = 0; i < ALT_K.length - 1; i++) { const [a, ha] = ALT_K[i], [b, hb] = ALT_K[i + 1]; if (t <= b) return logLerp(ha, hb, E.io3(seg(t, a, b))); } return ALT_K[ALT_K.length - 1][1]; };
const anchorF = t => { const k1 = E.io3(seg(t, E0 + 18.4, E0 + 21.0)), k2 = E.io3(seg(t, E0 + 37.0, E0 + 39.6)); return norm3(slerp3(norm3(slerp3(A_EXIT, A_TY, k1)), A_EXIT, k2 * .5)); };
function camF(t) { const a = anchorF(t), h = altF(t); return { pos: add3(E_PR, a.map(v => v * (R_E + h))), target: add3(E_PR, a.map(v => v * R_E)), up: northAt(a), h }; }
/* 51 条路径：1 条控制 + 50 条扰动。转向（先往西北、再折向东北）的快慢和幅度各不一样，差别随天数越来越大 */
const ENS = (() => { const r = TB.rng(51), gauss = () => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return Array.from({ length: 51 }, (_, m) => m === 0 ? { a: 1, b: 0, c: 0, j1: 0, j2: 0 } : { a: 1 + .13 * gauss(), b: gauss(), c: gauss(), j1: .12 * gauss(), j2: .12 * gauss() }); })();
const memberLL = (m, d) => { const e = ENS[m], da = d * e.a; return [TYPH[0] + .9 * da + .16 * da * da + e.c * .035 * Math.pow(d, 1.8) + e.j1, TYPH[1] - 2.2 * da + .32 * da * da + e.b * .05 * Math.pow(d, 1.9) + e.j2]; };
const gcd = (p, q) => { const a = localDir(...p), b = localDir(...q); return Math.acos(clamp(dot3(a, b), -1, 1)); };
const MEAN = d => { let la = 0, lo = 0; for (let m = 0; m < 51; m++) { const p = memberLL(m, d); la += p[0]; lo += p[1]; } return [la / 51, lo / 51]; };
const R70 = (() => { const out = []; for (let k = 0; k <= 40; k++) { const d = k / 4, c = MEAN(d), ds = Array.from({ length: 51 }, (_, m) => gcd(memberLL(m, d), c)).sort((a, b) => a - b); out.push(Math.max(ds[Math.floor(.7 * 50)], .004)); } return out; })();   // 70% 的路径落在多大的圈里（弧度）
const r70 = d => { const f = clamp(d, 0, 10) * 4, k = Math.min(39, Math.floor(f)); return lerp(R70[k], R70[k + 1], f - k); };
const NPT = 61, trackRibs = ENS.map((_, m) => { const rb = new Ribbon(NPT, m === 0 ? GOLD : ICE); rb.mat.uniforms.uTail.value = 0; rb.mesh.visible = false; SP.scene.add(rb.mesh); return rb; });
const NC = 72, circRibs = [1, 2, 3, 4, 5].map(() => { const rb = new Ribbon(NC, '#FFFFFF'); rb.mat.uniforms.uTail.value = 0; rb.mesh.visible = false; SP.scene.add(rb.mesh); return rb; });
const toWorld = (ll, spin, lift = 1.013) => { const d = earthDirW(ll[0], ll[1], spin); return add3(E_PR, d.map(v => v * R_E * lift)); };
const D_NOW = t => 10 * E.io3(seg(t, E0 + 22.8, E0 + 27.2));                              // 路径往前长到第几天
const YEAR = t => 1985 + 40 * seg(t, E0 + 33.0, E0 + 36.6);                                // 1985 → 2025
const YEAR_SHIFT = t => { const y = YEAR(t), k = (y - 1985) / 10, f = Math.floor(k), u = k - f; return (4 - (f + E.io3(clamp((u - .55) / .45)))); };   // 每过十年，圈缩回去一天（一格一格地跳，跳的时候顺滑）
function updateEnsemble(t, spin) {
  const dN = D_NOW(t), on = t > E0 + 22.7, dim = lerp(1, .25, ss(t, E0 + 28.4, E0 + 29.6)), camP = SP.camera.position;
  trackRibs.forEach((rb, m) => {
    rb.mesh.visible = on; if (!on) return;
    const pts = new Float32Array(NPT * 3);
    for (let j = 0; j < NPT; j++) { const d = Math.min(dN, 10 * j / (NPT - 1)); pts.set(toWorld(memberLL(m, d), spin), j * 3); }
    rb.update(pts, camP, m === 0 ? 2.4 : 1.1, UPP, 1); rb.mat.uniforms.uA.value = (m === 0 ? .95 : .32 * dim) * ss(t, E0 + 22.7, E0 + 23.2);
  });
  const shift = YEAR_SHIFT(t);
  circRibs.forEach((rb, i) => {
    const day = i + 1, a = ss(t, E0 + 28.4 + i * .4, E0 + 28.9 + i * .4); rb.mesh.visible = a > .001; if (!rb.mesh.visible) return;
    const c = MEAN(day), cd = localDir(...c), e1 = norm3(cross3([0, 1, 0], cd)), e2 = cross3(cd, e1), rho = r70(day + (t > E0 + 32.8 ? shift : 0) * ss(t, E0 + 32.8, E0 + 33.4) + (t > E0 + 32.8 ? 0 : 0));
    const pts = new Float32Array(NC * 3);
    for (let j = 0; j < NC; j++) { const th = 2 * Math.PI * j / (NC - 1), l = cd.map((v, k) => v * Math.cos(rho) + (e1[k] * Math.cos(th) + e2[k] * Math.sin(th)) * Math.sin(rho)), w = rotZ(rotY(l, spin), TILT); pts.set(add3(E_PR, w.map(v => v * R_E * 1.014)), j * 3); }
    rb.update(pts, camP, 1.6, UPP, 1); rb.mat.uniforms.uA.value = .85 * a;
  });
}
function spaceFrameF(t) {
  const c = camF(t), spin = spinF(t); SP.camera.near = clamp(c.h * .25, .00002, .004); SP.camera.far = c.h < .02 ? 3 : 400; SP.camera.updateProjectionMatrix(); aimUp(SP.camera, c.pos, c.target, c.up);
  const step = Math.exp(lerp(0, Math.log(1 / 22), E.io3(seg(t, E0 + 1.4, E0 + 4.6))));
  const days = 12 * seg(t, E0 + 9.4, E0 + 13.4), rS = Math.min(Math.PI / 2, (.5 * Math.pow(2, days / 1.6)) * Math.PI / 180) * (t < E0 + 9.4 ? (1 + .25 * Math.sin((t - E0) * 9)) : 1);
  SP.update({
    t, target: c.target, A: PA, B: PB, bA: 0, bSplit: 0, planetSpin: 0, trailVis: 0, planetTrail: 0, trailA: [0, 1, 2, 3].map(() => new Float32Array(TRN * 3)), trailB: [0, 1, 2, 3].map(() => new Float32Array(TRN * 3)),
    bgA: 1, nebA: .5, dustA: 0, sysK: 0, bg: 1,
    earth: { on: true, pos: E_PR, reveal: 1, ringK: 1, spin, cloudSpin: 0, sunDir: SUN_X, sunK: 1, cloudA: VK.smooth(clamp((c.h - .004) / .016)),
      grid: { a: lerp(1, .5, ss(t, E0 + 2, E0 + 4.6)) * (1 - ss(t, E0 + 5.2, E0 + 6.6)), reveal: 4, center: [0, 1, 0], lift: gridLift(c.h), cell: EXITBOX, cellA: 1 - ss(t, E0 + .6, E0 + 2.0), step: [1.8 * step, 3 * step] },
      cyc: { a: ss(t, E0 + 19.0, E0 + 20.2), dir: localDir(...TYPH) },
      stain: { a: ss(t, E0 + 7.6, E0 + 8.1) * (1 - ss(t, E0 + 17.6, E0 + 18.8)), r: rS, center: localDir(...ORG) } },
  });
  updateEnsemble(t, spin);
  core.render(SP.scene, SP.camera, { bloom: .72, threshold: .85 });
  return { days };
}
/* 屏幕上的那一帧：把太空场景渲好的画面拷一份，交给手机的屏幕 */
const SNAP = (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; })();
const PHONE_DESK = (() => { const c = camPhone(4.6); return { pos: c.pos, target: c.target }; })();          // 和开头 4.6 秒那一刻同一个机位
const PHONE_NEAR = { pos: lerpV(PHONE_DESK.pos, PHONE_DESK.target, .32), target: PHONE_DESK.target };
function camPhoneEnd(t) {
  const sf = PH.screenFrame(), dist = sf.SD / 2 / Math.tan(15 * Math.PI / 180), cut = { pos: add3(sf.c, [0, dist, 0]), target: sf.c };
  let c = t < T_PH2 + 12.8 ? approach(t, T_PH2, T_PH2 + 3.4, cut, PHONE_DESK) : approach(t, T_PH2 + 12.8, T_PH2 + 18.6, PHONE_DESK, PHONE_NEAR);
  return { ...c, up: norm3(lerpV(sf.up, [0, 1, 0], ss(t, T_PH2 + .3, T_PH2 + 2.8))) };
}
function phoneFrameEnd(t) {
  const page = E.io3(seg(t, T_PH2 + 2.6, T_PH2 + 3.6));
  if (page < 1) { spaceFrameF(t); SNAP.getContext('2d').drawImage(core.canvas, 0, 0); }
  const coins = {}; for (let i = 9; i < 15; i++) coins[i] = { vis: 0 };
  /* 熄屏以后黑玻璃上的倒影：三颗太阳还在跳那支舞（用前面那场模拟） */
  const sim = 2 + (t - T_PH2) * .25, P3 = at(RA, sim), off = ss(t, T_PH2 + 13.4, T_PH2 + 14.6), sf = PH.screenFrame();
  const refl = off > 0 ? [0, 1, 2].map(i => ({ x: sf.UIW / 2 + P3[i * 3] * 300, y: sf.UIH / 2 + P3[i * 3 + 2] * 300, r: 46 + 10 * i, a: .85 * ss(t, T_PH2 + 14.2, T_PH2 + 15.6) })) : null;
  PH.update({ t, screenOn: 1, room: 1, stars: 0, cellIn: DAYS.map(() => 1), iconHide: DAYS.map(() => 0), hl15: 0, coins, cards: [0, 1, 2].map(() => ({ a: 0, fill: 0 })), coinGlow: 0, morph: { on: false },
    page, snap: SNAP, raw: true, sheen: ss(t, T_PH2 + 1, T_PH2 + 3), trust7: ss(t, T_PH2 + 3.8, T_PH2 + 4.6), fan: ss(t, T_PH2 + 7.8, T_PH2 + 8.8),
    pull: fade(t, T_PH2 + 10.0, T_PH2 + 11.6, .4, .5), updated: ss(t, T_PH2 + 11.0, T_PH2 + 11.6), off, refl });
  const c = camPhoneEnd(t); aimUp(PH.camera, c.pos, c.target, c.up);
  const k = ss(t, T_PH2 + .3, T_PH2 + 2.2);
  core.render(PH.scene, PH.camera, { bloom: .55 * k, vig: .55 * k, ca: .0022 * k, fade: 1 - .82 * ss(t, T_PH2 + 18.2, T_PH2 + 19.4) });
}
/* 15 天的尺子（屏上的叠层）：第几天被误差盖住；两周那里一道墙 */
function strip(fr, a, dNow, wallK) {
  if (a <= 0) return;
  const x0 = 330, w = 80, gap = 4, y0 = 690, hgt = 92;
  fr.text('预报的第几天', x0 - 20, y0 + hgt / 2, { font: 'serifr', size: 20, track: 2, color: PAL.sub, a: a * .85, align: 'r' });
  for (let i = 0; i < 15; i++) {
    const x = x0 + i * (w + gap), cov = ss(dNow, i + .3, i + 1), beyond = wallK > 0 && i === 14 ? 1 - .55 * wallK : 1;
    fr.rect(x, y0, w, hgt, { r: 10, fill: 'rgba(10,18,32,.72)', color: '#7E8FA6', w: 1, a: a * .7 * beyond });
    if (cov > 0) fr.rect(x + 2, y0 + 2, w - 4, hgt - 4, { r: 9, fill: 'rgba(100,227,246,.32)', a: a * cov * beyond });
    fr.text(`第${i + 1}天`, x + w / 2, y0 + 30, { font: 'serifr', size: 19, color: PAL.ink, a: a * beyond });
    fr.text(`10/${13 + i}`, x + w / 2, y0 + 64, { font: 'mono', size: 15, color: PAL.label, a: a * beyond });
  }
  if (wallK > 0) { const x = x0 + 14 * (w + gap) - gap / 2, yT = lerp(y0 + hgt, y0 - 40, E.out3(wallK));
    fr.line(x, y0 + hgt + 14, x, yT, { w: 4, color: GOLD, a: a, glow: 14 });
    fr.text('上限 ≈ 两周', x, y0 - 62, { font: 'serifr', size: 24, track: 3, color: GOLD, a: a * ss(wallK, .5, 1), align: 'c' }); }
}

/* ---------- 字幕 ---------- */
const SUBS = [
  { a: .5, b: 4.5, zh: '你手机里的天气 App，能往后报 15 天。' },
  { a: 5.0, b: 8.6, zh: '第 15 天这个太阳，你敢按它订机票吗？' },
  { a: 9.0, b: 13.6, zh: '5 天内九成准，7 天八成——10 天以后，差不多是{抛硬币}。' },
  { a: 14.0, b: 17.4, zh: '这不是气象台不努力。' },
  { a: 24.3, b: 27.9, zh: '三颗太阳互相拉扯，谁也说不准明天升起哪一颗。' },
  { a: 29.0, b: 32.0, zh: '三体人管这叫{乱纪元}。' },
  { a: 34.4, b: 39.0, zh: '游戏里，三千万士兵举旗，排成一台「人列计算机」去算太阳。' },
  { a: 39.4, b: 43.8, zh: '可这个文明，最后还是毁于{三日连珠}。' },
  { a: 44.4, b: 48.6, zh: '为什么算不准？把一颗太阳挪动{十万分之一}，再算一遍。' },
  { a: T_SPLIT - 3.0, b: T_SPLIT + 1.2, zh: '前几圈分毫不差，然后——{分道扬镳}。' },
  { a: T_EJECT - .1, b: T_EJECT + 3.9, zh: '差一丝，结局就是两个世界——这叫{混沌}。' },
  { a: T_E0 + 3.3, b: T_E0 + 7.3, zh: '地球的天上只有一个太阳，可天气，也在跳同一支乱舞。' },
  { a: T_LAB + .8, b: T_LAB + 4.8, zh: '1961 年，气象学家洛伦茨在电脑上算天气。' },
  { a: T_LAB + 5.2, b: T_LAB + 9.6, zh: '他想省事，把 0.506127 抄成 {0.506}，重跑一遍。' },
  { a: T_LAB + 10.0, b: T_LAB + 14.6, zh: '头几天几乎一样；几个月后，完全是两种天气。' },
  { a: T_LAB + 15.0, b: T_LAB + 19.6, zh: '两条线放进三维空间——画出来的，像一只{蝴蝶}。' },
  { a: T_LAB + 20.0, b: T_LAB + 25.0, zh: '1972 年，他把这件事问成了一句话——' },
  { a: T_LAB + 25.5, b: T_LAB + 30.1, zh: '开头只差一丝，一个点落在左翅，一个点落在右翅。' },
  { a: T_LAB + 32.2, b: T_LAB + 38.4, zh: '三颗太阳和地球的天气，是{同一种数学}。' },
  { a: T_RC + 1.4, b: T_RC + 6.0, zh: '1922 年，英国人理查森想：把地球切成格子，一格一格地算。' },
  { a: T_HC + .5, b: T_HC + 4.3, zh: '他设想了一座大厅，墙上画满世界地图。' },
  { a: T_HC + 4.7, b: T_HC + 8.9, zh: '6.4 万人坐在地图上，各算自己脚下那一块。' },
  { a: T_HC + 9.3, b: T_HC + 12.7, zh: '——这就是地球版的{人列计算机}。' },
  { a: T_HC + 13.1, b: T_HC + 17.0, zh: '可真正动手算过的，只有一个人：他自己。' },
  { a: T_HC + 17.4, b: T_HC + 21.4, zh: '6 小时的天气，他前后算了约两年。' },
  { a: T_HC + 21.8, b: T_HC + 25.8, zh: '算出来：6 小时里，气压涨了 {!145 百帕}。' },
  { a: T_HC + 26.2, b: T_HC + 30.0, zh: '可那天真实的气压，几乎没动。' },
  { a: E0 + .8, b: E0 + 5.0, zh: '今天，超级计算机替他算：全球约 9 公里一格，每天重算。' },
  { a: E0 + 5.6, b: E0 + 8.8, zh: '可起点的观测，总会差一点——' },
  { a: E0 + 9.2, b: E0 + 13.8, zh: '这一点差别一天天长大，十来天，就爬满了半个地球。' },
  { a: E0 + 14.2, b: E0 + 18.2, zh: '所以，天气预报有一道天花板：大约{两周}。' },
  { a: E0 + 18.6, b: E0 + 22.6, zh: '气象台的办法是：不只算一个世界，算 {51} 个。' },
  { a: E0 + 23.0, b: E0 + 27.8, zh: '前三天，51 条路挤成一股；十天后，散成一把扇子。' },
  { a: E0 + 28.2, b: E0 + 32.4, zh: '新闻里台风路径那个越画越大的圈，就是这把扇子。' },
  { a: E0 + 32.8, b: E0 + 37.2, zh: '四十年来，这把扇子每十年，往后推了一天。' },
  { a: T_PH2 + 3.4, b: T_PH2 + 7.2, zh: '所以：一周内的预报，放心信；' },
  { a: T_PH2 + 7.6, b: T_PH2 + 12.4, zh: '十天以后的，当趋势看；出门前，再刷新一次。' },
  { a: T_PH2 + 12.8, b: T_PH2 + 18.2, zh: '乱纪元里，没有算得准的第十五天——只有每天都重算一遍的明天。' },
];

/* ---------- 小字 ---------- */
const GOLDG = [[0, '#F6E3B4'], [.55, '#E7C477'], [1, '#C79A4C']];
function labelBlock(fr, a, big, caps, line) {
  if (a <= 0) return;
  fr.text(caps, 112, 84, { font: 'latin', size: 21, track: 7, color: PAL.goldLo, a: a * .9, align: 'l' });
  fr.text(big, 108, 142, { font: 'serifl', size: 70, track: 12, align: 'l', grad: GOLDG, a, glow: 14, glowColor: '#D9B15F', glowA: .28 });
  fr.line(112, 186, 112 + 290 * E.out3(a), 186, { w: 1.2, color: '#B89B63', a: .45 * a, cap: 'butt' });
  fr.text(line, 112, 214, { font: 'serifr', size: 23, track: 3, color: PAL.sub, a: a * .85, align: 'l' });
}
const note = (fr, s, a) => a > 0 && fr.text(s, 1816, 836, { font: 'serifr', size: 18, track: 2, color: PAL.label, a: .6 * a, align: 'r' });
function legend(fr, a) {
  if (a <= 0) return;
  const y = 84, x = 1404;
  fr.circle(x, y, 7, { fill: GOLD, a: a * .95, glow: 10 }); fr.text('世界 A', x + 18, y, { font: 'serifr', size: 21, track: 2, color: PAL.sub, a, align: 'l' });
  fr.circle(x + 132, y, 7, { color: ICE, w: 2, a, glow: 10 }); fr.text('世界 B', x + 150, y, { font: 'serifr', size: 21, track: 2, color: PAL.sub, a, align: 'l' });
}
/* 两个世界的距离（对数轴）：曲线画到当前模拟时刻 */
const LOG0 = -5.3, LOG1 = .4;
function chart(fr, t, sim, a) {
  if (a <= 0) return;
  const x0 = 1470, x1 = 1816, y0 = 300, y1 = 166, px0 = 1384, simEnd = simOf(DUR);
  const X = s => lerp(x0, x1, s / simEnd), Y = v => lerp(y0, y1, (Math.log10(Math.max(v, 1e-9)) - LOG0) / (LOG1 - LOG0));
  fr.rect(px0, 112, x1 - px0 + 24, 214, { r: 10, fill: 'rgba(8,14,26,.55)', color: '#7E8FA6', w: 1, a: a * .55 });
  fr.text('两个世界的距离', px0 + 20, 138, { font: 'serifr', size: 21, track: 2, color: PAL.sub, a, align: 'l' });
  fr.text('DIVERGENCE', px0 + 190, 139, { font: 'latin', size: 15, track: 4, color: PAL.label, a: a * .8, align: 'l' });
  fr.line(x0, y0, x1, y0, { w: 1, color: '#7E8FA6', a: a * .5, cap: 'butt' });
  for (const [v, s] of [[1e-5, '0.00001'], [1e-3, '0.001'], [1e-1, '0.1']]) {
    fr.line(x0, Y(v), x1, Y(v), { w: 1, color: '#7E8FA6', a: a * .14, cap: 'butt' });
    fr.text(s, x0 - 10, Y(v), { font: 'mono', size: 13, color: PAL.label, a: a * .75, align: 'r' });
  }
  fr.line(x0, Y(.04), x1, Y(.04), { w: 1.2, color: '#D9D9D8', a: a * .45, dash: [4, 5], cap: 'butt' });
  fr.text('肉眼可见', x1, Y(.04) - 13, { font: 'serifr', size: 15, color: PAL.sub, a: a * .7, align: 'r' });
  const pts = [], n = Math.max(2, Math.floor(sim / SD / 4));
  for (let j = 0; j <= n; j++) { const s = sim * j / n; pts.push([X(s), Y(divAt(s))]); }
  const hot = ss(t, T_SPLIT - .2, T_SPLIT + .4);
  fr.poly(pts, { color: GOLD, w: 2.2, a, glow: 8 + 10 * hot });
  const hd = pts[pts.length - 1]; fr.spark(hd[0], hd[1], 3 + 2 * hot, GOLD, a);
  const v = divAt(sim), txt = v < 1e-4 ? v.toFixed(5) : v < 1e-2 ? v.toFixed(4) : v.toFixed(2);
  fr.text(txt, x1, 138, { font: 'mono', size: 17, color: v > .04 ? GOLD : PAL.sub, a, align: 'r' });
}
/* 一张小图：对数轴上的"两次的差距"，曲线画到 k（0..1） */
function miniChart(fr, x0, y0, w, h, title, en, n, valAt, xEnd, label0, col, a, k) {
  if (a <= 0) return;
  const L0 = -5.3, L1 = 1.6, X = u => x0 + 70 + (w - 90) * u, Y = v => y0 + h - 40 - (h - 90) * (Math.log10(Math.max(v, 1e-9)) - L0) / (L1 - L0);
  fr.rect(x0, y0, w, h, { r: 12, fill: 'rgba(6,10,20,.86)', color: '#7E8FA6', w: 1, a: a * .7 });
  fr.text(title, x0 + 24, y0 + 30, { font: 'serifr', size: 24, track: 2, color: PAL.ink, a, align: 'l' });
  fr.text(en, x0 + 24 + fr.measure(title, { font: 'serifr', size: 24, track: 2 }) + 14, y0 + 31, { font: 'latin', size: 15, track: 4, color: PAL.label, a: a * .8, align: 'l' });
  for (const [v, sl] of [[1e-5, '0.00001'], [1e-3, '0.001'], [1e-1, '0.1'], [10, '10']]) { fr.line(X(0), Y(v), X(1), Y(v), { w: 1, color: '#7E8FA6', a: a * .14, cap: 'butt' }); fr.text(sl, X(0) - 10, Y(v), { font: 'mono', size: 13, color: PAL.label, a: a * .75, align: 'r' }); }
  fr.line(X(0), Y(1e-5) + 12, X(1), Y(1e-5) + 12, { w: 1, color: '#7E8FA6', a: a * .45, cap: 'butt' });
  const pts = [], m = Math.max(2, Math.floor(n * k));
  for (let j = 0; j <= m; j++) { const u = j / n; pts.push([X(u * xEnd), Y(valAt(u))]); }
  fr.poly(pts, { color: col, w: 2.6, a, glow: 10 });
  const hd = pts[pts.length - 1]; fr.spark(hd[0], hd[1], 4, col, a);
  fr.text(label0, X(0), Y(valAt(0)) + 26, { font: 'serifr', size: 16, color: PAL.sub, a: a * .85, align: 'l' });
}
/* 天气那条：距离在每一圈里一涨一落，取 log 以后按一圈左右（61 个点）滑动平均，看得出它是斜着往上走的 */
const THREAD = (() => { const d = new Float32Array(LZ_N); for (let i = 0; i < LZ_N; i++) { const dx = RUN_A[i * 3] - RUN_B[i * 3], dy = (RUN_A[i * 3 + 1] - RUN_B[i * 3 + 1]) * .6, dz = RUN_A[i * 3 + 2] - RUN_B[i * 3 + 2]; d[i] = Math.hypot(dx, dy, dz); } return d; })();   // 蝴蝶上那根白线的长度（模型单位）
const LZ_LOGS = (() => { const lg = Array.from(LZ_DIV, v => Math.log10(Math.max(v, 1e-9))), out = new Float32Array(LZ_N);
  for (let i = 0; i < LZ_N; i++) { const w = Math.min(30, i, LZ_N - 1 - i); let a = 0; for (let j = i - w; j <= i + w; j++) a += lg[j]; out[i] = a / (2 * w + 1); } return out; })();
function sameMath(fr, lt) {
  const x0 = 1010, x1 = 1780, yT = 200, yB = 640, LO = -4.4, HI = 2.0;
  const X = u => x0 + (x1 - x0) * u, Y = v => yB - (yB - yT) * (Math.log10(Math.max(v, 1e-9)) - LO) / (HI - LO);
  const out = 1 - ss(lt, 38.6, 39.4);
  if (lt < 31.0 || out <= 0) return;
  /* 坐标轴：从原点长出来，箭头跟着轴头走 */
  const ky = E.out3(seg(lt, 31.0, 31.9)), kx = E.out3(seg(lt, 31.3, 32.3)), axC = '#C3CBD6';
  const yTip = lerp(yB, yT - 40, ky), xTip = lerp(x0, x1 + 30, kx);
  fr.line(x0, yB, x0, yTip, { w: 1.6, color: axC, a: .8 * out, cap: 'butt' });
  fr.line(x0, yB, xTip, yB, { w: 1.6, color: axC, a: .8 * out, cap: 'butt' });
  if (ky > .02) fr.poly([[x0 - 8, yTip + 14], [x0, yTip], [x0 + 8, yTip + 14]], { color: axC, w: 1.8, a: .8 * out * ss(ky, .02, .2) });
  if (kx > .02) fr.poly([[xTip - 14, yB - 8], [xTip, yB], [xTip - 14, yB + 8]], { color: axC, w: 1.8, a: .8 * out * ss(kx, .02, .2) });
  fr.text('两点之间的距离', x0 + 16, yT - 46, { font: 'serifr', size: 24, track: 3, color: PAL.ink, a: ss(lt, 31.6, 32.3) * out, align: 'l' });
  fr.text('DISTANCE · LOG SCALE', x0 + 16 + 182, yT - 45, { font: 'latin', size: 15, track: 4, color: PAL.label, a: ss(lt, 31.8, 32.5) * out, align: 'l' });
  fr.text('时间', x1 + 30, yB + 32, { font: 'serifr', size: 18, track: 2, color: PAL.label, a: ss(lt, 32.0, 32.6) * out, align: 'r' });
  [[1e-4, '0.0001'], [1e-2, '0.01'], [1, '1']].forEach(([v, sl], j) => {
    const a = ss(lt, 31.4 + j * .15, 31.9 + j * .15) * out;
    fr.line(x0, Y(v), x1, Y(v), { w: 1, color: '#7E8FA6', a: a * .16, cap: 'butt' }); fr.text(sl, x0 - 12, Y(v), { font: 'mono', size: 14, color: PAL.label, a: a * .8, align: 'r' });
  });
  /* 一条线：蝴蝶上那根白线有多长，一路记下来 */
  const iR = I_R(lt), pts = [];
  for (let i = 0; i <= Math.round(iR); i += 2) pts.push([X(i / (LZ_N - 1)), Y(THREAD[i])]);
  if (lt > 31.4 && pts.length > 1) {
    fr.poly(pts, { color: ICE, w: 2.4, a: out, glow: 10 }); const hd = pts[pts.length - 1]; fr.spark(hd[0], hd[1], 4, ICE, out);
    fr.circle(pts[0][0], pts[0][1], 4, { fill: ICE, a: out * ss(lt, 31.4, 31.8) });
    fr.text('开头只差 0.000127', pts[0][0] + 14, pts[0][1] + 26, { font: 'serifr', size: 18, track: 2, color: ICE, a: ss(lt, 31.6, 32.4) * out, align: 'l' });
    /* 引线：从蝴蝶上那根白线的中点，连到曲线的笔头 */
    const pa = butterflyPoint(RUN_A, Math.round(iR)), pb = butterflyPoint(RUN_B, Math.round(iR)), m = core.project(LB.camera, [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2]);
    const la = fade(lt, 31.6, 36.8, .6, .6) * out;
    if (la > 0 && !m.behind) fr.line(m.x, m.y, hd[0], hd[1], { w: 1, color: '#D9D9D8', a: .35 * la, dash: [3, 6] });
  }
  fr.text('差距不是一点点加上去，是一倍一倍地翻上去', (x0 + x1) / 2, yB + 76, { font: 'serifr', size: 21, track: 3, color: PAL.sub, a: ss(lt, 35.2, 36.0) * out });
}
/* 引线标注：文字放在哪一侧随这一点的屏幕位置连续地变，跟着星走时不会跳边 */
function callout(fr, p, a, l1, l2, col, o = {}) {
  if (a <= 0 || p.behind) return;
  const reach = o.reach || 150, side = lerp(1, -1, ss(p.x, o.flipX || 1050, (o.flipX || 1050) + 260)), up = lerp(1, -1, ss(p.y, 360, 520));
  const f1 = { font: 'serifr', size: 22, track: 2 }, f2 = l2 && /^[0-9.]+$/.test(l2) ? { font: 'mono', size: 20 } : { font: 'latin', size: 16, track: 4 };
  const w = Math.max(fr.measure(l1, f1), l2 ? fr.measure(l2, f2) : 0) + 12;
  const ex = p.x + side * reach, ey = clamp(p.y - up * reach * .75, 120, 800);
  const k = E.out3(a), r0 = o.r0 || 16;
  const ux = ex - p.x, uy = ey - p.y, L = Math.hypot(ux, uy) || 1, sx = p.x + ux / L * r0, sy = p.y + uy / L * r0;
  const tl = lerp(ex - w, ex, (side + 1) / 2);
  fr.line(sx, sy, lerp(sx, ex, k), lerp(sy, ey, k), { w: 1.1, color: '#D9D9D8', a: a * .7 });
  fr.line(lerp(ex, tl, 1 - (side + 1) / 2), ey, lerp(ex, tl + w, (side + 1) / 2) * k + ex * (1 - k), ey, { w: 1.1, color: '#D9D9D8', a: a * .7, cap: 'butt' });
  fr.circle(p.x, p.y, r0, { color: col, w: 1.2, a: a * .6 });
  fr.text(l1, tl + 4, ey - 18, { ...f1, color: PAL.ink, a, align: 'l' });
  if (l2) fr.text(l2, tl + 4, ey + 19, { ...f2, color: col, a: a * .95, align: 'l' });
}
/* 出画的东西：在画框边上放一个箭头指着它（躲开左上的标题块） */
function edgeArrow(fr, p, a, label, col) {
  const m = 70; let x = clamp(p.x, m, W - m), y = clamp(p.y, m, 840);
  if (Math.hypot(p.x - x, p.y - y) < 1 && !p.behind) return false;
  if (x < 640 && y < 290) { if (p.x < 0) y = 300; else x = 660; }
  const ang = Math.atan2(p.y - y, p.x - x);
  fr.g({ at: [x, y], rot: ang, a }, () => { fr.poly([[-16, -10], [0, 0], [-16, 10]], { color: col, w: 2.2, glow: 8 }); });
  const al = x > W / 2 ? 'r' : 'l', lx = x - Math.cos(ang) * 30 + (al === 'r' ? -26 : 26), ly = y - Math.sin(ang) * 30 + 6;
  fr.text(label, lx, ly - 14, { font: 'serifr', size: 21, track: 2, color: PAL.ink, a, align: al });
  fr.text('EJECTED', lx, ly + 16, { font: 'latin', size: 16, track: 4, color: col, a, align: al });
  return true;
}

window.__dbg = { SP, HL, core, camRC: t => camRC(t) };
window.PROBE = t => { at(RA, simOf(t), PA); const c = camAny(t, PA); aim(SP.camera, c.pos, c.target);
  return [0, 1, 2].map(i => { const p = [PA[i * 3], PA[i * 3 + 1], PA[i * 3 + 2]], q = core.project(SP.camera, p), d = Math.hypot(p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]);
    return { x: q.x, y: q.y, r: SUN_R / d * (H / 2) / Math.tan(15 * Math.PI / 180), behind: q.behind }; }); };
VK.film({
  dur: DUR_FILM, fps: 30, theme: 'night', bloom: .45, grain: .045, meta: { title: '乱纪元' },
  draw(fr, tf) {
    if (fr.look.bg === undefined) return;
    const t = tIn(tf);                             // 内部时间（见 WARP）          // events() 收集时什么都不做（这条片没有声音）
    let fx = null;
    if (t < T_CUT) phoneFrame(t); else if (t < T_DIVE || (t >= T_UP && t < T_LAB)) spaceFrame(t); else if (t < T_UP) surfaceFrame(t); else if (t < T_RC) labFrame(t); else if (t < T_HC) spaceFrameRC(t); else if (t < T_EX) hallFrame(t); else if (t < T_PH2) fx = spaceFrameF(t); else phoneFrameEnd(t);
    fr.look.under = ctx => {
      ctx.drawImage(core.canvas, 0, 0);
      const g = ctx.createLinearGradient(0, 780, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.55, 'rgba(0,0,0,.38)'); g.addColorStop(1, 'rgba(0,0,0,.5)');
      ctx.fillStyle = g; ctx.fillRect(0, 780, W, H - 780);
      /* 开头片名的副标题正好压在两颗太阳上：字底下垫一层很软的暗（只在副标题出现时） */
      const sa = .5 * ss(tf - 18.6, 4.0, 5.4) * (1 - ss(tf, 25.6, 26.4));
      if (sa > 0) { ctx.save(); ctx.translate(W / 2, 690); ctx.scale(1, .32); const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 680);
        rg.addColorStop(0, `rgba(2,4,8,${sa})`); rg.addColorStop(.4, `rgba(2,4,8,${sa * .8})`); rg.addColorStop(.75, `rgba(2,4,8,${sa * .3})`); rg.addColorStop(1, 'rgba(2,4,8,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 680, 0, 6.2832); ctx.fill(); ctx.restore(); }
    };
    const TT = 18.6; if (tf > TT - .1 && tf < 26.4) K.titleNight(fr, tf - TT, { zh: '乱纪元', sub: '为什么天气预报，只能准一周', en: 'CHAOTIC ERA · WHY FORECASTS FADE', a: 1 - ss(tf, 25.6, 26.4), cy: 430 });   // 片名按片子时间走
    labelBlock(fr, fade(t, 24.6, 29.0, .8, .5), '三体', 'THE THREE-BODY PROBLEM', '— 三颗恒星 · 一颗行星');
    labelBlock(fr, fade(t, 29.0, 33.2, .8, .6), '乱纪元', 'CHAOTIC ERA', '— 刘慈欣《三体》');
    labelBlock(fr, fade(t, 34.8, 42.6, .9, .7), '人列计算机', 'THE HUMAN COMPUTER', '— 《三体》第 184 号文明 · 秦一号');
    /* 再算一遍：模拟时间倒回 0 再往前走 */
    if (t >= T_UP) {
      const sim = simOf(t), late = t >= T_UP;
      labelBlock(fr, fade(t, T_UP + 1.2, T_SPLIT - .6, .8, .6), '再算一遍', 'RUN IT AGAIN', `— 模拟时间  ${sim.toFixed(2)}`);
      labelBlock(fr, fade(t, T_EJECT + .8, T_E0 + 1.4, 1, .6), '混沌', 'CHAOS', '— 开头差一丝，结局两个世界');
      const panelOut = 1 - ss(t, T_EJECT - .7, T_EJECT - .1);
      legend(fr, ss(t, T_REW1 + .2, T_REW1 + 1.0) * panelOut);
      chart(fr, t, sim, ss(t, T_REW1 + .6, T_REW1 + 1.4) * panelOut);
      const pBeta = core.project(SP.camera, [PB[3], PB[4], PB[5]]);
      callout(fr, pBeta, fade(t, T_REW1 + .4, T_SPLIT - .3, .8, .5), '世界 B · 这颗星挪了', '0.00001', ICE, { r0: 20 });
      const k = fade(t, T_EJECT - .2, T_E0 + .8, .6, .5), pPB = core.project(SP.camera, [PB[9], PB[10], PB[11]]), pPA = core.project(SP.camera, [PA[9], PA[10], PA[11]]);
      if (k > 0 && !edgeArrow(fr, pPB, k, '世界 B 的行星 · 被甩出去了', ICE)) callout(fr, pPB, k, '世界 B 的行星', 'EJECTED', ICE, { reach: 120 });
      callout(fr, pPA, k * .9, '世界 A 的行星 · 还在', 'STILL IN ORBIT', GOLD, { reach: 130, flipX: 760 });
      note(fr, '示意 · 轨道由牛顿引力实时数值积分', ss(t, T_UP + 2, T_UP + 3) * (1 - ss(t, T_E0 + .4, T_E0 + 1)));
      labelBlock(fr, fade(t, T_E0 + 3.4, T_LAB - .4, .9, .6), '地球', 'EARTH', '— 只有一个太阳 · NASA Blue Marble');
    }
    if (t >= T_LAB) {
      const lt = L(t);
      labelBlock(fr, fade(lt, 1.2, 14.8, .9, .6), '1961', 'EDWARD LORENZ · MIT', '— 洛伦茨 · Royal McBee LGP-30 计算机');
      note(fr, '示意 · 用洛伦茨 1963 年的三变量模型重演 · 纸边的"天"为示意换算', fade(lt, 9.8, 30.2, .6, .6));
      note(fr, '示意 · 洛伦茨 1963 年模型 · 纵轴是对数刻度：每往上一格，距离大 100 倍', fade(lt, 33.0, 39.4, .8, .4));
      labelBlock(fr, fade(lt, 18.6, 20.6, .7, .5), '洛伦茨吸引子', 'LORENZ ATTRACTOR', '— Lorenz 1963 · Deterministic Nonperiodic Flow');
      /* 引文卡 */
      const qa = fade(lt, 20.4, 25.4, .9, .6);
      if (qa > 0) {
        fr.text('“Does the flap of a butterfly’s wings', W / 2, 150, { font: 'latini', size: 46, track: 1, color: PAL.ink, a: qa, glow: 10, glowA: .25 });
        fr.text('in Brazil set off a tornado in Texas?”', W / 2, 212, { font: 'latini', size: 46, track: 1, color: PAL.ink, a: qa * ss(lt, 20.8, 21.6), glow: 10, glowA: .25 });
        fr.text('巴西的一只蝴蝶扇动翅膀，会不会在得克萨斯掀起一场龙卷风？', W / 2, 284, { font: 'serifr', size: 30, track: 4, color: PAL.gold, a: qa * ss(lt, 21.4, 22.2) });
        fr.text('— E. N. Lorenz，1972 年美国科学促进会年会演讲题目', W / 2, 336, { font: 'serifr', size: 20, track: 3, color: PAL.label, a: qa * ss(lt, 21.8, 22.6) });
      }
      labelBlock(fr, fade(lt, 25.6, 30.2, .9, .6), '蝴蝶效应', 'THE BUTTERFLY EFFECT', '— 开头差 0.000127');
      /* 同一种数学：右边一张图，把两个点之间那根线的长度一路记下来；然后三体那条画到同一张图上 */
      if (lt > 30.8) sameMath(fr, lt);
    }
    if (t >= T_RC) {
      labelBlock(fr, fade(t, T_RC + 1.8, T_HC - .4, .9, .6), '1922', 'LEWIS FRY RICHARDSON', '— 理查森《用数值方法预报天气》');
      note(fr, '网格示意：纬度 1.8° × 经度 3°', fade(t, T_RC + 3, T_HC - .4, .6, .5));
      const h = t - T_HC;
      labelBlock(fr, fade(h, 1.0, 12.6, .9, .7), '预报工厂', 'THE FORECAST FACTORY', '— 理查森 1922 年书中的设想 · 示意');
      note(fr, '讲台上的指挥：玫瑰色的光照向算快了的地方，蓝色的光照向落后的（理查森原文）', fade(h, 6.0, 12.6, .7, .6));
      labelBlock(fr, fade(h, 13.6, 21.4, .9, .6), '1910 · 5 · 20', 'ONE COMPUTER', '— 一战期间，在前线的空档里手算（据 P. Lynch）');
      if (h > 21.6 && t < T_EX) {
        const tips = HL.needleTips(), pc = core.project(HL.camera, tips[0]), pr = core.project(HL.camera, tips[1]), out = 1 - ss(h, 29.4, 30.2);
        callout(fr, pc, ss(h, 23.0, 23.8) * out, '算出来：6 小时后', '+145 百帕', '#E84B5E', { reach: 190, flipX: 700 });
        callout(fr, pr, ss(h, 26.4, 27.2) * out, '那天实际', '几乎没动', GOLD, { reach: 190, flipX: 1400 });
        note(fr, '计算点：德国巴伐利亚 · 1910 年 5 月 20 日 · 据 P. Lynch', fade(h, 22.4, 30.4, .6, .4));
      }
    }
    if (t >= T_EX && t < T_PH2) {
      labelBlock(fr, fade(t, E0 + 1.2, E0 + 5.4, .9, .6), '今天', 'ECMWF · 9 KM', '— 欧洲中期天气预报中心：全球约 9 公里一格（示意）');
      const d = Math.floor(12 * seg(t, E0 + 9.4, E0 + 13.4));
      labelBlock(fr, fade(t, E0 + 9.2, E0 + 17.8, .7, .6), `第 ${d} 天`, 'ERROR GROWTH', '— 起点那一点差别，一天天长大（示意）');
      strip(fr, fade(t, E0 + 8.6, E0 + 18.6, .8, .7), 12 * seg(t, E0 + 9.4, E0 + 13.4), ss(t, E0 + 14.6, E0 + 15.6));
      note(fr, '可预报的上限约两周：Zhang 等，J. Atmos. Sci. 2019', fade(t, E0 + 14.6, E0 + 18.4, .6, .5));
      labelBlock(fr, fade(t, E0 + 19.0, E0 + 32.4, .9, .6), '集合预报', 'ENSEMBLE · 51 MEMBERS', '— 1 个控制 + 50 个扰动（ECMWF）· 路径为示意');
      /* 51 个分身：在台风周围抖一抖，然后各自出发 */
      const ga = fade(t, E0 + 20.6, E0 + 23.4, .6, .6);
      if (ga > 0) for (let m = 0; m < 51; m++) { const ll = memberLL(m, 0), j = .25 * Math.sin(t * 3 + m * 1.7), q = core.project(SP.camera, toWorld([ll[0] + j * .3, ll[1] + j * .4], spinF(t), 1.014)); if (!q.behind) fr.spark(q.x, q.y, m === 0 ? 4 : 2.4, m === 0 ? GOLD : ICE, ga * (m === 0 ? 1 : .7)); }
      /* 控制路径上的天数 */
      const dN = D_NOW(t);
      for (const day of [3, 10]) { const a = fade(t, E0 + 22.8 + day * .44, E0 + 32.4, .5, .6) * (dN >= day ? 1 : 0); if (a <= 0) continue; const q = core.project(SP.camera, toWorld(memberLL(0, day), spinF(t), 1.014)); if (!q.behind) { fr.circle(q.x, q.y, 6, { fill: GOLD, a }); fr.text(`第 ${day} 天`, q.x + 18, q.y - 18, { font: 'serifr', size: 22, track: 2, color: PAL.ink, a, align: 'l' }); } }
      note(fr, '新闻里的台风路径图：台风中心约 70% 落在圈内（示意）', fade(t, E0 + 28.6, E0 + 32.6, .6, .5));
      const y = Math.min(2025, 1985 + 10 * Math.round((YEAR(t) - 1985) / 10 - .05));
      labelBlock(fr, fade(t, E0 + 32.8, E0 + 37.4, .7, .6), String(y), 'FORECAST SKILL', '— 同样准的预报，每十年往后多推一天（Bauer 等，Nature 2015）');
    }
    if (t >= T_PH2) {
      K.titleNight(fr, t - (T_PH2 + 18.8), { zh: '乱纪元', sub: '为什么天气预报，只能准一周', en: 'CHAOTIC ERA · WHY FORECASTS FADE', a: t > T_PH2 + 18.7 ? 1 - ss(t, END - .9, END - .1) : 0, cy: 400 });
      const ra = ss(t, T_PH2 + 21.0, T_PH2 + 22.0) * (1 - ss(t, END - .9, END - .1));
      if (ra > 0) ['E. N. Lorenz, Deterministic Nonperiodic Flow, 1963 · L. F. Richardson, Weather Prediction by Numerical Process, 1922',
        'F. Zhang et al., J. Atmos. Sci. 2019 · P. Bauer et al., Nature 2015 · P. Lynch, The Emergence of NWP, 2006 · 刘慈欣《三体》'].forEach((l, i) => fr.text(l, W / 2, 800 + i * 34, { font: 'serifr', size: 19, track: 1, color: PAL.label, a: ra * .9 }));
    }
    K.subs(fr, t, SUBS, 'night');
  },
});
