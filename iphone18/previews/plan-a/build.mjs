// Plan A key frame (beat 5): the display opened over its left edge and lying face down, the
// vapor-chamber tray (with the battery glued under it) lifted out onto the bench, its 14 screws in
// the magnetic mat, and the A20 Pro's chain mail exposed on the board, lit.
import * as k from "../../kit/iso-kit.mjs";
import * as A from "../../kit/audit.mjs";
import { phone } from "../../model/phone.mjs";
import { bench, screwMat, displayFaceDown } from "../../model/bench.mjs";
import { writePage, READY_TAIL } from "../../model/stage.mjs";
import { U, W3, X, Y, Z } from "../../model/units.mjs";
import { fileURLToPath } from "node:url";
const theme = process.argv.includes("--dark") ? "dark" : "light";
const AZ = 58, EL = 36;
const PLATE = { x: X(-70), y: Y(-140), w: (163.4 + 300) * U, d: (78 + 290) * U, r: 12 * U };
const TRAY = [12 * U, 104 * U, Z(-2.5)];         // the tray goes down onto the bench at the front
const ext = [W3(0, -82, 0), W3(78, 0, 9), W3(0, 163.4, 0), [X(8) + TRAY[0], Y(78) + TRAY[1], 0], [X(150) + TRAY[0], Y(78) + TRAY[1], 0], [X(232), Y(10), 0], [X(232), Y(70), 0]];
const P = k.fitProjection(ext, 1920, 1080, { pad: 70, azimuth: AZ, elevation: EL });
const R = A.recorder(P);
phone(P, R, { moves: { battery: TRAY }, battScrews: false, skip: ["display"], lit: "soc", lod: false });
const b = bench(P, R, { plate: PLATE });
const cells = Array.from({ length: 14 }, (_, i) => [i % 5, Math.floor(i / 5)]);
screwMat(P, R, { at: [X(176), Y(4)], cols: 5, rows: 3, cell: 10, screws: cells, z: b.matTop - 2.2 * U });
displayFaceDown(P, R, { at: [X(0), Y(-81.5)], z: b.matTop - 2.2 * U, crack: 1, flexX: X(52) });
const sp = { ...P, scale: P.scale / 3, origin: [P.origin[0] / 3, P.origin[1] / 3] };
const t0 = Date.now();
A.settle(R, sp, { states: [1] });
console.log("items", R.items.length, "settle", Date.now() - t0, "ms");
const items = R.items.map((it) => ({ svg: it.svg, key: it.key, piece: it.piece, move: it.move }));
writePage(fileURLToPath(new URL("./index.html", import.meta.url)), {
  title: "plan A · 拆机台", theme, P, items, base: [0, 0, 1920, 1080],
  timeline: { dur: 2, shares: { battery: [[0, 1]] }, subs: [[0, 2, "托盘一抬走，A20 Pro 就贴在它下面"]] },
  css: `.bench-digits{font-family:Inter,sans-serif;font-variant-numeric:tabular-nums;fill:var(--anatomy-hi);letter-spacing:.04em}`,
  corners: { tl: "Fig. 05", tr: "iPhone 18 Pro Max · 拆机台", bl: "示意 · 刻度 1 mm", br: "螺丝 14/14 · A20 Pro · 2 nm" },
  live: READY_TAIL,
});
