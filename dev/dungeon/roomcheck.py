"""Room checks after composite (SAVE_LAYERS=1): floor covered by objects and door lanes.
usage: python3 roomcheck.py <watabou.json> <work_dir>
Lane = the 5-ft band (140 px) just inside each doorway, the doorway's width. Reports object cover in each lane."""
import sys, os, json, glob
import numpy as np
from layout import Layout, S

def run(jp, work):
    L = Layout(jp); cells = set(L.cells().keys()) if isinstance(L.cells(), dict) else set(L.cells())
    out = []
    for rm in L.rooms():
        key = f"{rm['n']:02d}"; p = os.path.join(work, f"layer-{key}.npz")
        if not os.path.exists(p): continue
        d = np.load(p); obj = d["obj"].astype(np.float32); m = d["rm"].astype(bool)
        meta = json.load(open(os.path.join(work, "crops", f"crop-{key}.json")))
        x, y, w, h = rm["rect"]; x0, y0 = meta["x0"], meta["y0"]
        px = lambda cx, cy: (int((cx - L.X0) * S - x0), int((cy - L.Y0) * S - y0))
        cover = float((obj > 0.3)[m].mean())
        lanes = []
        def lane(c0, c1, r0, r1, name):
            a = obj[max(0, r0):r1, max(0, c0):c1]
            if a.size: lanes.append((name, round(float((a > 0.3).mean()), 2)))
        for i in range(w):
            if (x + i, y - 1) in cells:
                c0, r0 = px(x + i, y); lane(c0, c0 + S, r0, r0 + S // 2, f"N{i}")
            if (x + i, y + h) in cells:
                c0, r0 = px(x + i, y + h); lane(c0, c0 + S, r0 - S // 2, r0, f"S{i}")
        for j in range(h):
            if (x - 1, y + j) in cells:
                c0, r0 = px(x, y + j); lane(c0, c0 + S // 2, r0, r0 + S, f"W{j}")
            if (x + w, y + j) in cells:
                c0, r0 = px(x + w, y + j); lane(c0 - S // 2, c0, r0, r0 + S, f"E{j}")
        out.append(dict(room=key, cover=round(cover, 2), lanes=lanes, blocked=[n for n, v in lanes if v > 0.25]))
    return out

if __name__ == "__main__":
    for r in run(*sys.argv[1:3]): print(r)
