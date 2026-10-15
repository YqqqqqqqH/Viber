// The film's one world: the phone opened into six floors that climb to the upper right, on its
// plinth, with the main camera lifted out of its bay and opened along its axis.
// Floors (Apple's exploded-view order): 0 back glass, 1 unibody, 2 internals, 3 battery,
// 4 vapor chamber (battery tray), 5 display. Each floor sits STEP further toward the phone's
// bottom (+x) and up, so the top half of every floor (board, cameras, A20 Pro, Face ID) stays
// in view under the floor above.
import * as k from "../kit/iso-kit.mjs";
import * as A from "../kit/audit.mjs";
import { phone, L } from "./phone.mjs";
import { mainCamera } from "./maincam.mjs";
import { plinth } from "./stand.mjs";
import { U, PHONE, X, Y, Z, W3, plan } from "./units.mjs";

export const AZ = 58, EL = 32;
export const FLOOR = { back: 0, chassis: 1, board: 2, camera: 2, front: 2, speaker: 2, taptic: 2, usb: 2, cc: 2, battery: 3, vc: 4, display: 5 };
export const STEP = [88 * U, 0, 62 * U];
export const floorMove = (piece, share = 1) => STEP.map((d) => d * (FLOOR[piece] ?? 0) * share);
export const MAIN = { u: (L.cam.main.u0 + L.cam.main.u1) / 2, v: (L.cam.main.v0 + L.cam.main.v1) / 2, lift: 15 };

// one projection for the whole film, fitted to the opened building and its plinth
export function worldP(width = 1920, height = 1080) {
  const ext = [];
  for (let f = 0; f <= 5; f++) for (const u of [-2, 80]) for (const v of [-2, 165.4]) for (const w of [-3, 9]) { const c = W3(u, v, w); ext.push([c[0] + STEP[0] * f, c[1], c[2] + STEP[2] * f]); }
  for (const u of [-14, 92]) for (const v of [-14, 177.4]) ext.push(W3(u, v, -24));
  return k.fitProjection(ext, width, height, { pad: 40, azimuth: AZ, elevation: EL });
}

// Explode poses. Every floor first rises UP (clear of everything still at home: the cameras
// reach 2.4 mm into the plateau, the walls stand 7.3 mm), then slides out to its place in the
// building. A pose is [up, out] per group, each 0 → 1. The battery leaves glued under the
// vapor chamber (Apple: "attached to vapor chamber") and drops to its own floor when battDrop
// goes 0 → 1.
export const UP = 14 * U;
export const GROUP = { back: "back", chassis: "chassis", board: "internals", camera: "internals", front: "internals", speaker: "internals", taptic: "internals", usb: "internals", cc: "internals", battery: "battery", vc: "vc", display: "display" };
export function moveFor(piece, [su, so] = [1, 1]) {
  const fin = floorMove(piece);
  if (!fin.some((d) => d)) return [0, 0, 0];
  return [fin[0] * so, fin[1] * so, UP * su + (fin[2] - UP) * so];
}
export function posedMoves({ pose = 1, floors = null, battDrop = 1 } = {}) {
  const at = (g) => (floors && floors[g]) || [pose, pose];
  const moves = {};
  for (const p of Object.keys(FLOOR)) moves[p] = moveFor(p, at(GROUP[p]));
  const glued = moveFor("vc", at("vc")), own = moveFor("battery", at("battery"));
  moves.battery = glued.map((g, i) => g + (own[i] - g) * battDrop);
  return moves;
}

export function scene(P, R, { lit = "", irisF = 1.48, mainOpen = true, irisLit = false, heat = 0, prevVC = false, lod = true, pose = 1, floors = null, battDrop = 1, screenOn = false } = {}) {
  const moves = posedMoves({ pose, floors, battDrop });
  phone(P, R, { moves, lit, lod, hide: mainOpen ? ["camera.main", "camera.main.cap"] : [] });
  plinth(P, R, { plan: plan(-14, -14, PHONE.u + 28, PHONE.v + 28, 14), top: Z(-L.plateau.h) - 0.3 * U });
  if (mainOpen) {
    const m = moves.camera;
    const c = W3(MAIN.u, MAIN.v, MAIN.lift);
    mainCamera(P, R, { centre: [c[0] + m[0], c[1] + m[1], c[2] + m[2]], f: irisF, open: 1, gaps: [0, 4.0, 5.2, 2.8, 3.2, 3.6], lit: irisLit ? "iris" : "", pieces: {} });
  }
  if (heat > 0 || prevVC) heatOverlay(P, R, { heat, prevVC, move: moves.vc });
  if (screenOn) lockScreen(P, R, { move: moves.display, on: screenOn === true ? 1 : screenOn });
  return moves;
}

// what the display shows when it wakes: the lock screen's clock, date, the two quick buttons
// and the home bar, drawn in the glass's own plane (text the machine displays, not a label)
export function lockScreen(P, R, { move, on = 1 }) {
  const top = L.rim + 0.55 + 0.3 + 0.6 + 0.004;
  const tm = k.topMatrix([X(0), Y(0)], Z(top), P, "x");
  const q = (u, v) => [(u * U).toFixed(2), (v * U).toFixed(2)];
  let g = `<defs><clipPath id="lockclip"><rect id="lock-rect" x="0" y="0" width="${(78 * U).toFixed(1)}" height="${(163.4 * U).toFixed(1)}"/></clipPath></defs><g transform="${tm}"><g id="lock-g" transform="matrix(0 -1 1 0 0 0)" clip-path="url(#lockclip)" opacity="${on.toFixed(3)}">`;
  g += `<text class="lock-date" x="${q(39, 0)[0]}" y="${q(0, 21.5)[1]}" font-size="${(3.4 * U).toFixed(1)}" text-anchor="middle">10月15日 星期四</text>`;
  g += `<text class="lock-time" x="${q(39, 0)[0]}" y="${q(0, 39)[1]}" font-size="${(19 * U).toFixed(1)}" text-anchor="middle">9:41</text>`;
  for (const u of [14, 64]) g += `<circle class="lock-btn" cx="${q(u, 0)[0]}" cy="${q(0, 148.5)[1]}" r="${(4.6 * U).toFixed(1)}"/>`;
  g += `<rect class="lock-btn" x="${q(12.6, 0)[0]}" y="${q(0, 146.2)[1]}" width="${(2.8 * U).toFixed(1)}" height="${(4.6 * U).toFixed(1)}" rx="${(0.9 * U).toFixed(1)}"/>`;
  g += `<rect class="lock-btn" x="${q(61.4, 0)[0]}" y="${q(0, 146.9)[1]}" width="${(5.2 * U).toFixed(1)}" height="${(3.4 * U).toFixed(1)}" rx="${(0.7 * U).toFixed(1)}"/><circle class="lock-btn" cx="${q(64, 0)[0]}" cy="${q(0, 148.6)[1]}" r="${(1.0 * U).toFixed(1)}"/>`;
  g += `<rect class="lock-bar" x="${q(26, 0)[0]}" y="${q(0, 158.9)[1]}" width="${(26 * U).toFixed(1)}" height="${(0.9 * U).toFixed(1)}" rx="${(0.45 * U).toFixed(1)}"/>`;
  g += `</g></g>`;
  R.put({ piece: "display", at: W3(39, 81.7, top), svg: g, move, shapes: [R.solid(A.slab(plan(4, 12, 70, 150, 0), Z(top) + 0.12 * U, 0.01, { name: "display.lock" }))], name: "display.lock" });
}

// heat spreading through the vapor chamber from the spot over the A20 Pro: a warm tint and
// isotherms drawn in the plate's own plane, clipped to the plate; the previous generation's
// chamber (a third of the area, 示意) as a faint outline
let clipId = 0;
export function heatOverlay(P, R, { heat, prevVC, move }) {
  const top = 6.45 + 0.42 + 0.004;
  const off = (u, v) => { const w = W3(u, v, top); return [w[0] + move[0], w[1] + move[1], w[2] + move[2]]; };
  const tm = k.topMatrix([off(0, 0)[0], off(0, 0)[1]], off(0, 0)[2], P, "x");
  // plate-plane coordinates: x along world x (= v·U), y along world y (= −u·U), origin at local (0, 0)
  const pl = (u, v) => [v * U, -u * U];
  const poly = L.vc.map(([u, v]) => pl(u, v));
  const id = `vcclip${clipId++}`;
  const [hu, hv] = [34.3, 52.9];
  const [hx, hy] = pl(hu, hv);
  const Rmax = 92 * U;
  const r = Rmax * Math.max(0.001, heat);
  let svg = `<defs><clipPath id="${id}"><path d="M${poly.map((p) => p.join(" ")).join("L")}Z"/></clipPath>`;
  svg += `<radialGradient id="heatgrad" gradientUnits="userSpaceOnUse" cx="${hx}" cy="${hy}" r="${r.toFixed(1)}"><stop offset="0" style="stop-color:var(--film-heat);stop-opacity:.42"/><stop offset=".55" style="stop-color:var(--film-heat);stop-opacity:.18"/><stop offset="1" style="stop-color:var(--film-heat);stop-opacity:0"/></radialGradient></defs>`;
  svg += `<g transform="${tm}" clip-path="url(#${id})">`;
  if (heat > 0) {
    svg += `<circle id="heat-disc" cx="${hx}" cy="${hy}" r="${r.toFixed(1)}" fill="url(#heatgrad)"/>`;
    // isotherms: closed rings, so no line ends; the outer ones fade with the heat front
    for (let i = 1; i <= 6; i++) {
      const ri = r * (i / 6.5);
      const a = 0.85 * (1 - i / 7.5);
      svg += `<circle class="isotherm" data-i="${i}" cx="${hx}" cy="${hy}" r="${ri.toFixed(1)}" stroke-opacity="${a.toFixed(2)}"/>`;
    }
  }
  if (prevVC) {
    // a third of the plate's area, centred on the chip (示意)
    const w = 52 * U, d = 58 * U;
    svg += `<rect class="prevvc" id="prevvc" x="${(hx - w / 2).toFixed(1)}" y="${(hy - d / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${d.toFixed(1)}" rx="${(3 * U).toFixed(1)}"/>`;
    // "1×" inside last year's outline, "3×" out on this year's plate; written along the phone's width like its own screen
    const tx = (u, v, s, id) => `<text class="vc-x" id="${id}" x="${(u * U).toFixed(1)}" y="${(v * U).toFixed(1)}" font-size="${(10 * U).toFixed(1)}" text-anchor="middle" opacity="0">${s}</text>`;
    svg += `<g transform="matrix(0 -1 1 0 0 0)">${tx(hu, hv + 22, "1×", "vc-l1")}${tx(46, 122, "3×", "vc-l3")}</g>`;
  }
  // where the A20 Pro sits under the plate (three floors down): a dashed footprint, 示意
  const s = L.soc, [sx, sy] = pl(s.u1, s.v0);
  svg += `<g id="socghost" opacity="0"><rect class="socghost" x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${((s.v1 - s.v0) * U).toFixed(1)}" height="${((s.u1 - s.u0) * U).toFixed(1)}" rx="${(1.2 * U).toFixed(1)}"/>`;
  svg += `<g transform="matrix(0 -1 1 0 0 0)"><text class="soc-t" x="${(hu * U).toFixed(1)}" y="${((s.v0 - 2.2) * U).toFixed(1)}" font-size="${(3.2 * U).toFixed(1)}" text-anchor="middle">A20 Pro</text></g></g>`;
  svg += `<circle class="hotspot" id="hotspot" cx="${hx}" cy="${hy}" r="${(1.6 * U).toFixed(1)}"/></g>`;
  const ring = L.vc.map(([u, v]) => [X(v) + move[0], Y(u) + move[1]]);
  R.put({ piece: "vc", at: off(hu, hv), svg, shapes: [R.solid(A.extruded(ring, Z(top) + move[2] + 0.15 * U, 0.01, { name: "vc.heat" }))], move: [0, 0, 0], name: "vc.heat" });
}

export const SCENE_CSS = `
.isotherm{fill:none;stroke:var(--film-heat);stroke-width:calc(var(--px)*1.2);vector-effect:non-scaling-stroke}
.prevvc{fill:var(--anatomy-shade-0);fill-opacity:.55;stroke:var(--anatomy-hi);stroke-width:calc(var(--px)*1.8);vector-effect:non-scaling-stroke;stroke-dasharray:calc(var(--px)*8) calc(var(--px)*5)}
.vc-x{font-family:Inter,sans-serif;font-weight:600;fill:var(--anatomy-strong)}
.socghost{fill:none;stroke:var(--anatomy-hi);stroke-width:calc(var(--px)*1.6);vector-effect:non-scaling-stroke;stroke-dasharray:calc(var(--px)*6) calc(var(--px)*4)}
.soc-t{font-family:Inter,sans-serif;font-weight:500;fill:var(--anatomy-hi)}
.hotspot{fill:var(--film-heat);opacity:.85}
.lock-time{font-family:Inter,sans-serif;font-weight:250;fill:var(--anatomy-hi);letter-spacing:-.01em}
.lock-date{font-family:Sans,sans-serif;fill:var(--anatomy-mid)}
.lock-btn{fill:none;stroke:var(--anatomy-mid);stroke-width:calc(var(--px)*1.2);vector-effect:non-scaling-stroke}
.lock-bar{fill:var(--anatomy-hi)}
.field{fill:none;stroke:var(--anatomy-hi);stroke-width:calc(var(--px)*1.3);vector-effect:non-scaling-stroke;stroke-dasharray:calc(var(--px)*2) calc(var(--px)*9);stroke-linecap:round}
.iso{--film-heat:#ff6a4a}.iso[data-theme="light"]{--film-heat:#e5484d}
`;

// MagSafe field: a few loops rising from the coil's inner turns and closing on the magnet ring,
// each in a vertical plane through the centre; flow marks run along them (dash offset in the page)
export function fieldLines(P, R, { move = [0, 0, 0] } = {}) {
  const m = L.magsafe, out = [];
  for (const th of [0.35, 1.2, 2.05, 2.9, 3.75, 4.6, 5.45]) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const s = i / 40, r = 9 + (m.ring[0] + 0.6 - 9) * s, w = L.floor + 0.3 + 12 * Math.sin(Math.PI * s);
      pts.push(k.iso(W3(m.u + Math.cos(th) * r, m.v + Math.sin(th) * r, w), P));
    }
    out.push(k.pathOf(pts));
  }
  R.put({ piece: "back", at: W3(m.u, m.v, 7), svg: `<g id="field" opacity="0"><path class="field" d="${out.join("")}"/></g>`, move, shapes: [R.solid(A.cylinder(X(m.v), Y(m.u), 26 * U, Z(1.6), 11 * U, { name: "back.field" }))], name: "back.field" });
}
