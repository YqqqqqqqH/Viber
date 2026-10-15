// The display plinth the phone lies on: a heavy base plate on four feet, a groove, corner screws,
// a millimetre ruler along the near edge (the scale of everything above it) and a label plate.
// World units (U per mm); `top` is the plinth's top face height.
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { U, X, Y, Z } from "./units.mjs";

const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);

export function plinth(P, R, { plan: PL, top, h = 14 * U, foot = 5 * U, key = -1e7 }) {
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const z0 = top - h;
  let svg = `<path class="iso-halo" d="${k.haloOf(PL, z0 - foot, h, P)}"/>`;
  for (const [x, y] of byDepth(k.corners(PL, 16 * U))) {
    svg += S(k.cylinder(x, y, 6.5 * U, z0 - foot, 1.2 * U, P, 40), { tone: "lo" });
    svg += S(k.cylinder(x, y, 5.0 * U, z0 - foot + 1.2 * U, foot - 1.2 * U, P, 40), { tone: "mid" });
  }
  svg += S(k.slabOf(PL, z0, h, P, 10, 1.4 * U), { tone: "mid" });
  R.put({ piece: "stand", at: [PL.x + PL.w / 2, PL.y + PL.d / 2, z0 + h / 2], key, svg, shapes: [R.solid(A.slab(PL, z0, h, { name: "stand.plinth" }))], name: "stand.plinth" });
  // groove, corner screws
  const screws = k.corners(PL, 7 * U);
  let face = Ln(k.planOutline(k.insetPlan(PL, 3.5 * U), top, P, 10), { tone: "lo" });
  face += Ln(screws.map(([x, y]) => k.ring(x, y, 1.6 * U, top, P, 24)).join(""), { tone: "lo" });
  face += k.dotsSvg(screws.map(([x, y]) => k.iso([x, y, top], P)), { size: 0.4 * U, tone: "mid" });
  R.put({ piece: "stand", at: [PL.x + PL.w / 2, PL.y + PL.d / 2, top], key: key + 1, svg: face, shapes: [], name: "stand.face" });
  // millimetre ruler along the near (+y) edge: ticks every mm, majors every 10 mm
  const strip = { x: PL.x + 14 * U, y: PL.y + PL.d - 9.5 * U, w: PL.w - 28 * U, d: 5 * U, r: 0.8 * U };
  const t = k.topTicks(strip.x + 2 * U, strip.x + strip.w - 2 * U, U, 10, strip.y + 0.1 * U, top + 0.5 * U, [1.2 * U, 2.6 * U], P);
  R.put({ piece: "stand", at: [strip.x + strip.w / 2, strip.y, top], key: key + 2, svg: S(k.slabOf(strip, top, 0.5 * U, P, 3), { tone: "lo", crease: "none" }) + Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }), shapes: [R.solid(A.slab(strip, top, 0.5 * U, { name: "stand.ruler" }, 3))], name: "stand.ruler" });
  // label plate with three rule lines (printed text) and two screws, near the left corner
  const lab = { x: PL.x + 10 * U, y: PL.y + 8 * U, w: 34 * U, d: 10 * U, r: 1.2 * U };
  const lt = top + 0.6 * U;
  const rules = [0, 1, 2].map((i) => k.lineOnTop([lab.x + 3.5 * U, lab.y + 2.6 * U + i * 2.4 * U], [lab.x + (3.5 + [22, 15, 18][i]) * U, lab.y + 2.6 * U + i * 2.4 * U], lt, P)).join("");
  const lsvg = S(k.slabOf(lab, top, 0.6 * U, P, 4), { tone: "lo", crease: "none" }) + Ln(k.planOutline(k.insetPlan(lab, 1.2 * U), lt, P, 4), { tone: "faint" }) + Ln(rules, { tone: "lo", free: true }) + k.dotsSvg([k.iso([lab.x + lab.w - 2.5 * U, lab.y + 2.5 * U, lt], P), k.iso([lab.x + lab.w - 2.5 * U, lab.y + lab.d - 2.5 * U, lt], P)], { size: 0.4 * U });
  R.put({ piece: "stand", at: [lab.x + lab.w / 2, lab.y + lab.d / 2, top], key: key + 2, svg: lsvg, shapes: [R.solid(A.slab(lab, top, 0.6 * U, { name: "stand.label" }, 4))], name: "stand.label" });
}
