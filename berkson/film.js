/* 《伯克森悖论 · 为什么好看的人，都不靠谱》C 夜曲 · 约 192 秒。分镜表见 storyboard.md，立题和事实表见 brief.md。
 * 全片的形象：一只筛子（过了线的留下，没过线的漏下去）；那把尺子：一张 6×6 的骰子表（table.js）。
 * 换场：牌子翻到下一章的图标 → 镜头钻进去 → 下一章从图标里长出来（chs.js）。各章的画在 hook.js、ch1.js、chs.js 里，这里只放字幕、章节标和调度。
 * 声音：sound.py（项目自己的合成器，按 fr.sfx 登记的事件一个个合成）。
 *
 * 事实（2026-10-09 联网核对）：
 *   J. Berkson, Biometrics Bulletin 2(3):47–53, 1946；梅奥诊所统计学家；论文用的假想例子是住院病人里的胆囊炎和糖尿病。
 *   J. Yerushalmy, Am J Epidemiol 93:443, 1971：出生 < 2500 g 的婴儿里，母亲吸烟的一组死亡率更低（二手转述两组数 147/72、218/114 每千人，都约一半）。
 *   S. Hernández-Díaz, E. Schisterman, M. Hernán, Am J Epidemiol 164:1115, 2006：用"按共同结果分层"解释这个反转（一种主流解释）。
 *   J. Ellenberg, How Not to Be Wrong, 2014：帅哥与混蛋；同一所学校里数学和语文成绩负相关，因为录取看总分。
 * 示意：骰子表是模型；学校、巷子、博主没有用真实数据；第 21 镜十个图标暗两个对暗一个是比例示意。 */
(function () {
'use strict';
const { ss, lerp } = VK;
const K = VKit, B = window.BK, CH = window.CH;

const T = {
  in0: .9, sort: 5.9, glow: 7.7, dim: 10.6, col0: 14.1, col1: 14.85, title: 15.0, titleEnd: 23.6, heroIn: 24.2,
  c1: 24.0, deal: 30.6, avg: 36.0, gate: 41.6, recalc: 47.6, glint: 58.6, law: 62.2, flip1: 66.2, push1: 66.7, c1end: 67.8,
  c2: 67.2, c3: 90.0, c4: 112.6, c5: 151.0, epi: 179.0, endCard: 186.6, end: 192.0,
};
const SUBS = [
  { a: .8,    b: 4.4,   zh: '你约过的人里——', en: 'Among the people you have dated —' },
  { a: 5.6,   b: 10.2,  zh: '好看的，好像都不太靠谱。', en: 'the good-looking ones never seem quite decent.' },
  { a: 10.6,  b: 14.4,  zh: '老天，就是不让人两样都占吗？', en: 'Does fate never let anyone have both?' },
  { a: 24.8,  b: 30.0,  zh: '老天给每个人掷两颗骰子：一颗定长相，一颗定人品。', en: 'Fate rolls two dice for everyone: one for looks, one for character.' },
  { a: 30.4,  b: 35.4,  zh: '两颗各掷各的——36 种搭配，一种一个人。', en: 'Each die rolls on its own — 36 combinations, one person each.' },
  { a: 35.8,  b: 40.6,  zh: '不管长相几点，人品平均都是 3.5。', en: 'Whatever the looks, character averages 3.5.' },
  { a: 41.2,  b: 46.6,  zh: '现在过一遍{!筛子}：两颗加起来不到 8 的，你不约。', en: 'Now run everyone through a sieve: if the dice add up to less than 8, no date.' },
  { a: 47.6,  b: 52.4,  zh: '再算一遍，每一列的平均人品——', en: 'Now average each column again —' },
  { a: 52.8,  b: 57.0,  zh: '长得越好看的，人品越差。', en: 'The better-looking, the worse the character.' },
  { a: 57.4,  b: 61.4,  zh: '可骰子，一颗都没动过。', en: 'Yet not a single die has moved.' },
  { a: 62.0,  b: 66.6,  zh: '规律不在人身上，在{!筛子}上。', en: 'The pattern is not in the people. It is in the sieve.' },
  { a: 68.0,  b: 73.2,  zh: '1946 年，统计学家伯克森在医院里撞见了它。', en: 'In 1946, the statistician Joseph Berkson ran into it in a hospital.' },
  { a: 73.6,  b: 78.8,  zh: '住院也是一道筛子：病得够重，才住得进来。', en: 'A hospital is a sieve too: you get in only if you are sick enough.' },
  { a: 79.2,  b: 84.6,  zh: '于是在病房里，两种不相干的病，看起来像是有关系。', en: 'So on the ward, two unrelated diseases look connected.' },
  { a: 85.0,  b: 89.4,  zh: '筛过之后冒出来的假规律，叫{!伯克森悖论}。', en: 'A fake pattern that appears after sieving: Berkson’s paradox.' },
  { a: 90.8,  b: 95.8,  zh: '同一所高中里，数学好的，语文往往差一点。', en: 'At the same high school, the best at maths tend to be weaker at writing.' },
  { a: 96.2,  b: 100.2, zh: '因为录取，只看总分。', en: 'Because admission looks only at the total.' },
  { a: 100.8, b: 106.4, zh: '路口的店，难吃也开得下去；巷子深的店，不好吃早就关了。', en: 'A corner shop survives bad food; a shop deep in an alley does not.' },
  { a: 106.8, b: 112.0, zh: '酒香不怕巷子深——不香的，早就关门了。', en: '“Good wine fears no deep alley” — the bad wine already closed.' },
  { a: 113.4, b: 118.6, zh: '1971 年的数据：出生不到 2500 克的婴儿里——', en: 'Data from 1971: among babies born under 2,500 grams —' },
  { a: 119.0, b: 124.2, zh: '妈妈抽烟的，死亡率反而低了将近一半。', en: 'those whose mothers smoked died at nearly half the rate.' },
  { a: 124.6, b: 128.6, zh: '难道抽烟，在保护瘦小的婴儿？', en: 'Was smoking protecting small babies?' },
  { a: 129.2, b: 134.6, zh: '让婴儿变轻的，有两颗骰子：抽烟，和更凶的病因。', en: 'Two dice make a baby light: smoking, and graver causes.' },
  { a: 135.0, b: 139.6, zh: '这道筛子，就是秤上的 2500 克。', en: 'This sieve is the 2,500-gram mark on the scale.' },
  { a: 140.0, b: 144.8, zh: '筛出来的婴儿里，妈妈抽得越少，病因就越凶。', en: 'Among the babies it keeps, the less the mother smoked, the graver the cause.' },
  { a: 145.2, b: 150.4, zh: '抽烟没有保护谁——是筛子，把两条路混在了一起。', en: 'Smoking protected no one. The sieve mixed two roads together.' },
  { a: 151.8, b: 156.4, zh: '你每天刷的屏幕，也是一道筛子。', en: 'The screen you scroll every day is a sieve too.' },
  { a: 156.8, b: 161.8, zh: '好看的博主内容水，内容好的长得普通——', en: 'Good-looking creators post fluff; good content comes with plain faces —' },
  { a: 162.2, b: 167.0, zh: '两样都不行的，早被筛掉了，你一个也刷不到。', en: 'those with neither were sieved out; you never see them at all.' },
  { a: 167.6, b: 173.0, zh: '下次觉得两样不可兼得，先问一句：被筛掉的是谁？', en: 'When two good things seem to exclude each other, ask: who was sieved out?' },
  { a: 173.4, b: 178.4, zh: '把筛掉的人放回来，规律就消失了。', en: 'Put them back, and the pattern disappears.' },
  { a: 179.8, b: 186.0, zh: '好看的人不是不靠谱——是又丑又坏的，早被筛掉了。', en: 'Good-looking people are not unreliable — the plain and nasty ones were sieved out long ago.' },
];
const MARKS = [
  { t: .4, no: '00', zh: '序', en: 'PROLOGUE' }, { t: T.c1, no: '01', zh: '骰', en: 'DICE' }, { t: T.c2, no: '02', zh: '院', en: 'HOSPITAL' },
  { t: T.c3, no: '03', zh: '处', en: 'EVERYWHERE' }, { t: T.c4, no: '04', zh: '秤', en: 'SCALE' }, { t: T.c5, no: '05', zh: '你', en: 'YOU' },
];

/* 片尾：片名 + 文献线索 + 示意说明 */
function endCard(fr, t) {
  const a = ss(t, T.endCard + .2, T.endCard + 1.2) * (1 - ss(t, T.end - .7, T.end)); if (a <= 0) return;
  fr.text('伯克森悖论', 960, 360, { font: 'serifl', size: 112, track: 44, color: '#F8F9F8', a, glow: 16, glowColor: '#BFD9F2', glowA: .35 });
  fr.text('为什么好看的人，都不靠谱', 969, 470, { font: 'serifm', size: 34, track: 16, color: '#B09973', a: a * ss(t, T.endCard + .6, T.endCard + 1.6) });
  const ra = a * ss(t, T.endCard + 1.2, T.endCard + 2.2), o = { font: 'latin', size: 23, track: 1, color: '#879399', a: ra };
  fr.text('文献线索', 960, 570, { font: 'serifr', size: 20, track: 8, color: '#5E6B77', a: ra });
  fr.text('J. Berkson, Limitations of the application of fourfold table analysis to hospital data, Biometrics Bulletin, 1946', 960, 614, o);
  fr.text('J. Yerushalmy, Am J Epidemiol, 1971   ·   S. Hernández-Díaz, E. Schisterman, M. Hernán, Am J Epidemiol, 2006', 960, 652, o);
  fr.text('J. Ellenberg, How Not to Be Wrong（《魔鬼数学》）, 2014', 960, 690, o);
  fr.text('画面为示意：骰子表是模型；学校、巷子、博主三处未用真实数据；婴儿图标为比例示意', 960, 760, { font: 'serifr', size: 19, track: 2, color: '#5E6B77', a: ra });
  fr.sfx(T.endCard + .2, 'chord', { root: 0, gain: .8 });
}

/* ---------- 换场放慢：时间扭曲 ----------
 * 全片的戏都按"故事时间"写（上面所有的数字）。换场的那几段，故事时间走得慢一些（SLOW 里的倍数），前后平滑过渡，不会突然变速。
 * 画面拿到的是真实时间 tr，先换算成故事时间 t 再画；fr.sfx 登记的时刻反过来换算回真实时间，音效的时长也跟着拉长。 */
const SLOW = [
  [14.0, 15.1, 1.6],  [23.2, 25.0, 1.5],                       // 序收拢成光点；光点展开成第一张卡
  [66.1, 68.2, 2.0],  [73.7, 74.95, 1.9],                      // 01 → 02 院；医院缩回、表回来
  [89.5, 91.5, 2.0],  [92.9, 94.1, 1.9],                       // 02 → 校门；校门缩回
  [99.8, 101.7, 2.0], [106.9, 108.1, 1.9],                     // → 巷子；巷子缩回
  [111.4, 113.3, 2.0], [128.5, 129.7, 1.9],                    // 03 → 04 秤；秤缩回
  [149.9, 152.5, 1.8], [178.3, 179.9, 1.8],                    // 04 → 05 屏幕；→ 尾声
];
const RAMP = .3, STEP = 1 / 240;
const rate = s => SLOW.reduce((r, [a, b, f]) => r + (f - 1) * ss(s, a - RAMP, a) * (1 - ss(s, b, b + RAMP)), 1);
const REAL = (() => { const n = Math.ceil(T.end / STEP) + 2, o = new Float64Array(n); for (let i = 1; i < n; i++) o[i] = o[i - 1] + rate((i - .5) * STEP) * STEP; return o; })();
const toReal = s => { const f = Math.max(0, s) / STEP, i = Math.min(REAL.length - 2, Math.floor(f)); return REAL[i] + (REAL[i + 1] - REAL[i]) * (f - i); };
const toStory = r => { let lo = 0, hi = REAL.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (REAL[m] <= r) lo = m; else hi = m; } return (lo + (r - REAL[lo]) / Math.max(1e-9, REAL[hi] - REAL[lo])) * STEP; };
const DUR = toReal(T.end);
function warpSfx(fr) {
  if (fr._sfxWarp) return; const base = fr.sfx;
  fr.sfx = (ts, name, p) => { const q = Object.assign({}, p || {}); if (q.dur) q.dur = +(toReal(ts + q.dur) - toReal(ts)).toFixed(3); base(toReal(ts), name, q); };
  fr._sfxWarp = true;
}

VK.film({
  dur: DUR, theme: 'night', meta: { title: '伯克森悖论', family: 'C', bgm: 'synth' },
  draw(fr, tr) {
    warpSfx(fr);
    const t = Math.min(T.end, toStory(tr));
    const titleK = ss(t, T.title - .2, T.title + 1.5) * (1 - ss(t, T.titleEnd - 1, T.titleEnd));
    fr.look.bgo = { core: .7 + .3 * titleK, stars: lerp(.5, 1.25, titleK) };
    fr.look.bloom = t > T.c1 ? .55 : (t > T.title - .3 && t < T.titleEnd ? .8 : .5);
    K.chapterMark(fr, t, MARKS, T.endCard);
    if (t < T.title + .4) B.hook(fr, t, { in0: T.in0, sort: T.sort, glow: T.glow, dim: T.dim, col0: T.col0, col1: T.col1, flash: T.title });
    if (t >= T.title && t < T.titleEnd + .1) {
      K.titleNight(fr, t - T.title, { zh: '伯克森悖论', sub: '为什么好看的人，都不靠谱', en: 'BERKSON’S   PARADOX', a: 1 - ss(t, T.titleEnd - .8, T.titleEnd) });
      fr.sfx(T.title, 'chord', { root: 0, gain: 1 }); fr.sfx(T.title + .5, 'grains', { dur: 2.9, gain: .7 });
    }
    /* 片名线上的光点升到正中，展开成第一张卡 */
    if (t > T.titleEnd - .5 && t < T.heroIn + .5) { const k = VK.E.io3(VK.seg(t, T.titleEnd - .3, T.heroIn)); fr.spark(960, lerp(577, 450, k), lerp(8, 18, k), '#DCEBFF', ss(t, T.titleEnd - .5, T.titleEnd - .2) * (1 - ss(t, T.heroIn + .1, T.heroIn + .45))); fr.sfx(T.titleEnd - .3, 'rise', { dur: .9, gain: .6 }); }
    if (t >= T.c1 && t < T.c1end) { CH.ch1(fr, t, T); fr.sfx(T.c1 + .3, 'chord', { root: 5, gain: .6 }); }
    if (t >= 67.0 && t < 91.1) CH.ch2(fr, t);
    if (t >= 90.3 && t < 113.0) CH.ch3(fr, t);
    if (t >= 112.2 && t < 150.9) CH.ch4(fr, t);
    if (t >= 150.9 && t < 179.3) CH.ch5(fr, t);
    if (t >= 178.45 && t < T.endCard + .1) B.epilogue(fr, t, { fly0: 178.45, fly1: 179.75, mesh: 180.2, end: T.endCard, from: (c, r) => CH.cell5(c, r, 178.45) });
    if (t >= T.endCard) endCard(fr, t);
    K.flash(fr, t, T.title, { fall: .35, color: '#B9A679', edge: '#6E6247', peak: .92 });
    K.flash(fr, t, T.law, { fall: .5, color: '#E8B8C6', edge: '#7A4A5A', peak: .45 });
    K.subs(fr, t, SUBS, 'night');
  },
});
})();
