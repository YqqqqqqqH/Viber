// The 48 MP Fusion main camera, taken out of the phone and opened along its optical axis.
// Real numbers (brief.md): focal length 6.8 mm, six blades about a hair thick, magnetic rotor,
// four stops ƒ/1.48 ƒ/1.8 ƒ/2.8 ƒ/4.0, opening ≈ 4.6 mm at ƒ/1.48, 1/1.28" sensor
// (≈ 10.0 × 7.5 mm). Housing sizes are estimates (示意).
//
// Layers from the outside of the phone (bottom, s = 0) to the inside (top):
//   cover ring → iris (blades + rotor + magnets) → lens barrel → IR filter → sensor on its
//   sensor-shift stage → top housing with the flex tail.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import * as A from "../kit/audit.mjs";
import { U } from "./units.mjs";
import { trayHalves } from "./parts.mjs";

export const FOCAL = 6.8;
export const STOPS = [1.48, 1.8, 2.8, 4.0];
export const openingOf = (f) => FOCAL / f;           // mm

// Layer heights (mm, along the axis) and the gap each layer gets when opened (mm)
// heights sum to 9.0 mm: closed, the stack is exactly the module in its bay (w −2.4 → 6.6)
export const LAYERS = [
  { name: "cover", h: 1.0 },
  { name: "iris", h: 0.8 },
  { name: "barrel", h: 4.0 },
  { name: "filter", h: 0.4 },
  { name: "sensor", h: 1.2 },
  { name: "housing", h: 1.6 },
];

// iris geometry in the plane: opening polygon for a given ƒ-number, and the six blade outlines
export const RB = 2.75;   // radius of the blade field: at ƒ/1.48 the opening (4.6 mm) nearly fills it
export function irisOf(f, { n = 6, ring = RB, turn = 0.62 } = {}) {
  const D = openingOf(f);
  const rho = D / 2 / Math.cos(Math.PI / n);         // hexagon circumradius whose inscribed circle is D/2
  const beta = turn * (openingOf(STOPS[0]) - D);      // the polygon turns as it closes
  const V = Array.from({ length: n }, (_, i) => { const a = beta + (i / n) * Math.PI * 2; return [Math.cos(a) * rho, Math.sin(a) * rho]; });
  // extend side i (V_i → V_{i+1}) beyond V_{i+1} to the ring
  const hit = (p, d) => { // p + t d on |x| = ring, t > 0
    const b = p[0] * d[0] + p[1] * d[1], c = p[0] * p[0] + p[1] * p[1] - ring * ring;
    const t = -b + Math.sqrt(Math.max(0, b * b - c));
    return [p[0] + d[0] * t, p[1] + d[1] * t];
  };
  const Q = V.map((p, i) => {
    const q = V[(i + 1) % n]; const d = [q[0] - p[0], q[1] - p[1]]; const l = Math.hypot(...d);
    return hit(q, [d[0] / l, d[1] / l]);
  });
  const arc = (a, b, steps = 18) => {
    let a0 = Math.atan2(a[1], a[0]), a1 = Math.atan2(b[1], b[0]);
    while (a1 > a0) a1 -= Math.PI * 2;            // walk clockwise from a to b
    while (a1 < a0 - Math.PI * 2) a1 += Math.PI * 2;
    return Array.from({ length: steps + 1 }, (_, j) => { const t = a0 + ((a1 - a0) * j) / steps; return [Math.cos(t) * ring, Math.sin(t) * ring]; });
  };
  // blade i: V_i → V_{i+1} → Q_i → (ring, back) → Q_{i-1} → V_i
  const blades = V.map((p, i) => {
    const q = V[(i + 1) % n];
    const back = Q[(i + n - 1) % n];
    return [p, q, ...arc(Q[i], back).slice(0, -1), back];
  });
  return { D, rho, beta, V, Q, blades, opening: V };
}

export function mainCamera(P, R, { centre, f = 1.48, open = 0, gaps = [0, 3.4, 5.0, 2.6, 3.0, 3.4], pieces = {}, moves = {}, lit = "iris", lod = null } = {}) {
  const [cx, cy, cz] = centre;          // world position of the cover ring's outer face (s = 0)
  const F = G.frameOf([cx, cy, cz], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const flat = (pts, z, closed = true) => k.pathOf(pts.map(([x, y]) => k.iso([cx + x * U, cy + y * U, z], P)), closed);
  let s = 0;
  const base = {};
  LAYERS.forEach((L, i) => { s += (gaps[i] || 0) * open; base[L.name] = s; s += L.h; });
  const zOf = (name) => cz + base[name] * U;
  const put = (layer, at, svg, shapes = []) => R.put({ piece: pieces[layer] || "maincam." + layer, at, svg, shapes: shapes.map((x) => R.solid(x)), move: moves[layer] || [0, 0, 0] });
  const ax = (name) => [cx, cy, zOf(name)];

  // 1. cover ring: a stepped ring with the sapphire window (the part you see on the back)
  {
    const z = 0, F1 = G.frameOf([cx, cy, zOf("cover")], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const prof = [[0, 5.4 * U], [0.6 * U, 5.4 * U], [0.6 * U, 4.8 * U], [1.0 * U, 4.8 * U]];
    const ring = G.lathe([[0, 3.5 * U], ...prof, [1.0 * U, 3.5 * U]], F1, P, { steps: 96, hole: [1.0 * U, 3.5 * U] });
    const win = G.disc(0.15 * U, 0.7 * U, 3.5 * U, F1, P, { steps: 96 });
    put("cover", ax("cover"), S(win, { tone: "lo" }) + S(ring, { tone: "mid", className: "ring", inner: Ln(G.arcOf(F1, 0.6 * U, 5.4 * U, P), { tone: "faint" }) }),
      [A.ring(F1, 0, 1.0 * U, 3.5 * U, 5.4 * U, { name: "maincam.cover" })]);
  }
  // 2. iris: base plate, rotor ring with four magnets and coils, six blades
  {
    const zb = zOf("iris");
    const F2 = G.frameOf([cx, cy, zb], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const plate = G.ringBand(0, 0.35 * U, RB * U, 5.2 * U, F2, P, { steps: 96, hole: [0.35 * U, RB * U] });
    put("iris", [cx, cy, zb + 0.1], S(plate, { tone: "lo", className: "ring" }), [A.ring(F2, 0, 0.35 * U, RB * U, 5.2 * U, { name: "maincam.iris.plate" })]);
    const rotor = G.ringBand(0.35 * U, 0.85 * U, 3.1 * U, 3.9 * U, F2, P, { steps: 96, hole: [0.85 * U, 3.1 * U] });
    put("iris", [cx, cy, zb + 0.6], S(rotor, { tone: "mid", className: "ring", inner: Ln(G.arcOf(F2, 0.6 * U, 3.9 * U, P), { tone: "faint" }) }), [A.ring(F2, 0.35 * U, 0.85 * U, 3.1 * U, 3.9 * U, { name: "maincam.iris.rotor" })]);
    // four magnets on the plate outside the rotor and a coil block under each (driving the rotor)
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const mx = cx + Math.cos(a) * 4.5 * U, my = cy + Math.sin(a) * 4.5 * U;
      const m = k.slabOf({ x: mx - 0.45 * U, y: my - 0.45 * U, w: 0.9 * U, d: 0.9 * U, r: 0.15 * U }, zb + 0.35 * U, 0.55 * U, P, 2);
      put("iris", [mx, my, zb + 0.6 * U], S(m, { tone: "hi" }), [A.slab({ x: mx - 0.45 * U, y: my - 0.45 * U, w: 0.9 * U, d: 0.9 * U, r: 0.15 * U }, zb + 0.35 * U, 0.55 * U, { name: "maincam.iris.magnet" }, 2)]);
    }
    // blades: flat, about a hair thick, drawn in the plane on top of the plate; the cyclic overlap
    // is drawn by repainting the first blade's overlap over the last one
    const zt = zb + 0.36 * U;
    const iris = irisOf(f);
    const shapes = iris.blades.map((b) => flat(b, zt));
    const edge = iris.blades.map((b) => flat([b[1], b[2]], zt, false)).join("");
    let svg = "";
    const tone = lit === "iris" ? "lit" : "hi";
    shapes.forEach((d) => (svg += `<path class="mc-blade" d="${d}"/>`));
    svg += `<path class="mc-void" d="${flat(iris.opening, zt)}"/>`;
    svg += Ln(shapes.join(""), { tone });
    svg += Ln(flat(iris.opening, zt), { tone });
    // pivot pins on the outer ends and the slot pins (iFixit: pivot hole, slot pin, edge notch)
    const pins = iris.blades.map((b, i) => { const a = Math.atan2(b[2][1], b[2][0]) - 0.35; return k.iso([cx + Math.cos(a) * (RB - 0.3) * U, cy + Math.sin(a) * (RB - 0.3) * U, zt], P); });
    svg += k.dotsSvg(pins, { size: 0.12 * U, tone: "hi" });
    put("iris", [cx, cy, zt + 0.3], `<g class="mc-iris" id="iris-blades" data-cx="${cx}" data-cy="${cy}" data-zt="${zt}">${svg}</g>`, [A.cylinder(cx, cy, RB * U, zt - 0.05, 0.1, { name: "maincam.iris.blades" })]);
  }
  // 3. lens barrel: a stepped turned barrel; the front element shows in its mouth
  {
    const zb = zOf("barrel");
    const F3 = G.frameOf([cx, cy, zb], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const prof = [[0, 3.9], [0.6, 3.9], [0.6, 4.2], [3.4, 4.2], [3.4, 4.45], [4.0, 4.45]].map(([a, r]) => [a * U, r * U]);
    const barrel = G.solidOf(prof, F3, P, { steps: 96 });
    const seams = Ln(G.arcOf(F3, 0.6 * U, 4.2 * U, P) + G.arcOf(F3, 2.0 * U, 4.2 * U, P) + G.arcOf(F3, 3.4 * U, 4.45 * U, P), { tone: "faint" });
    const topZ = zb + 4.0 * U;
    const glass = Ln(k.ring(cx, cy, 3.7 * U, topZ, P, 96) + k.ring(cx, cy, 2.9 * U, topZ, P, 96) + k.ring(cx, cy, 1.6 * U, topZ, P, 64), { tone: "lo" });
    put("barrel", [cx, cy, zb + 2.3 * U], S(barrel, { tone: "mid", inner: seams }) + glass, [A.solid(F3, prof, { name: "maincam.barrel" })]);
  }
  // 4. IR filter: a thin glass square in a frame
  {
    const zb = zOf("filter");
    const pl = { x: cx - 4.6 * U, y: cy - 4.6 * U, w: 9.2 * U, d: 9.2 * U, r: 0.6 * U };
    const fr = k.slabOf(pl, zb, 0.4 * U, P, 3, 0.1 * U);
    put("filter", [cx, cy, zb], S(fr, { tone: "lo" }) + Ln(k.planOutline(k.insetPlan(pl, 0.7 * U), zb + 0.4 * U, P, 3), { tone: "faint" }), [A.slab(pl, zb, 0.4 * U, { name: "maincam.filter" }, 3)]);
  }
  // 5. sensor on the sensor-shift stage: outer frame, four serpentine springs, carrier, die
  {
    const zb = zOf("sensor");
    const outer = { x: cx - 8.0 * U, y: cy - 8.0 * U, w: 16 * U, d: 16 * U, r: 1.4 * U };
    const halves = trayHalves(outer, 1.1 * U, P, 4);
    for (const side of ["far", "near"]) {
      const ring = halves[side];
      const paths = k.extrude(ring, zb, 0.6 * U, P, { convex: false });
      put("sensor", [cx, cy + (side === "far" ? -6 : 6) * U, zb + 0.3 * U], S(paths, { tone: "mid" }), [A.extruded(ring, zb, 0.6 * U, { name: "maincam.stage.frame." + side })]);
    }
    const carrier = { x: cx - 6.4 * U, y: cy - 5.6 * U, w: 12.8 * U, d: 11.2 * U, r: 0.6 * U };
    const car = k.slabOf(carrier, zb + 0.2 * U, 0.6 * U, P, 3, 0.1 * U);
    // springs: zig-zag flexures from the carrier corners to the frame (drawn on the carrier plane)
    const zz = (x0, y0, x1, y1, n, amp) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1; const o = i === 0 || i === n ? 0 : (i % 2 ? amp : -amp); pts.push([x0 + (x1 - x0) * t + (nx / l) * o, y0 + (y1 - y0) * t + (ny / l) * o]); } return pts; };
    const springs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => k.onTop(zz(cx + sx * 6.4 * U, cy + sy * 5.6 * U, cx + sx * 7.2 * U, cy + sy * 7.2 * U, 6, 0.35 * U), zb + 0.6 * U, P)).join("");
    const die = { x: cx - 5.0 * U, y: cy - 3.75 * U, w: 10.0 * U, d: 7.5 * U, r: 0.15 * U };
    const dieS = k.slabOf(die, zb + 0.8 * U, 0.45 * U, P, 2, 0.08 * U);
    const pix = [];
    for (let i = 1; i < 12; i++) pix.push(k.lineOnTop([die.x + (i * die.w) / 12, die.y + 0.5 * U], [die.x + (i * die.w) / 12, die.y + die.d - 0.5 * U], zb + 1.25 * U, P));
    put("sensor", [cx, cy, zb + 0.6 * U], S(car, { tone: "lo" }) + Ln(springs, { tone: "mid" }), [A.slab(carrier, zb + 0.2 * U, 0.6 * U, { name: "maincam.stage.carrier" }, 3)]);
    put("sensor", [cx, cy, zb + 1.0 * U], S(dieS, { tone: lit === "sensor" ? "lit" : "hi", lit: lit === "sensor" }) + Ln(pix.join(""), { tone: "faint" }), [A.slab(die, zb + 0.8 * U, 0.45 * U, { name: "maincam.sensor" }, 2)]);
  }
  // 6. top housing with the flex tail toward the board
  {
    const zb = zOf("housing");
    const pl = { x: cx - 11.15 * U, y: cy - 10.5 * U, w: 22.3 * U, d: 21 * U, r: 2.0 * U };   // the module's own footprint (21 × 22.3)
    const h = k.slabOf(pl, zb, 1.0 * U, P, 8, 0.25 * U);
    const tail = { x: cx - 2.0 * U, y: cy + 10.5 * U - 0.2 * U, w: 4 * U, d: 9.2 * U, r: 0.4 * U };   // toward the board
    const t = k.slabOf(tail, zb + 1.0 * U, 0.15 * U, P, 2);
    const conn = { x: cx - 2.6 * U, y: cy + 10.5 * U + 8.2 * U, w: 5.2 * U, d: 3.0 * U, r: 0.3 * U };
    const c = k.slabOf(conn, zb + 1.0 * U, 0.7 * U, P, 2, 0.08 * U);
    put("housing", [cx, cy, zb + 0.5 * U], S(h, { tone: "mid", inner: "" }) + Ln(k.planOutline(k.insetPlan(pl, 1.2 * U), zb + 1.0 * U, P, 8), { tone: "faint" }),
      [A.slab(pl, zb, 1.0 * U, { name: "maincam.housing" })]);
    put("housing", [cx, cy + 15 * U, zb + 1.1 * U], S(t, { tone: "lo" }) + S(c, { tone: "hi" }), [A.slab(tail, zb + 1.0 * U, 0.15 * U, { name: "maincam.flex" }, 2), A.slab(conn, zb + 1.0 * U, 0.7 * U, { name: "maincam.conn" }, 2)]);
  }
  return { top: cz + s * U, base };
}

