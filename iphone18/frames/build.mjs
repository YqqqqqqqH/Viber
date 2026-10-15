// Style frames for stop 2, drawn with the film's own scene code: one world projection, the
// camera is just a viewBox on it. node frames/build.mjs [f1 f2 f3 f4]
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { scene, worldP, floorMove, MAIN, SCENE_CSS, FLOOR } from "../model/scene.mjs";
import { writePage, READY_TAIL } from "../model/stage.mjs";
import { U, W3, X, Y, Z } from "../model/units.mjs";
import { mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const HERE = dirname(fileURLToPath(import.meta.url));
const P = worldP();
const BASE = [0, 0, 1920, 1080];
const at = (piece, u, v, w) => { const m = floorMove(piece); const p = W3(u, v, w); return k.iso([p[0] + m[0], p[1] + m[1], p[2] + m[2]], P); };
// a camera framing from a few world points: centre and width with margin, 16:9
const frame = (pts, margin = 1.15) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const w = Math.max((Math.max(...xs) - Math.min(...xs)) * margin, (Math.max(...ys) - Math.min(...ys)) * margin * 16 / 9);
  return [cx, cy, w];
};
const FRAMES = {
  f1: { opts: { irisF: 1.48 }, cam: [960, 540, 1920], sub: "把它一层层拆开，叠起来是一栋六层的楼。", tr: "八毫米的楼 · 全景", br: "6 层 · 8.75 mm" },
  f2: { opts: { irisF: 2.8, irisLit: true }, cam: () => { const m = floorMove("camera"); const c = W3(MAIN.u, MAIN.v, MAIN.lift); const q = (dz, du = 0, dv = 0) => k.iso([c[0] + m[0] + dv * U, c[1] + m[1] + du * U, c[2] + m[2] + dz * U], P); return frame([q(-6, -14, -14), q(-6, 14, 14), q(28, 0, 0), q(-8, 10, -12), q(-8, -10, 12)], 1.05); }, sub: "从 ƒ/1.48 收到 ƒ/4，开口从 4.6 毫米缩到 1.7 毫米。", tr: "三楼 · 主摄光圈", br: "ƒ/2.8 · 开口 2.43 mm" },
  f3: { opts: { heat: 0.7, prevVC: true, lit: "vc" }, cam: () => frame([at("vc", 4, 8, 7), at("vc", 74, 8, 7), at("vc", 4, 100, 7), at("vc", 74, 100, 7)], 1.05), sub: "面积是上一代的 3 倍，芯片的热顺着它铺开。", tr: "五楼 · 均热板", br: "面积 3× · 持续性能 +40%" },
  f4: { opts: { lit: "" }, cam: () => frame([at("display", 10.3, 4.2, 8.75), at("display", 17.8, 4.2, 8.75), at("display", 10.3, 11.6, 8.75), at("display", 17.8, 11.6, 8.75)], 1.0), sub: "它上方的像素每隔一行少一行，所以灵动岛变小了。", tr: "六楼 · 屏下红外摄像头", br: "460 ppi · 孔径 3.68 mm" },
};
const want = process.argv.slice(2).filter((a) => FRAMES[a]);
for (const name of want.length ? want : Object.keys(FRAMES)) {
  const F = FRAMES[name];
  const R = A.recorder(P);
  scene(P, R, { ...F.opts, lod: true });
  const t0 = Date.now();
  A.settle(R, { ...P, scale: P.scale / 3, origin: [P.origin[0] / 3, P.origin[1] / 3] }, { states: [1] });
  const cam = typeof F.cam === "function" ? F.cam() : F.cam;
  const dir = join(HERE, name);
  mkdirSync(join(dir, "fonts"), { recursive: true });
  for (const f of ["NotoSansSC-500.woff", "Inter-var.woff"]) copyFileSync(join(HERE, "..", "fonts", f), join(dir, "fonts", f));
  const items = R.items.map((it) => ({ svg: it.svg, key: it.key, piece: it.piece, lod: it.lod, move: it.move }));
  const shares = Object.fromEntries(Object.keys(FLOOR).map((p) => [p, [[0, 1]]]));
  const r = writePage(join(dir, "index.html"), {
    title: "style frame " + name, theme: "light", P, items, base: BASE,
    timeline: { dur: 2, cam: [[0, ...cam]], subs: [[0, 2, F.sub]], shares },
    css: SCENE_CSS, corners: { tl: "Fig. " + name.slice(1).padStart(2, "0"), tr: F.tr, bl: "示意 · 按 iFixit / Apple 资料建模", br: F.br },
    live: READY_TAIL,
  });
  console.log(name, R.items.length, "items", (r.bytes / 1e6).toFixed(1), "MB", "settle", Date.now() - t0, "ms", "zoom", (1920 / cam[2]).toFixed(2));
}
