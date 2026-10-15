// The teardown bench for plan A: a heavy base plate on feet, a millimetre ruler, a heat mat
// with a readout window, a magnetic screw mat with a grid of cells, and the display lying face
// down. All in world units (U per mm), z up; the phone's own frame is in units.mjs.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import * as A from "../kit/audit.mjs";
import { U, PHONE, X, Y, Z, W3 } from "./units.mjs";

const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const byDepth = (pts, P) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// bench plan in world units; top of the plate at z = Z(-0.01) - mat thickness (the phone rests on the heat mat)
export function bench(P, R, { plate, matTop = Z(-1.75), heat = true } = {}) {
  const put = (at, svg, shapes = [], o = {}) => R.put({ piece: "bench", at, svg, shapes: shapes.map((s) => R.solid(s)), ...o });
  const PL = plate;
  const top = matTop - 2.2 * U;              // plate top under the mat
  const H = 9 * U, FOOT = 5 * U;
  // halo, feet, plate, groove, corner screws
  let svg = `<path class="iso-halo" d="${k.haloOf(PL, top - H - FOOT, H, P)}"/>`;
  for (const [x, y] of byDepth(k.corners(PL, 30 * U * 0.4), P)) {
    svg += S(k.cylinder(x, y, 9 * U * 0.45, top - H - FOOT, 1.6 * U * 0.5, P, 28), { tone: "lo" });
    svg += S(k.cylinder(x, y, 7 * U * 0.45, top - H - FOOT + 0.8 * U, FOOT - 0.8 * U, P, 28), { tone: "mid" });
  }
  svg += S(k.slabOf(PL, top - H, H, P, 10, 1.6 * U * 0.6), { tone: "mid" });
  put([PL.x + PL.w / 2, PL.y + PL.d / 2, top - H / 2], svg, [A.slab(PL, top - H, H, { name: "stand.bench" })], { key: -1e7 });
  const groove = k.planOutline(k.insetPlan(PL, 5 * U), top, P, 10);
  const screws = k.corners(PL, 12 * U);
  put([PL.x + PL.w / 2, PL.y + PL.d / 2, top], Ln(groove, { tone: "lo" }) + Ln(screws.map(([x, y]) => k.ring(x, y, 2.4 * U * 0.5, top, P, 16)).join(""), { tone: "lo" }) + k.dotsSvg(screws.map(([x, y]) => k.iso([x, y, top], P)), { size: 0.55 * U * 0.5 }), [], { key: -9.9e6 });

  // millimetre ruler along the near (+y) edge: ticks every mm, majors every 10
  const strip = { x: PL.x + 22 * U, y: PL.y + PL.d - 12 * U, w: PL.w - 44 * U, d: 7 * U, r: 1 * U };
  const t = k.topTicks(strip.x + 3 * U, strip.x + strip.w - 3 * U, U, 10, strip.y + 0.2 * U, top + 0.6 * U, [1.6 * U, 3.4 * U], P);
  put([strip.x + strip.w / 2, strip.y, top], S(k.slabOf(strip, top, 0.6 * U, P, 3), { tone: "lo", crease: "none" }) + Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }), [A.slab(strip, top, 0.6 * U, { name: "stand.ruler" }, 3)], { key: -9.8e6 });

  // label plate, front left
  const lab = { x: PL.x + 14 * U, y: PL.y + PL.d - 30 * U, w: 46 * U, d: 12 * U, r: 1.4 * U };
  const lt = top + 0.8 * U;
  const rules = [0, 1, 2].map((i) => k.lineOnTop([lab.x + 4 * U, lab.y + 3.2 * U + i * 3 * U], [lab.x + 4 * U + [30, 22, 26][i] * U, lab.y + 3.2 * U + i * 3 * U], lt, P)).join("");
  put([lab.x + lab.w / 2, lab.y + lab.d / 2, top], S(k.slabOf(lab, top, 0.8 * U, P, 4), { tone: "lo", crease: "none" }) + Ln(k.planOutline(k.insetPlan(lab, 1.6 * U), lt, P, 4), { tone: "faint" }) + Ln(rules, { tone: "lo", free: true }) + k.dotsSvg([k.iso([lab.x + lab.w - 3 * U, lab.y + 3 * U, lt], P), k.iso([lab.x + lab.w - 3 * U, lab.y + lab.d - 3 * U, lt], P)], { size: 0.5 }), [A.slab(lab, top, 0.8 * U, { name: "stand.label" }, 4)], { key: -9.8e6 });

  // heat mat under the phone, with a temperature window and a cable to its controller
  const mat = { x: X(-9), y: Y(-9), w: (PHONE.v + 18) * U, d: (PHONE.u + 18) * U, r: 6 * U };
  const matH = 2.2 * U;
  const win = { x: mat.x + 6 * U, y: mat.y + mat.d - 8.5 * U, w: 26 * U, d: 6 * U, r: 1 * U };
  let msvg = S(k.slabOf(mat, top, matH, P, 10, 0.6 * U), { tone: "lo" });
  msvg += Ln(k.planOutline(k.insetPlan(mat, 3 * U), top + matH, P, 10), { tone: "faint" });
  msvg += Ln(k.planOutline(win, top + matH, P, 4), { tone: "mid" });
  put([mat.x + mat.w / 2, mat.y + mat.d / 2, top + matH / 2], msvg, [A.slab(mat, top, matH, { name: "stand.mat" })], { key: -9.5e6 });
  // readout digits in the window (machine text, fits the window)
  const tm = k.topMatrix([win.x + 2.2 * U, win.y + 4.6 * U], top + matH, P, "x");
  put([win.x, win.y, top + matH + 0.1], `<g transform="${tm}"><text class="bench-digits" x="0" y="0" font-size="${4.2 * U}">70.0 °C</text></g>`, [], { key: -9.4e6 });
  return { top, matTop: top + matH, mat };
}

// a magnetic screw mat: a thin slab with a grid of cells; `screws` = [[col, row, kind]]
export function screwMat(P, R, { at, cols = 6, rows = 4, cell = 9, screws = [], z, lit = false }) {
  const [x0, y0] = at;
  const w = cols * cell * U + 6 * U, d = rows * cell * U + 6 * U;
  const pl = { x: x0, y: y0, w, d, r: 3 * U };
  const h = 1.6 * U;
  let svg = `<path class="iso-halo" d="${k.haloOf(pl, z, h, P)}"/>` + S(k.slabOf(pl, z, h, P, 8, 0.4 * U), { tone: "mid" });
  const zt = z + h;
  const lines = [];
  for (let c = 0; c <= cols; c++) lines.push(k.lineOnTop([x0 + 3 * U + c * cell * U, y0 + 3 * U], [x0 + 3 * U + c * cell * U, y0 + d - 3 * U], zt, P));
  for (let r = 0; r <= rows; r++) lines.push(k.lineOnTop([x0 + 3 * U, y0 + 3 * U + r * cell * U], [x0 + w - 3 * U, y0 + 3 * U + r * cell * U], zt, P));
  svg += Ln(lines.join(""), { tone: "faint" });
  R.put({ piece: "bench", at: [x0 + w / 2, y0 + d / 2, z], svg, shapes: [R.solid(A.slab(pl, z, h, { name: "stand.screwmat" }))] });
  // screws lying on their sides would be truer; standing heads read better at this size: a head
  // disc with a cross, on a short shank stub
  screws.forEach(([c, r], i) => {
    const sx = x0 + 3 * U + (c + 0.5) * cell * U, sy = y0 + 3 * U + (r + 0.5) * cell * U;
    const head = k.cylinder(sx, sy, 0.95 * U, zt, 0.5 * U, P, 20, 0.12 * U);
    const s = 0.5 * U;
    const slot = k.lineOnTop([sx - s, sy], [sx + s, sy], zt + 0.5 * U, P) + k.lineOnTop([sx, sy - s], [sx, sy + s], zt + 0.5 * U, P);
    R.put({ piece: "bench", at: [sx, sy, zt + 0.25 * U], svg: S(head, { tone: lit ? "lit" : "hi", lit }) + Ln(slot, { tone: "lo" }), shapes: [R.solid(A.cylinder(sx, sy, 0.95 * U, zt, 0.5 * U, { name: "bench.screw" }))] });
  });
  return { plan: pl, top: zt };
}

// the display assembly lying face down: what you see is its back. White plastic frame round the
// edge (cracked in 3 of iFixit's 4 teardowns), the OLED's back with its graphite sheet, the
// display flex folded over with its connector. `at` = world [x, y] of the glass corner (min x, min y).
export function displayFaceDown(P, R, { at, z, crack = 1, lit = "", flexX = null }) {
  const [x0, y0] = at;
  const Lw = PHONE.v * U, Dw = PHONE.u * U, r = PHONE.r * U;
  const glass = { x: x0, y: y0, w: Lw, d: Dw, r };
  const put = (c, svg, shapes, name) => R.put({ piece: "display", at: c, svg, shapes: shapes.map((s) => R.solid(s)), name });
  // glass (down), OLED, frame: z grows upward through the back
  const gH = 0.6 * U, oH = 0.3 * U, fH = 0.55 * U;
  put([x0 + Lw / 2, y0 + Dw / 2, z + gH / 2], S(k.slabOf(glass, z, gH, P, 10, 0.3 * U), { tone: "hi" }), [A.slab(glass, z, gH, { name: "display.glass" })]);
  const fr = k.insetPlan(glass, 0.45 * U);
  // the frame is a ring: draw its outer slab and the OLED back inside it a little lower
  const frZ = z + gH, oZ = z + gH;
  const frameTop = frZ + fH;
  const inner = k.insetPlan(glass, 2.4 * U);
  let fsvg = S(k.slabOf(fr, frZ, fH, P, 10, 0.15 * U), { tone: lit === "frame" ? "lit" : "hi", lit: lit === "frame" });
  fsvg += Ln(k.planOutline(inner, frameTop, P, 10), { tone: "mid" });
  put([x0 + Lw / 2, y0 + Dw / 2, frZ + fH / 2], fsvg, [A.slab(fr, frZ, fH, { name: "display.frame" })]);
  // OLED back: graphite / copper sheet (a slightly darker rectangle) with its print, inside the frame
  // the OLED's back: a large L-shaped black graphite sheet (iFixit), drawn as a stepped polygon
  // in the display's own (along, across) millimetres; "across" runs from the hinge edge outward
  const sh = { ...k.insetPlan(glass, 6 * U), r: 3 * U };
  const shTop = frameTop + 0.12 * U;
  const at2 = (a, c) => [x0 + a * U, y0 + Dw - c * U];
  const Lpoly = [[8, 6], [150, 6], [150, 40], [70, 40], [70, 72], [8, 72]].map(([a, c]) => at2(a, c));
  const gs = k.extrude(Lpoly, frameTop, 0.12 * U, P, { convex: false });
  let osvg = `<path class="iso-fill" d="${k.slabOf(sh, frameTop, 0.01, P, 6).fill}"/>` + S(gs, { tone: "lo", crease: "none" });
  const rows = [0, 1, 2].map((i) => k.lineOnTop(at2(84, 50 + i * 3), at2(84 + [40, 28, 34][i], 50 + i * 3), frameTop, P)).join("");
  osvg += Ln(rows, { tone: "faint", free: true });
  // foam rings over the front sensors (IR camera, dot projector, selfie camera) near the top end
  for (const [a, c, r] of [[7.9, 14.1, 3.2], [8.1, 33.8, 2.8], [7.7, 43.6, 3.6]]) osvg += Ln(k.ring(at2(a, c)[0], at2(a, c)[1], r * U, frameTop + 0.01, P, 32) + k.ring(at2(a, c)[0], at2(a, c)[1], (r - 1.1) * U, frameTop + 0.01, P, 28), { tone: "mid" });
  put([x0 + Lw / 2, y0 + Dw / 2, shTop], osvg, [A.slab(sh, frameTop, 0.12 * U, { name: "display.sheet" }, 6)]);
  // metal clips on the glass's underside: two on the far side, one at the hinge side
  for (const [a, c] of [[60, 75.6], [110, 75.6], [90, 2.4]]) {
    const cp = { x: x0 + (a - 3) * U, y: y0 + Dw - (c + 1) * U, w: 6 * U, d: 2 * U, r: 0.4 * U };
    put([cp.x + cp.w / 2, cp.y + cp.d / 2, frameTop], S(k.slabOf(cp, frameTop, 0.6 * U, P, 2, 0.05 * U), { tone: "mid" }), [A.slab(cp, frameTop, 0.6 * U, { name: "display.clip" }, 2)]);
  }
  // display flex + driver: folded tail near the bottom end, connector on its tip
  const fx = { x: flexX ?? x0 + Lw - 40 * U, y: y0 + Dw - 13 * U, w: 12 * U, d: 13 * U + 0.2 * U, r: 1 * U };
  const conn = { x: fx.x + 2 * U, y: fx.y + 1.5 * U, w: 8 * U, d: 5 * U, r: 0.4 * U };
  put([fx.x + fx.w / 2, fx.y + fx.d / 2, shTop + 0.2 * U], S(k.slabOf(fx, shTop, 0.18 * U, P, 3), { tone: "lo" }) + S(k.slabOf(conn, shTop + 0.18 * U, 0.7 * U, P, 2, 0.08 * U), { tone: "hi" }), [A.slab(fx, shTop, 0.18 * U, { name: "display.flex" }, 3), A.slab(conn, shTop + 0.18 * U, 0.7 * U, { name: "display.conn" }, 2)]);
  // the crack: a jagged line across the frame near one corner, drawn on the frame's top face
  if (crack) {
    const cx = x0 + Lw - 18 * U, cy = y0 + 0.9 * U;
    const pts = [[cx, cy - 0.1], [cx - 0.6 * U, cy + 0.6 * U], [cx + 0.2 * U, cy + 1.1 * U], [cx - 0.5 * U, cy + 1.6 * U], [cx + 0.1 * U, cy + 2.3 * U]];
    put([cx, cy + U, frameTop + 0.05], Ln(k.onTop(pts, frameTop, P), { tone: "lit" }), [A.box([cx - U, cy, frameTop - 0.1], [cx + U, cy + 2.4 * U, frameTop + 0.05], { name: "display.crack" })]);
  }
  return { top: shTop };
}
