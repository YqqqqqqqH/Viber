"""声音：读 events.json（页面的 window.EV），每个画面动作放一个拟音，写 renders/mix.wav。
片子不要声音就删掉本文件，build.sh 会直接出无声成片。

拟音用 lemo 的 core/audio/sfx.py（click、clack、whoosh、thump、ding、pop、step、creak、rumble……，
都返回 48 kHz 单声道），配乐要用采样乐器时看 $LIB/core/audio/INSTRUMENTS.md（乐器库要另外下载，先问用户）。
响度不用在这里管：build.sh 里的 mux.sh 会两遍 loudnorm 到 -14 LUFS。
"""
import json, os, pathlib, sys

import numpy as np
import soundfile as sf

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, os.path.join(os.environ['LIB'], 'core', 'audio'))
import sfx  # noqa: E402

ev = json.loads((HERE / 'events.json').read_text(encoding='utf-8'))
buf = np.zeros((int((ev['dur'] + 1) * sfx.SR), 2), np.float32)

# 事件类型 → 声音。页面里每加一种 type，这里加一行；没登记的类型直接报错，免得漏音
FOLEY = {
    'whoosh': lambda e: sfx.whoosh(e.get('d', .35), e.get('v', .8)),
    'tap': lambda e: sfx.click(e.get('pitch', 1.0), e.get('v', .8)),
    'land': lambda e: sfx.thump(e.get('v', .9)),
    'ding': lambda e: sfx.ding(e.get('v', .7)),
}
for e in ev['ev']:
    if e['type'] not in FOLEY:
        sys.exit(f"mix.py：事件类型 {e['type']!r}（{e['t']}s）没有对应的声音，在 FOLEY 里加一行")
    sfx.add(buf, FOLEY[e['type']](e), e['t'], gain=e.get('gain', 1.0), pan=e.get('pan', 0.0))

(HERE / 'renders').mkdir(exist_ok=True)
# sfx.compress 只收单声道、逐采样 Python 循环（长片很慢），整轨只做 limit
sf.write(HERE / 'renders' / 'mix.wav', sfx.limit(buf), sfx.SR)
print(f"mix.py：{len(ev['ev'])} 个音效 → renders/mix.wav")
