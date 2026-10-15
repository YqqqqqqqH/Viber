// iPhone 18 Pro Max, built part by part in phone-local millimetres (units.mjs).
//
// Layout source: iFixit's iPhone 18 Pro Max internals wallpaper (front view, battery out, screen
// sized: 1320 × 2868 px over the 72.9 × 158.4 mm display area, so 1 px ≈ 0.0552 mm, offset
// 2.55 / 2.5 mm from the body edge), iFixit's teardown photos and text (2026-09-20).
// Positions read off that image are good to about ±1 mm; heights (w) are estimates. Every
// number the film says out loud is in brief.md with its source.
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { U, PHONE, X, Y, Z, W3, plan } from "./units.mjs";
import { kitOf, trayHalves } from "./parts.mjs";
import { addDetail } from "./detail.mjs";

// ---------------------------------------------------------------- layout (mm, local frame)
// Positions from research/layout.md (iFixit 18 Pro Max wallpaper + guides, Apple repair manual
// and dimensional drawing, Lumafield CT). Heights (w) are a budget, not data.
export const L = {
  wall: 2.0, floor: 0.6, rim: 7.3,
  plateau: { u0: 3.9, v0: 4.9, u1: 74.1, v1: 42.9, h: 2.85, r: 7 },     // 11.6 mm from the display face
  glassCut: { u0: 3.8, v0: 48.7, u1: 74.1, v1: 159.5, r: 8 },          // back glass, 70.3 × 110.8
  sheetHole: { u: 58, v: 63, r: 13 },                                   // round die-cut in the rear sheet (back-glass flex)
  magsafe: { u: 38.99, v: 81.71, coil: 20, ring: [23.0, 26.0] },
  // vapor chamber = battery tray: one stepped, dimpled plate in front of the battery and the board
  vc: [[4, 26], [25, 26], [25, 13.6], [52, 13.6], [52, 8], [74, 8], [74, 145], [21.5, 145], [21.5, 134.6], [4, 134.6]],
  vcPad: { u0: 49, v0: 21, u1: 73, v1: 46 },                            // raised flat pad over the main camera
  vcHoles: [[12, 50, 14, 12], [54, 52, 16, 8]],                         // display and battery connector windows
  vcScrews: [[45.0, 38.7, 5.7], [14.0, 53.0, 3.5], [69.0, 50.5, 3.5],
    [3.0, 24.5], [3.0, 74.5], [3.0, 82], [3.0, 86], [3.0, 108], [3.0, 136], [73.4, 20], [73.4, 67.5], [73.4, 86], [73.4, 123], [73.4, 135.5]],
  batt: [[6.5, 63], [72, 63], [72, 144], [21, 144], [21, 134], [6.5, 134]],
  board: [[12, 37], [47, 37], [47, 47], [72, 47], [72, 57], [47, 57], [47, 63.5], [12, 63.5]],
  soc: { u0: 26.8, v0: 44.1, u1: 41.7, v1: 61.7 },                      // A20 Pro + memory under the chain mail
  cam: {
    bracket: { u0: 28, v0: 7, u1: 74, v1: 45 },
    tele: { u0: 28.2, v0: 14.6, u1: 52.6, v1: 34.7 },
    ultra: { u0: 55.3, v0: 7.2, u1: 71.1, v1: 21.6 },
    main: { u0: 53, v0: 22.6, u1: 74, v1: 44.9 },
    flash: [13.85, 13.75], lidar: [13.85, 34.1], mic: [13.85, 23.9],
  },
  front: { ir: [14.1, 7.9], flood: [24.0, 6.0], dots: [33.8, 8.1], selfie: [43.6, 7.7] },
  island: { u: 38.99, v: 7.9, du: 15.68, dv: 6.07 },
  speaker: [[6.7, 137], [20.3, 137], [20.3, 145.5], [45.5, 145.5], [45.5, 153], [6.7, 153]],
  taptic: { u0: 47, v0: 146, u1: 67, v1: 155.7 },
  usb: { u0: 33.8, v0: 153, u1: 44, v1: 160.9 },
  mic: { u0: 50, v0: 156.2, u1: 66, v1: 159.8 },
  sideButton: { v: 54, len: 17 }, cameraControl: { v: 109, len: 17.5 },
  antenna: [16.5, 142.5],
};

// Build the phone. `moves` maps assembly → world move vector at share 1.
export function phone(P, R, { moves = {}, lod = true, battScrews = true, skip = [], lit = "", hide = [], detail = true } = {}) {
  const K = kitOf(P);
  const { S, L: Ln, Dots, at, box, boxC, cyl, prism, lineAt, outlineAt, ringAt, ribbon, screw } = K;
  const put = (piece, c, svg, shapes, o = {}) => (hide.includes(o.name) ? null : R.put({ piece, at: W3(...c), svg, shapes: shapes.map((s) => R.solid(s)), move: moves[piece] || [0, 0, 0], ...o }));
  const fine = lod ? [1.6, 2.4] : null;
  const tone = (part, t) => (lit === part ? "lit" : t);
  const isLit = (part) => lit === part;

  const parts = { chassis, antennas, back, battery, board, cameras, front, bottom, flexes, buttons, vapor, display };
  for (const [name, fn] of Object.entries(parts)) if (!skip.includes(name)) fn();
  if (detail) addDetail({ K, put, L, P, fine, tone, isLit, insetPoly, pointIn, deep: lod ? [5, 8] : null }, skip);
  return { L };

  // ------------------------------------------------------------ unibody: plateau, floor ring round the glass, walls
  function chassis() {
    const outer = plan(0, 0, PHONE.u, PHONE.v, PHONE.r);
    const p = L.plateau;
    const pl = plan(p.u0, p.v0, p.u1 - p.u0, p.v1 - p.v0, p.r);
    put("chassis", [39, 24, -1.4], S(k.slabOf(pl, Z(-p.h), p.h * U, P, 8, 0.5 * U), { tone: "mid" }), [A.slab(pl, Z(-p.h), p.h * U, { name: "stand.plateau" })]);
    const g = L.glassCut;
    const hole = plan(g.u0, g.v0, g.u1 - g.u0, g.v1 - g.v0, g.r);
    const fl = trayHalves(outer, hole, P, 10);
    for (const side of ["far", "near"]) {
      const ring = fl[side];
      put("chassis", [39, side === "far" ? 30 : 140, L.floor / 2], S(k.extrude(ring, 0, L.floor * U, P, { convex: false }), { tone: "mid" }), [A.extruded(ring, 0, L.floor * U, { name: "stand.floor." + side })]);
    }
    const wl = trayHalves(outer, L.wall, P, 10);
    const wallH = (L.rim - L.floor) * U;
    for (const side of ["far", "near"]) {
      const ring = wl[side];
      const inner = side === "near" ? nearWallDetail() : "";
      put("chassis", [39, side === "far" ? 20 : 150, 4], S(k.extrude(ring, Z(L.floor), wallH, P, { convex: false, bevel: 0.35 * U }), { tone: "mid", inner }), [A.extruded(ring, Z(L.floor), wallH, { name: "stand.wall." + side })]);
    }
    put("chassis", [39, 81, L.floor + 0.01], Ln(k.planOutline(k.insetPlan(outer, L.wall + 0.9), Z(L.floor), P, 10), { tone: "faint" }), [A.slab(k.insetPlan(outer, L.wall + 0.9), Z(L.floor), 0.01, { name: "stand.step" })]);
    // silver grounding clips along both sidewalls (Apple: "fragile grounding clips")
    for (const [u, v] of [[2.4, 40], [2.4, 70], [2.4, 98], [2.4, 120], [75.6, 30], [75.6, 76], [75.6, 96], [75.6, 128]]) {
      const c = boxC(u, v, 1.4, 3.6, 0.4, L.floor, 3.2, { tone: "hi", bevel: 0.05 });
      put("chassis", [u, v, 2.2], c.svg, c.shapes, { name: "chassis.clip" });
    }
  }
  function antennas() {
    for (const v of L.antenna) {
      // on the left side wall, which faces the viewer (the splits cross both side walls)
      const left = (vv, w) => at(0, vv, w);
      const d = k.pathOf([left(v - 0.6, 0.15), left(v - 0.6, L.rim - 0.15)]) + k.pathOf([left(v + 0.6, 0.15), left(v + 0.6, L.rim - 0.15)]);
      put("chassis", [-0.02, v, 3.7], Ln(d, { tone: "lo" }), [A.box([X(v - 0.8), Y(0), Z(0.2)], [X(v + 0.8), Y(-0.04), Z(L.rim - 0.2)], { name: "chassis.antenna" })], { name: "chassis.antenna" });
    }
  }
  function nearWallDetail() {
    let out = "";
    const right = (v, w) => at(PHONE.u, v, w);
    const bottom = (u, w) => at(u, PHONE.v, w);
    const holes = [];
    for (let i = 0; i < 7; i++) holes.push(bottom(14 + i * 2.15, 3.7), bottom(52.6 + i * 2.15, 3.7));
    out += Dots(holes, { size: 0.42 * U, tone: "mid" });
    const usbPts = [], cu = 39, cw = 3.7, hw = 4.65, hr = 1.25;
    for (let i = 0; i <= 16; i++) { const t = -Math.PI / 2 + (i / 16) * Math.PI; usbPts.push(bottom(cu + hw - hr + Math.cos(t) * hr, cw + Math.sin(t) * hr)); }
    for (let i = 0; i <= 16; i++) { const t = Math.PI / 2 + (i / 16) * Math.PI; usbPts.push(bottom(cu - hw + hr + Math.cos(t) * hr, cw + Math.sin(t) * hr)); }
    out += Ln(k.pathOf(usbPts, true), { tone: "hi" });
    out += Dots([bottom(cu - 7.3, 3.7), bottom(cu + 7.3, 3.7)], { size: 0.55 * U, tone: "hi" });
    return out;
  }

  // ------------------------------------------------------------ back glass with MagSafe, the rear graphite sheet
  function back() {
    const g = L.glassCut, m = L.magsafe;
    const gl = box(g.u0, g.v0, g.u1 - g.u0, g.v1 - g.v0, g.r, 0, L.floor, { tone: "hi", bevel: 0.2 });
    put("back", [39, 104, L.floor / 2], gl.svg, gl.shapes, { name: "back.glass" });
    const top = L.floor;
    const fer = cyl(m.u, m.v, m.coil + 0.8, top, 0.25, { tone: tone("coil", "lo"), steps: 80, lit: isLit("coil") });
    const turns = [];
    for (let r = 8.0; r <= m.coil; r += 0.8) turns.push(ringAt(m.u, m.v, r, top + 0.25, 96));
    put("back", [m.u, m.v, top + 0.12], fer.svg + turns.map((d, i) => `<path class="iso-line turn" data-tone="lo" data-i="${i}" d="${d}"/>`).join(""), fer.shapes, { name: "back.coil" });
    for (let i = 0; i < 18; i++) {
      const a0 = (i / 18) * Math.PI * 2, a1 = ((i + 0.82) / 18) * Math.PI * 2, pts = [];
      for (let j = 0; j <= 5; j++) { const a = a0 + (a1 - a0) * (j / 5); pts.push([m.u + Math.cos(a) * m.ring[1], m.v + Math.sin(a) * m.ring[1]]); }
      for (let j = 5; j >= 0; j--) { const a = a0 + (a1 - a0) * (j / 5); pts.push([m.u + Math.cos(a) * m.ring[0], m.v + Math.sin(a) * m.ring[0]]); }
      const mg = prism(pts, top, 0.5, { tone: "mid", convex: true });
      const c = [m.u + Math.cos((a0 + a1) / 2) * 24.5, m.v + Math.sin((a0 + a1) / 2) * 24.5];
      put("back", [c[0], c[1], top + 0.25], mg.svg, mg.shapes, { name: "back.magnet" });
    }
    // the back glass's own flex, its lobe showing through the round die-cut
    const fx = ribbon([[58, 72], [58, 56]], 3.6, top + 0.55, 0.14, { tone: "lo" });
    put("back", [58, 64, top + 0.6], fx.svg + Ln(ringAt(58, 56.2, 2.2, top + 0.69, 28), { tone: "lo" }), fx.shapes, { name: "back.flex" });
    // rear graphite sheet over the inside of the glass, with the round die-cut
    const sh = plan(g.u0 + 0.6, g.v0 + 0.6, g.u1 - g.u0 - 1.2, g.v1 - g.v0 - 1.2, g.r - 0.6);
    const hole = L.sheetHole;
    const ring = k.roundedPlan(sh, 8);
    const circ = Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2; return [X(hole.v + Math.sin(a) * hole.r), Y(hole.u + Math.cos(a) * hole.r)]; });
    const topZ = Z(top + 0.9);
    const hp = k.pathOf(circ.map((q) => k.iso([q[0], q[1], topZ], P)), true);
    const d = k.pathOf(ring.map((q) => k.iso([q[0], q[1], topZ], P)), true) + hp;
    put("chassis", [39, 110, top + 0.9], `<path class="sheet" d="${d}"/>` + Ln(hp, { tone: "lo" }), [A.slab(sh, topZ - 0.05 * U, 0.05 * U, { name: "chassis.sheet" })], { name: "chassis.sheet" });
  }

  // ------------------------------------------------------------ battery cell (attached to the vapor chamber)
  function battery() {
    const w0 = L.floor + 0.85, h = 4.95, top = w0 + h;   // top 6.4: just under the vapor chamber (6.45)
    const cell = prism(L.batt, w0, h, { tone: tone("battery", "hi"), bevel: 0.45, lit: isLit("battery") });
    const label = lineAt(insetPoly(L.batt, 4.0), top, true);
    const rules = [0, 1, 2, 3].map((i) => lineAt([[12, 88 + i * 3.2], [12 + [30, 24, 34, 18][i], 88 + i * 3.2]], top)).join("");
    const plate = outlineAt(12, 114, 20, 11, 1, top);
    const rules2 = [0, 1].map((i) => lineAt([[14.5, 117.5 + i * 3.6], [14.5 + [13, 9][i], 117.5 + i * 3.6]], top)).join("");
    put("battery", [40, 103, w0 + h / 2], cell.svg + Ln(label, { tone: "faint" }) + Ln(rules + rules2, { tone: "lo", free: true }) + Ln(plate, { tone: "lo" }), cell.shapes, { name: "battery.cell" });
    // its flex leaves the top-right corner for the battery connector on the board
    const fx = ribbon([[66.5, 64.8], [66.5, 60.2], [61.6, 56.2]], 3.6, top - 0.1, 0.14, { tone: "lo" });
    put("battery", [65, 60, top], fx.svg, fx.shapes, { name: "battery.flex" });
  }

  // ------------------------------------------------------------ logic board sandwich (L-shaped), A20 Pro on its front face
  function board() {
    const w0 = L.floor + 0.4, t = 0.8, gap = 1.25;
    const shape = L.board;
    const lower = prism(shape, w0, t, { tone: "lo", bevel: 0.12 });
    put("board", [30, 50, w0 + t / 2], lower.svg, lower.shapes, { name: "board.lower" });
    const inter = prism(insetPoly(shape, 0.6), w0 + t, gap, { tone: "lo" });
    put("board", [30, 50, w0 + t + gap / 2], inter.svg, inter.shapes, { name: "board.interposer" });
    const upW = w0 + t + gap, top = upW + t;
    const upper = prism(shape, upW, t, { tone: tone("board", "mid"), bevel: 0.15, lit: isLit("board") });
    put("board", [30, 50, upW + t / 2], upper.svg + Ln(lineAt(insetPoly(shape, 0.9), top, true), { tone: "faint" }), upper.shapes, { name: "board.upper" });
    // A20 Pro + memory side by side, with the "thermal chain mail" mesh bonded on top (iFixit)
    const s = L.soc, sh = 1.05;
    const soc = box(s.u0, s.v0, s.u1 - s.u0, s.v1 - s.v0, 0.6, top, sh, { tone: tone("soc", "hi"), bevel: 0.12, lit: isLit("soc") });
    const st = top + sh, mesh = [];
    for (let u = s.u0 + 1.2; u < s.u1 - 0.8; u += 0.8) mesh.push(lineAt([[u, s.v0 + 0.9], [u, s.v1 - 0.9]], st));
    for (let v = s.v0 + 1.2; v < s.v1 - 0.8; v += 0.8) mesh.push(lineAt([[s.u0 + 0.9, v], [s.u1 - 0.9, v]], st));
    put("board", [(s.u0 + s.u1) / 2, (s.v0 + s.v1) / 2, top + sh / 2], soc.svg + Ln(outlineAt(s.u0 + 0.7, s.v0 + 0.7, s.u1 - s.u0 - 1.4, s.v1 - s.v0 - 1.4, 0.3, st), { tone: "mid" }), soc.shapes, { name: "board.soc" });
    put("board", [(s.u0 + s.u1) / 2, (s.v0 + s.v1) / 2, st + 0.01], mesh.map((d, i) => `<path class="iso-line mesh-l" data-tone="${isLit("soc") ? "mid" : "faint"}" data-i="${i}" d="${d}"/>`).join(""), [A.slab(plan(s.u0 + 0.9, s.v0 + 0.9, s.u1 - s.u0 - 1.8, s.v1 - s.v0 - 1.8, 0), Z(st) + 0.12 * U, 0.01, { name: "board.mesh" })], { name: "board.mesh", lod: fine });
    // shield cans: a block on the left, two metal cans on the wing (iFixit boards photo)
    const cans = [[13.0, 38.0, 12.4, 7.0, 0.9], [13.0, 45.8, 7.0, 8.4, 0.8], [20.8, 45.8, 5.2, 6.0, 0.8], [42.4, 38.0, 4.0, 5.6, 0.7], [42.4, 44.6, 4.0, 11.0, 0.8], [48.0, 47.8, 8.4, 8.4, 0.9], [65.0, 47.8, 6.4, 4.4, 0.8]];
    for (const [u0, v0, du, dv, h] of cans) {
      const c = box(u0, v0, du, dv, 0.45, top, h, { tone: "mid", bevel: 0.1 });
      put("board", [u0 + du / 2, v0 + dv / 2, top + h / 2], c.svg + Ln(outlineAt(u0 + 0.6, v0 + 0.6, du - 1.2, dv - 1.2, 0.3, top + h), { tone: "faint" }), c.shapes, { name: "board.can" });
    }
    // connector cowlings: display + ALS (left, one screw), battery (right, one screw), camera flex pads (top)
    const cowl = (u0, v0, du, dv, su, sv, name, tn = "hi") => {
      const c = box(u0, v0, du, dv, 0.4, top, 0.75, { tone: tn, bevel: 0.08 });
      const sc = screw(su, sv, top + 0.75, { r: 0.55 });
      put("board", [u0 + du / 2, v0 + dv / 2, top + 0.4], c.svg + sc.svg, [...c.shapes, ...sc.shapes], { name });
    };
    cowl(18.0, 55.0, 6.4, 7.2, 21.2, 60.6, "board.cowl.display");
    cowl(57.0, 52.6, 7.4, 3.6, 62.6, 54.4, "board.cowl.battery");
    cowl(31.6, 37.6, 11.6, 2.6, 33.0, 38.9, "board.cowl.camera", "mid");
    // passives in the open board areas
    const caps = [];
    for (let u = 13; u < 26; u += 1.0) caps.push(at(u, 62.6, top));
    for (let v = 45; v < 62; v += 1.0) caps.push(at(25.8, v, top), at(42.5, v + 0.5, top));
    for (let u = 57; u < 71; u += 1.0) caps.push(at(u, 56.2, top), at(u, 49.2, top));
    put("board", [40, 55, top + 0.02], Dots(caps, { size: 0.24 * U, tone: "mid" }), [A.slab(plan(13, 45, 58, 18, 0), Z(top) + 0.12 * U, 0.01, { name: "board.passives" })], { name: "board.passives", lod: fine });
  }

  // ------------------------------------------------------------ rear camera assembly (bracket + three modules), flash/LiDAR carrier
  function cameras() {
    const c = L.cam, base = -2.4;
    const bx = (r, h, tn, chamferIt) => {
      const du = r.u1 - r.u0, dv = r.v1 - r.v0;
      const shp = chamferIt ? prism(chamfer(r.u0, r.v0, du, dv, 2.6), base, h, { tone: tn, convex: true, bevel: 0.2, lit: tn === "lit" }) : box(r.u0, r.v0, du, dv, 1.6, base, h, { tone: tn, bevel: 0.22, lit: tn === "lit" });
      return { ...shp, top: base + h, du, dv };
    };
    // telephoto periscope: long axis across the width; the prism end (under the entry aperture) raised
    {
      const r = c.tele, m = bx(r, 8.2, tone("tele", "mid"));
      put("camera", [(r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, base + 4.1], m.svg + Ln(outlineAt(r.u0 + 1.2, r.v0 + 1.2, m.du - 2.4, m.dv - 2.4, 0.8, m.top), { tone: "faint" }), m.shapes, { name: "camera.tele" });
      const pr = box(r.u1 - 10.5, r.v0 + 2, 9.0, m.dv - 4, 1.0, m.top, 0.7, { tone: "lo", bevel: 0.08 });
      put("camera", [r.u1 - 6, (r.v0 + r.v1) / 2, m.top + 0.35], pr.svg, pr.shapes, { name: "camera.tele.prism" });
    }
    {
      const r = c.ultra, m = bx(r, 8.0, tone("ultra", "mid"), true);
      put("camera", [(r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, base + 4], m.svg + Ln(lineAt(chamfer(r.u0 + 1.4, r.v0 + 1.4, m.du - 2.8, m.dv - 2.8, 1.8), m.top, true), { tone: "faint" }), m.shapes, { name: "camera.ultra" });
    }
    {
      const r = c.main, m = bx(r, 9.0, tone("main", "mid"));
      const cu = (r.u0 + r.u1) / 2, cv = (r.v0 + r.v1) / 2;
      put("camera", [cu, cv, base + 4.5], m.svg + Ln(outlineAt(r.u0 + 1.4, r.v0 + 1.4, m.du - 2.8, m.dv - 2.8, 1.0, m.top), { tone: "faint" }), m.shapes, { name: "camera.main" });
      const cap = boxC(cu, cv + 0.4, 14.6, 14.2, 1.2, m.top, 0.4, { tone: "lo", bevel: 0.06 });
      put("camera", [cu, cv, m.top + 0.2], cap.svg, cap.shapes, { name: "camera.main.cap" });
    }
    // three Torx screws on bosses tie the assembly to the unibody
    for (const [u, v] of [[29.8, 9.6], [51.6, 38.6], [72.6, 22.0]]) {
      const bo = cyl(u, v, 1.6, base + 6, 2.3, { tone: "mid", steps: 28 });
      const sc = screw(u, v, base + 8.3, { r: 0.8, kind: "tri" });
      put("camera", [u, v, base + 7.5], bo.svg + sc.svg, [...bo.shapes, ...sc.shapes], { name: "camera.screw" });
    }
    // flash, rear mic and LiDAR on their carrier down the left
    {
      const car = box(7.6, 9.6, 12.6, 29.0, 1.6, L.floor, 3.6, { tone: "mid", bevel: 0.15 });
      const ct = L.floor + 3.6;
      const ribs = [];
      for (let v = 18.2; v < 29.6; v += 0.85) ribs.push(lineAt([[9.4, v], [18.4, v]], ct));
      put("camera", [13.9, 24, L.floor + 1.8], car.svg + Ln(ribs.join(""), { tone: "faint" }), car.shapes, { name: "camera.carrier" });
      for (const [u, v, nm] of [[...c.flash, "flash"], [...c.lidar, "lidar"]]) {
        const pod = cyl(u, v, 3.0, ct, 1.2, { tone: tone(nm, "lo"), steps: 32, lit: isLit(nm) });
        put("camera", [u, v, ct + 0.6], pod.svg + Ln(ringAt(u, v, 1.6, ct + 1.2, 28), { tone: "mid" }), pod.shapes, { name: "camera." + nm });
      }
    }
  }

  // ------------------------------------------------------------ front camera array (one part, no screws) under the display
  function front() {
    const f = L.front, top = L.rim - 0.2;
    {
      const [u, v] = f.ir;
      const b = boxC(u, v, 9.0, 7.0, 1.0, 2.8, top - 2.8 - 0.9, { tone: tone("ir", "mid"), bevel: 0.1, lit: isLit("ir") });
      const lens = cyl(u, v, 2.8, top - 0.9, 0.9, { tone: tone("ir", "hi"), bevel: 0.12, steps: 48, lit: isLit("ir") });
      put("front", [u, v, 4.5], b.svg, b.shapes, { name: "front.ir.base" });
      put("front", [u, v, top - 0.45], lens.svg + Ln(ringAt(u, v, 1.84, top, 48) + ringAt(u, v, 0.9, top, 28), { tone: "lo" }), lens.shapes, { name: "front.ir.lens" });
    }
    {
      const [u, v] = f.flood;
      const s = boxC(u, v, 12, 3.0, 0.6, top - 0.45, 0.32, { tone: "hi", bevel: 0.05 });
      put("front", [u, v, top - 0.3], s.svg + Ln(outlineAt(u - 2.8, v - 0.6, 5.55, 1.2, 0.3, top - 0.13), { tone: "lo" }) + Dots([at(u + 4, v, top - 0.13), at(u + 5.2, v, top - 0.13)], { size: 0.35 * U, tone: "lo" }), s.shapes, { name: "front.flood" });
    }
    {
      const [u, v] = f.dots;
      const b = boxC(u, v, 7.7, 8.2, 0.8, 3.0, top - 3.0, { tone: tone("dots", "mid"), bevel: 0.1, lit: isLit("dots") });
      put("front", [u, v, 4.8], b.svg + Ln(outlineAt(u - 1.4, v - 1.2, 2.8, 2.4, 0.3, top), { tone: "hi" }), b.shapes, { name: "front.dots" });
    }
    {
      const [u, v] = f.selfie;
      const b = boxC(u, v, 11, 8.4, 1.2, 2.6, top - 2.6, { tone: tone("selfie", "mid"), bevel: 0.1, lit: isLit("selfie") });
      put("front", [u, v, 4.6], b.svg + Ln(ringAt(u - 1.4, v, 2.7, top, 40) + ringAt(u - 1.4, v, 1.5, top, 32), { tone: "lo" }), b.shapes, { name: "front.selfie" });
    }
  }

  // ------------------------------------------------------------ bottom: L-shaped speaker, Taptic Engine, USB-C, main mic
  function bottom() {
    const w0 = L.floor;
    {
      const h = 5.0, top = w0 + h;
      const b = prism(L.speaker, w0, h, { tone: tone("speaker", "mid"), bevel: 0.25, lit: isLit("speaker") });
      const blob = [[9.4, 140.2], [14.8, 138.8], [17.6, 142.0], [16.4, 148.6], [10.8, 149.6], [8.8, 145.4]];
      const g = prism(blob, top, 0.25, { tone: "hi", convex: true });
      const mesh = [];
      for (let u = 22; u < 45; u += 1.2) mesh.push(at(u, 151.4, top));
      const sc = [[8.2, 138.4], [43.6, 147.0], [21.8, 151.6]].map(([u, v]) => screw(u, v, top, { r: 0.55 }));
      put("speaker", [16, 146, w0 + h / 2], b.svg + Dots(mesh, { size: 0.28 * U, tone: "lo" }) + sc.map((x) => x.svg).join(""), [...b.shapes, ...sc.flatMap((x) => x.shapes)], { name: "speaker.body" });
      put("speaker", [13, 144, top + 0.12], g.svg, g.shapes, { name: "speaker.gasket" });
    }
    {
      const t = L.taptic, h = 4.6, top = w0 + h;
      const b = box(t.u0, t.v0, t.u1 - t.u0, t.v1 - t.v0, 1.2, w0, h, { tone: tone("taptic", "mid"), bevel: 0.25, lit: isLit("taptic") });
      const tm = k.topMatrix([X(t.v0 + 3.4), Y(t.u0 + 3.2)], Z(top), P, "y");
      const label = `<g transform="${tm}"><text class="iso-face-text" data-tone="lo" font-size="${(1.2 * U).toFixed(2)}" x="0" y="0">TAPTIC ENGINE</text></g>`;
      const sc = [screw(t.u0 + 1.4, t.v0 + 1.4, top, { r: 0.6 }), screw(t.u1 - 1.4, t.v1 - 1.4, top, { r: 0.6 })];
      put("taptic", [(t.u0 + t.u1) / 2, (t.v0 + t.v1) / 2, w0 + h / 2], b.svg + Ln(outlineAt(t.u0 + 1.6, t.v0 + 1.6, t.u1 - t.u0 - 3.2, t.v1 - t.v0 - 3.2, 0.6, top), { tone: "faint" }) + label + sc.map((x) => x.svg).join(""), [...b.shapes, ...sc.flatMap((x) => x.shapes)], { name: "taptic.body" });
    }
    {
      const u = L.usb;
      const port = box(u.u0, u.v0, u.u1 - u.u0, u.v1 - u.v0, 1.0, w0 + 1.4, 4.6, { tone: tone("usb", "hi"), bevel: 0.25, lit: isLit("usb") });
      put("usb", [(u.u0 + u.u1) / 2, (u.v0 + u.v1) / 2, w0 + 3.7], port.svg, port.shapes, { name: "usb.port" });
      const cw = box(u.u0 - 2.4, u.v0 + 0.8, u.u1 - u.u0 + 4.8, 4.0, 0.6, w0 + 6.0, 0.3, { tone: "mid" });
      const sc = [screw(u.u0 - 1.2, u.v0 + 2.8, w0 + 6.3, { r: 0.6 }), screw(u.u1 + 1.2, u.v0 + 2.8, w0 + 6.3, { r: 0.6 })];
      put("usb", [(u.u0 + u.u1) / 2, u.v0 + 2.8, w0 + 6.2], cw.svg + sc.map((x) => x.svg).join(""), [...cw.shapes, ...sc.flatMap((x) => x.shapes)], { name: "usb.cowling" });
      const m = L.mic;
      const mic = box(m.u0, m.v0, m.u1 - m.u0, m.v1 - m.v0, 0.8, w0, 2.6, { tone: "mid", bevel: 0.12 });
      put("usb", [(m.u0 + m.u1) / 2, (m.v0 + m.v1) / 2, w0 + 1.3], mic.svg, mic.shapes, { name: "usb.mic" });
    }
  }

  // ------------------------------------------------------------ flex cables
  function flexes() {
    const hi = 6.3;
    const runs = [
      [[[17.6, 10.8], [17.6, 38.0]], 2.8, "front"],
      [[[24.0, 8.0], [21.2, 11.0], [21.2, 38.0]], 2.8, "front"],
      [[[33.8, 12.4], [25.0, 14.6], [25.0, 38.4]], 2.6, "front"],
      [[[38.0, 34.0], [36.0, 38.2]], 6.0, "camera"],
      [[[53.6, 38.0], [43.6, 38.6]], 3.0, "camera"],
      [[[58.0, 21.0], [54.4, 23.4], [54.4, 31.0]], 2.8, "camera"],
      [[[13.85, 37.2], [13.85, 40.2]], 2.4, "camera"],
    ];
    runs.forEach(([pts, width, piece]) => {
      const r = ribbon(pts, width, hi, 0.14, { tone: "lo" });
      const mid = pts[Math.floor(pts.length / 2)];
      put(piece, [mid[0], mid[1], hi], r.svg, r.shapes, { name: piece + ".flex" });
    });
    // USB-C: two stacked flex cables up the LEFT side to the board's left edge (iFixit, Apple)
    const fx = ribbon([[36.4, 154.4], [36.4, 157.4], [5.2, 157.4], [5.2, 49.4], [12.6, 49.4]], 2.4, L.floor + 0.05, 0.14, { tone: "lo" });
    put("usb", [6, 110, L.floor + 0.1], fx.svg, fx.shapes, { name: "usb.flex" });
    // Camera Control and side button flex along the inside of the right wall to the board wing
    const cc = ribbon([[75.4, L.cameraControl.v + 6], [75.4, 58.6], [71.4, 55.4]], 1.6, 6.5, 0.12, { tone: "lo" });
    put("cc", [75.4, 85, 6.6], cc.svg, cc.shapes, { name: "cc.flex" });
    const ccm = boxC(75.2, L.cameraControl.v, 1.4, 12.4, 0.4, 2.2, 4.0, { tone: tone("cc", "mid"), lit: isLit("cc") });
    put("cc", [75.2, L.cameraControl.v, 4.2], ccm.svg, ccm.shapes, { name: "cc.sensor" });
  }

  // ------------------------------------------------------------ side button and Camera Control on the right side
  function buttons() {
    // left side, facing the viewer: Action button and the two volume buttons (Apple drawing)
    for (const [v, len, name] of [[34.2, 7.4, "action"], [48.4, 11.7, "volup"], [62.6, 11.7, "voldown"]]) {
      const lb = box(-0.55, v - len / 2, 0.55, len, 0.3, 2.5, 2.6, { tone: "mid", bevel: 0.08, steps: 4 });
      put("chassis", [-0.3, v, 3.8], lb.svg, lb.shapes, { name: "chassis." + name });
    }
    const sb = L.sideButton, cc = L.cameraControl;
    const b = box(PHONE.u, sb.v - sb.len / 2, 0.55, sb.len, 0.3, 2.5, 2.6, { tone: "mid", bevel: 0.08, steps: 4 });
    put("chassis", [PHONE.u + 0.3, sb.v, 3.8], b.svg, b.shapes, { name: "chassis.sidebutton" });
    const face = (v, w) => at(PHONE.u, v, w);
    const pill = (v0, v1, w0, w1, steps = 10) => {
      const r = (w1 - w0) / 2, wc = (w0 + w1) / 2, pts = [];
      for (let i = 0; i <= steps; i++) { const t = -Math.PI / 2 + (i / steps) * Math.PI; pts.push(face(v1 - r + Math.cos(t) * r, wc + Math.sin(t) * r)); }
      for (let i = 0; i <= steps; i++) { const t = Math.PI / 2 + (i / steps) * Math.PI; pts.push(face(v0 + r + Math.cos(t) * r, wc + Math.sin(t) * r)); }
      return k.pathOf(pts, true);
    };
    const ring = pill(cc.v - cc.len / 2, cc.v + cc.len / 2, 2.0, 5.4);
    const win = pill(cc.v - cc.len / 2 + 0.7, cc.v + cc.len / 2 - 0.7, 2.7, 4.7);
    put("chassis", [PHONE.u + 0.05, cc.v, 3.7], `<path class="cc-win${isLit("ccbtn") ? " lit" : ""}" d="${win}"/>` + Ln(ring, { tone: isLit("ccbtn") ? "lit" : "hi" }) + Ln(win, { tone: "mid" }),
      [A.box([X(cc.v - cc.len / 2), Y(PHONE.u), Z(2.0)], [X(cc.v + cc.len / 2), Y(PHONE.u + 0.05), Z(5.4)], { name: "chassis.cc" })], { name: "chassis.cc" });
  }

  // ------------------------------------------------------------ vapor chamber = battery tray: stepped dimpled plate, raised pad, windows, 14 screws
  function vapor() {
    const w0 = 6.45, h = 0.42, top = w0 + h;
    const plate = prism(L.vc, w0, h, { tone: tone("vc", "mid"), bevel: 0.15, lit: isLit("vc") });
    let win = "";
    for (const [u0, v0, du, dv] of L.vcHoles) win += `<path class="vc-win" d="${outlineAt(u0, v0, du, dv, 1.2, top)}"/>` + Ln(outlineAt(u0, v0, du, dv, 1.2, top), { tone: "lo" });
    const seam = lineAt(insetPoly(L.vc, 1.0), top, true);
    put("vc", [42, 80, w0 + h / 2], plate.svg + Ln(seam, { tone: "faint" }) + win, plate.shapes, { name: "battery.vc" });
    const p = L.vcPad;
    const pad = box(p.u0, p.v0, p.u1 - p.u0, p.v1 - p.v0, 2.4, top, 0.32, { tone: tone("vc", "mid"), bevel: 0.1, lit: isLit("vc") });
    put("vc", [(p.u0 + p.u1) / 2, (p.v0 + p.v1) / 2, top + 0.16], pad.svg, pad.shapes, { name: "battery.vcpad" });
    // dimples: the pillar array that keeps the chamber from collapsing (fades in with zoom)
    const inner = insetPoly(L.vc, 2.2);
    const inside = (u, v) => pointIn(inner, u, v) && !(u > p.u0 - 1 && u < p.u1 + 1 && v > p.v0 - 1 && v < p.v1 + 1) && !L.vcHoles.some(([a, b, c, d]) => u > a - 1 && u < a + c + 1 && v > b - 1 && v < b + d + 1);
    const dim = [];
    for (let v = 10; v < 144; v += 2.4) for (let u = 5 + (Math.round(v / 2.4) % 2) * 1.2; u < 73.5; u += 2.4) if (inside(u, v)) dim.push(at(u, v, top));
    put("vc", [42, 80, top + 0.04], Dots(dim, { size: 0.32 * U, tone: "lo" }), [A.extruded(ringL2(inner), Z(top) + 0.12 * U, 0.01, { name: "battery.dimples" })], { name: "battery.dimples", lod: fine });
    // 14 Torx Plus screws: the round boss in the middle, two by the connectors, eleven round the edge
    L.vcScrews.forEach(([u, v, len]) => {
      const edge = u < 5 || u > 72;
      const tab = edge ? boxC(u, v, 3.4, 3.4, 1.1, w0, h, { tone: "mid" }) : cyl(u, v, len === 5.7 ? 2.2 : 1.6, top, 0.35, { tone: "mid", steps: 28 });
      const sz = len === 5.7 ? 0.9 : 0.75;
      const st = edge ? top : top + 0.35;
      if (battScrews) {
        const sc = screw(u, v, st, { r: sz, kind: "tri" });
        put("vc", [u, v, st + 0.1], tab.svg + sc.svg, [...tab.shapes, ...sc.shapes], { name: "battery.screw" });
      } else {
        put("vc", [u, v, st], tab.svg + Ln(ringAt(u, v, sz * 0.7, st, 20), { tone: "lo" }), tab.shapes, { name: "battery.screw" });
      }
    });
  }

  // ------------------------------------------------------------ display assembly
  function display() {
    const g0 = L.rim, frameH = 0.55, oledH = 0.3, glassH = 0.6;
    const fr = box(0.45, 0.45, PHONE.u - 0.9, PHONE.v - 0.9, PHONE.r - 0.45, g0, frameH, { tone: "hi" });
    put("display", [39, 81.7, g0 + frameH / 2], fr.svg, fr.shapes, { name: "display.frame" });
    const ol = box(0.9, 0.9, PHONE.u - 1.8, PHONE.v - 1.8, PHONE.r - 0.9, g0 + frameH, oledH, { tone: "lo" });
    put("display", [39, 81.7, g0 + frameH + oledH / 2], ol.svg, ol.shapes, { name: "display.oled" });
    const gw = g0 + frameH + oledH;
    const glass = box(0, 0, PHONE.u, PHONE.v, PHONE.r, gw, glassH, { tone: "hi", bevel: 0.45 });
    const top = gw + glassH;
    const isl = L.island;
    const active = outlineAt(2.55, 2.5, PHONE.u - 5.1, PHONE.v - 5.0, PHONE.r - 2.3, top);
    const pill = outlineAt(isl.u - isl.du / 2, isl.v - isl.dv / 2, isl.du, isl.dv, isl.dv / 2, top);
    put("display", [39, 81.7, gw + glassH / 2], glass.svg + Ln(active, { tone: "faint" }) + `<path class="island" d="${pill}"/>` + Ln(pill, { tone: "mid" }), glass.shapes, { name: "display.glass" });
  }
}

const ringL2 = (poly) => poly.map(([u, v]) => [X(v), Y(u)]);
function pointIn(poly, u, v) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i], [uj, vj] = poly[j];
    if ((vi > v) !== (vj > v) && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------- polygon helpers (local mm)
export function insetPoly(poly, d) {
  const n = poly.length;
  const area = poly.reduce((s, p, i) => { const q = poly[(i + 1) % n]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  const sgn = area > 0 ? 1 : -1;
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * sgn, ny = (dx / len) * sgn;
    return [[p[0] + nx * d, p[1] + ny * d], [q[0] + nx * d, q[1] + ny * d]];
  });
  return lines.map((l, i) => intersect(lines[(i + n - 1) % n][0], lines[(i + n - 1) % n][1], l[0], l[1]));
}
export const outsetPoly = (poly, d) => insetPoly(poly, -d);
function intersect(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return b;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  return [a[0] + r[0] * t, a[1] + r[1] * t];
}
function chamfer(u0, v0, du, dv, c) {
  return [[u0 + c, v0], [u0 + du - c, v0], [u0 + du, v0 + c], [u0 + du, v0 + dv - c], [u0 + du - c, v0 + dv], [u0 + c, v0 + dv], [u0, v0 + dv - c], [u0, v0 + c]];
}
