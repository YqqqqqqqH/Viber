/* 《伯克森悖论》道具：骰子、人物卡（剪影 + 两颗骰子）、襁褓、卷帘门、门槛牌子上的小图标。
 * 全片的颜色：金 = 第一颗骰子，冰蓝 = 第二颗骰子，玫红 = 门槛和门造出来的东西，白 = 人和东西，暗灰 = 门外。 */
(function () {
'use strict';
const { clamp, lerp, seg, ss, E, hash, rgba, mix } = VK;

const C = {
  gold: '#E2BE70', goldPip: '#2A1B05', goldLab: '#F8D893',
  ice: '#62CDE0', icePip: '#05262E', iceLab: '#7FE6F6',
  rose: '#F0557F', roseLo: '#B83A5E',
  grey: '#39424D', greyPip: '#151A20',
  ink: '#F8F9F8', label: '#879399', dim: '#5E6B77', line: '#8FA3B5',
  cardTop: '#16263C', cardBot: '#0B1424', cardEdge: '#7F98B0',
  body: '#8698AB', hair: '#46546A',
};
const PIPS = { 1: [[0, 0]], 2: [[-.5, -.5], [.5, .5]], 3: [[-.5, -.5], [0, 0], [.5, .5]], 4: [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]], 5: [[-.5, -.5], [.5, -.5], [0, 0], [-.5, .5], [.5, .5]], 6: [[-.5, -.55], [-.5, 0], [-.5, .55], [.5, -.55], [.5, 0], [.5, .55]] };

/* 一颗骰子的正面。s = 半边长；o.tone 'gold' | 'ice'；o.dim 0..1 褪成灰；o.glint 0..1 闪一下；o.rot 转角 */
function die(fr, cx, cy, s, v, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= .004 || s < 1) return;
  const x = fr.x, gold = o.tone !== 'ice', dim = o.dim || 0, gl = o.glint || 0;
  const face = mix(gold ? C.gold : C.ice, C.grey, dim), pip = mix(gold ? C.goldPip : C.icePip, C.greyPip, dim);
  x.save(); x.globalAlpha *= clamp(a); x.translate(cx, cy); if (o.rot) x.rotate(o.rot);
  const g = x.createLinearGradient(0, -s, 0, s); g.addColorStop(0, mix(face, '#FFFFFF', .28 + .5 * gl)); g.addColorStop(.55, mix(face, '#FFFFFF', .5 * gl)); g.addColorStop(1, mix(face, '#000000', .32));
  x.fillStyle = g; x.beginPath(); x.roundRect(-s, -s, s * 2, s * 2, s * .3); x.fill();
  x.lineWidth = Math.max(1, s * .07); x.strokeStyle = rgba(mix(face, '#000000', .45), .9); x.stroke();
  x.fillStyle = pip; const pr = (v === 1 ? .2 : .14) * s;
  if (v >= 1 && v <= 6) for (const [pu, pv] of PIPS[v]) { x.beginPath(); x.arc(pu * s * 1.08, pv * s * 1.08, pr, 0, 6.2832); x.fill(); }
  x.restore();
}

/* 人物头像：扁平插画风的半身像（肤色、发型、衣服、领口），不画五官。style 0..5：
 *  0 短发男 · 衬衫领   1 长直发女 · V 领   2 丸子头女 · 高领   3 波波头女 · 圆领   4 侧分男 · 眼镜 · 卫衣   5 大波浪女 · V 领
 * 衣服的颜色都是灰调的蓝、紫、绿、棕，避开全片有含义的金、冰蓝、玫红。
 * s ≈ 半身像的总高度；o.dim 0..1 褪成灰（被筛掉）；o.shade 0..1 压暗（夜里巷子里的人） */
const AV = [
  { skin: '#E6C3A3', hair: '#2E2622', cloth: '#4F6A8F', collar: 'shirt' },
  { skin: '#EBCBAE', hair: '#3A2A22', cloth: '#7B5C82', collar: 'vneck' },
  { skin: '#DDB291', hair: '#2A2321', cloth: '#3F7468', collar: 'turtle' },
  { skin: '#E8C6A8', hair: '#5A3A2A', cloth: '#8C6A52', collar: 'round' },
  { skin: '#D6A887', hair: '#262322', cloth: '#5D6B80', collar: 'hood' },
  { skin: '#ECCDB2', hair: '#4A3328', cloth: '#6A5A8C', collar: 'vneck' },
];
function avatar(fr, cx, cy, s, style, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= .004) return;
  const P = AV[((style % 6) + 6) % 6], dim = o.dim || 0, sh = o.shade || 0;
  const col = c => mix(mix(c, '#0E1622', sh), '#3A424C', dim * .85);
  const skin = col(P.skin), skinD = col(mix(P.skin, '#7A4E36', .28)), hair = col(P.hair), hairL = col(mix(P.hair, '#C9B8A8', .07));
  const cloth = col(P.cloth), clothL = col(mix(P.cloth, '#FFFFFF', .2)), clothD = col(mix(P.cloth, '#000000', .28));
  const x = fr.x, u = s, hx = cx, hy = cy - .1 * u, rx = .158 * u, ry = .19 * u, sy = cy + .16 * u;
  const fill = (c, fn) => { x.fillStyle = c; x.beginPath(); fn(); x.fill(); };
  x.save(); x.globalAlpha *= clamp(a);
  /* 身子：圆润的肩，上浅下深 */
  const g = x.createLinearGradient(0, sy, 0, cy + .56 * u); g.addColorStop(0, clothL); g.addColorStop(.35, cloth); g.addColorStop(1, clothD);
  fill(g, () => { x.moveTo(cx - .44 * u, cy + .58 * u); x.bezierCurveTo(cx - .44 * u, cy + .32 * u, cx - .34 * u, sy + .04 * u, cx - .12 * u, sy); x.lineTo(cx + .12 * u, sy); x.bezierCurveTo(cx + .34 * u, sy + .04 * u, cx + .44 * u, cy + .32 * u, cx + .44 * u, cy + .58 * u); x.closePath(); });
  /* 披在肩上的长发（在脖子后面） */
  if (style === 1 || style === 5) fill(hair, () => {
    const top = hy - ry * .5, bot = cy + .42 * u, L = hx - rx * 1.32, R = hx + rx * 1.32;
    x.moveTo(L, top + rx); x.quadraticCurveTo(L, top, L + rx, top); x.lineTo(R - rx, top); x.quadraticCurveTo(R, top, R, top + rx); x.lineTo(R + .01 * u, bot);
    if (style === 5) { const n = 5, w = (R - L) / n; for (let i = n; i > 0; i--) x.quadraticCurveTo(L + (i - .5) * w, bot + .06 * u, L + (i - 1) * w, bot); }
    else { x.quadraticCurveTo(hx, bot + .05 * u, L - .01 * u, bot); }
    x.closePath();
  });
  if (style === 3) fill(hair, () => { x.roundRect(hx - rx * 1.3, hy - ry * 1.1, rx * 2.6, ry * 1.95, [rx * 1.2, rx * 1.2, rx * .35, rx * .35]); });   // 波波头的外轮廓
  /* 脖子 */
  fill(skinD, () => x.roundRect(hx - .062 * u, hy + ry * .55, .124 * u, sy + .04 * u - (hy + ry * .55), .03 * u));
  /* 领口 */
  if (P.collar === 'shirt') {
    fill(skinD, () => { x.moveTo(hx - .07 * u, sy - .01 * u); x.lineTo(hx + .07 * u, sy - .01 * u); x.lineTo(hx, sy + .1 * u); x.closePath(); });
    fill(col('#E9EDF2'), () => { x.moveTo(hx - .085 * u, sy - .03 * u); x.lineTo(hx - .004 * u, sy + .1 * u); x.lineTo(hx - .15 * u, sy + .07 * u); x.closePath(); x.moveTo(hx + .085 * u, sy - .03 * u); x.lineTo(hx + .004 * u, sy + .1 * u); x.lineTo(hx + .15 * u, sy + .07 * u); x.closePath(); });
  } else if (P.collar === 'vneck') {
    fill(skinD, () => { x.moveTo(hx - .085 * u, sy - .01 * u); x.lineTo(hx + .085 * u, sy - .01 * u); x.lineTo(hx, sy + .15 * u); x.closePath(); });
    x.strokeStyle = clothL; x.lineWidth = Math.max(1, .012 * u); x.beginPath(); x.moveTo(hx - .095 * u, sy - .01 * u); x.lineTo(hx, sy + .16 * u); x.lineTo(hx + .095 * u, sy - .01 * u); x.stroke();
  } else if (P.collar === 'turtle') {
    fill(clothL, () => x.roundRect(hx - .085 * u, hy + ry * .95, .17 * u, sy + .03 * u - (hy + ry * .95), .035 * u));
    x.strokeStyle = clothD; x.lineWidth = Math.max(1, .008 * u); for (let i = 1; i < 3; i++) { const yy = hy + ry * .95 + i * .028 * u; x.beginPath(); x.moveTo(hx - .08 * u, yy); x.lineTo(hx + .08 * u, yy); x.stroke(); }
  } else if (P.collar === 'round') {
    fill(skinD, () => x.ellipse(hx, sy - .005 * u, .085 * u, .045 * u, 0, 0, Math.PI));
  } else if (P.collar === 'hood') {
    x.strokeStyle = clothD; x.lineWidth = .05 * u; x.beginPath(); x.ellipse(hx, sy + .005 * u, .15 * u, .06 * u, 0, -.1, Math.PI + .1); x.stroke();
    x.strokeStyle = clothL; x.lineWidth = Math.max(1, .01 * u); for (const e of [-1, 1]) { x.beginPath(); x.moveTo(hx + e * .04 * u, sy + .03 * u); x.lineTo(hx + e * .045 * u, sy + .14 * u); x.stroke(); }
  }
  /* 头发的底（脸后面那一圈），然后是耳朵和脸 */
  if (style !== 3) fill(hair, () => x.ellipse(hx, hy - ry * .1, rx * 1.12, ry * 1.08, 0, 0, 6.2832));
  fill(skinD, () => { x.ellipse(hx - rx * .93, hy + ry * .12, rx * .16, ry * .2, 0, 0, 6.2832); x.ellipse(hx + rx * .93, hy + ry * .12, rx * .16, ry * .2, 0, 0, 6.2832); });
  fill(skin, () => x.ellipse(hx, hy + ry * .1, rx * .93, ry * .92, 0, 0, 6.2832));
  /* 刘海和发顶 */
  if (style === 0) {
    fill(hair, () => { x.moveTo(hx - rx * .98, hy - ry * .12); x.quadraticCurveTo(hx - rx * .25, hy - ry * .58, hx + rx * .98, hy - ry * .42); x.lineTo(hx + rx * 1.05, hy - ry * .95); x.lineTo(hx - rx * 1.05, hy - ry * .95); x.closePath(); x.ellipse(hx - rx * .1, hy - ry * .92, rx * .95, ry * .4, -.08, 0, 6.2832); });
    fill(hairL, () => x.ellipse(hx - rx * .35, hy - ry * 1.05, rx * .4, ry * .12, -.3, 0, 6.2832));
  } else if (style === 4) {
    fill(hair, () => { x.moveTo(hx + rx * .98, hy - ry * .2); x.quadraticCurveTo(hx + rx * .3, hy - ry * .5, hx - rx * .35, hy - ry * .55); x.quadraticCurveTo(hx - rx * .75, hy - ry * .52, hx - rx * .98, hy - ry * .3); x.lineTo(hx - rx * 1.05, hy - ry * .95); x.lineTo(hx + rx * 1.05, hy - ry * .95); x.closePath(); x.ellipse(hx + rx * .05, hy - ry * .9, rx * 1.0, ry * .32, 0, 0, 6.2832); });
    x.strokeStyle = col('#1C1D22'); x.lineWidth = Math.max(1, .014 * u);                          // 眼镜
    x.beginPath(); x.roundRect(hx - rx * .78, hy - ry * .02, rx * .62, ry * .3, rx * .12); x.roundRect(hx + rx * .16, hy - ry * .02, rx * .62, ry * .3, rx * .12); x.moveTo(hx - rx * .16, hy + ry * .08); x.lineTo(hx + rx * .16, hy + ry * .08); x.stroke();
  } else if (style === 1 || style === 5) {
    fill(hair, () => {                                                 // 中分的两片门帘刘海，一直垂到脸侧
      x.moveTo(hx, hy - ry * .78); x.quadraticCurveTo(hx - rx * .7, hy - ry * .62, hx - rx * .96, hy + ry * .55); x.lineTo(hx - rx * 1.12, hy + ry * .55); x.lineTo(hx - rx * 1.12, hy - ry * .7); x.quadraticCurveTo(hx - rx * .6, hy - ry * 1.15, hx, hy - ry * 1.12); x.closePath();
      x.moveTo(hx, hy - ry * .78); x.quadraticCurveTo(hx + rx * .7, hy - ry * .62, hx + rx * .96, hy + ry * .55); x.lineTo(hx + rx * 1.12, hy + ry * .55); x.lineTo(hx + rx * 1.12, hy - ry * .7); x.quadraticCurveTo(hx + rx * .6, hy - ry * 1.15, hx, hy - ry * 1.12); x.closePath();
    });
    fill(hairL, () => x.ellipse(hx - rx * .45, hy - ry * .95, rx * .35, ry * .1, -.4, 0, 6.2832));
  } else if (style === 2) {
    fill(hair, () => { x.moveTo(hx - rx * .97, hy - ry * .05); x.quadraticCurveTo(hx - rx * .6, hy - ry * .62, hx, hy - ry * .68); x.quadraticCurveTo(hx + rx * .6, hy - ry * .62, hx + rx * .97, hy - ry * .05); x.lineTo(hx + rx * 1.05, hy - ry * 1); x.lineTo(hx - rx * 1.05, hy - ry * 1); x.closePath(); x.ellipse(hx, hy - ry * .95, rx * 1.02, ry * .3, 0, 0, 6.2832); });
    fill(hair, () => x.arc(hx + rx * .05, hy - ry * 1.38, rx * .5, 0, 6.2832));      // 丸子
    fill(hairL, () => x.ellipse(hx - rx * .12, hy - ry * 1.5, rx * .22, ry * .08, -.4, 0, 6.2832));
  } else if (style === 3) {
    fill(hair, () => { x.moveTo(hx - rx * .98, hy - ry * .3); x.lineTo(hx - rx * .98, hy - ry * .95); x.quadraticCurveTo(hx, hy - ry * 1.35, hx + rx * .98, hy - ry * .95); x.lineTo(hx + rx * .98, hy - ry * .3); x.quadraticCurveTo(hx, hy - ry * .4, hx - rx * .98, hy - ry * .3); x.closePath(); });   // 齐刘海
    fill(hairL, () => x.ellipse(hx - rx * .4, hy - ry * .9, rx * .32, ry * .09, -.2, 0, 6.2832));
  }
  x.restore();
}
const bust = (fr, cx, cy, s, style, o = {}) => avatar(fr, cx, cy, s, style, o);
/* 每个人的发型：开头那六张约会卡各不相同，其余的按序号散开；表里和开头用同一个函数，同一个人始终是同一个样子 */
const STYLE_FIX = { '2,6': 3, '3,5': 0, '4,5': 1, '4,4': 4, '5,3': 5, '6,2': 2 };
const styleOf = (c, r) => STYLE_FIX[c + ',' + r] != null ? STYLE_FIX[c + ',' + r] : Math.floor(VK.hash(c * 7.13 + r * 3.31) * 6);

/* 襁褓里的婴儿，正面：带一圈绒边的兜帽、圆脸（闭着眼、两团腮红、一点点笑）、裹成蛋形的小被子，胸前两片被角交叠，被子上几颗小星星。
 * s = 总高度；o.rot 转角（躺着用 -π/2）；o.wrap / o.face 颜色（暗下去时传灰色）；o.dim 0..1 腮红和星星跟着淡掉 */
function baby(fr, cx, cy, s, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= .004) return;
  const x = fr.x, wrap = o.wrap || '#8396AE', face = o.face || '#E2C2A6', wrapL = mix(wrap, '#FFFFFF', .22), wrapD = mix(wrap, '#000000', .35), edge = mix(wrap, '#000000', .5), lit = 1 - (o.dim || 0);
  x.save(); x.globalAlpha *= clamp(a); x.translate(cx, cy); if (o.rot) x.rotate(o.rot);
  x.lineWidth = Math.max(1, s * .016); x.strokeStyle = rgba(edge, .85);
  const g = x.createLinearGradient(-s * .3, -s * .1, s * .3, s * .5); g.addColorStop(0, wrapL); g.addColorStop(1, wrapD);
  x.fillStyle = g; x.beginPath();                                                           // 被子
  x.moveTo(-s * .31, -s * .12); x.bezierCurveTo(-s * .36, s * .22, -s * .17, s * .5, 0, s * .5); x.bezierCurveTo(s * .17, s * .5, s * .36, s * .22, s * .31, -s * .12); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = mix(wrap, '#FFFFFF', .1); x.beginPath(); x.moveTo(-s * .3, -s * .06); x.quadraticCurveTo(-s * .05, s * .12, s * .16, s * .38); x.quadraticCurveTo(-s * .12, s * .3, -s * .27, s * .16); x.closePath(); x.fill(); x.stroke();   // 左边的被角
  x.fillStyle = wrapL; x.beginPath(); x.moveTo(s * .3, -s * .06); x.quadraticCurveTo(s * .08, s * .1, -s * .1, s * .3); x.quadraticCurveTo(s * .14, s * .26, s * .27, s * .14); x.closePath(); x.fill(); x.stroke();     // 右边的被角
  x.fillStyle = rgba('#FFFFFF', .35 * lit); for (const [px, py] of [[-.15, .3], [.12, .42], [.2, .2], [-.05, .44]]) { x.beginPath(); x.arc(px * s, py * s, s * .018, 0, 6.2832); x.fill(); }   // 小星星
  x.fillStyle = mix(wrap, '#FFFFFF', .08); x.beginPath(); x.arc(0, -s * .24, s * .27, 0, 6.2832); x.fill(); x.stroke();                // 兜帽
  x.fillStyle = mix(wrap, '#FFFFFF', .45); x.beginPath(); x.arc(0, -s * .22, s * .205, 0, 6.2832); x.fill();                            // 兜帽的绒边
  x.fillStyle = face; x.beginPath(); x.arc(0, -s * .215, s * .165, 0, 6.2832); x.fill();                                                 // 脸
  x.fillStyle = rgba('#E58C8C', .35 * lit); for (const e of [-1, 1]) { x.beginPath(); x.ellipse(e * s * .085, -s * .175, s * .032, s * .022, 0, 0, 6.2832); x.fill(); }   // 腮红
  x.strokeStyle = rgba(mix(face, '#000000', .62), .9); x.lineWidth = Math.max(1, s * .014);
  for (const e of [-1, 1]) { x.beginPath(); x.arc(e * s * .06, -s * .235, s * .032, .15 * Math.PI, .85 * Math.PI); x.stroke(); }       // 闭着的眼睛
  x.beginPath(); x.arc(0, -s * .175, s * .022, .2 * Math.PI, .8 * Math.PI); x.stroke();                                                // 嘴
  x.restore();
}

/* 拉下来的卷帘门：门外那些关了的店 */
function shutter(fr, x0, y0, w, h, o = {}) {
  const a = o.a == null ? 1 : o.a; if (a <= .004) return;
  fr.g({ a }, () => {
    fr.rect(x0, y0, w, h * .22, { fill: '#2B3440', r: 4 });                                     // 门头
    fr.rect(x0 + w * .08, y0 + h * .26, w * .84, h * .7, { fill: '#232B35', color: '#4A5664', w: 1.2 });
    for (let i = 1; i < 8; i++) { const yy = y0 + h * .26 + h * .7 * i / 8; fr.line(x0 + w * .08, yy, x0 + w * .92, yy, { w: 1, color: '#4A5664', a: .9, cap: 'butt' }); }
    fr.rect(x0 + w * .44, y0 + h * .88, w * .12, h * .04, { fill: '#5A6573' });                // 把手
  });
}

/* 人物卡。p: { gold, ice, style, kind 'person' | 'baby', babyK 0..1, big, a, dim 0..1, glint, shut 0..1 } */
function card(fr, x0, y0, w, h, p) {
  const a = p.a == null ? 1 : p.a; if (a <= .004) return;
  const dim = p.dim || 0, big = !!p.big, bk = p.babyK || 0, sh = p.shut || 0;
  fr.g({ a }, () => {
    const x = fr.x;
    if (sh < 1) fr.g({ a: 1 - sh }, () => {
      x.save(); const g = x.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, mix(C.cardTop, '#0C1118', dim)); g.addColorStop(1, mix(C.cardBot, '#080B10', dim));
      x.fillStyle = g; x.beginPath(); x.roundRect(x0, y0, w, h, big ? 18 : 10); x.fill();
      x.lineWidth = big ? 1.6 : 1.2; x.strokeStyle = rgba(mix(C.cardEdge, '#3A4450', dim), big ? .6 : .5); x.stroke(); x.restore();
      if (big) {
        const px = x0 + w / 2, py = y0 + 108;
        fr.circle(px, py - 4, 74, { fill: fr.rgrad(px, py - 4, 0, 80, [[0, '#2A4260', .7], [1, '#2A4260', 0]]) });
        x.save(); x.beginPath(); x.roundRect(x0 + 1, y0 + 1, w - 2, 178, [17, 17, 0, 0]); x.clip(); avatar(fr, px, py + 14, 158, p.style, { dim }); x.restore();
        fr.line(x0 + 1, y0 + 180, x0 + w - 1, y0 + 180, { w: 1, color: C.cardEdge, a: .35, cap: 'butt' });
        fr.path('M0,-5 C-3,-11 -12,-10 -12,-3 C-12,3 -4,8 0,12 C4,8 12,3 12,-3 C12,-10 3,-11 0,-5 Z', { at: [x0 + w - 28, y0 + 26], s: .9, color: '#C9D3DC', w: 1.6, a: .55 });
        fr.text('颜值', x0 + w / 2 - 44, y0 + 206, { font: 'serifr', size: 19, track: 3, color: C.goldLab, a: .8 * (1 - dim) });
        fr.text('人品', x0 + w / 2 + 44, y0 + 206, { font: 'serifr', size: 19, track: 3, color: C.iceLab, a: .8 * (1 - dim) });
        die(fr, x0 + w / 2 - 44, y0 + 248, 27, p.gold, { tone: 'gold', dim, glint: p.glint, a: p.dieA == null ? 1 : p.dieA });
        die(fr, x0 + w / 2 + 44, y0 + 248, 27, p.ice, { tone: 'ice', dim, glint: p.glintIce == null ? p.glint : p.glintIce, a: p.dieA == null ? 1 : p.dieA });
      } else {
        const px = x0 + 31, py = y0 + h / 2 + 2;
        x.save(); x.beginPath(); x.roundRect(x0 + 1, y0 + 1, w - 2, h - 2, 9); x.clip();             // 剪影一直画到卡片下沿，被卡片裁住
        if (bk < 1) avatar(fr, px, py + 9, 70, p.style, { dim, a: 1 - bk });
        x.restore();
        if (bk > 0) baby(fr, px, py - 4, 64, { a: bk, dim, wrap: mix('#8396AE', '#36404B', dim), face: mix('#E2C2A6', '#3D3A37', dim) });
        const da = p.dieA == null ? 1 : p.dieA;
        if (da < 1) { fr.rect(x0 + 56, y0 + h / 2 - 17, 34, 34, { r: 6, color: C.cardEdge, w: 1, dash: [4, 4], a: .5 * (1 - da) }); fr.rect(x0 + 93, y0 + h / 2 - 17, 34, 34, { r: 6, color: C.cardEdge, w: 1, dash: [4, 4], a: .5 * (1 - da) }); }   // 骰子还没落下时的空格
        die(fr, x0 + 73, y0 + h / 2, 17, p.gold, { tone: 'gold', dim, glint: p.glint, a: da });
        die(fr, x0 + 110, y0 + h / 2, 17, p.ice, { tone: 'ice', dim, glint: p.glintIce == null ? p.glint : p.glintIce, a: da });
      }
    });
    if (sh > 0) shutter(fr, x0 + 6, y0 + 4, w - 12, h - 8, { a: sh });
  });
}

/* 门槛牌子上的小图标：线描，s ≈ 图标高度 */
const ICONS = {
  sieve(fr, cx, cy, s, o) {                                  // 一只圆筛子：圆框、网眼、一截把手
    fr.circle(cx - s * .06, cy, s * .36, Object.assign({ w: 2.2 }, o));
    fr.g({ clip: [cx - s * .42, cy - s * .36, s * .72, s * .72] }, () => {
      for (let i = -3; i <= 3; i++) { fr.line(cx - s * .06 + i * s * .1, cy - s * .36, cx - s * .06 + i * s * .1, cy + s * .36, Object.assign({ w: 1 }, o, { a: (o.a || 1) * .6 })); fr.line(cx - s * .42, cy + i * s * .1, cx + s * .3, cy + i * s * .1, Object.assign({ w: 1 }, o, { a: (o.a || 1) * .6 })); }
    });
    fr.line(cx + s * .3, cy, cx + s * .5, cy, Object.assign({ w: 3 }, o));
  },
  door(fr, cx, cy, s, o) {
    fr.rect(cx - s * .3, cy - s * .48, s * .6, s * .9, Object.assign({ w: 2 }, o));
    fr.line(cx - s * .45, cy + s * .44, cx + s * .45, cy + s * .44, Object.assign({ w: 3.2 }, o));
    fr.circle(cx + s * .17, cy, s * .04, Object.assign({ fill: o.color }, o));
  },
  hospital(fr, cx, cy, s, o) {
    fr.rect(cx - s * .5, cy - s * .3, s, s * .74, Object.assign({ w: 2 }, o));
    fr.rect(cx - s * .12, cy + s * .14, s * .24, s * .3, Object.assign({ w: 1.6 }, o));
    for (let i = 0; i < 3; i++) fr.rect(cx - s * .38 + i * s * .29, cy - s * .16, s * .18, s * .16, Object.assign({ w: 1.2 }, o));
    fr.line(cx, cy - s * .52, cx, cy - s * .36, Object.assign({ w: 2.4 }, o)); fr.line(cx - s * .08, cy - s * .44, cx + s * .08, cy - s * .44, Object.assign({ w: 2.4 }, o));
  },
  school(fr, cx, cy, s, o) {
    fr.rect(cx - s * .46, cy - s * .2, s * .14, s * .64, Object.assign({ w: 1.8 }, o)); fr.rect(cx + s * .32, cy - s * .2, s * .14, s * .64, Object.assign({ w: 1.8 }, o));
    fr.rect(cx - s * .56, cy - s * .44, s * 1.12, s * .24, Object.assign({ w: 2 }, o));
    fr.line(cx - s * .2, cy - s * .32, cx + s * .2, cy - s * .32, Object.assign({ w: 1.4 }, o));
  },
  lantern(fr, cx, cy, s, o) {
    fr.line(cx, cy - s * .5, cx, cy - s * .32, Object.assign({ w: 1.6 }, o));
    fr.ellipse(cx, cy, s * .3, s * .34, Object.assign({ w: 2 }, o));
    fr.line(cx - s * .16, cy - s * .32, cx + s * .16, cy - s * .32, Object.assign({ w: 2.4 }, o)); fr.line(cx - s * .16, cy + s * .32, cx + s * .16, cy + s * .32, Object.assign({ w: 2.4 }, o));
    fr.line(cx, cy + s * .34, cx, cy + s * .5, Object.assign({ w: 1.4 }, o));
  },
  scale(fr, cx, cy, s, o) {
    fr.circle(cx, cy - s * .08, s * .3, Object.assign({ w: 2 }, o));
    fr.line(cx, cy - s * .08, cx - s * .16, cy - s * .2, Object.assign({ w: 1.6 }, o));
    fr.path(`M${-s * .5},${s * .32} Q0,${s * .5} ${s * .5},${s * .32}`, Object.assign({ at: [cx, cy], w: 2 }, o));
    fr.line(cx - s * .5, cy + s * .32, cx + s * .5, cy + s * .32, Object.assign({ w: 1.6 }, o));
  },
  phone(fr, cx, cy, s, o) {
    fr.rect(cx - s * .5, cy - s * .3, s, s * .6, Object.assign({ w: 2, r: s * .1 }, o));
    fr.circle(cx + s * .42, cy, s * .025, Object.assign({ fill: o.color }, o));
  },
};

/* 门槛牌子：挂在两根细绳上的一块小牌。o: { icon, title, rule, a, hi 0..1 高亮 } */
function plaque(fr, x0, y0, o) {
  const a = o.a == null ? 1 : o.a; if (a <= .004) return;
  const w = o.w || 420, h = 124, hi = o.hi || 0;
  fr.g({ a }, () => {
    fr.line(x0 + 60, y0 - 46, x0 + 90, y0, { w: 1.2, color: C.line, a: .35 }); fr.line(x0 + w - 60, y0 - 46, x0 + w - 90, y0, { w: 1.2, color: C.line, a: .35 });
    fr.circle(x0 + 60, y0 - 46, 3, { fill: C.line, a: .5 }); fr.circle(x0 + w - 60, y0 - 46, 3, { fill: C.line, a: .5 });
    fr.rect(x0, y0, w, h, { r: 12, fill: '#120C14', fa: .88, color: C.rose, w: 1.6 + 1.2 * hi, a: .75 + .25 * hi, glow: 8 + 14 * hi });
    (ICONS[o.icon] || ICONS.sieve)(fr, x0 + 64, y0 + h / 2, 70, { color: mix('#C9D3DC', C.rose, .35 + .5 * hi), a: .85 });
    fr.line(x0 + 118, y0 + 22, x0 + 118, y0 + h - 22, { w: 1, color: C.rose, a: .35, cap: 'butt' });
    fr.text(o.title || '筛子', x0 + 140, y0 + 40, { font: 'serifr', size: 22, track: 6, color: C.rose, align: 'l', a: .85 });
    fr.text(o.rule, x0 + 140, y0 + 84, { font: 'serifr', size: o.ruleSize || 30, track: 2, color: mix(C.ink, '#FFD3DF', hi), align: 'l', glow: 6 + 10 * hi, glowColor: C.rose, glowA: .2 + .4 * hi });
  });
}

window.BK = Object.assign(window.BK || {}, { C, die, bust, avatar, styleOf, baby, shutter, card, ICONS, plaque });
})();
