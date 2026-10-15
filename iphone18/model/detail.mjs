// Second pass of detail on the phone: the parts that make a 4× close-up still rewarding.
// Called from phone() with the same helpers; positions in phone-local millimetres.
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { U, PHONE, X, Y, Z, W3, plan } from "./units.mjs";

// seeded random (mulberry32)
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function addDetail(ctx, skip = []) {
  const { K, put, L, P, fine, tone, isLit, insetPoly, pointIn } = ctx;
  const { S, L: Ln, Dots, at, box, boxC, cyl, lineAt, outlineAt, ringAt, ribbon } = K;
  const on = (name) => !skip.includes(name);
  if (on("chassis")) chassisDetail();
  if (on("board")) boardDetail();
  if (on("battery")) batteryDetail();
  if (on("back")) backDetail();
  if (on("display")) displayDetail();
  if (on("cameras")) cameraDetail();

  // ---------------------------------------------------------- unibody: lens ports, button slots, antenna splits, receiver slot
  function chassisDetail() {
    const w = L.floor;
    // the openings the lenses, flash, LiDAR and rear mic look through (Apple dimensional drawing)
    const ports = [[63.9, 14.1, 7.33], [63.85, 33.8, 7.33], [45.2, 24.1, 7.33], [13.85, 13.75, 3.385], [13.85, 34.1, 3.385], [13.85, 23.9, 0.6]];
    for (const [u, v, r] of ports) {
      const hole = ringAt(u, v, r, w + 0.005, 64);
      const step = r > 1 ? ringAt(u, v, r + 0.9, w + 0.005, 64) : "";
      put("chassis", [u, v, w + 0.01], `<path class="port" d="${hole}"/>` + Ln(hole, { tone: "mid" }) + (step ? Ln(step, { tone: "faint" }) : ""), [A.cylinder(X(v), Y(u), (r + 0.9) * U, Z(w) + 0.12 * U, 0.01, { name: "chassis.port" })], { name: "chassis.port" });
    }
    // openings on the inner face of the far (right) wall: side button and Camera Control
    const face = (v, ww) => at(PHONE.u - L.wall, v, ww);
    const slot = (vc, len, w0, w1) => {
      const r = (w1 - w0) / 2, wc = (w0 + w1) / 2, pts = [];
      for (let i = 0; i <= 10; i++) { const t = -Math.PI / 2 + (i / 10) * Math.PI; pts.push(face(vc + len / 2 - r + Math.cos(t) * r, wc + Math.sin(t) * r)); }
      for (let i = 0; i <= 10; i++) { const t = Math.PI / 2 + (i / 10) * Math.PI; pts.push(face(vc - len / 2 + r + Math.cos(t) * r, wc + Math.sin(t) * r)); }
      return k.pathOf(pts, true);
    };
    let d = slot(L.sideButton.v, L.sideButton.len, 2.9, 4.9) + slot(L.cameraControl.v, L.cameraControl.len, 2.4, 5.0);
    // antenna splits run the full height of the inner face
    for (const v of L.antenna) d += k.pathOf([face(v - 0.6, w), face(v - 0.6, L.rim)]) + k.pathOf([face(v + 0.6, w), face(v + 0.6, L.rim)]);
    put("chassis", [L.wall, 81, 4], Ln(d, { tone: "lo" }), [A.box([X(10), Y(PHONE.u - L.wall), Z(w)], [X(150), Y(PHONE.u - L.wall - 0.02), Z(L.rim)], { name: "chassis.rightface" })], { name: "chassis.rightface" });
    // the receiver slot in the inner face of the top wall
    const top = (u, ww) => at(u, L.wall, ww);
    const rs = [];
    for (let i = 0; i <= 10; i++) { const t = -Math.PI / 2 + (i / 10) * Math.PI; rs.push(top(53.4 - 0.25 + Math.cos(t) * 0.25, 6.6 + Math.sin(t) * 0.25)); }
    for (let i = 0; i <= 10; i++) { const t = Math.PI / 2 + (i / 10) * Math.PI; rs.push(top(24.6 + 0.25 + Math.cos(t) * 0.25, 6.6 + Math.sin(t) * 0.25)); }
    let td = k.pathOf(rs, true);
    for (const u of [20, 58]) td += k.pathOf([top(u, w), top(u, L.rim)]);
    put("chassis", [39, L.wall, 4], Ln(td, { tone: "lo" }), [A.box([X(L.wall), Y(15), Z(w)], [X(L.wall + 0.02), Y(63), Z(L.rim)], { name: "chassis.topface" })], { name: "chassis.topface" });
  }

  // ---------------------------------------------------------- board: a field of small parts in the open areas
  function boardDetail() {
    const top = L.floor + 0.4 + 0.8 + 1.25 + 0.8;
    const s = L.soc;
    const occupied = [
      [s.u0, s.v0, s.u1, s.v1], [13.0, 38.0, 25.4, 45.0], [13.0, 45.8, 20.0, 54.2], [20.8, 45.8, 26.0, 51.8], [42.4, 38.0, 46.4, 43.6], [42.4, 44.6, 46.4, 55.6],
      [48.0, 47.8, 56.4, 56.2], [65.0, 47.8, 71.4, 52.2], [18.0, 55.0, 24.4, 62.2], [57.0, 52.6, 64.4, 56.2], [31.6, 37.6, 43.2, 40.2],
    ].map(([a, b, c, d]) => [a - 0.35, b - 0.35, c + 0.35, d + 0.35]);
    const inner = insetPoly(L.board, 1.0);
    const free = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].every(([u, v]) => pointIn(inner, u, v)) && !occupied.some(([a, b, c, d]) => u0 < c && u1 > a && v0 < d && v1 > b);
    const R = rng(1817);
    const parts = [];
    const kinds = [
      { w: [1.0, 0.5], h: 0.3, tone: "hi", p: 0.42 },     // 0402 passives
      { w: [0.6, 0.3], h: 0.22, tone: "mid", p: 0.22 },   // 0201
      { w: [2.0, 1.6], h: 0.8, tone: "lo", p: 0.12, ring: true }, // power inductor
      { w: [1.6, 1.6], h: 0.45, tone: "mid", p: 0.14, ic: true },  // small QFN / WLCSP
      { w: [2.0, 1.2], h: 0.5, tone: "hi", p: 0.10 },     // crystal
    ];
    for (let v = 38.2; v < 63; v += 0.55) for (let u = 12.6; u < 72; u += 0.55) {
      if (R() > 0.34) continue;
      let r = R(), kd = kinds[0];
      for (const c of kinds) { if (r < c.p) { kd = c; break; } r -= c.p; }
      const rot = R() < 0.5;
      const du = rot ? kd.w[1] : kd.w[0], dv = rot ? kd.w[0] : kd.w[1];
      const rect = [u, v, u + du, v + dv];
      if (!free(...rect)) continue;
      occupied.push([u - 0.18, v - 0.18, u + du + 0.18, v + dv + 0.18]);
      parts.push({ u, v, du, dv, kd });
    }
    // three clusters (left block, middle, wing), each one item with every part's true shape
    const groups = { left: [], mid: [], wing: [] };
    for (const p of parts) (p.u < 26.6 ? groups.left : p.u < 47 ? groups.mid : groups.wing).push(p);
    for (const [gname, list] of Object.entries(groups)) {
      list.sort((a, b) => k.depthOf(W3(a.u + a.du / 2, a.v + a.dv / 2, top), P) - k.depthOf(W3(b.u + b.du / 2, b.v + b.dv / 2, top), P));
      let svg = "";
      const shapes = [];
      for (const p of list) {
        const b = box(p.u, p.v, p.du, p.dv, Math.min(p.du, p.dv) * 0.15, top, p.kd.h, { tone: p.kd.tone, crease: "faint" });
        svg += b.svg;
        if (p.kd.ring) svg += Ln(ringAt(p.u + p.du / 2, p.v + p.dv / 2, Math.min(p.du, p.dv) * 0.32, top + p.kd.h, 20), { tone: "faint" });
        if (p.kd.ic) svg += Dots([at(p.u + 0.3, p.v + 0.3, top + p.kd.h)], { size: 0.08 * U, tone: "lo" });
        shapes.push(...b.shapes);
      }
      if (!list.length) continue;
      const c = list[Math.floor(list.length / 2)];
      put("board", [c.u, c.v, top + 0.3], svg, shapes, { name: "board.field." + gname, lod: fine });
    }
    // four board screws on hex standoffs
    for (const [u, v] of [[13.6, 62.4], [46.2, 62.4], [71.0, 48.6], [71.0, 56.0]]) {
      const so = cyl(u, v, 1.1, top, 0.45, { tone: "hi", steps: 6 });
      const sc = K.screw(u, v, top + 0.45, { r: 0.6 });
      put("board", [u, v, top + 0.3], so.svg + sc.svg, [...so.shapes, ...sc.shapes], { name: "board.standoff" });
    }
  }

  // ---------------------------------------------------------- battery: e-adhesive strips on top, connector head
  function batteryDetail() {
    const top = L.floor + 0.85 + 4.95;
    let d = "";
    [[68, 74], [104, 110], [128.4, 132.4]].forEach(([v0, v1], i) => (d += `<path class="iso-line adh" data-tone="faint" data-i="${i}" d="${outlineAt(11, v0, 56, v1 - v0, 1.2, top + 0.005)}"/>`));
    // the two contact pads where the debonding voltage goes in (12 V, about 90 s)
    const pads = [boxC(15, 66.2, 3.2, 1.6, 0.4, top, 0.12, { tone: "hi" }), boxC(20, 66.2, 3.2, 1.6, 0.4, top, 0.12, { tone: "hi" })];
    put("battery", [40, 100, top + 0.01], d, [A.slab(plan(11, 68, 56, 64.4, 0), Z(top) + 0.12 * U, 0.01, { name: "battery.adhesive" })], { name: "battery.adhesive" });
    pads.forEach((p, i) => put("battery", [15 + i * 5, 66.2, top + 0.06], p.svg, p.shapes, { name: "battery.pad" }));
    const head = boxC(61.4, 55.8, 6.0, 2.6, 0.4, top - 0.1, 0.7, { tone: "hi", bevel: 0.06 });
    put("battery", [61.4, 55.8, top + 0.3], head.svg, head.shapes, { name: "battery.connector" });
    // capacity gauge (示意), drawn on the cell top along the phone's width: 22 cells ≈ 21.751 Wh,
    // a rule at 20 Wh with a padlock (shipping firmware holds the cell under it until activation)
    const gt = k.topMatrix([X(0), Y(0)], Z(top + 0.004), P, "x");
    const q = (n) => (n * U).toFixed(2), pc = 50 / 22, uL = 14 + 20 * pc;
    let g = `<g id="cap" opacity="0"><g transform="${gt}"><g transform="matrix(0 -1 1 0 0 0)">`;
    g += `<rect class="cap-box" x="${q(14)}" y="${q(74.5)}" width="${q(50)}" height="${q(7)}" rx="${q(1)}"/>`;
    for (let j = 0; j < 22; j++) g += `<rect class="cap-cell" data-j="${j}" x="${q(14 + j * pc + 0.3)}" y="${q(75.2)}" width="${q(pc - 0.6)}" height="${q(5.6)}" rx="${q(0.3)}"/>`;
    g += `<path class="cap-line" d="M${q(uL)} ${q(72.2)}V${q(83.8)}"/><text class="cap-t" x="${q(uL)}" y="${q(87.4)}" font-size="${q(3)}" text-anchor="middle">20 Wh</text>`;
    g += `<g id="cap-lock" opacity="0"><g id="cap-shk"><path class="cap-shk" d="M${q(uL - 1)} ${q(68.4)}V${q(67)}A${q(1)} ${q(1)} 0 0 1 ${q(uL + 1)} ${q(67)}V${q(68.4)}"/></g>`;
    g += `<rect class="cap-lockb" x="${q(uL - 1.7)}" y="${q(68.2)}" width="${q(3.4)}" height="${q(2.8)}" rx="${q(0.4)}"/></g>`;
    g += `</g></g></g>`;
    put("battery", [40, 78, top + 0.02], g, [A.slab(plan(12, 64, 54, 26, 0), Z(top) + 0.12 * U, 0.01, { name: "battery.gauge" })], { name: "battery.gauge" });
    // the same three strips seen through the vapor chamber while the cell is still glued under it (hidden lines)
    const vt = 6.45 + 0.42;
    let hd = "";
    [[68, 74], [104, 110], [128.4, 132.4]].forEach(([v0, v1], i) => (hd += `<path class="iso-line adhg" data-i="${i}" d="${outlineAt(11, v0, 56, v1 - v0, 1.2, vt + 0.005)}"/>`));
    put("vc", [40, 100, vt + 0.01], hd, [A.slab(plan(11, 68, 56, 64.4, 0), Z(vt) + 0.12 * U, 0.01, { name: "vc.adhghost" })], { name: "vc.adhghost" });
  }

  // ---------------------------------------------------------- back glass: adhesive perimeter, coil lead
  function backDetail() {
    const g = L.glassCut, top = L.floor;
    const per = outlineAt(g.u0 + 1.4, g.v0 + 1.4, g.u1 - g.u0 - 2.8, g.v1 - g.v0 - 2.8, g.r - 1.4, top + 0.005);
    put("back", [39, 104, top + 0.01], Ln(per, { tone: "faint" }), [A.slab(plan(g.u0 + 1.4, g.v0 + 1.4, g.u1 - g.u0 - 2.8, g.v1 - g.v0 - 2.8, 0), Z(top) + 0.12 * U, 0.01, { name: "back.adhesive" })], { name: "back.adhesive" });
    const lead = ribbon([[55.1, 68.4], [58, 70.6]], 2.2, top + 0.3, 0.12, { tone: "lo" });
    put("back", [56.5, 69.5, top + 0.4], lead.svg, lead.shapes, { name: "back.lead" });
  }

  // ---------------------------------------------------------- display: true-scale pixel rows over the IR camera (deep zoom)
  function displayDetail() {
    const top = L.rim + 0.55 + 0.3 + 0.6;
    const [cu, cv] = [14.07, 7.91];
    const pitch = 25.4 / 460;            // 460 ppi
    const half = 3.4, fadeIn = 2.2, rIR = 1.84;
    const list = [];
    let row = 0;
    for (let v = cv - half; v <= cv + half; v += pitch, row++) {
      // segments across the patch; inside the IR window only every other row is kept
      for (let u = cu - half; u < cu + half; u += 0.2) {
        const um = u + 0.1, d = Math.hypot(um - cu, v - cv);
        if (d < rIR && row % 2) continue;
        const ax = Math.max(Math.abs(um - cu), Math.abs(v - cv));
        const alpha = 1 - Math.min(1, Math.max(0, (ax - fadeIn) / (half - fadeIn)));
        if (alpha <= 0.02) continue;
        list.push({ d: lineAt([[u, v], [u + 0.2, v]], top + 0.002), alpha: alpha * alpha * (3 - 2 * alpha) });
      }
    }
    const circle = ringAt(cu, cv, rIR, top + 0.002, 72);
    // the infrared camera below shows through the thinned rows as a faint deep-red glow
    const tm = k.topMatrix([X(0), Y(0)], Z(top), P, "x");
    const glow = `<defs><radialGradient id="irglow" gradientUnits="userSpaceOnUse" cx="${cv * U}" cy="${-cu * U}" r="${(rIR * 1.25 * U).toFixed(2)}"><stop offset="0" style="stop-color:var(--film-ir);stop-opacity:.34"/><stop offset=".7" style="stop-color:var(--film-ir);stop-opacity:.14"/><stop offset="1" style="stop-color:var(--film-ir);stop-opacity:0"/></radialGradient></defs><g transform="${tm}"><circle id="irglow-disc" cx="${cv * U}" cy="${-cu * U}" r="${(rIR * 1.25 * U).toFixed(2)}" fill="url(#irglow)"/></g>`;
    put("display", [cu, cv, top + 0.01], glow + k.fadedSvg(list, { tone: "mid" }) + Ln(circle, { tone: "hi" }), [A.slab(plan(cu - half, cv - half, 2 * half, 2 * half, 0), Z(top) + 0.12 * U, 0.01, { name: "display.pixels" })], { name: "display.pixels", lod: ctx.deep });
    // the IR camera docks 1.5 mm under its assembled spot (lens top w 5.6): two vertical rules at the
    // window's silhouette and the lens ring below, dashed (hidden lines through the ghosted glass)
    const lw = L.rim - 0.2 - 1.5, ring = Array.from({ length: 96 }, (_, i) => { const a = (i / 96) * Math.PI * 2; return [cu + Math.cos(a) * rIR, cv + Math.sin(a) * rIR]; });
    const sx = ring.map(([u, v]) => at(u, v, top)[0]);
    const ends = [ring[sx.indexOf(Math.min(...sx))], ring[sx.indexOf(Math.max(...sx))]];
    const guide = ends.map(([u, v]) => k.pathOf([at(u, v, top), at(u, v, lw)])).join("") + ringAt(cu, cv, rIR, lw, 72);
    const isl = L.island, pad = 0.9;
    const marks = `<g id="ir-guide" opacity="0">${Ln(guide, { tone: "lit" })}</g>` +
      `<g id="ir-mark" opacity="0">${Ln(ringAt(cu, cv, 2.9, top + 0.004, 72), { tone: "lit" })}</g>` +
      `<g id="isl-mark" opacity="0">${Ln(outlineAt(isl.u - isl.du / 2 - pad, isl.v - isl.dv / 2 - pad, isl.du + 2 * pad, isl.dv + 2 * pad, isl.dv / 2 + pad, top + 0.004), { tone: "lit" })}</g>`;
    put("display", [28, 8, top + 0.02], marks, [A.slab(plan(5, 1, 46, 14, 0), Z(top) + 0.12 * U, 0.01, { name: "display.marks" })], { name: "display.marks" });
  }

  // ---------------------------------------------------------- camera module tops: label rules, flex stiffeners
  function cameraDetail() {
    const base = -2.4;
    const c = L.cam;
    const tT = base + 8.2 + 0.0, tM = base + 9.0 + 0.4, tU = base + 8.0;
    const rules = (u, v, lens, z) => lens.map((len, i) => lineAt([[u, v + i * 1.2], [u + len, v + i * 1.2]], z)).join("");
    put("camera", [32, 20, tT + 0.01], Ln(rules(30.0, 17.0, [8, 5.5, 7], tT + 0.01), { tone: "lo", free: true }), [A.slab(plan(30, 16.5, 9, 4, 0), Z(tT) + 0.12 * U, 0.01, { name: "camera.tele.label" })], { name: "camera.tele.label" });
    put("camera", [60, 39, tM + 0.01], Ln(rules(57.4, 26.6, [6, 4], tM + 0.01), { tone: "lo", free: true }), [A.slab(plan(57, 26, 7, 3, 0), Z(tM) + 0.12 * U, 0.01, { name: "camera.main.label" })], { name: "camera.main.label" });
    // stiffeners at the flex ends over the board's camera connectors
    for (const [u, v] of [[36.0, 38.6], [44.6, 38.8]]) {
      const st = boxC(u, v, 3.4, 2.0, 0.3, 6.44, 0.25, { tone: "hi" });
      put("camera", [u, v, 6.6], st.svg, st.shapes, { name: "camera.stiffener" });
    }
    void tU; void c;
  }
}
