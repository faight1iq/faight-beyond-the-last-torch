"""Clutter the dead-end alleys (John, 2026-11-11): open ground that no route between two doors passes through, 2 or
more squares from any such route, gets crates, barrels, carts and the like, cut from a room's grabs (dress.py).
usage: python3 alleys.py <work_dir> <layout.json> <spec.json> <final_in.png> <final_out.png> <room key> <piece,piece,...> [x0 y0 x1 y1]
The optional box (squares, inclusive) limits the search, e.g. to inside the curtain wall. Writes alleys.jpg (preview)."""
import sys, os, json, collections, zlib
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from layout import Layout, S
import dress
Image.MAX_IMAGE_PIXELS = None


def dead_cells(L, box=None):
    cells = L.cells(); walk = set(cells) - set(L.water)
    room = set()
    for r in L.rooms():
        x, y, w, h = r["rect"]
        room |= {(x + i, y + j) for i in range(w) for j in range(h)}
    pts = [c for c in L.doors if c in walk]
    nb = lambda c: [(c[0] + dx, c[1] + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if (c[0] + dx, c[1] + dy) in walk]
    used = set()
    for a in pts:
        prev = {a: None}; q = collections.deque([a])
        while q:
            c = q.popleft()
            for n in nb(c):
                if n not in prev: prev[n] = c; q.append(n)
        for b in pts:
            c = b if b in prev else None
            while c is not None: used.add(c); c = prev[c]
    dist = {c: 0 for c in used}; q = collections.deque(used)
    while q:
        c = q.popleft()
        for n in nb(c):
            if n not in dist: dist[n] = dist[c] + 1; q.append(n)
    out = {c for c in walk - room if dist.get(c, 99) >= 2}
    if box: out = {c for c in out if box[0] <= c[0] <= box[2] and box[1] <= c[1] <= box[3]}
    return out


if __name__ == "__main__":
    work, L = os.path.abspath(sys.argv[1]), Layout(sys.argv[2]); spec = json.load(open(sys.argv[3]))
    final = np.array(Image.open(sys.argv[4]).convert("RGB")); key = sys.argv[6]; names = sys.argv[7].split(",")
    box = [int(v) for v in sys.argv[8:12]] if len(sys.argv) > 11 else None
    meta = json.load(open(os.path.join(work, "crops", f"crop-{key}.json"))); ax, ay, _, _ = dress.room_px(L, meta)
    dress.ORIGIN[(work, key)] = (ax, ay)
    sp = spec.get(key, {})
    P = dress.pieces_of(work, key, sp.get("split"), sp.get("cuts"), (ax, ay), sp.get("grabs"), sp.get("regroup"))
    pal = [P[n] for n in names]
    dead = dead_cells(L, box)
    # the walkable floor mask, so clutter keeps off the walls
    region = np.zeros(final.shape[:2], bool)
    for (cx, cy) in dead:
        X, Y = int((cx - L.X0) * S), int((cy - L.Y0) * S); region[Y:Y + S, X:X + S] = True
    floor = L.floor_mask() > 0
    region &= cv2.erode(floor.astype(np.uint8), np.ones((25, 25), np.uint8)).astype(bool)
    occ = np.zeros_like(region)
    rng = np.random.default_rng(zlib.crc32(b"alleys"))
    n, lab, st, _ = cv2.connectedComponentsWithStats(region.astype(np.uint8), 8)
    placed = 0
    for i in range(1, n):
        x, y, w, h, area = st[i]
        target = 0.5 * area; got = 0
        for _ in range(400):
            if got >= target: break
            p = pal[rng.integers(len(pal))]
            rot = 0   # never turned: the art keeps the scene's three-quarter facing (John, 2026-11-11)
            c, o, s = dress.xform(p, 1.0, rot, "h" if rng.random() < 0.5 else None)
            hh, ww = o.shape
            if ww > w or hh > h: continue
            nx, ny = x + int(rng.integers(0, w - ww + 1)), y + int(rng.integers(0, h - hh + 1))
            core = o > 0.3
            sub_r, sub_o = region[ny:ny + hh, nx:nx + ww], occ[ny:ny + hh, nx:nx + ww]
            if (core & ~sub_r).any() or (core & sub_o).any(): continue
            reg = final[ny:ny + hh, nx:nx + ww].astype(np.float32)
            reg = reg * (1 - s[..., None]); reg = reg * (1 - o[..., None]) + c * o[..., None]
            final[ny:ny + hh, nx:nx + ww] = np.clip(reg, 0, 255).astype(np.uint8)
            occ[ny:ny + hh, nx:nx + ww] |= cv2.dilate(core.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
            got += core.sum(); placed += 1
    Image.fromarray(final).save(sys.argv[5])
    ys, xs = np.nonzero(region)
    if len(ys):
        y0, y1, x0, x1 = ys.min() - 140, ys.max() + 140, xs.min() - 140, xs.max() + 140
        Image.fromarray(final[max(0, y0):y1, max(0, x0):x1]).resize(((x1 - max(0, x0)) // 6, (y1 - max(0, y0)) // 6)).save(os.path.join(work, "dress", "alleys.jpg"), quality=82)
    print("dead cells", len(dead), "areas", n - 1, "pieces", placed)
