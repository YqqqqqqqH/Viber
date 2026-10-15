import * as k from "../../kit/iso-kit.mjs";
import * as A from "../../kit/audit.mjs";
import { mainCamera } from "../../model/maincam.mjs";
import { writePage, READY_TAIL } from "../../model/stage.mjs";
import { U } from "../../model/units.mjs";
import { fileURLToPath } from "node:url";
const theme = process.argv.includes("--light") ? "light" : "dark";
const f = +(process.argv.find((a) => a.startsWith("--f="))?.slice(4) || 1.48);
const pts = [[-9 * U, -22 * U, 0], [9 * U, 9 * U, 0], [-9 * U, -22 * U, 30 * U], [9 * U, 9 * U, 30 * U]];
const P = k.fitProjection(pts, 1920, 1080, { pad: 120, azimuth: 58, elevation: 30 });
const R = A.recorder(P);
mainCamera(P, R, { centre: [0, 0, 0], f, open: 1 });
A.settle(R, { ...P, scale: P.scale / 4, origin: [P.origin[0] / 4, P.origin[1] / 4] }, { states: [0] });
const items = R.items.map((it) => ({ svg: it.svg, key: it.key, piece: it.piece }));
writePage(fileURLToPath(new URL("./index.html", import.meta.url)), {
  title: "maincam", theme, P, items, base: [0, 0, 1920, 1080],
  css: `.iso-solid.ring>.iso-fill,.iso-solid.ring>.iso-top{fill-rule:evenodd}.mc-blade{fill:var(--anatomy-top)}.mc-void{fill:var(--mc-void)}.iso{--mc-void:#030303}.iso[data-theme="light"]{--mc-void:#3a3a3e}`,
  corners: { tl: "Fig. 04", tr: "48MP Fusion · variable aperture", br: "ƒ/" + f },
  live: READY_TAIL,
});
