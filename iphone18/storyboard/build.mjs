// Storyboard for stop 3: nine key shots from 镜头表.md, each drawn by the film's scene code in
// its own explode pose, with its own camera framing on the one world projection.
// node storyboard/build.mjs [s01 s03 …]
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { scene, worldP, posedMoves, MAIN, SCENE_CSS, FLOOR } from "../model/scene.mjs";
import { writePage, READY_TAIL } from "../model/stage.mjs";
import { U, W3 } from "../model/units.mjs";
import { mkdirSync, copyFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const HERE = dirname(fileURLToPath(import.meta.url));
const P = worldP();
const SUBS = JSON.parse(readFileSync(join(HERE, "..", "subs.json"), "utf8")).subs;
const subAt = (t) => (SUBS.find(([a, b]) => t >= a && t < b) || [0, 0, ""])[2];
const frame = (pts, margin = 1.1) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return [cx, cy, Math.max((Math.max(...xs) - Math.min(...xs)) * margin, (Math.max(...ys) - Math.min(...ys)) * margin * 16 / 9)];
};
const corners = (moves, piece, u0, v0, u1, v1, w0, w1) => {
  const m = moves[piece] || [0, 0, 0], out = [];
  for (const u of [u0, u1]) for (const v of [v0, v1]) for (const w of [w0, w1]) { const p = W3(u, v, w); out.push(k.iso([p[0] + m[0], p[1] + m[1], p[2] + m[2]], P)); }
  return out;
};
const allFloors = (moves, margin) => frame(Object.keys(FLOOR).flatMap((p) => corners(moves, p, -2, -2, 80, 165.4, -3, 9)).concat(corners({}, "x", -14, -14, 92, 177.4, -20, -3)), margin);
const SHOTS = {
  s01: { file: "s01_still_3s", t: 1.5, opts: { pose: 0, mainOpen: false, screenOn: true }, cam: (m) => frame(corners({}, "x", -14, -14, 92, 177.4, -20, 9), 1.06), tr: "开场", br: "163.4 × 78.0 × 8.75 mm" },
  s03: { file: "s03_pullback_4s", t: 8, opts: { mainOpen: false, battDrop: 0, floors: { back: [0, 0], chassis: [0.55, 0], internals: [1, 0.18], vc: [1, 0.5], battery: [1, 0.5], display: [1, 0.8] } }, cam: (m) => allFloors(m, 1.02), tr: "盖楼", br: "6 层 · 依次升起" },
  s06: { file: "s06_push_5.5s", t: 18, opts: { mainOpen: false, lit: "coil" }, cam: (m) => frame(corners(m, "back", 10, 54, 68, 110, 0, 1), 1.12), tr: "一楼 · 后盖玻璃", br: "MagSafe 线圈" },
  s13: { file: "s13_snap_4.4s", t: 50.5, opts: { irisF: 4.0, irisLit: true }, cam: (m) => { const c = W3(MAIN.u, MAIN.v, MAIN.lift + 5.4), mm = m.camera; const q = (du, dv, dz) => k.iso([c[0] + mm[0] + dv * U, c[1] + mm[1] + du * U, c[2] + mm[2] + dz * U], P); return frame([q(-7, -7, 0), q(7, 7, 0), q(7, -7, 0), q(-7, 7, 0), q(0, 0, 6), q(0, 0, -6)], 1.05); }, tr: "三楼 · 主摄光圈", br: "ƒ/4.0 · 开口 1.70 mm" },
  s17: { file: "s17_push_4s", t: 66, opts: { mainOpen: false, lit: "soc" }, cam: (m) => frame(corners(m, "board", 20, 39, 49, 66, 3, 6), 1.0), tr: "三楼 · 主板", br: "A20 Pro · 2 nm · 32 核神经网络引擎" },
  s21: { file: "s21_hold_5.5s", t: 82, opts: { mainOpen: false, battDrop: 0.72, lit: "battery" }, cam: (m) => frame([...corners(m, "battery", 6, 63, 72, 144, 1.5, 6.4), ...corners(m, "vc", 4, 60, 74, 145, 6.4, 6.9)], 1.04), tr: "四楼 · 电池", br: "12 V · 约 90 秒解胶" },
  s25: { file: "s25_pullback_6s", t: 103, opts: { mainOpen: false, heat: 0.95, prevVC: true, lit: "vc" }, cam: (m) => frame(corners(m, "vc", 4, 8, 74, 145, 6, 7.2), 1.04), tr: "五楼 · 均热板", br: "面积 3× · 持续性能 +40%" },
  s29: { file: "s29_snap_4s", t: 121, opts: { mainOpen: false }, cam: (m) => frame(corners(m, "display", 10.3, 4.2, 17.8, 11.6, 8.75, 8.75), 1.0), tr: "六楼 · 屏下红外摄像头", br: "460 ppi · 孔径 3.68 mm" },
  s32: { file: "s32_pullback_5s", t: 130, opts: { mainOpen: false }, cam: (m) => allFloors(m, 0.9), tr: "整栋楼", br: "6 层 · 8.75 mm" },
};
const want = process.argv.slice(2).filter((a) => SHOTS[a]);
for (const name of want.length ? want : Object.keys(SHOTS)) {
  const S = SHOTS[name];
  const R = A.recorder(P);
  const moves = scene(P, R, { lod: true, ...S.opts });
  A.settle(R, { ...P, scale: P.scale / 3, origin: [P.origin[0] / 3, P.origin[1] / 3] }, { states: [1] });
  const cam = S.cam(moves);
  const dir = join(HERE, name);
  mkdirSync(join(dir, "fonts"), { recursive: true });
  for (const f of ["NotoSansSC-500.woff", "Inter-var.woff"]) copyFileSync(join(HERE, "..", "fonts", f), join(dir, "fonts", f));
  const items = R.items.map((it) => ({ svg: it.svg, key: it.key, piece: it.piece, lod: it.lod, move: it.move }));
  const shares = Object.fromEntries([...new Set(items.map((i) => i.piece))].map((p) => [p, [[0, 1]]]));
  writePage(join(dir, "index.html"), {
    title: "storyboard " + name, theme: "light", P, items, base: [0, 0, 1920, 1080],
    timeline: { dur: 2, cam: [[0, ...cam]], subs: [[0, 2, subAt(S.t)]], shares },
    css: SCENE_CSS, corners: { tl: name.toUpperCase() + " · " + S.file.split("_").slice(-1)[0], tr: S.tr, bl: "示意 · 按 iFixit / Apple 资料建模", br: S.br },
    live: READY_TAIL,
  });
  console.log(name, R.items.length, "items", "zoom", (1920 / cam[2]).toFixed(2));
}
