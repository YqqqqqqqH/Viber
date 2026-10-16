// 《八毫米的楼》 film page: node film/build.mjs → iphone18/index.html
// One world (model/scene.mjs pieces), one projection; the page's render(t) moves the floors
// (rise, then slide), opens the main camera, turns the iris, spreads the heat, wakes the lock
// screen, lights one part at a time, flies the camera and writes subtitles and readouts.
// Painter's order is solved by A.settle at samples through every moving stretch.
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { phone, L } from "../model/phone.mjs";
import { mainCamera, LAYERS } from "../model/maincam.mjs";
import { plinth } from "../model/stand.mjs";
import { worldP, floorMove, heatOverlay, lockScreen, fieldLines, GROUP, UP, MAIN, SCENE_CSS, FLOOR } from "../model/scene.mjs";
import { U, PHONE, X, Y, Z, W3, plan } from "../model/units.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const QUICK = process.argv.includes("--quick");      // sparse depth samples for fast iteration
const t0 = Date.now();

// ------------------------------------------------------------------ pose code shared with the page
const POSE_JS = String.raw`
function mono(keys) {
  const n = keys.length; if (n === 1) return () => keys[0][1];
  const x = keys.map((p) => p[0]), y = keys.map((p) => p[1]);
  const d = []; for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (3 * (x[i + 1] - x[i - 1])) / ((2 * x[i + 1] - x[i] - x[i - 1]) / d[i - 1] + (x[i + 1] - 2 * x[i] + x[i - 1]) / d[i]);
  return (t) => {
    if (t <= x[0]) return y[0]; if (t >= x[n - 1]) return y[n - 1];
    let i = 0; while (t > x[i + 1]) i++;
    const h = x[i + 1] - x[i], s = (t - x[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}
// v2 runs 2:16: the first 44 s are tightened (explode a little, floors 1 and 2 by about a quarter) and the
// rest moves up 6.8 s. Every motion, effect and readout keeps its v1 timing in "old" seconds; the page
// maps film time to old time at the top of render(), events are mapped the other way. The camera is at
// rest at each anchor, so the piecewise-linear map never breaks a moving shot.
const WARP = [[0, 0], [5.2, 5.2], [11.9, 11.4], [26.7, 22.2], [39.6, 32.8], [142.8, 136.0]];
const lerpOn = (pts, x, a, b) => { if (x <= pts[0][a]) return pts[0][b] + (x - pts[0][a]); for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1]; if (x <= q[a]) return p[b] + ((x - p[a]) * (q[b] - p[b])) / (q[a] - p[a]); } const l = pts[pts.length - 1]; return l[b] + (x - l[a]); };
const toNew = (t) => lerpOn(WARP, t, 0, 1), toOld = (t) => lerpOn(WARP, t, 1, 0);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function poser(SH, FIN, UP, OPENZ, DOCK) {
  const f = {}; for (const key of Object.keys(SH)) f[key] = mono(SH[key]);
  const sh = (key, t) => (f[key] ? f[key](t) : 0);
  const mv = (g, su, so) => { const q = FIN[g]; return [q[0] * so, q[1] * so, UP * su + (q[2] - UP) * so]; };
  return (t) => {
    const m = { static: [0, 0, 0], back: [0, 0, 0] };
    for (const g of ["chassis", "internals", "vc", "display"]) m[g] = mv(g, sh("su_" + g, t), sh("so_" + g, t));
    const own = mv("battery", sh("su_battery", t), sh("so_battery", t)), glued = m.vc, d = sh("battDrop", t);
    m.battery = glued.map((x, i) => x + (own[i] - x) * d);
    const o = sh("mcOpen", t);
    for (const layer of Object.keys(OPENZ)) m["mc:" + layer] = [m.internals[0], m.internals[1], m.internals[2] + OPENZ[layer] * o];
    // Face ID's IR camera: straight up from floor 3 to just under the display's height, then in under it
    const iu = sh("irUp", t), io = sh("irOver", t), a = m.internals, b = [m.display[0], m.display[1], m.display[2] + DOCK];
    m.ir = [a[0] + (b[0] - a[0]) * io, a[1] + (b[1] - a[1]) * io, a[2] + (b[2] - a[2]) * iu];
    return m;
  };
}
`;
const { mono, poser, sstep, toNew } = new Function(POSE_JS + "; return { mono, poser, sstep, toNew };")();

// ------------------------------------------------------------------ timeline (seconds; see 镜头表.md)
const SUBS = JSON.parse(readFileSync(join(ROOT, "subs.json"), "utf8")).subs;
const DUR = 142.8;
const SH = {
  su_display: [[5.2, 0], [6.4, 1], [138.0, 1], [139.0, 0]], so_display: [[6.0, 0], [8.4, 1], [136.3, 1], [138.3, 0]],
  su_vc: [[5.8, 0], [7.0, 1], [137.5, 1], [138.5, 0]], so_vc: [[6.6, 0], [9.0, 1], [135.8, 1], [137.8, 0]],
  su_internals: [[6.4, 0], [7.6, 1], [136.5, 1], [137.5, 0]], so_internals: [[7.2, 0], [9.6, 1], [134.8, 1], [136.8, 0]],
  su_chassis: [[7.0, 0], [8.2, 1], [136.0, 1], [137.0, 0]], so_chassis: [[7.8, 0], [10.2, 1], [134.3, 1], [136.3, 0]],
  su_battery: [[0, 1], [137.0, 1], [138.0, 0]], so_battery: [[0, 1], [135.3, 1], [137.3, 0]],
  battDrop: [[0, 0], [82.0, 0], [84.0, 1]],
  mcOpen: [[0, 0], [43.6, 0], [48.0, 1], [56.4, 1], [58.9, 0]],
  irUp: [[0, 0], [115.9, 0], [117.6, 1]], irOver: [[0, 0], [116.2, 0], [118.3, 1]],
};
const FIN = { chassis: floorMove("chassis"), internals: floorMove("board"), battery: floorMove("battery"), vc: floorMove("vc"), display: floorMove("display") };
const GAPS = [0, 4.0, 5.2, 2.8, 3.2, 3.6];
const LIFT = MAIN.lift + 2.4;                       // the cover's outer face goes from w −2.4 to w 15
const OPENZ = {}; { let c = 0; LAYERS.forEach((ly, i) => { c += GAPS[i]; OPENZ[ly.name] = (LIFT + c) * U; }); }
const DOCK = -1.5 * U;                              // the IR camera parks 1.5 mm under its assembled spot
const movesAt = poser(SH, FIN, UP, OPENZ, DOCK);
const IRIS = [[0, 1.48], [49.2, 1.48], [49.8, 1.8], [50.4, 1.8], [51.0, 2.8], [51.6, 2.8], [52.2, 4.0], [54.4, 4.0], [56.0, 1.48]];
const HEAT = [[0, 0], [103.0, 0], [108.0, 1], [110.5, 1], [112.8, 0]];
const PREV = [[0, 0], [101.2, 0], [102.0, 1], [109.5, 1], [111.5, 0]];
const LOCK = [[0, 0], [0.3, 0], [1.1, 1], [3.2, 1], [5.0, 0], [112.4, 0], [112.6, 1], [134.3, 1], [136.0, 0], [139.4, 0], [140.2, 1]];
const SWEEP = [[0, 1], [112.3, 1], [112.35, 0], [112.4, 0], [116.4, 1]];
const IRGLOW = [[0, 0], [121.2, 0], [122.8, 1], [123.2, 1], [124.8, 0]];
const FIELD = [[0, 0], [22.5, 0], [23.5, 1], [26.4, 1], [28.0, 0]];
const FOCUS = { coil: [15.6, 16.2, 27, 29], antenna: [34.9, 35.5, 40, 41.5], buttons: [36.8, 37.4, 41, 42.5], soc: [59.0, 59.6, 70.6, 71.6], battery: [72.6, 73.4, 93.6, 94.6], vc: [95.0, 95.8, 103.4, 105.0], ir: [115.0, 115.6, 124.6, 125.4] };
// the recap names the floors bottom to top; each lights as its word is read
const RECAP = [130.6, 131.2, 131.8, 132.4, 133.0, 133.6];
const TITLE = "口袋里的六层楼";
const TR = [[0, "iPhone 18 Pro Max"], [5.2, TITLE]];
// the floor indicator (top left): which floor we are on, shown through the tour
const FL = [[11.9, 0, "1F · 后盖和线圈"], [26.7, 1, "2F · 铝机身"], [39.6, 2, "3F · 光圈和芯片"], [72.0, 3, "4F · 电池"], [94.6, 4, "5F · 均热板"], [112.4, 5, "6F · 屏幕"]];
const BR = [[0, "163.4 × 78.0 × 8.75 mm"], [15.5, "MagSafe 线圈 · 磁铁对位"], [29.7, "85% 回收铝"], [43.6, "ƒ/1.48 · 开口 4.59 mm"], [59.0, "A20 Pro · 2 nm · 6 核 CPU"], [64.6, "导热锁子甲 · 双 16 核神经网络引擎"], [72.0, "电池粘在均热板背面"], [83.8, "eSIM 版 5567 mAh · 21.751 Wh"], [89.0, "运输中 < 20 Wh · 激活后解除"], [94.6, "14 颗 Torx Plus 螺丝"], [101.3, "面积 ×3"], [107.9, "持续性能最多 +40%"], [112.4, "6.9 英寸 · 460 ppi"], [119.6, "隔一行少一行 · 红外透光"], [125.0, "灵动岛变小"], [129.4, "6 层 · 8.75 mm"]];
const EV = [
  { t: 0.5, type: "wake" },
  { t: 5.25, type: "rise", n: 0 }, { t: 5.85, type: "rise", n: 1 }, { t: 6.45, type: "rise", n: 2 }, { t: 7.05, type: "rise", n: 3 }, { t: 10.2, type: "settle" },
  { t: 16.0, type: "hum" }, { t: 21.3, type: "snap" }, { t: 22.6, type: "shimmer" },
  { t: 35.0, type: "tap" }, { t: 36.9, type: "tap", pitch: 1.3 },
  { t: 43.7, type: "whoosh" },
  { t: 49.5, type: "blade" }, { t: 50.7, type: "blade" }, { t: 51.9, type: "blade" }, { t: 54.8, type: "blade", pitch: 0.9 }, { t: 55.2, type: "blade", pitch: 0.9 }, { t: 55.6, type: "blade", pitch: 0.9 },
  { t: 58.7, type: "seat" }, { t: 59.3, type: "ding" },
  { t: 79.0, type: "hum" }, { t: 82.0, type: "peel" }, { t: 83.8, type: "drop" },
  ...[84.8, 85.5, 86.2, 86.9, 87.6].map((t) => ({ t, type: "tick", soft: 1 })),
  { t: 89.8, type: "tick" }, { t: 92.3, type: "tap", pitch: 1.4 },
  ...Array.from({ length: 14 }, (_, j) => ({ t: +(96.0 + 0.25 * j).toFixed(2), type: "tick", soft: 1 })),
  { t: 103.0, type: "swell" },
  { t: 112.5, type: "sparkle" }, { t: 115.9, type: "whoosh" }, { t: 118.3, type: "seat" }, { t: 119.4, type: "ping" }, { t: 121.7, type: "shimmer" },
  ...RECAP.map((t, j) => ({ t, type: "tap", pitch: +(1 + 0.08 * j).toFixed(2) })),
  { t: 137.0, type: "land", n: 0 }, { t: 137.5, type: "land", n: 1 }, { t: 138.0, type: "land", n: 2 }, { t: 138.5, type: "land", n: 3 }, { t: 139.0, type: "land", n: 4 }, { t: 139.05, type: "boom" },
  { t: 139.6, type: "wake" },
];

// ------------------------------------------------------------------ build the world at home
const P = worldP();
const R = A.recorder(P);
phone(P, R, { moves: {}, lod: true, hide: ["camera.main", "camera.main.cap"] });
plinth(P, R, { plan: plan(-14, -14, PHONE.u + 28, PHONE.v + 28, 14), top: Z(-L.plateau.h) - 0.3 * U });
mainCamera(P, R, { centre: W3(MAIN.u, MAIN.v, -2.4), f: 1.48, open: 0, lit: "iris", pieces: {} });
heatOverlay(P, R, { heat: 1, prevVC: true, move: [0, 0, 0] });
lockScreen(P, R, { move: [0, 0, 0], on: 0 });
fieldLines(P, R, {});

const TAGS = { "back.coil": "coil", "back.magnet": "magnet", "chassis.antenna": "antenna", "chassis.action": "buttons", "chassis.volup": "buttons", "chassis.voldown": "buttons", "board.soc": "soc", "battery.cell": "battery", "battery.vc": "vc", "battery.vcpad": "vc", "battery.screw": "vcscrew", "front.ir.base": "ir", "front.ir.lens": "ir" };
const grpOf = (it) => (it.piece === "stand" ? "static" : it.name?.startsWith("front.ir") ? "ir" : it.piece.startsWith("maincam.") ? "mc:" + it.piece.slice(8) : GROUP[it.piece] || "static");
const FLOOR_OF = { back: 0, chassis: 1, internals: 2, ir: 2, battery: 3, vc: 4, display: 5 };
const counters = {};
const items = R.items.map((it, i) => {
  const tag = TAGS[it.name?.replace(/#\d+$/, "")] || "";
  const idx = tag ? (counters[tag] = (counters[tag] ?? -1) + 1) : 0;
  return { it, i, grp: grpOf(it), tag, idx, base: it.key };
});
const GRPS = [...new Set(items.map((x) => x.grp))];
// ghosted while we look through the glass at the IR camera: every display layer but the pixel patch and the marks
const GH = items.map((x) => (x.grp === "display" && !/^display\.(pixels|marks)/.test(x.it.name || "") ? 1 : 0));
const FLI = items.map((x) => (x.grp.startsWith("mc:") ? 2 : FLOOR_OF[x.grp] ?? -1));
// each floor has its own colour (see brief, 色彩脚本); the IR camera wears the screen's colour, it moves there
const ACC = items.map((x) => (x.grp === "ir" ? 5 : x.grp.startsWith("mc:") ? 2 : FLOOR_OF[x.grp] ?? -1));
console.log("items", items.length, "groups", GRPS.join(" "));

// ------------------------------------------------------------------ depth order at samples
const V = R.V;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const Ps = { ...P, scale: P.scale / 3, origin: [P.origin[0] / 3, P.origin[1] / 3] };
const motion = [[5.0, 10.6], [43.4, 48.4], [56.2, 59.2], [81.8, 84.4], [115.6, 118.6], [133.9, 139.4]];
const step = QUICK ? 1.0 : process.argv.includes("--fine") ? 0.25 : 0.4;
const ts = new Set([0, 12, 20, 30, 40, 50, 55, 63, 70, 78, 90, 100, 112, 125, 130, 141]);
for (const [a, b] of motion) for (let t = a; t <= b + 1e-6; t += step) ts.add(+t.toFixed(2));
const SAMPLES = [...ts].sort((a, b) => a - b);
// depth keys depend only on the floors' motion, not on the camera: cache them by that
const { createHash } = await import("node:crypto");
const { existsSync } = await import("node:fs");
const cacheKey = createHash("sha1").update(JSON.stringify({ SH, OPENZ, SAMPLES, n: items.length, names: items.map((x) => x.it.name).join("|") })).digest("hex").slice(0, 16);
const cacheFile = join(ROOT, "review", "depth-" + cacheKey + ".json");
const SK = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : [];
if (!SK.length) for (const t of SAMPLES) {
  const m = movesAt(t);
  for (const x of items) {
    const mv = m[x.grp] || [0, 0, 0];
    x.it.move = mv; x.it.ride = x.it.piece; for (const s of x.it.shapes) { s.move = mv; s.ride = x.it.piece; }
    x.it.key = x.base;
  }
  A.settle(R, Ps, { states: [1] });
  SK.push([t, items.map((x) => +(x.it.key + dot(x.it.move, V)).toFixed(3))]);
}
if (!existsSync(cacheFile)) writeFileSync(cacheFile, JSON.stringify(SK));
console.log("depth samples", SAMPLES.length, existsSync(cacheFile) ? "(cached " + cacheKey + ")" : "", "in", ((Date.now() - t0) / 1000).toFixed(0), "s");

// the antenna splits are two hairlines on the outside of the left wall; the settle files them under the wall
// they are drawn on, so draw them right after the last chassis part at every sample
{
  const ant = items.filter((x) => x.tag === "antenna").map((x) => x.i), ch = items.filter((x) => x.grp === "chassis" && x.tag !== "antenna").map((x) => x.i);
  for (const [, keys] of SK) { const top = Math.max(...ch.map((i) => keys[i])); for (const i of ant) keys[i] = +(top + 0.001).toFixed(4); }
}

// ------------------------------------------------------------------ camera path
const at = (m, grp, u, v, w) => { const d = m[grp] || [0, 0, 0]; const p = W3(u, v, w); return k.iso([p[0] + d[0], p[1] + d[1], p[2] + d[2]], P); };
const box = (m, grp, u0, v0, u1, v1, w0, w1) => { const out = []; for (const u of [u0, u1]) for (const v of [v0, v1]) for (const w of [w0, w1]) out.push(at(m, grp, u, v, w)); return out; };
const frame = (pts, margin = 1.1) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, Math.max((Math.max(...xs) - Math.min(...xs)) * margin, (Math.max(...ys) - Math.min(...ys)) * margin * 16 / 9)];
};
const shot = (t, fn) => { const m = movesAt(t); return fn(m); };
const closed = (m) => frame([...box(m, "static", -14, -14, 92, 177.4, -20, 9)], 1.12);
const building = (m) => frame([...["back", "chassis", "internals", "battery", "vc", "display"].flatMap((g) => box(m, g, -2, -2, 80, 165.4, -3, 9)), ...box(m, "static", -14, -14, 92, 177.4, -20, -3)], 0.9);
const irisC = (m) => { const c = W3(MAIN.u, MAIN.v, -2.4 + 1.0), d = m["mc:iris"]; const q = (du, dv, dz) => k.iso([c[0] + d[0] + dv * U, c[1] + d[1] - du * U, c[2] + d[2] + dz * U], P); return frame([q(-7, -7, 0), q(7, 7, 0), q(7, -7, 0), q(-7, 7, 0), q(0, 0, 6), q(0, 0, -6)], 1.05); };
// framings, reused below
const F_screen = (m) => frame(box(m, "display", 0, 0, 78, 70, 8.75, 8.75), 1.15);
const F_floor1 = (m) => frame(box(m, "back", -2, 40, 80, 165, 0, 1), 1.12);
const F_coil = (m) => frame(box(m, "back", 10, 54, 68, 110, 0, 1), 1.12);
const F_floor2 = (m) => frame(box(m, "chassis", -2, -2, 80, 165.4, -3, 7.3), 1.06);
const F_floor2in = (m) => frame(box(m, "chassis", 30, 0, 78, 50, -3, 0.6), 1.15);
const F_left = (m) => frame(box(m, "chassis", -1, 8, 6, 72, 0, 7.3), 1.3);
const F_floor3 = (m) => frame(box(m, "internals", 0, 0, 78, 70, -3, 8), 1.1);
const F_stack = (m) => { const d = m["mc:cover"], e = m["mc:housing"]; return frame([...box({ x: d }, "x", MAIN.u - 14, MAIN.v - 14, MAIN.u + 14, MAIN.v + 14, -2.4, -2.4), ...box({ x: e }, "x", MAIN.u - 14, MAIN.v - 14, MAIN.u + 14, MAIN.v + 14, 7, 7)], 1.06); };
const F_floor3b = (m) => frame(box(m, "internals", 8, 0, 78, 66, -3, 8), 1.08);
const F_board = (m) => frame(box(m, "internals", 12, 36, 60, 66, 3, 6), 1.08);
const F_mesh = (m) => frame(box(m, "internals", 20, 39, 49, 66, 3, 6), 1.0);
const F_mid4 = (m) => frame([...box(m, "internals", 10, 30, 70, 70, 0, 6), ...box(m, "vc", 4, 8, 74, 146, 6, 7.3)], 1.0);
const F_f4a = (m) => frame([...box(m, "battery", 4, 55, 74, 146, 1.4, 6.4), ...box(m, "vc", 4, 8, 74, 146, 6.4, 7.3)], 1.04);
const F_f4aIn = (m) => frame(box(m, "vc", 6, 60, 72, 140, 6.87, 6.87), 1.06);
const F_f4b = (m) => frame([...box(m, "battery", 4, 55, 74, 146, 1.4, 6.4), ...box(m, "vc", 4, 60, 74, 146, 6.4, 7.3)], 1.04);
const F_bat = (m) => frame(box(m, "battery", 6, 60, 72, 146, 1.4, 6.4), 1.06);
const F_lock = (m) => frame(box(m, "battery", 26, 60, 68, 92, 6.4, 6.4), 1.08);
const F_floor5 = (m) => frame(box(m, "vc", 4, 8, 74, 145, 6, 7.2), 1.04);
const F_floor5w = (m) => frame(box(m, "vc", -6, -2, 84, 160, 6, 7.2), 1.08);
const F_hot = (m) => frame(box(m, "vc", 6, 22, 66, 92, 6.9, 6.9), 1.06);
const F_floor6 = (m) => frame(box(m, "display", -2, -2, 80, 165.4, 8.75, 8.75), 1.04);
const F_dispTL = (m) => frame(box(m, "display", 0, -1, 30, 19, 8.75, 8.75), 1.15);
const F_ir = (m) => frame([...box(m, "display", 9.0, 2.6, 19.2, 13.2, 8.75, 8.75), ...box(m, "ir", 11.2, 5.0, 17.0, 10.8, 5.6, 5.6)], 1.04);
const F_irEdge = (m) => frame(box(m, "display", 10.2, 5.6, 14.6, 10.2, 8.75, 8.75), 1.0);
const F_irWide = (m) => frame(box(m, "display", 4, 0, 26, 16, 8.75, 8.75), 1.1);
const F_isl2 = (m) => frame(box(m, "display", 2, -2, 54, 17, 8.75, 8.75), 1.3);
// the IR camera's trip: its home on floor 3, the whole curve it flies and the display's top corner in one frame
const IR_TRIP = Array.from({ length: 9 }, (_, i) => 115.9 + i * 0.3);
const F_irPath = (m) => frame([...box(m, "internals", 4, 0, 28, 18, 3, 8), ...box(m, "display", -2, -2, 32, 22, 8.75, 8.75), ...IR_TRIP.flatMap((t) => box(movesAt(t), "ir", 9.5, 4, 18.5, 11.5, 3.4, 7.1))], 1.06);
// holds are where the subtitle is read; each short push (≈1 s, ≈20 %) lands on the detail it names
const CAM = [
  [0, shot(0, closed)], [3.2, shot(0, closed)], [4.1, shot(0, F_screen)], [5.2, shot(0, F_screen)],
  [9.6, shot(11, building)], [11.9, shot(11, building)],
  [15.5, shot(15, F_floor1)], [19.2, shot(19, F_floor1)], [20.4, shot(20.4, F_coil)], [26.7, shot(26, F_coil)],
  [29.7, shot(30, F_floor2)], [30.8, shot(30.8, F_floor2)], [31.7, shot(31.7, F_floor2in)], [32.6, shot(32.6, F_floor2in)], [34.3, shot(34.3, F_left)], [39.6, shot(39, F_left)],
  [43.6, shot(43, F_floor3)],
  [47.9, shot(48, F_stack)], [48.9, shot(48.9, irisC)], [52.4, shot(52.4, irisC)], [56.4, shot(56.4, irisC)],
  [57.7, shot(57.7, F_floor3b)], [59.0, shot(59.0, F_board)], [64.6, shot(64.6, F_board)], [65.6, shot(65.6, F_mesh)], [70.6, shot(70.6, F_mesh)],
  [72.0, shot(72.0, F_mid4)], [73.4, shot(73.4, F_f4a)], [76.2, shot(76.2, F_f4a)], [77.2, shot(77.2, F_f4aIn)], [82.0, shot(82.0, F_f4aIn)],
  [84.2, shot(84.2, F_f4b)], [85.2, shot(85.2, F_bat)], [88.9, shot(88.9, F_bat)], [89.9, shot(89.9, F_lock)], [93.6, shot(93.6, F_lock)],
  [95.4, shot(95.4, F_floor5)], [99.4, shot(99.4, F_floor5)], [100.6, shot(100.6, F_floor5w)], [107.6, shot(107.6, F_floor5w)], [108.9, shot(108.9, F_hot)], [111.4, shot(111.4, F_hot)],
  [112.6, shot(112.6, F_floor6)], [114.6, shot(114.6, F_floor6)], [115.7, shot(116, F_irPath)], [117.2, shot(117.2, F_irPath)], [118.4, shot(118.4, F_dispTL)],
  [119.4, shot(119.4, F_ir)], [120.5, shot(120.5, F_ir)], [121.5, shot(121.5, F_irEdge)], [124.2, shot(124.2, F_irEdge)], [125.0, shot(125, F_irWide)], [126.0, shot(126, F_isl2)], [128.6, shot(128.6, F_isl2)],
  [130.2, shot(130.2, building)], [134.3, shot(134.3, building)],
  [139.3, shot(142, closed)], [DUR, shot(142, closed)],
].map(([t, c]) => [t, +c[0].toFixed(2), +c[1].toFixed(2), +c[2].toFixed(2)]);

// the IR camera's route, drawn over everything while it travels
const ROUTE = (() => {
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const seat = W3(L.front.ir[0], L.front.ir[1], L.rim - 0.2);
  const raw = Array.from({ length: 49 }, (_, i) => k.iso(add(seat, movesAt(115.9 + i * 0.05).ir), P));
  // the lens parks 3 mm under the glass, so its end point and the target ring on the glass top don't
  // coincide on screen: bend the last third of the route so the arrow tip lands on the ring's edge,
  // pointing at its centre
  const [cu, cv, rr] = [14.07, 7.91, 2.9], top = L.rim + 0.55 + 0.3 + 0.6 + 0.004;
  const C = k.iso(add(W3(cu, cv, top), FIN.display), P);
  const ring = Array.from({ length: 144 }, (_, j) => { const a = (j / 144) * Math.PI * 2; return k.iso(add(W3(cu + Math.cos(a) * rr, cv + Math.sin(a) * rr, top), FIN.display), P); });
  const end = raw[raw.length - 1];
  const bend = (T) => raw.map((p, i) => { const w = sstep(32, 48, i); return [p[0] + (T[0] - end[0]) * w, p[1] + (T[1] - end[1]) * w]; });
  let T = C, pts = bend(T);
  for (let it = 0; it < 3; it++) {
    // the ring point facing the incoming route
    const q = pts[42], dx = C[0] - q[0], dy = C[1] - q[1], dl = Math.hypot(dx, dy);
    let best = ring[0], bd = -2;
    for (const e of ring) { const ex = e[0] - C[0], ey = e[1] - C[1], el = Math.hypot(ex, ey); const dd = -(ex * dx + ey * dy) / (el * dl); if (dd > bd) { bd = dd; best = e; } }
    T = best; pts = bend(T);
  }
  const fw = shot(117, F_irPath)[2], len = 0.016 * fw, gap = 0.0025 * fw;
  const d = [C[0] - pts[44][0], C[1] - pts[44][1]], l = Math.hypot(d[0], d[1]), ux = d[0] / l, uy = d[1] / l;
  const c = [T[0] - ux * gap, T[1] - uy * gap];
  // the dashed line stops inside the arrowhead
  pts = pts.filter((p) => (p[0] - c[0]) * ux + (p[1] - c[1]) * uy < -len * 0.5);
  pts.push([c[0] - ux * len * 0.5, c[1] - uy * len * 0.5]);
  const chev = [[c[0] - ux * len - uy * len * 0.6, c[1] - uy * len + ux * len * 0.6], c, [c[0] - ux * len + uy * len * 0.6, c[1] - uy * len - ux * len * 0.6]];
  const f = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);
  return `<g id="ir-route" opacity="0"><path class="route" d="M${pts.map(f).join("L")}"/><path class="route-end" d="M${chev.map(f).join("L")}Z"/></g>`;
})();

// ------------------------------------------------------------------ page
const order = [...items].sort((a, b) => SK[0][1][a.i] - SK[0][1][b.i]);
const body = order.map((x) => `<g class="it" data-i="${x.i}"${ACC[x.i] >= 0 ? ` style="--acc:var(--f${ACC[x.i]})"` : ""}${x.tag ? ` data-tag="${x.tag}" data-idx="${x.idx}"` : ""}>${x.it.svg}</g>`).join("\n");
const axis = (v) => k.axisVector(P, v).map((n) => +n.toFixed(5));
const DATA = {
  P: { origin: P.origin, scale: P.scale, az: P.azimuth, el: P.elevation }, U,
  AX: [axis([1, 0, 0]), axis([0, 1, 0]), axis([0, 0, 1])],
  GRPS, GR: items.map((x) => GRPS.indexOf(x.grp)), LOD: items.map((x) => x.it.lod || null), GH, FLI,
  SK, CAM, SUBS, DUR, DURN: +toNew(DUR).toFixed(2), SH, FIN, UP, OPENZ, DOCK, IRIS, HEAT, PREV, LOCK, SWEEP, IRGLOW, FIELD, FOCUS, RECAP, TR, FL, BR, EV: EV.map((e) => ({ ...e, t: +toNew(e.t).toFixed(3) })),
  RB: 2.75, HEATR: 92 * U, LOCKH: 163.4 * U, base: [0, 0, 1920, 1080],
};
// six floating slabs climbing to the right, like the building; the current floor is filled
const STAIR = Array.from({ length: 6 }, (_, i) => { const x = 4 + i * 28, y = 136 - i * 24; return `<g class="st" data-f="${i}"><path class="st-top" d="M${x} ${y}H${x + 70}L${x + 92} ${y - 16}H${x + 22}Z"/><path class="st-side" d="M${x} ${y}H${x + 70}L${x + 92} ${y - 16}V${y - 9}L${x + 70} ${y + 7}H${x}Z"/></g>`; }).join("");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>口袋里的六层楼</title>
<style>
@font-face{font-family:Sans;src:url(fonts/NotoSansSC-500.woff)}
@font-face{font-family:Sans;src:url(fonts/NotoSansSC-700.woff);font-weight:700}
@font-face{font-family:Inter;src:url(fonts/Inter-var.woff);font-weight:100 900}
${k.ISO_CSS}
html,body{margin:0;height:100%;overflow:hidden;background:var(--anatomy-page)}
.iso{--anatomy-weight:calc(var(--px) * 1.4)}
/* video: phones and H.264 flatten the light theme's pale ramp, so it is lifted one step */
.iso[data-theme="light"]{--anatomy-shade-0:#d0d0cc;--anatomy-shade-1:#dbdbd7;--anatomy-shade-2:#e5e5e1;--anatomy-shade-3:#eeeeea;--anatomy-lit-shade:#e3e3df;--anatomy-mid:#76767b;--anatomy-lo:#a2a2a7;--anatomy-faint:#c6c6c9;--anatomy-dot:#2e2e32}
.iso-solid.ring>.iso-fill,.iso-solid.ring>.iso-top{fill-rule:evenodd}
/* 色彩脚本: one colour per floor, 1F amber, 2F blue, 3F violet, 4F green, 5F coral (the heat), 6F teal (the IR light).
   --fN draws lines and fills, --fNt is the darker shade used for text on paper */
.iso{--f0:#e8a252;--f1:#62a0f0;--f2:#a08af2;--f3:#62c46e;--f4:#ff7a5c;--f5:#33c3c7;--f0t:#f0b76e;--f1t:#86b6f4;--f2t:#b9a8f6;--f3t:#86d290;--f4t:#ff9a82;--f5t:#5fd3d6}
.iso[data-theme="light"]{--f0:#d4862f;--f1:#3b7dd8;--f2:#7b5cd6;--f3:#3fa34d;--f4:#e5533d;--f5:#149ca0;--f0t:#a85f12;--f1t:#245fae;--f2t:#5a3db5;--f3t:#2b7d37;--f4t:#bf3a26;--f5t:#0d7a7e}
.mc-blade{fill:color-mix(in srgb,var(--f2) 16%,var(--anatomy-top))}#iris-blades .iso-line[data-tone="lit"]{stroke:var(--f2)}
.port{fill:var(--film-port)}.iso{--film-port:#060606;--film-ir:var(--f5)}.iso[data-theme="light"]{--film-port:#cfcfcc}
.vc-win{fill:var(--anatomy-shade-0)}.sheet{fill:var(--film-sheet);fill-rule:evenodd}.island{fill:var(--film-void)}.cc-win{fill:var(--anatomy-shade-1)}.mc-void{fill:var(--film-void)}
.iso{--film-void:#040404;--film-sheet:#0c0c0c}.iso[data-theme="light"]{--film-void:#3a3a3e;--film-sheet:#e4e4e1}
${SCENE_CSS}
/* one lit part at a time: --on (0..1) per item mixes its edges toward the lit ink; --dim steps the rest down */
#world{--dim:0}.it{--on:0}
.it .iso-edge[data-tone="hi"]{stroke:color-mix(in srgb,var(--acc,var(--anatomy-lit)) calc(var(--on)*100%),color-mix(in srgb,var(--anatomy-mid) calc(var(--dim)*(1 - var(--on))*72%),var(--anatomy-hi)))}
.it .iso-edge[data-tone="mid"]{stroke:color-mix(in srgb,var(--acc,var(--anatomy-lit)) calc(var(--on)*100%),var(--anatomy-mid))}
.it .iso-edge[data-tone="lo"]{stroke:color-mix(in srgb,var(--acc,var(--anatomy-lit)) calc(var(--on)*100%),var(--anatomy-lo))}
.iso-line.turn,.iso-line.mesh-l,.iso-line.adh{--on:0;stroke:color-mix(in srgb,var(--acc,var(--anatomy-lit)) calc(var(--on)*100%),var(--anatomy-lo))}
/* a lit part takes its floor's colour: lines fully, faces as a light tint */
.it{--tint:18%}
.it .iso-solid>.iso-top{fill:color-mix(in srgb,var(--acc,var(--anatomy-lit)) calc(var(--on)*var(--tint)),var(--anatomy-top))}
.it .iso-solid>.iso-fill{fill:color-mix(in srgb,var(--acc,var(--anatomy-lit)) calc(var(--on)*var(--tint)),var(--anatomy-paper))}
.it .iso-solid>.iso-shade[data-shade="0"]{fill:color-mix(in srgb,var(--acc,var(--anatomy-lit)) calc(var(--on)*var(--tint)),var(--anatomy-shade-0))}
.it .iso-solid>.iso-shade[data-shade="1"]{fill:color-mix(in srgb,var(--acc,var(--anatomy-lit)) calc(var(--on)*var(--tint)),var(--anatomy-shade-1))}
.it .iso-solid>.iso-shade[data-shade="2"]{fill:color-mix(in srgb,var(--acc,var(--anatomy-lit)) calc(var(--on)*var(--tint)),var(--anatomy-shade-2))}
.it .iso-solid>.iso-shade[data-shade="3"]{fill:color-mix(in srgb,var(--acc,var(--anatomy-lit)) calc(var(--on)*var(--tint)),var(--anatomy-shade-3))}
/* the antenna splits are plain lines on the wall: they light as heavy lines in the floor colour */
.it[data-tag="antenna"] .iso-line{stroke:color-mix(in srgb,var(--acc,var(--anatomy-lit)) calc(var(--on)*100%),var(--anatomy-lo));stroke-width:calc(var(--anatomy-weight) * (1 + var(--on) * 1.6))}
/* a lit part also draws heavier, so it stands out from neighbours drawn the same way */
.it .iso-edge{stroke-width:calc(var(--anatomy-weight) * (1 + var(--on) * .8))}
/* the battery's glue strips seen through the vapor chamber (hidden lines), lit while the 12 V is on */
.iso-line.adhg{--on:0;stroke:color-mix(in srgb,var(--f3) calc(var(--on)*100%),var(--anatomy-mid));stroke-width:calc(var(--anatomy-weight) * (1 + var(--on)));stroke-dasharray:calc(var(--px)*7) calc(var(--px)*5);opacity:0}
/* capacity gauge on the cell */
.cap-box{fill:var(--anatomy-card);stroke:var(--anatomy-hi);stroke-width:calc(var(--px)*1.6);vector-effect:non-scaling-stroke}
.cap-cell{fill:var(--f3);fill-opacity:0;stroke:var(--anatomy-lo);stroke-width:calc(var(--px)*1);vector-effect:non-scaling-stroke}
.cap-line{stroke:var(--anatomy-lit);stroke-width:calc(var(--px)*2.6);vector-effect:non-scaling-stroke}
.cap-t{font-family:Inter,sans-serif;font-weight:600;fill:var(--anatomy-strong)}
.cap-lockb{fill:var(--anatomy-lit)}.cap-shk{fill:none;stroke:var(--anatomy-lit);stroke-width:calc(var(--px)*3.2);vector-effect:non-scaling-stroke}
/* IR camera: the guide down to the lens is dashed (hidden); the marks are heavy */
#ir-guide .iso-line{stroke-dasharray:calc(var(--px)*6) calc(var(--px)*5)}
#ir-mark .iso-line,#isl-mark .iso-line{stroke-width:calc(var(--anatomy-weight) * 2)}
#ir-guide .iso-line,#ir-mark .iso-line,#isl-mark .iso-line{stroke:var(--f5)}
.route{fill:none;stroke:var(--f5);stroke-width:calc(var(--px)*2.4);vector-effect:non-scaling-stroke;stroke-dasharray:calc(var(--px)*12) calc(var(--px)*8);stroke-linecap:round;stroke-linejoin:round}
.route-end{fill:var(--f5);stroke:var(--f5);stroke-width:calc(var(--px)*1.5);vector-effect:non-scaling-stroke;stroke-linejoin:round}
/* iris blades heavier so the six can be counted */
#iris-blades .iso-line{stroke-width:calc(var(--anatomy-weight) * 1.8)}
#stage{position:fixed;inset:0;background:var(--anatomy-card);--anatomy-paper:var(--anatomy-card)}
#fig.iso-svg{position:absolute;inset:0;width:100%;height:100%}
.card{position:absolute;inset:calc(var(--px)*34);box-shadow:0 0 0 calc(var(--px)*1) var(--anatomy-faint);pointer-events:none}
.corner{position:absolute;font-family:Inter,sans-serif;font-size:calc(var(--px)*17);letter-spacing:.12em;text-transform:uppercase;color:var(--anatomy-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.corner.tl{top:calc(var(--px)*22);left:calc(var(--px)*26);color:var(--anatomy-text)}
.corner.tr{top:calc(var(--px)*22);right:calc(var(--px)*26)}
.corner.bl{bottom:calc(var(--px)*22);left:calc(var(--px)*26)}
.corner.br{bottom:calc(var(--px)*16);right:calc(var(--px)*26);color:var(--anatomy-strong);letter-spacing:.04em;text-transform:none;font-family:Inter,Sans,sans-serif;font-size:calc(var(--px)*30);box-shadow:inset calc(var(--px)*5) 0 0 var(--cur,transparent);padding:calc(var(--px)*4) calc(var(--px)*12);border-radius:calc(var(--px)*6);background:color-mix(in srgb,var(--anatomy-card) 82%,transparent)}
#stair{position:absolute;top:calc(var(--px)*56);left:calc(var(--px)*14);display:flex;align-items:flex-end;gap:calc(var(--px)*14);opacity:0;padding:calc(var(--px)*8) calc(var(--px)*14);border-radius:calc(var(--px)*8);background:color-mix(in srgb,var(--anatomy-card) 82%,transparent)}
#stair svg{width:calc(var(--px)*168);height:calc(var(--px)*105);overflow:visible}
#stair .st[data-f="0"]{--c:var(--f0)}#stair .st[data-f="1"]{--c:var(--f1)}#stair .st[data-f="2"]{--c:var(--f2)}#stair .st[data-f="3"]{--c:var(--f3)}#stair .st[data-f="4"]{--c:var(--f4)}#stair .st[data-f="5"]{--c:var(--f5)}
#stair .st path{stroke:color-mix(in srgb,var(--c) 55%,var(--anatomy-mid));stroke-width:2;stroke-linejoin:round}
#stair .st-top{fill:color-mix(in srgb,var(--c) 16%,var(--anatomy-card))}#stair .st-side{fill:color-mix(in srgb,var(--c) 34%,var(--anatomy-card))}
#stair .st.on path{fill:var(--c);stroke:var(--c)}
#stair-t{font-family:Sans,sans-serif;font-size:calc(var(--px)*32);line-height:1;color:var(--anatomy-strong);letter-spacing:.04em;white-space:nowrap;padding-bottom:calc(var(--px)*4)}
#sub{position:absolute;left:0;right:0;bottom:calc(var(--px)*92);text-align:center;font-family:Sans,sans-serif;font-size:calc(var(--px)*50);line-height:1.3;color:var(--anatomy-strong);letter-spacing:.04em}
#sub .hl{font-weight:700}
#sub span{display:inline-block;padding:calc(var(--px)*6) calc(var(--px)*22);border-radius:calc(var(--px)*6);background:color-mix(in srgb,var(--anatomy-card) 80%,transparent)}
</style>
</head>
<body class="iso" data-theme="light">
<div id="stage">
<svg id="fig" class="iso-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" role="img" aria-label="口袋里的六层楼：iPhone 18 Pro Max 拆成六层">
<g id="world">
${body}
</g>
${ROUTE}
</svg>
<div class="card">
<div class="corner tl">Fig. 01</div>
<div class="corner tr" id="c-tr"></div>
<div class="corner bl">示意 · 按 iFixit / Apple 资料建模</div>
<div class="corner br" id="c-br"></div>
<div id="stair"><svg viewBox="0 0 240 150">${STAIR}</svg><div id="stair-t"></div></div>
</div>
<div id="sub"></div>
</div>
<script type="module">
const D = ${JSON.stringify(DATA)};
${POSE_JS}
${LIVE()}
</script>
</body>
</html>
`;
writeFileSync(join(ROOT, "index.html"), html);
console.log("index.html", (html.length / 1e6).toFixed(2), "MB", "total", ((Date.now() - t0) / 1000).toFixed(0), "s");

function LIVE() {
  return String.raw`
const q = new URLSearchParams(location.search);
if (q.get('theme')) document.body.dataset.theme = q.get('theme');
const Wd = innerWidth, Hd = innerHeight, S = Wd / 1920;
document.documentElement.style.setProperty('--px', S + 'px');
const svg = document.getElementById('fig'), world = document.getElementById('world');
const byI = []; for (const n of world.children) byI[+n.dataset.i] = n;
const N = byI.length;
const TAG = {}; for (const n of byI) { const t = n.dataset.tag; if (t) (TAG[t] = TAG[t] || []).push(n); }
for (const t in TAG) TAG[t].sort((a, b) => a.dataset.idx - b.dataset.idx);
const moves = poser(D.SH, D.FIN, D.UP, D.OPENZ, D.DOCK);
const camX = mono(D.CAM.map((c) => [c[0], c[1]])), camY = mono(D.CAM.map((c) => [c[0], c[2]])), camW = mono(D.CAM.map((c) => [c[0], Math.log(c[3])]));
const fIris = mono(D.IRIS), fHeat = mono(D.HEAT), fPrev = mono(D.PREV), fLock = mono(D.LOCK), fSweep = mono(D.SWEEP), fIr = mono(D.IRGLOW), fField = mono(D.FIELD);
const aspect = Wd / Hd;
let lastSig = '';
const el = (id) => document.getElementById(id);
const irisEl = el('iris-blades'), heatDisc = el('heat-disc'), heatGrad = el('heatgrad'), prev = el('prevvc'), hot = el('hotspot'), lockG = el('lock-g'), lockR = el('lock-rect'), irg = el('irglow-disc'), field = el('field');
const isos = [...document.querySelectorAll('.isotherm')];
const turns = [...document.querySelectorAll('.turn')], mesh = [...document.querySelectorAll('.mesh-l')], adh = [...document.querySelectorAll('.adh')], adhg = [...document.querySelectorAll('.adhg')];
const socG = el('socghost'), vcL1 = el('vc-l1'), vcL3 = el('vc-l3'), irGuide = el('ir-guide'), irMark = el('ir-mark'), islMark = el('isl-mark');
const route = el('ir-route'), routePath = route ? route.querySelector('.route') : null;
const cap = el('cap'), capLock = el('cap-lock'), capShk = el('cap-shk'), cells = [...document.querySelectorAll('.cap-cell')];
const stairEl = el('stair'), stairT = el('stair-t'), slabs = [...document.querySelectorAll('#stair .st')];
const onv = new Float32Array(N), lastOn = new Float32Array(N).fill(-1), lastOp = new Float32Array(N).fill(-1);
let lastFloor = -2;
const fade = (a, b, c, d, t) => sstep(a, b, t) * (1 - sstep(c, d, t));
const RISE = [5.0, 7.0, 6.4, 5.8, 5.8, 5.2];   // when each floor starts to lift (back, chassis, internals, battery, vc, display)
const HL = /【(?:(\d)\|)?([^】]+)】/g, plain = (x) => x.replace(HL, '$2');
const fieldPath = field ? field.querySelector('path') : null;
// ---- iris, rebuilt from the f-number each frame (same geometry as model/maincam.mjs)
const RAD = Math.PI / 180, cA = Math.cos(D.P.az * RAD), sA = Math.sin(D.P.az * RAD), cE = Math.cos(D.P.el * RAD), sE = Math.sin(D.P.el * RAD), KK = D.P.scale * Math.sqrt(1.6);
const iso = (x, y, z) => [D.P.origin[0] + (x * sA - y * cA) * KK, D.P.origin[1] + ((x * cA + y * sA) * sE - z * cE) * KK];
function irisGeo(f) {
  const n = 6, ring = D.RB, Dm = 6.8 / f, rho = Dm / 2 / Math.cos(Math.PI / n), beta = 0.62 * (6.8 / 1.48 - Dm);
  const V = Array.from({ length: n }, (_, i) => { const a = beta + (i / n) * Math.PI * 2; return [Math.cos(a) * rho, Math.sin(a) * rho]; });
  const hit = (p, d) => { const b = p[0] * d[0] + p[1] * d[1], c = p[0] * p[0] + p[1] * p[1] - ring * ring; const t = -b + Math.sqrt(Math.max(0, b * b - c)); return [p[0] + d[0] * t, p[1] + d[1] * t]; };
  const Q = V.map((p, i) => { const qv = V[(i + 1) % n]; const d = [qv[0] - p[0], qv[1] - p[1]]; const l = Math.hypot(d[0], d[1]); return hit(qv, [d[0] / l, d[1] / l]); });
  const arc = (a, b, steps = 18) => { let a0 = Math.atan2(a[1], a[0]), a1 = Math.atan2(b[1], b[0]); while (a1 > a0) a1 -= Math.PI * 2; while (a1 < a0 - Math.PI * 2) a1 += Math.PI * 2; return Array.from({ length: steps + 1 }, (_, j) => { const t = a0 + ((a1 - a0) * j) / steps; return [Math.cos(t) * ring, Math.sin(t) * ring]; }); };
  const blades = V.map((p, i) => { const qv = V[(i + 1) % n], back = Q[(i + n - 1) % n]; return [p, qv, ...arc(Q[i], back).slice(0, -1), back]; });
  return { blades, opening: V, Dm };
}
let lastF = -1;
function drawIris(f) {
  if (!irisEl || Math.abs(f - lastF) < 1e-4) return; lastF = f;
  const cx = +irisEl.dataset.cx, cy = +irisEl.dataset.cy, zt = +irisEl.dataset.zt, U = D.U;
  const flat = (pts, closed = true) => pts.map(([x, y], i) => { const p = iso(cx + x * U, cy + y * U, zt); return (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join('') + (closed ? 'Z' : '');
  const g = irisGeo(f);
  const bl = g.blades.map((b) => flat(b)).join('');
  const op = flat(g.opening);
  const pins = g.blades.map((b) => { const a = Math.atan2(b[2][1], b[2][0]) - 0.35; const p = iso(cx + Math.cos(a) * (D.RB - 0.3) * U, cy + Math.sin(a) * (D.RB - 0.3) * U, zt); return '<circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="' + (0.12 * U).toFixed(2) + '"/>'; }).join('');
  irisEl.innerHTML = g.blades.map((b) => '<path class="mc-blade" d="' + flat(b) + '"/>').join('') + '<path class="mc-void" d="' + op + '"/><path class="iso-line" data-tone="lit" d="' + bl + '"/><path class="iso-line" data-tone="lit" d="' + op + '"/><g class="iso-dots" data-tone="hi">' + pins + '</g>';
}
const subEl = document.getElementById('sub'), trEl = document.getElementById('c-tr'), brEl = document.getElementById('c-br');
const pick = (list, t) => { let r = list[0][1]; for (const x of list) if (t >= x[0]) r = x[1]; return r; };
function render(tn) {
  const t = toOld(tn);                    // everything below runs on v1 seconds; subtitles run on film time
  // floors and the main camera
  const m = moves(t);
  const off = D.GRPS.map((g) => { const v = m[g] || [0, 0, 0]; return [D.AX[0][0] * v[0] + D.AX[1][0] * v[1] + D.AX[2][0] * v[2], D.AX[0][1] * v[0] + D.AX[1][1] * v[1] + D.AX[2][1] * v[2]]; });
  for (let i = 0; i < N; i++) { const o = off[D.GR[i]], n = byI[i]; if (o[0] || o[1]) n.setAttribute('transform', 'translate(' + o[0].toFixed(2) + ' ' + o[1].toFixed(2) + ')'); else n.removeAttribute('transform'); }
  // painter's order: the depth sample nearest to t
  let best = D.SK[0]; for (const s of D.SK) if (Math.abs(s[0] - t) < Math.abs(best[0] - t)) best = s;
  const keys = best[1], idx = Array.from({ length: N }, (_, i) => i).sort((a, b) => keys[a] - keys[b] || a - b), sig = idx.join(',');
  if (sig !== lastSig) { const f = document.createDocumentFragment(); for (const i of idx) f.appendChild(byI[i]); world.appendChild(f); lastSig = sig; }
  // camera
  const w = Math.exp(camW(t)), h = w / aspect, cx = camX(t), cy = camY(t);
  svg.setAttribute('viewBox', (cx - w / 2).toFixed(2) + ' ' + (cy - h / 2).toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2));
  const zoom = D.base[2] / w;
  // zoom fades fine detail in; the display layers ghost while we look through the glass at the IR camera
  const gh = fade(118.5, 119.7, 124.0, 125.3, t);
  for (let i = 0; i < N; i++) {
    let op = D.LOD[i] ? sstep(D.LOD[i][0], D.LOD[i][1], zoom) : 1;
    if (D.GH[i]) op *= 1 - 0.82 * gh;
    if (Math.abs(op - lastOp[i]) > 1e-3) { byI[i].style.opacity = op >= 0.999 ? '' : op.toFixed(3); lastOp[i] = op; }
  }
  // one lit part at a time (several only when they are one thing: the magnets, the 14 screws, a floor in the recap)
  onv.fill(0); let dim = 0;
  const lift = (i, on) => { if (on > onv[i]) onv[i] = on; if (on > dim) dim = on; };
  for (const tag in D.FOCUS) { const [a, b, c, d] = D.FOCUS[tag]; const on = fade(a, b, c, d, t); if (on > 0) for (const n of TAG[tag] || []) lift(+n.dataset.i, on); }
  (TAG.magnet || []).forEach((n, j) => lift(+n.dataset.i, fade(21.3 + 0.12 * j, 21.6 + 0.12 * j, 27, 29, t)));
  (TAG.vcscrew || []).forEach((n, j) => { const a = 96.0 + 0.25 * j; const on = fade(a, a + 0.2, 100.2, 100.8, t); if (on > onv[+n.dataset.i]) onv[+n.dataset.i] = on; });
  if (t > 130 && t < 135.5) for (let i = 0; i < N; i++) { const f = D.FLI[i]; if (f >= 0) { const a = D.RECAP[f]; lift(i, fade(a, a + 0.3, a + 0.7, a + 1.1, t)); } }
  // the six colours are introduced once: each floor tints as it lifts off, and they all fade before 1F
  if (t > 4.9 && t < 11.9) for (let i = 0; i < N; i++) { const f = D.FLI[i]; if (f >= 0) { const a = RISE[f]; lift(i, 0.85 * fade(a, a + 0.6, 10.6, 11.7, t)); } }
  for (let i = 0; i < N; i++) if (Math.abs(onv[i] - lastOn[i]) > 1e-3) { byI[i].style.setProperty('--on', onv[i].toFixed(3)); lastOn[i] = onv[i]; }
  world.style.setProperty('--dim', dim.toFixed(3));
  turns.forEach((n, i) => n.style.setProperty('--on', fade(16 + 0.3 * i, 16.4 + 0.3 * i, 27, 29, t).toFixed(3)));
  mesh.forEach((n, i) => n.style.setProperty('--on', fade(65.0 + 0.09 * i, 65.3 + 0.09 * i, 70.6, 72, t).toFixed(3)));
  adh.forEach((n, i) => { n.style.setProperty('--on', sstep(79.0 + 0.3 * i, 79.4 + 0.3 * i, t).toFixed(3)); n.style.opacity = (1 - sstep(81.4 + 0.3 * i, 82.2 + 0.3 * i, t)).toFixed(3); });
  // 12 V on: the strips under the plate light one by one, then let go (fade) as the counter reaches 90 s
  adhg.forEach((n, i) => { n.style.setProperty('--on', sstep(79.0 + 0.3 * i, 79.4 + 0.3 * i, t).toFixed(3)); n.style.opacity = fade(78.6, 79.0, 81.4 + 0.3 * i, 82.2 + 0.3 * i, t).toFixed(3); });
  // capacity gauge: fills cell by cell, the last two (past 20 Wh) are held back under the lock, then released
  if (cap) {
    cap.setAttribute('opacity', fade(84.2, 84.6, 93.8, 94.6, t).toFixed(3));
    const locked = fade(89.4, 89.8, 92.5, 92.9, t);
    cells.forEach((n, j) => { const f = sstep(84.6 + j * 0.136, 84.72 + j * 0.136, t) * (j >= 20 ? 1 - locked : 1); n.style.fillOpacity = f.toFixed(3); });
    capLock.setAttribute('opacity', fade(89.6, 90.0, 93.0, 93.6, t).toFixed(3));
    capShk.setAttribute('transform', 'translate(0 ' + (-1.2 * D.U * sstep(92.2, 92.5, t)).toFixed(2) + ')');
  }
  // the IR camera's window and the island
  if (irGuide) irGuide.setAttribute('opacity', fade(119.2, 119.8, 124.0, 124.6, t).toFixed(3));
  if (irMark) irMark.setAttribute('opacity', Math.max(fade(115.4, 115.9, 118.8, 119.3, t), fade(125.4, 125.9, 128.4, 129.0, t)).toFixed(3));
  if (route) { route.setAttribute('opacity', fade(115.3, 115.8, 118.3, 118.9, t).toFixed(3)); routePath.style.strokeDashoffset = (-t * 40 * S).toFixed(1) + 'px'; }
  if (islMark) islMark.setAttribute('opacity', fade(125.8, 126.3, 128.4, 129.0, t).toFixed(3));
  // MagSafe field
  if (field) { field.setAttribute('opacity', fField(t).toFixed(3)); if (fieldPath) fieldPath.style.strokeDashoffset = (-t * 22 * S).toFixed(1) + 'px'; }
  // iris
  const f = fIris(t); drawIris(f);
  // heat
  const ht = Math.max(0, fHeat(t)), r = D.HEATR * Math.max(0.002, ht);
  if (heatDisc) { heatDisc.setAttribute('r', r.toFixed(1)); heatGrad.setAttribute('r', r.toFixed(1)); const ho = Math.min(1, ht * 6).toFixed(3); isos.forEach((c, i) => { c.setAttribute('r', (r * ((i + 1) / 6.5)).toFixed(1)); c.style.opacity = ho; }); heatDisc.style.opacity = ho; }
  if (prev) prev.style.opacity = fPrev(t).toFixed(3);
  const ho = fade(100.4, 101.0, 110.5, 112.8, t);
  if (hot) hot.style.opacity = ho.toFixed(3);
  if (socG) socG.setAttribute('opacity', ho.toFixed(3));
  if (vcL1) vcL1.setAttribute('opacity', fade(101.6, 102.2, 110, 111.5, t).toFixed(3));
  if (vcL3) vcL3.setAttribute('opacity', fade(102.4, 103.0, 110, 111.5, t).toFixed(3));
  // lock screen and IR glow
  if (lockG) { lockG.setAttribute('opacity', Math.max(0, fLock(t)).toFixed(3)); lockR.setAttribute('height', (D.LOCKH * Math.min(1, Math.max(0, fSweep(t)))).toFixed(1)); }
  if (irg) irg.style.opacity = Math.max(0, fIr(t)).toFixed(3);
  // subtitles and corners
  const s = D.SUBS.find((x) => tn >= x[0] && tn < x[1]);
  let cf = -1; for (const x of D.FL) if (t >= x[0]) cf = x[1];
  if (t >= 129.4) cf = -1;
  // highlighted words take the current floor's colour; 【n|word】 forces floor n (the recap)
  const hl = (x) => x.replace(HL, (m, n, w) => { const f = n !== undefined ? +n : cf; return '<b class="hl"' + (f >= 0 ? ' style="color:var(--f' + f + 't)"' : '') + '>' + w + '</b>'; });
  if (s) { const a = Math.min(sstep(s[0], s[0] + 0.25, tn), 1 - sstep(s[1] - 0.25, s[1], tn)); subEl.innerHTML = '<span>' + hl(s[2]) + '</span>'; subEl.style.opacity = a.toFixed(3); } else subEl.innerHTML = '';
  document.getElementById('stage').style.setProperty('--cur', cf >= 0 ? 'var(--f' + cf + ')' : 'transparent');
  trEl.textContent = pick(D.TR, t);
  let br = pick(D.BR, t);
  if (t >= 48.5 && t < 57.0) br = 'ƒ/' + f.toFixed(2) + (t < 54.4 ? ' · 开口 ' + (6.8 / f).toFixed(2) + ' mm' : ' · 进光量 ×' + ((4 / f) ** 2).toFixed(1));
  else if (t >= 78.6 && t < 83.8) br = '12 V · 通电 ' + Math.round(90 * Math.min(1, Math.max(0, (t - 79.0) / 3.0))) + ' 秒';
  brEl.textContent = br;
  // floor indicator
  stairEl.style.opacity = fade(11.9, 12.5, 129.0, 129.6, t).toFixed(3);
  let fl = -1, name = ''; for (const x of D.FL) if (t >= x[0]) { fl = x[1]; name = x[2]; }
  if (fl !== lastFloor) { slabs.forEach((n, i) => n.classList.toggle('on', i === fl)); stairT.textContent = name; stairT.style.color = fl >= 0 ? 'var(--f' + fl + 't)' : ''; lastFloor = fl; }
}
window.DUR = D.DURN;
window.EV = D.EV;
window.TEXTS = (t) => { const s = D.SUBS.find((x) => t >= x[0] && t < x[1]); if (!s) return []; render(t); const b = subEl.firstChild.getBoundingClientRect(); return [{ id: 'sub' + D.SUBS.indexOf(s), text: plain(s[2]), x0: b.left, y0: b.top, x1: b.right, y1: b.bottom }]; };
window.render = render;
await document.fonts.load('44px Sans'); await document.fonts.load('17px Inter'); await document.fonts.ready;
render(+(q.get('t') || 0));
window.READY = true;
`;
}
