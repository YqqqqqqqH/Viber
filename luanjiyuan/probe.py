"""python probe.py → 搜机位偏移：太阳别从字幕区（y > 800）后面经过，也别意外地贴近镜头。
用 render.py 的小服务器打开页面，往 window.__opt 里塞不同的偏移，量 PROBE(t)。"""
import sys, json, itertools, importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location("r", str(Path.home() / ".claude/skills/vibe-knowledge-film/engine/render.py")); R = importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
from playwright.sync_api import sync_playwright
proj = Path(__file__).resolve().parent
def cost(rows, t0, t1):
    c = 0
    for t, suns in rows:
        if not (t0 <= t <= t1): continue
        for i, s in enumerate(suns):
            if s['behind'] or (i == 0 and t < 19.4): continue                                  # 刚切过来时 α 星本来就该大
            vis = -s['r'] * 3 < s['x'] < 1920 + s['r'] * 3 and -s['r'] * 3 < s['y'] < 1080 + s['r'] * 3
            if not vis: continue
            if s['y'] + s['r'] * 1.3 > 860 and abs(s['x'] - 960) < 760 and s['r'] > 5: c += min(s['r'], 200) / 10   # 压在字幕上
            if s['r'] > 140: c += (s['r'] - 140) / 20                                          # 太近、太大
    return c
def run(cands, t0, t1, step=.2):
    srv, url = R.serve(proj); out = []
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome"); pg = b.new_page(viewport={"width": 1920, "height": 1080})
        for opt in cands:
            pg.add_init_script(f"window.__opt = {json.dumps(opt)};"); pg.goto(url); pg.wait_for_function("window.READY === true", timeout=180000)
            ts = [round(t0 + i * step, 2) for i in range(int((t1 - t0) / step) + 1)]
            rows = pg.evaluate(f"{json.dumps(ts)}.map(t => [t, PROBE(t)])"); out.append((cost(rows, t0, t1), opt))
            pg.close(); pg = b.new_page(viewport={"width": 1920, "height": 1080})
        b.close()
    srv.shutdown(); out.sort(key=lambda x: x[0]); return out
if __name__ == "__main__":
    which = sys.argv[1]
    if which == "pull":      # 17.6–24：从 α 星拉远
        cands = [{"azOff": a, "upEl": u} for a, u in itertools.product([-.5, -.3, -.15, 0, .15, .3, .5], [0, .25, .5])]
        res = run(cands, 17.8, 24.0)
    else:                    # 24–32：飞向行星
        cands = [{"pAzOff": a, "pEl": e} for a, e in itertools.product([-.9, -.5, -.2, .2, .5, .7, 1.0, 1.4], [.36, .5, .65])]
        res = run(cands, 24.2, 32.0)
    for c, o in res[:8]: print(round(c, 1), o)
