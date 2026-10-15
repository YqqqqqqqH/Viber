// Small drawing helpers on top of the kit, all in phone-local millimetres (see units.mjs),
// each returning { svg, shapes } so the caller can R.put it with its true shape.
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { U, X, Y, Z, W3, plan, ringL } from "./units.mjs";

export function kitOf(P) {
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const Dots = (points, style) => k.dotsSvg(points, style);
  const at = (u, v, w) => k.iso(W3(u, v, w), P);
  const [vx, vy] = k.towardViewer(P);

  // a rounded box, local mm
  function box(u0, v0, du, dv, r, w0, h, { tone = "mid", crease, bevel = 0, steps, lit, inner = "", name } = {}) {
    const pl = plan(u0, v0, du, dv, r);
    const st = steps ?? (r > 2 ? 8 : r > 0.3 ? 4 : 2);
    const paths = k.slabOf(pl, Z(w0), h * U, P, st, bevel * U);
    return { svg: S(paths, { tone, crease, lit, inner }), shapes: [A.slab(pl, Z(w0), h * U, { name }, st)], paths, plan: pl };
  }
  const boxC = (uc, vc, du, dv, r, w0, h, o) => box(uc - du / 2, vc - dv / 2, du, dv, r, w0, h, o);
  // a vertical cylinder (axis along w)
  function cyl(uc, vc, r, w0, h, { tone = "mid", crease, bevel = 0, steps = 40, lit, inner = "", name } = {}) {
    const paths = k.cylinder(X(vc), Y(uc), r * U, Z(w0), h * U, P, steps, bevel * U);
    return { svg: S(paths, { tone, crease, lit, inner }), shapes: [A.cylinder(X(vc), Y(uc), r * U, Z(w0), h * U, { name })], paths };
  }
  // any floor polygon given as local [u, v] points (concave allowed)
  function prism(points, w0, h, { tone = "mid", crease, convex = false, bevel = 0, lit, inner = "", name } = {}) {
    const ring = ringL(points);
    const paths = k.extrude(ring, Z(w0), h * U, P, { convex, bevel: bevel * U });
    return { svg: S(paths, { tone, crease, lit, inner }), shapes: [A.extruded(ring, Z(w0), h * U, { name })], paths, ring };
  }
  // lines on a horizontal face at height w
  const lineAt = (pts, w, closed = false) => k.onTop(pts.map(([u, v]) => [X(v), Y(u)]), Z(w), P, closed);
  const outlineAt = (u0, v0, du, dv, r, w, steps = 6) => k.planOutline(plan(u0, v0, du, dv, r), Z(w), P, steps);
  const ringAt = (uc, vc, r, w, steps = 40) => k.ring(X(vc), Y(uc), r * U, Z(w), P, steps);
  const dotAt = (u, v, w) => at(u, v, w);

  // a flat strip along a polyline (a flex cable lying on a face), local [u, v] points, width in mm
  function ribbonRing(points, width) {
    const half = width / 2;
    const left = [], right = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      let nx = -ty, ny = tx;
      // miter
      let m = 1;
      if (i > 0 && i < points.length - 1) {
        const ax = p[0] - a[0], ay = p[1] - a[1], al = Math.hypot(ax, ay) || 1;
        const n0 = [-ay / al, ax / al];
        m = 1 / Math.max(0.35, n0[0] * nx + n0[1] * ny);
      }
      left.push([p[0] + nx * half * m, p[1] + ny * half * m]);
      right.push([p[0] - nx * half * m, p[1] - ny * half * m]);
    }
    return [...left, ...right.reverse()];
  }
  function ribbon(points, width, w0, h, o = {}) {
    return prism(ribbonRing(points, width), w0, h, { tone: "lo", ...o });
  }
  // a screw head seen from above: a short cylinder, a ring and a slot (tri-point or cross)
  function screw(u, v, w, { r = 0.7, kind = "cross", tone = "mid", h = 0.25 } = {}) {
    const c = cyl(u, v, r, w, h, { tone, steps: 20 });
    const top = w + h, s = r * 0.55;
    let slot;
    if (kind === "tri") {
      slot = [0, 1, 2].map((i) => { const t = (i / 3) * Math.PI * 2 - Math.PI / 2; return lineAt([[u, v], [u + Math.cos(t) * s, v + Math.sin(t) * s]], top); }).join("");
    } else {
      slot = lineAt([[u - s, v], [u + s, v]], top) + lineAt([[u, v - s], [u, v + s]], top);
    }
    return { svg: c.svg + L(slot, { tone: "lo" }), shapes: c.shapes };
  }
  return { k, A, S, L, Dots, at, box, boxC, cyl, prism, lineAt, outlineAt, ringAt, dotAt, ribbon, ribbonRing, screw, viewer: [vx, vy] };
}

// Split a rounded-rectangle ring (outer plan, wall thickness) into the far and near "U" halves,
// so a tray's back walls paint before what sits inside it and its front walls after.
export function trayHalves(outer, wall, P, steps = 10) {
  const inner = typeof wall === "number" ? k.insetPlan(outer, wall) : wall;
  const ro = k.roundedPlan(outer, steps), ri = k.roundedPlan(inner, steps);
  const cx = outer.x + outer.w / 2, cy = outer.y + outer.d / 2;
  const [vx, vy] = k.towardViewer(P);
  const near = ro.map(([x, y]) => (x - cx) * vx + (y - cy) * vy > 0);
  const n = ro.length;
  // each half runs from its first point to the first point of the other half, so the two
  // halves share exactly the two cut segments
  const halfOf = (want) => {
    let start = 0;
    for (let i = 0; i < n; i++) if (near[i] === want && near[(i + n - 1) % n] !== want) start = i;
    const idx = [];
    for (let j = 0; j <= n; j++) { const i = (start + j) % n; idx.push(i); if (near[i] !== want) break; }
    const outerPts = idx.map((i) => ro[i]);
    const innerPts = idx.map((i) => ri[i]).reverse();
    return [...outerPts, ...innerPts];
  };
  return { inner, far: halfOf(false), near: halfOf(true) };
}
