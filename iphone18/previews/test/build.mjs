import * as k from "../../kit/iso-kit.mjs";
import * as A from "../../kit/audit.mjs";
import { phone } from "../../model/phone.mjs";
import { writePage, READY_TAIL } from "../../model/stage.mjs";
import { W3, Z } from "../../model/units.mjs";
import { fileURLToPath } from "node:url";
const theme = process.argv.includes("--light") ? "light" : "dark";
const P0 = { origin: [0, 0], scale: 1, azimuth: 58, elevation: 30 };
const pts = [W3(0,0,-2), W3(78,0,-2), W3(0,163.4,-2), W3(78,163.4,-2), W3(0,0,40), W3(78,163.4,40)];
const P = k.fitProjection(pts, 1920, 1080, { pad: 160, azimuth: 58, elevation: 30 });
const R = A.recorder(P);
const t0 = Date.now();
phone(P, R, { moves: { display: [0, 0, Z(40)], front: [0,0,Z(20)] } });
const states = [0, 1];
A.settle(R, { ...P, scale: P.scale / 3, origin: [P.origin[0] / 3, P.origin[1] / 3] }, { states });
console.log("items", R.items.length, "settle ms", Date.now() - t0);
const items = R.items.map((it) => ({ svg: it.svg, key: it.key, piece: it.piece, move: it.move, lod: it.lod }));
const r = writePage(fileURLToPath(new URL("./index.html", import.meta.url)), {
  title: "test", theme, P, items, base: [0, 0, 1920, 1080],
  timeline: { dur: 2, shares: { display: [[0, 1]], front: [[0, 1]] }, subs: [[0, 2, "测试：iPhone 18 Pro Max 内部"]] },
  corners: { tl: "Fig. 01", tr: "iPhone 18 Pro Max · interior", bl: "示意 · 尺寸按 mm", br: "5567 mAh · 21.751 Wh" },
  live: READY_TAIL,
});
console.log(r);
