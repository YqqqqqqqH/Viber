// Plan C key frame: the shutter signal. Camera Control is pressed; a pulse runs along its flex up
// the inside of the right wall to the board and on toward the camera; the main camera is lifted
// out above its bay and opened along its axis, its six blades closing toward ƒ/2.8 (lit).
import * as k from "../../kit/iso-kit.mjs";
import * as A from "../../kit/audit.mjs";
import { phone, L } from "../../model/phone.mjs";
import { mainCamera, openingOf } from "../../model/maincam.mjs";
import { writePage, READY_TAIL } from "../../model/stage.mjs";
import { U, W3, X, Y, Z } from "../../model/units.mjs";
import { fileURLToPath } from "node:url";
const theme = process.argv.includes("--light") ? "light" : "dark";
const AZ = 58, EL = 32, F = 2.8;
// frame the top two thirds of the phone, Camera Control at the right edge of the frame
const ext = [W3(52.5, 21, 15), W3(74.5, 21, 15), W3(52.5, 46.5, 15), W3(74.5, 46.5, 15), W3(63.5, 33.8, 41.5), W3(63.5, 22, 41.5), W3(63.5, 46, 41.5)];
const P = k.fitProjection(ext, 1920, 1080, { pad: 40, azimuth: AZ, elevation: EL });
const R = A.recorder(P);
phone(P, R, { skip: ["display", "vapor", "battery"], hide: ["camera.main", "camera.main.cap"], lod: false });
// the main camera, out of its bay and opened up above it
const C = L.cam.main;
const cu = (C.u0 + C.u1) / 2, cv = (C.v0 + C.v1) / 2;
mainCamera(P, R, { centre: [X(cv), Y(cu), Z(16)], f: F, open: 1, gaps: [0, 4.2, 5.6, 3.0, 3.4, 3.8], lit: "iris" });
// the signal arrives: a lit trail along the camera's flex tail, from its connector to the module,
// with a glowing pulse at the head (the connector end sits over the board's camera cowling)
const zf = Z(16) + (1.1 + 1.0 + 4.6 + 0.5 + 1.3 + 4.2 + 5.6 + 3.0 + 3.4 + 3.8 + 1.0 + 0.15) * U;
const cx = X(cv), cy = Y(cu);
const tail = [[cx, cy - 19.6 * U, zf], [cx, cy - 8.8 * U, zf]];
const head = [cx, cy - 11.5 * U, zf];
const [hx, hy] = k.iso(head, P);
const glow = `<circle class="pulse-glow" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(9 * P.scale * U * 0.3).toFixed(1)}"/><circle class="pulse-core" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(0.55 * U * P.scale).toFixed(1)}"/>`;
R.put({ piece: "signal", at: head, key: 1e7, svg: k.lineSvg(k.pathOf(tail.map((p) => k.iso(p, P))), { tone: "lit" }) + glow, shapes: [] });
const sp = { ...P, scale: P.scale / 3, origin: [P.origin[0] / 3, P.origin[1] / 3] };
A.settle(R, sp, { states: [0] });
console.log("items", R.items.length);
const items = R.items.map((it) => ({ svg: it.svg, key: it.key, piece: it.piece, move: it.move }));
writePage(fileURLToPath(new URL("./index.html", import.meta.url)), {
  title: "plan C · 按一下快门", theme, P, items, base: [0, 0, 1920, 1080],
  timeline: { dur: 2, subs: [[0, 2, "六片叶片收拢，开口从 4.6 毫米缩到 " + openingOf(F).toFixed(1) + " 毫米"]] },
  css: `.pulse-glow{fill:url(#pg)}.pulse-core{fill:var(--anatomy-lit)}`,
  extraSvg: `<defs><radialGradient id="pg"><stop offset="0" stop-color="var(--anatomy-lit)" stop-opacity=".55"/><stop offset="1" stop-color="var(--anatomy-lit)" stop-opacity="0"/></radialGradient></defs>`,
  corners: { tl: "Fig. 06", tr: "iPhone 18 Pro Max · 一张照片的路", bl: "示意 · 主摄已取出", br: "ƒ/" + F + " · 开口 " + openingOf(F).toFixed(2) + " mm" },
  live: READY_TAIL,
});
