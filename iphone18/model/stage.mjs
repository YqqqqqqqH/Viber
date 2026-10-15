// Writes one film page: a full-frame anatomy plate whose camera, explode shares, subtitles and
// readout are pure functions of t (viber-studio page contract: DUR, render, EV, TEXTS, READY).
//
// items: [{ svg, at: [x,y,z] | key, bias, piece, move: [dx,dy,dz], lod: [z0, z1] }]
//   key  = depthOf(at) + bias (larger = nearer = painted later); per frame key + lift·share
//   move = world offset of the item's assembly at share 1 (the explode / lift vector)
//   lod  = zoom range over which the item fades in (zoom 1 = the base viewBox); fine texture
//          that would only be noise in the overview
// timeline (all optional): { dur, cam: [[t, cx, cy, w]], shares: { piece: [[t, v]] },
//   subs: [[t0, t1, text]], readout: [[t, text]], events: [{ t, type }] }
import * as k from "../kit/iso-kit.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function writePage(file, { title, theme = "dark", P, width = 1920, height = 1080, items, base, timeline = {}, corners = {}, css = "", live = "", extraSvg = "" }) {
  const V = [0, 0, 0];
  const vk = (p) => k.depthOf(p, P);
  const list = items.map((it, i) => {
    const key = it.key ?? vk(it.at) + (it.bias || 0);
    const mv = it.move ? k.axisVector(P, it.move) : [0, 0];
    const lift = it.move ? vk(it.move) : 0;
    return { ...it, key, mv, lift, i };
  });
  // initial order: rest keys
  const order = [...list].sort((a, b) => a.key - b.key || a.i - b.i);
  const pieces = [...new Set(list.map((it) => it.piece || "static"))];
  const body = order.map((it) => `<g class="it" data-i="${it.i}"${it.lod ? ` style="opacity:0"` : ""}>${it.svg}</g>`).join("\n");
  const DATA = {
    K: list.map((it) => +it.key.toFixed(3)),
    L: list.map((it) => +it.lift.toFixed(3)),
    M: list.map((it) => [+it.mv[0].toFixed(3), +it.mv[1].toFixed(3)]),
    PI: list.map((it) => pieces.indexOf(it.piece || "static")),
    LOD: list.map((it) => it.lod || null),
    pieces,
    base,
    tl: { dur: 6, cam: [[0, base[0] + base[2] / 2, base[1] + base[3] / 2, base[2]]], shares: {}, subs: [], readout: [], events: [], ...timeline },
    corners,
  };
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
@font-face{font-family:Sans;src:url(fonts/NotoSansSC-500.woff)}
@font-face{font-family:Inter;src:url(fonts/Inter-var.woff);font-weight:100 900}
${k.ISO_CSS}
html,body{margin:0;height:100%;overflow:hidden;background:var(--anatomy-page)}
.iso{--anatomy-weight:calc(var(--px) * 1.4)}
/* video: H.264 eats dark hairlines, so the dark theme's low tones are lifted a step */
.iso:not([data-theme="light"]){--anatomy-hi:#dcdcdc;--anatomy-mid:#7c7c7c;--anatomy-lo:#4e4e4e;--anatomy-faint:#363636;--anatomy-top:#1f1f1f;--anatomy-face:#1d1d1d;--anatomy-shade-0:#101010;--anatomy-shade-1:#141414;--anatomy-shade-2:#181818;--anatomy-shade-3:#1c1c1c}
.iso-solid.ring>.iso-fill,.iso-solid.ring>.iso-top{fill-rule:evenodd}
.mc-blade{fill:var(--anatomy-top)}.port{fill:var(--film-port)}.iso{--film-port:#060606;--film-ir:#ff4433}.iso[data-theme="light"]{--film-ir:#b3261e}.iso[data-theme="light"]{--film-port:#cfcfcc}.vc-win{fill:var(--anatomy-shade-0)}.sheet{fill:var(--film-sheet);fill-rule:evenodd}.island{fill:var(--film-void)}.iso{--film-sheet:#0c0c0c}.iso[data-theme="light"]{--film-sheet:#e4e4e1}.cc-win{fill:var(--anatomy-shade-1)}.mc-void{fill:var(--film-void)}
.iso{--film-void:#040404}.iso[data-theme="light"]{--film-void:#3a3a3e}
#stage{position:fixed;inset:0;background:var(--anatomy-card);--anatomy-paper:var(--anatomy-card)}
#fig.iso-svg{position:absolute;inset:0;width:100%;height:100%}
.card{position:absolute;inset:calc(var(--px)*34);box-shadow:0 0 0 calc(var(--px)*1) var(--anatomy-faint);pointer-events:none}
.corner{position:absolute;font-family:Inter,sans-serif;font-size:calc(var(--px)*17);letter-spacing:.12em;text-transform:uppercase;color:var(--anatomy-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.corner.tl{top:calc(var(--px)*22);left:calc(var(--px)*26);color:var(--anatomy-text)}
.corner.tr{top:calc(var(--px)*22);right:calc(var(--px)*26)}
.corner.bl{bottom:calc(var(--px)*22);left:calc(var(--px)*26)}
.corner.br{bottom:calc(var(--px)*22);right:calc(var(--px)*26);color:var(--anatomy-text);letter-spacing:.06em;text-transform:none}
#sub{position:absolute;left:0;right:0;bottom:calc(var(--px)*92);text-align:center;font-family:Sans,sans-serif;font-size:calc(var(--px)*44);line-height:1.3;color:var(--anatomy-strong);letter-spacing:.04em}
#sub span{display:inline-block;padding:calc(var(--px)*6) calc(var(--px)*22);border-radius:calc(var(--px)*6);background:color-mix(in srgb,var(--anatomy-card) 78%,transparent)}
${css}
</style>
</head>
<body class="iso" data-theme="${theme}">
<div id="stage">
<svg id="fig" class="iso-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${base.join(" ")}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(title)}">
<g id="world">
${body}
</g>
${extraSvg}
</svg>
<div class="card">
<div class="corner tl" id="c-tl">${esc(corners.tl || "")}</div>
<div class="corner tr" id="c-tr">${esc(corners.tr || "")}</div>
<div class="corner bl" id="c-bl">${esc(corners.bl || "")}</div>
<div class="corner br" id="c-br">${esc(corners.br || "")}</div>
</div>
<div id="sub"></div>
</div>
<script type="module">
const D = ${JSON.stringify(DATA)};
${LIVE}
${live}
</script>
</body>
</html>
`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  return { bytes: html.length, items: list.length };
}

// The live part, shared by every page. Pure in t.
const LIVE = String.raw`
const q = new URLSearchParams(location.search);
if (q.get('theme')) document.body.dataset.theme = q.get('theme');
const W = innerWidth, H = innerHeight, S = W / 1920;
document.documentElement.style.setProperty('--px', S + 'px');
const svg = document.getElementById('fig'), world = document.getElementById('world');
const nodes = [...world.children]; const byI = []; nodes.forEach((n) => (byI[+n.dataset.i] = n));
const N = byI.length;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// monotone cubic (Fritsch–Carlson) through [[t, v]]: C1, never overshoots, velocity-continuous at keys
function mono(keys) {
  const n = keys.length; if (n === 1) return () => keys[0][1];
  const x = keys.map((p) => p[0]), y = keys.map((p) => p[1]);
  const d = []; for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (3 * (x[i + 1] - x[i - 1])) / ((2 * x[i + 1] - x[i] - x[i - 1]) / d[i - 1] + (x[i + 1] - 2 * x[i] + x[i - 1]) / d[i]);
  return (t) => {
    if (t <= x[0]) return y[0]; if (t >= x[n - 1]) return y[n - 1];
    let i = 0; while (t > x[i + 1]) i++;
    const h = x[i + 1] - x[i], s = (t - x[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}
const tl = D.tl;
const camX = mono(tl.cam.map((c) => [c[0], c[1]])), camY = mono(tl.cam.map((c) => [c[0], c[2]]));
const camW = mono(tl.cam.map((c) => [c[0], Math.log(c[3])]));
const shareF = D.pieces.map((p) => (tl.shares[p] ? mono(tl.shares[p]) : () => 0));
const aspect = W / H;
window.SHARE = new Array(D.pieces.length).fill(0);
window.CAM = { cx: 0, cy: 0, w: 1, zoom: 1 };
let lastOrder = '';
function place(t) {
  for (let p = 0; p < D.pieces.length; p++) SHARE[p] = shareF[p](t);
  const keyed = [];
  for (let i = 0; i < N; i++) {
    const s = SHARE[D.PI[i]], n = byI[i];
    if (s) n.setAttribute('transform', 'translate(' + (D.M[i][0] * s).toFixed(2) + ' ' + (D.M[i][1] * s).toFixed(2) + ')');
    else n.removeAttribute('transform');
    keyed.push([D.K[i] + D.L[i] * s, i]);
  }
  keyed.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const sig = keyed.map((k) => k[1]).join(',');
  if (sig !== lastOrder) { const f = document.createDocumentFragment(); for (const [, i] of keyed) f.appendChild(byI[i]); world.appendChild(f); lastOrder = sig; }
}
function camera(t) {
  const w = Math.exp(camW(t)), h = w / aspect, cx = camX(t), cy = camY(t);
  svg.setAttribute('viewBox', (cx - w / 2).toFixed(2) + ' ' + (cy - h / 2).toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2));
  CAM.cx = cx; CAM.cy = cy; CAM.w = w; CAM.zoom = D.base[2] / w;
  for (let i = 0; i < N; i++) if (D.LOD[i]) byI[i].style.opacity = sstep(D.LOD[i][0], D.LOD[i][1], CAM.zoom).toFixed(3);
}
const subEl = document.getElementById('sub');
function subtitle(t) {
  const s = tl.subs.find((x) => t >= x[0] && t < x[1]);
  if (!s) { subEl.innerHTML = ''; return; }
  const a = Math.min(sstep(s[0], s[0] + 0.25, t), 1 - sstep(s[1] - 0.25, s[1], t));
  subEl.innerHTML = '<span>' + s[2] + '</span>'; subEl.style.opacity = a.toFixed(3);
}
const brEl = document.getElementById('c-br');
function readout(t) { let r = null; for (const x of tl.readout) if (t >= x[0]) r = x[1]; if (r !== null) brEl.textContent = r; }
window.DUR = tl.dur;
window.EV = tl.events;
window.TEXTS = (t) => {
  const s = tl.subs.find((x) => t >= x[0] && t < x[1]); if (!s) return [];
  subtitle(t); const b = subEl.firstChild.getBoundingClientRect();
  return [{ id: 'sub' + tl.subs.indexOf(s), text: s[2], x0: b.left, y0: b.top, x1: b.right, y1: b.bottom }];
};
window.HOOKS = [];
window.render = (t) => { place(t); camera(t); subtitle(t); readout(t); for (const h of HOOKS) h(t); };
`;

export const READY_TAIL = String.raw`
await document.fonts.load('44px Sans'); await document.fonts.load('17px Inter'); await document.fonts.ready;
window.render(+(q.get('t') || 0));
window.READY = true;
`;
