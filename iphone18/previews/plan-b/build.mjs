// Plan B key frame: the phone fanned into four layers above a display plinth (dark, keynote):
// unibody + back glass, the internals (board lit), the vapor chamber with the battery under it, the display.
import * as k from "../../kit/iso-kit.mjs";
import * as A from "../../kit/audit.mjs";
import { phone } from "../../model/phone.mjs";
import { writePage, READY_TAIL } from "../../model/stage.mjs";
import { U, W3, X, Y, Z } from "../../model/units.mjs";
import { fileURLToPath } from "node:url";
const theme = process.argv.includes("--light") ? "light" : "dark";
const AZ = 58, EL = 30;
const STEP = [-112 * U, 0, 26 * U];
const LEVEL = { chassis: 0, back: 0, board: 1, camera: 1, front: 1, speaker: 1, taptic: 1, usb: 1, cc: 1, battery: 2, display: 3 };
const moves = Object.fromEntries(Object.entries(LEVEL).map(([p, i]) => [p, STEP.map((d) => d * i)]));
const ext = [];
for (const i of [0, 3]) for (const c of [W3(-2, -2, -3), W3(80, 165, 9)]) ext.push([c[0] + STEP[0] * i, c[1], c[2] + STEP[2] * i]);
ext.push(W3(-14, -14, -8), W3(92, 177, -8));
const P = k.fitProjection(ext, 1920, 1080, { pad: 70, azimuth: AZ, elevation: EL });
const R = A.recorder(P);
phone(P, R, { moves, lod: false, lit: "soc" });
const base = { x: X(-12), y: Y(-12), w: (163.4 + 24) * U, d: (78 + 24) * U, r: 12 * U };
const zt = Z(-2.85) - 0.2 * U;
let svg = `<path class="iso-halo" d="${k.haloOf(base, zt - 16 * U, 16 * U, P)}"/>` + k.solidSvg(k.slabOf(base, zt - 16 * U, 16 * U, P, 10, 1.4 * U), { tone: "lo" });
svg += k.lineSvg(k.planOutline(k.insetPlan(base, 4 * U), zt, P, 10), { tone: "faint" });
R.put({ piece: "stand", at: [0, 0, zt - 8 * U], key: -1e7, svg, shapes: [] });
const sp = { ...P, scale: P.scale / 3, origin: [P.origin[0] / 3, P.origin[1] / 3] };
const t0 = Date.now();
A.settle(R, sp, { states: [1] });
console.log("items", R.items.length, "settle", Date.now() - t0, "ms");
const items = R.items.map((it) => ({ svg: it.svg, key: it.key, piece: it.piece, move: it.move }));
const shares = Object.fromEntries(Object.keys(moves).map((p) => [p, [[0, 1]]]));
writePage(fileURLToPath(new URL("./index.html", import.meta.url)), {
  title: "plan B · 八毫米的楼", theme, P, items, base: [0, 0, 1920, 1080],
  timeline: { dur: 2, shares, subs: [[0, 2, "第二层：A20 Pro 挪到了主板朝外的一面"]] },
  corners: { tl: "Fig. 02", tr: "iPhone 18 Pro Max · 爆炸图", bl: "示意", br: "层 2 / 4 · A20 Pro · 2 nm" },
  live: READY_TAIL,
});
