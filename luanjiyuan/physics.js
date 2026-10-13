/* physics.js — 三颗恒星 + 一颗行星（无质量）的牛顿引力，RK4 定步长积分。
 * 浏览器里挂到 window.TB，node 里 module.exports（tune.js 用它挑初始条件）。
 * 同一份代码、同一组浮点运算：屏上的轨道就是挑选时算出来的那一条。
 */
(function (root) {
'use strict';
const G = 1; let EPS2 = 0.015 * 0.015;          // 软化长度：两星贴得极近时不至于数值爆炸

/* s: Float64Array(24) = 4 个天体 × (x,y,z,vx,vy,vz)；m: 质量数组（行星质量 0，不拉别人） */
function deriv(s, m, out) {
  for (let i = 0; i < 4; i++) {
    const o = i * 6; out[o] = s[o + 3]; out[o + 1] = s[o + 4]; out[o + 2] = s[o + 5];
    let ax = 0, ay = 0, az = 0;
    for (let j = 0; j < 3; j++) {
      if (j === i) continue;
      const p = j * 6, dx = s[p] - s[o], dy = s[p + 1] - s[o + 1], dz = s[p + 2] - s[o + 2];
      const r2 = dx * dx + dy * dy + dz * dz + EPS2, inv = G * m[j] / (r2 * Math.sqrt(r2));
      ax += dx * inv; ay += dy * inv; az += dz * inv;
    }
    out[o + 3] = ax; out[o + 4] = ay; out[o + 5] = az;
  }
}

/* 积分到 T，每隔 every 步存一次位置。返回 Float32Array：样本数 × 4 天体 × 3 */
function run(s0, m, T, dt, every) {
  const n = Math.round(T / dt), s = Float64Array.from(s0), k1 = new Float64Array(24), k2 = new Float64Array(24),
    k3 = new Float64Array(24), k4 = new Float64Array(24), tmp = new Float64Array(24);
  const ns = Math.floor(n / every) + 1, out = new Float32Array(ns * 12); let w = 0;
  const save = () => { for (let i = 0; i < 4; i++) for (let c = 0; c < 3; c++) out[w * 12 + i * 3 + c] = s[i * 6 + c]; w++; };
  save();
  for (let k = 1; k <= n; k++) {
    deriv(s, m, k1);
    for (let i = 0; i < 24; i++) tmp[i] = s[i] + .5 * dt * k1[i]; deriv(tmp, m, k2);
    for (let i = 0; i < 24; i++) tmp[i] = s[i] + .5 * dt * k2[i]; deriv(tmp, m, k3);
    for (let i = 0; i < 24; i++) tmp[i] = s[i] + dt * k3[i]; deriv(tmp, m, k4);
    for (let i = 0; i < 24; i++) s[i] += dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    if (k % every === 0) save();
  }
  return { pos: out, n: w, dtSample: dt * every };
}

/* 确定的随机 */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* 由一个种子造初始条件：三星大致成三角、带一点倾斜和随机速度；行星绕 0 号星做圆轨道 */
function initial(seed, o = {}) {
  const r = rng(seed), m = [1, 1, 1, 0], s = new Float64Array(24);
  m[0] = .9 + .2 * r(); m[1] = .9 + .2 * r(); m[2] = .9 + .2 * r();
  const R = .8 + .5 * r(), vk = (o.vk0 == null ? .2 : o.vk0) + (o.vk1 == null ? .4 : o.vk1) * r();
  for (let i = 0; i < 3; i++) {
    const ang = i * 2.0944 + (r() - .5) * .9, rr = R * (.75 + .5 * r()), o6 = i * 6;
    s[o6] = rr * Math.cos(ang); s[o6 + 1] = (r() - .5) * .35; s[o6 + 2] = rr * Math.sin(ang);
    const vc = Math.sqrt(2 / rr) * vk;                          // 切向速度，带随机偏差
    s[o6 + 3] = -Math.sin(ang) * vc + (r() - .5) * .3; s[o6 + 4] = (r() - .5) * .25; s[o6 + 5] = Math.cos(ang) * vc + (r() - .5) * .3;
  }
  /* 质心归零 */
  const M = m[0] + m[1] + m[2];
  for (let c = 0; c < 6; c++) { let a = 0; for (let i = 0; i < 3; i++) a += m[i] * s[i * 6 + c]; a /= M; for (let i = 0; i < 3; i++) s[i * 6 + c] -= a; }
  /* 行星：0 号星周围半径 rp 的圆轨道，轨道面略倾斜 */
  const rp0 = .16 + .08 * r(), th0 = r() * 6.2832, tilt0 = (r() - .5) * .5;     // 先照常取数，保证星的初始条件不受行星参数影响
  const rp = o.rp || rp0, th = o.th == null ? th0 : o.th, tilt = o.tilt == null ? tilt0 : o.tilt, vp = Math.sqrt(G * m[0] / rp) * (o.retro ? -1 : 1) * (o.vf || 1);
  s[18] = s[0] + rp * Math.cos(th); s[19] = s[1] + rp * Math.sin(th) * tilt; s[20] = s[2] + rp * Math.sin(th);
  s[21] = s[3] - vp * Math.sin(th); s[22] = s[4] + vp * Math.cos(th) * tilt; s[23] = s[5] + vp * Math.cos(th);
  return { s, m };
}

/* 世界 B：把 who 号星沿 x 挪动 delta，其余不变 */
function perturb(s, who, delta) { const b = Float64Array.from(s); b[who * 6] += delta; return b; }

const api = { deriv, run, rng, initial, perturb, setSoft: e => { EPS2 = e * e; } };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TB = api;
})(typeof window !== 'undefined' ? window : globalThis);
