"""Room dressing, step 2 (John's GIMP method): rescale, drop, move and clone furnishing pieces, then repaint the rooms.
usage: python3 dress.py <work_dir> <layout.json> <spec.json> <base_map.png> <in_final.png> <out_final.png> [NN ...]

spec.json: {"NN": {"scale": 1.0,                       # every piece of the room
                   "pieces": {"3": {"s": 0.7}, "7": "drop", "9": {"dx": 2, "dy": -1}},   # by number from pieces.py
                   "add": [{"p": "12", "x": 5, "y": 0, "rot": 90, "flip": "h", "s": 0.8},  # x, y = top-left in feet
                           {"p": "basement/03:4", "wall": "e", "at": 20}]}}            # flush on a wall, `at` feet along it
Pieces come from the room's saved layer (layer-NN.npz). `p` may name another room ("07:3") or floor ("upper/06:2").
rot is clockwise degrees (multiples of 90). Anything left in a door lane (5 ft inside a doorway) or on a stair is
dropped and reported. Writes out_final.png and dress/after-NN.jpg (5-ft grid, door lanes red)."""
import sys, os, json, zlib
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from layout import Layout, S
from pieces import label, room_px
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "patina"))
import patina as _patina
Image.MAX_IMAGE_PIXELS = None
FT = S / 10.0
_cache = {}
ORIGIN = {}
_LC = {}


def _layout(p):
    if p not in _LC: _LC[p] = Layout(p)
    return _LC[p]


LAYOUT_OF = {}   # work dir -> layout json, for clones taken from another floor
SPEC_OF = {}   # work dir -> spec path, for clones taken from another floor


def split_piece(p, e):
    """Cut a merged group (sacks and barrels, a shield rack and its spears) along the gaps between its items:
    erode the object alpha by e px, take each surviving blob as one item, give every other pixel to the nearest item."""
    core = (p["obj"] > 0.45).astype(np.uint8)
    er = cv2.erode(core, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * e + 1, 2 * e + 1)))
    n, cl, st, _ = cv2.connectedComponentsWithStats(er, 8)
    seeds = [i for i in range(1, n) if st[i][4] >= 120]
    if len(seeds) < 2: return {"1": p}
    good = np.isin(cl, seeds)
    dist, idx = cv2.distanceTransformWithLabels((~good).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(good); seed = np.zeros(idx.max() + 1, np.int32); seed[idx[ys, xs]] = cl[ys, xs]
    own = seed[idx]
    have = (p["obj"] > 0.01) | (p["sh"] > 0.01)
    out = {}
    for j, i in enumerate(sorted(seeds, key=lambda i: (st[i][1] // 40, st[i][0])), 1):
        m = (own == i) & have
        ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        mm = m[y0:y1, x0:x1].astype(np.float32)
        mm = cv2.GaussianBlur(mm, (3, 3), 0)          # soften the cut edge by a pixel
        out[str(j)] = dict(x=p["x"] + int(x0), y=p["y"] + int(y0), col=p["col"][y0:y1, x0:x1].copy(),
                           obj=p["obj"][y0:y1, x0:x1] * mm, sh=p["sh"][y0:y1, x0:x1] * mm)
    return out


def seam_cut(p, axis, at, band, lim=None):
    """Cut a piece in two along a line, letting the cut wander up to `band` px either side to follow the gaps
    and outlines between items (dynamic-programming seam: cheap through floor, shadow and item edges, dear through
    the middle of an item). axis "v": a vertical line at x = at (px, piece coords); "h": horizontal. Returns (a, b) or None."""
    o, h, c = p["obj"], p["sh"], p["col"]
    if axis == "h": o, h, c = o.T, h.T, c.transpose(1, 0, 2)
    H, W = o.shape
    if not (0 < at < W): return None
    lo, hi = max(0, at - band), min(W, at + band + 1)
    lum = c.astype(np.float32).mean(-1) / 255
    gx = cv2.Sobel(lum, cv2.CV_32F, 1, 0); gy = cv2.Sobel(lum, cv2.CV_32F, 0, 1)
    gr = np.clip(np.hypot(gx, gy) / 1.5, 0, 1)
    cost = (o * (0.25 + lum) * (1 - 0.75 * gr) + 0.002)[:, lo:hi].astype(np.float64)
    cost += 0.0005 * np.abs(np.arange(lo, hi) - at)[None, :]          # a straight line when nothing is in the way
    r0, r1 = (0, H) if lim is None else (max(0, lim[0]), min(H, lim[1]))
    D = cost.copy(); back = np.zeros(D.shape, np.int8)
    for y in range(r0 + 1, r1):
        prev = D[y - 1]
        l = np.r_[np.inf, prev[:-1]]; r = np.r_[prev[1:], np.inf]
        st = np.stack([l, prev, r]); k = st.argmin(0)
        D[y] += st[k, np.arange(st.shape[1])]; back[y] = k - 1
    x = int(D[r1 - 1].argmin()); xs = np.full(H, at, int)
    for y in range(r1 - 1, r0 - 1, -1):
        xs[y] = lo + x; x = x + int(back[y, x]) if y > r0 else x
    left = np.arange(W)[None, :] < xs[:, None]
    if lim is not None:   # outside the limited span the whole row goes to the side the line starts from
        left[:r0] = np.arange(W)[None, :] < xs[r0]; left[r1:] = np.arange(W)[None, :] < xs[r1 - 1]
    if axis == "h": left = left.T
    out = []
    for m in (left, ~left):
        have = m & ((p["obj"] > 0.01) | (p["sh"] > 0.01))
        if (have & (p["obj"] > 0.5)).sum() < 150: return None
        ys, xs_ = np.nonzero(have); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs_.min(), xs_.max() + 1
        mm = m[y0:y1, x0:x1].astype(np.float32)
        out.append(dict(x=p["x"] + int(x0), y=p["y"] + int(y0), col=p["col"][y0:y1, x0:x1].copy(), obj=p["obj"][y0:y1, x0:x1] * mm, sh=p["sh"][y0:y1, x0:x1] * mm))
    return out


def _seam(cost):
    """Cheapest top-to-bottom path through cost (rows x cols), moving at most one column per row. Returns col per row."""
    H, W = cost.shape; D = cost.astype(np.float64).copy(); back = np.zeros((H, W), np.int8)
    for y in range(1, H):
        prev = D[y - 1]; l = np.r_[np.inf, prev[:-1]]; r = np.r_[prev[1:], np.inf]
        st = np.stack([l, prev, r]); k = st.argmin(0)
        D[y] += st[k, np.arange(W)]; back[y] = k - 1
    xs = np.zeros(H, int); x = int(D[-1].argmin())
    for y in range(H - 1, -1, -1):
        xs[y] = x
        if y: x += int(back[y, x])
    return xs


def grab(layer, rect, band):
    """John's GIMP cut: take the part of a room layer inside a rectangle, but let each of its four edges wander up to
    `band` px to run through floor, shadow and the outlines between items instead of through an item.
    rect = (x0, y0, x1, y1) in layer px. Returns a piece dict."""
    col, obj, sh = layer
    N = obj.shape[0]
    lum = col.astype(np.float32).mean(-1) / 255
    gr = np.clip(np.hypot(cv2.Sobel(lum, cv2.CV_32F, 1, 0), cv2.Sobel(lum, cv2.CV_32F, 0, 1)) / 1.5, 0, 1)
    C = obj * (0.25 + lum) * (1 - 0.75 * gr) + 0.002
    x0, y0, x1, y1 = [int(v) for v in rect]
    X0, Y0, X1, Y1 = max(0, x0 - band), max(0, y0 - band), min(N, x1 + band), min(N, y1 + band)
    sub = C[Y0:Y1, X0:X1]; H, W = sub.shape
    def vline(at):   # vertical edge at column `at` (sub coords) -> col per row
        lo, hi = max(0, at - band), min(W, at + band + 1)
        c = sub[:, lo:hi] + 0.0004 * np.abs(np.arange(lo, hi) - at)[None, :]
        return lo + _seam(c)
    def hline(at):
        lo, hi = max(0, at - band), min(H, at + band + 1)
        c = sub[lo:hi, :].T + 0.0004 * np.abs(np.arange(lo, hi) - at)[None, :]
        return lo + _seam(c)
    xl, xr = vline(x0 - X0), vline(x1 - X0); yt, yb = hline(y0 - Y0), hline(y1 - Y0)
    yy, xx = np.mgrid[0:H, 0:W]
    m = (xx >= xl[:, None]) & (xx < xr[:, None]) & (yy >= yt[None, :]) & (yy < yb[None, :])
    m = cv2.GaussianBlur(m.astype(np.float32), (3, 3), 0)
    o, h = obj[Y0:Y1, X0:X1] * m, sh[Y0:Y1, X0:X1] * m
    ys, xs = np.nonzero((o > 0.02) | (h > 0.02))
    if not len(ys): return None
    a, b, c_, d = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return dict(x=X0 + int(c_), y=Y0 + int(a), col=col[Y0:Y1, X0:X1][a:b, c_:d].copy(), obj=o[a:b, c_:d], sh=h[a:b, c_:d])


def pieces_of(work, key, split=None, cuts=None, origin=(0, 0), grabs=None, regroup=None):
    k = (work, key, json.dumps(split or {}, sort_keys=True), json.dumps(cuts or {}, sort_keys=True), json.dumps(grabs or {}, sort_keys=True), json.dumps(regroup or [], sort_keys=True))
    if k in _cache: return _cache[k]
    d = np.load(os.path.join(work, f"layer-{key}.npz"))
    col, obj, sh = d["col"], d["obj"].astype(np.float32), d["sh"].astype(np.float32)
    col0, obj0, sh0 = col, obj.copy(), sh.copy()
    rg = []
    for r in (regroup or []):    # [x0, y0, x1, y1, scale]: lift a group out (cut along item edges) to rescale it in place
        band = round(1.0 * FT)
        q = grab((col0, obj0, sh0), [origin[0] + round(r[0] * FT), origin[1] + round(r[1] * FT), origin[0] + round(r[2] * FT), origin[1] + round(r[3] * FT)], band)
        if q is None: continue
        hh, ww = q["obj"].shape
        obj[q["y"]:q["y"] + hh, q["x"]:q["x"] + ww] = np.clip(obj[q["y"]:q["y"] + hh, q["x"]:q["x"] + ww] - q["obj"], 0, 1)
        sh[q["y"]:q["y"] + hh, q["x"]:q["x"] + ww] = np.clip(sh[q["y"]:q["y"] + hh, q["x"]:q["x"] + ww] - q["sh"], 0, 1)
        q["s"] = r[4]; rg.append(q)
    lab, stats, keep = label(obj, sh)
    out = {}
    for j, i in enumerate(keep, 1):
        x, y, w, h, _ = stats[i]
        m = (lab[y:y + h, x:x + w] == i).astype(np.float32)
        out[str(j)] = dict(x=int(x), y=int(y), col=col[y:y + h, x:x + w].copy(), obj=obj[y:y + h, x:x + w] * m, sh=sh[y:y + h, x:x + w] * m)
    for name, e in (split or {}).items():          # "split": {"12": 6} -> pieces 12.1, 12.2, ...
        if name in out:
            for c, q in split_piece(out.pop(name), e).items(): out[f"{name}.{c}"] = q
    for i_, q in enumerate(rg, 1): out[f"R{i_}"] = q
    for name, lines in (cuts or {}).items():       # "cuts": {"1.1": [["v", 12.5], ["h", 20, [x0, x1]]]}  (feet, room coords; [a, b] limits the span)
        if name not in out: continue
        parts = [out.pop(name)]
        for ln in lines:
            ax_, at = ln[0], ln[1]; nxt = []
            for q in parts:
                qx, qy = q["x"] - origin[0], q["y"] - origin[1]
                pos = round(at * FT) - (qx if ax_ == "v" else qy)
                lim = None
                if len(ln) > 2:
                    a_, b_ = round(ln[2][0] * FT), round(ln[2][1] * FT)
                    lim = (a_ - (qy if ax_ == "v" else qx), b_ - (qy if ax_ == "v" else qx))
                    span = q["obj"].shape[0] if ax_ == "v" else q["obj"].shape[1]
                    if lim[1] <= 0 or lim[0] >= span: nxt.append(q); continue
                r = seam_cut(q, ax_, pos, round(ln[3] * FT) if len(ln) > 3 else round(1.5 * FT), lim)
                nxt += r if r else [q]
            parts = nxt
        parts.sort(key=lambda q: (q["y"] // 70, q["x"]))
        for i, q in enumerate(parts): out[f"{name}{chr(97 + i)}"] = q
    if grabs:   # wall bleed: the dark band ChatGPT paints along the walls, which must not travel with a copy
        lum = col.astype(np.float32).mean(-1)
        edge = d["rm"] & ~cv2.erode(d["rm"].astype(np.uint8), np.ones((41, 41), np.uint8)).astype(bool)
        bleed = edge & (lum < 48)
        gobj = np.where(bleed, 0, obj0); gsh = np.where(bleed, sh0 * 0.5, sh0)
    for name, r in (grabs or {}).items():           # "grabs": {"A": [x0, y0, x1, y1]} feet, room coords (optional 5th: band in feet)
        band = round((r[4] if len(r) > 4 else 1.2) * FT)
        q = grab((col0, gobj, gsh), [origin[0] + round(r[0] * FT), origin[1] + round(r[1] * FT), origin[0] + round(r[2] * FT), origin[1] + round(r[3] * FT)], band)
        if q is not None: out[name] = q; out[name]["grab"] = True
    _cache[k] = out
    return out


def xform(p, s=1.0, rot=0, flip=None):
    c, o, h = p["col"], p["obj"], p["sh"]
    if flip == "h": c, o, h = c[:, ::-1], o[:, ::-1], h[:, ::-1]
    if flip == "v": c, o, h = c[::-1], o[::-1], h[::-1]
    k = (-(rot // 90)) % 4
    if k: c, o, h = np.rot90(c, k), np.rot90(o, k), np.rot90(h, k)
    if abs(s - 1) > 1e-3:
        nw, nh = max(1, round(c.shape[1] * s)), max(1, round(c.shape[0] * s))
        it = cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC
        c, o, h = [cv2.resize(np.ascontiguousarray(a), (nw, nh), interpolation=it) for a in (c, o, h)]
    return np.ascontiguousarray(c), np.clip(np.ascontiguousarray(o), 0, 1), np.clip(np.ascontiguousarray(h), 0, 1)


def lanes_of(L, meta, ax, ay):
    rx, ry, rw, rh = meta["rect"]; cells = L.cells(); cells = set(cells.keys()) if isinstance(cells, dict) else set(cells)
    lanes = []
    for i in range(rw):
        if (rx + i, ry - 1) in cells: lanes.append((ax + i * S, ay, ax + (i + 1) * S, ay + S // 2))
        if (rx + i, ry + rh) in cells: lanes.append((ax + i * S, ay + rh * S - S // 2, ax + (i + 1) * S, ay + rh * S))
    for j in range(rh):
        if (rx - 1, ry + j) in cells: lanes.append((ax, ay + j * S, ax + S // 2, ay + (j + 1) * S))
        if (rx + rw, ry + j) in cells: lanes.append((ax + rw * S - S // 2, ay + j * S, ax + rw * S, ay + (j + 1) * S))
    return lanes


def stairs_of(L, meta, x0, y0):
    rx, ry, rw, rh = meta["rect"]; out = []
    for st in L.stairs:
        if rx <= st["x"] < rx + rw and ry <= st["y"] < ry + rh:
            a, b = int((st["x"] - L.X0) * S - x0), int((st["y"] - L.Y0) * S - y0)
            W_, H_ = st["w"] * S, st["h"] * S
            out.append((a - 20, b - 20, a + W_ + 20, b + H_ + 20))
            # the landing in front of the stair (10 ft deep, the stair's width): you walk onto a stair from there
            d = st.get("dir", "n")
            out.append({"n": (a - 20, b + H_, a + W_ + 20, b + H_ + S), "s": (a - 20, b - S, a + W_ + 20, b),
                        "e": (a - S, b - 20, a, b + H_ + 20), "w": (a + W_, b - 20, a + W_ + S, b + H_ + 20)}[d])
    return out


SIDES = "nesw"


def upright(p):
    """A banner or pennant (red / black cloth hanging from a bar or a pole): it must stay the right way up and face the
    same way as the original, so it is only ever copied to a wall of the same side, flipped left-right at most."""
    if "upright" in p: return p["upright"]
    c = p["col"].astype(np.int32); o = p["obj"] > 0.5
    red = (c[..., 0] > 55) & (c[..., 0] > 1.7 * c[..., 1]) & (c[..., 0] > 1.7 * c[..., 2])
    p["upright"] = bool(o.sum() and (red & o).sum() / o.sum() > 0.12)
    return p["upright"]


def wall_side(x, y, w, h, ax, ay, aw, ah, tol=42):
    """Which room wall a piece stands against (n/e/s/w), or None for a free-standing piece. Corner pieces: the longer contact."""
    d = {"n": y - ay, "s": ay + ah - (y + h), "w": x - ax, "e": ax + aw - (x + w)}
    near = [k for k, v in d.items() if v < tol]
    if not near: return None
    if len(near) > 1:   # corner: the wall along which the piece is longer
        return max(near, key=lambda k: w if k in "ns" else h)
    return near[0]


def resolve(work, key, spec, src, floor_root):
    if "/" in src: fl, rest = src.split("/"); w2 = os.path.join(floor_root, fl); k2, pn = rest.split(":")
    elif ":" in src: w2, (k2, pn) = work, src.split(":")
    else: w2, k2, pn = work, key, src
    if (w2, k2) == (work, key): sp = spec
    else: sp = json.load(open(SPEC_OF[w2])).get(k2, {}) if w2 in SPEC_OF else {}
    if (w2, k2) == (work, key): org = ORIGIN[(w2, k2)]
    else:
        m2 = json.load(open(os.path.join(w2, "crops", f"crop-{k2}.json"))); L2 = _layout(LAYOUT_OF[w2]); bx, by, _, _ = room_px(L2, m2); org = (bx, by)
    pp = pieces_of(w2, k2, sp.get("split"), sp.get("cuts"), org, sp.get("grabs"), sp.get("regroup"))[pn]
    s_src = sp.get("pieces", {}).get(pn, {}).get("s", sp.get("scale", 1.0)) if isinstance(sp.get("pieces", {}).get(pn, {}), dict) else sp.get("scale", 1.0)
    return pp, s_src, (w2, k2)


def dress_room(work, L, key, spec, floor_root):
    meta = json.load(open(os.path.join(work, "crops", f"crop-{key}.json")))
    x0, y0, N = meta["x0"], meta["y0"], meta["N"]
    ax, ay, aw, ah = room_px(L, meta); ORIGIN[(work, key)] = (ax, ay)
    rm = np.load(os.path.join(work, f"layer-{key}.npz"))["rm"]
    tol = 42
    col = np.zeros((N, N, 3), np.float32); obj = np.zeros((N, N), np.float32); sh = np.zeros((N, N), np.float32)
    lanes = (lanes_of(L, meta, ax, ay) if spec.get("lanes", True) else []) + stairs_of(L, meta, x0, y0)   # "lanes": false for open-sided rooms and carpets through a door
    dropped = []; boxes = []
    occ = np.zeros((N, N), bool)   # object footprints (with a gap), for packing
    _l = np.load(os.path.join(work, f"layer-{key}.npz"))
    wallband = (rm & ~cv2.erode(rm.astype(np.uint8), np.ones((45, 45), np.uint8)).astype(bool)) & (_l["col"].astype(np.float32).mean(-1) < 60)
    wallband = cv2.dilate(wallband.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)   # the dark band painted along the walls is not furniture

    def in_lane(o, nx, ny):
        hh, ww = o.shape; core = o > 0.5; area = max(1, core.sum())
        for (a1, b1, a2, b2) in lanes:
            ix0, iy0, ix1, iy1 = max(a1, nx), max(b1, ny), min(a2, nx + ww), min(b2, ny + hh)
            if ix1 > ix0 and iy1 > iy0 and core[iy0 - ny:iy1 - ny, ix0 - nx:ix1 - nx].sum() > max(60, 0.04 * area): return True
        return False

    def put(name, nx, ny, c, o, h, keep=False, check_occ=False, gap=0):
        hh, ww = o.shape
        if nx < 0 or ny < 0 or nx + ww > N or ny + hh > N: return False
        if not keep and in_lane(o, nx, ny): return False
        if ((o > 0.5) & ~rm[ny:ny + hh, nx:nx + ww]).sum() > 0.03 * max(1, (o > 0.5).sum()): return False   # leaves the room
        if check_occ and (occ[ny:ny + hh, nx:nx + ww] & (o > 0.3)).any(): return False
        sl = (slice(ny, ny + hh), slice(nx, nx + ww))
        take = o > obj[sl]
        col[sl][take] = c[take]; obj[sl] = np.maximum(obj[sl], o); sh[sl] = np.maximum(sh[sl], h)
        g = max(1, gap)
        big = np.zeros((hh + 2 * g, ww + 2 * g), np.uint8); big[g:g + hh, g:g + ww] = (o > 0.3)
        big = cv2.dilate(big, np.ones((2 * g + 1, 2 * g + 1), np.uint8)).astype(bool)
        Y0, X0, Y1, X1 = max(0, ny - g), max(0, nx - g), min(N, ny + hh + g), min(N, nx + ww + g)
        occ[Y0:Y1, X0:X1] |= big[Y0 - (ny - g):Y1 - (ny - g), X0 - (nx - g):X1 - (nx - g)] & ~wallband[Y0:Y1, X0:X1]
        boxes.append((name, nx, ny, ww, hh))
        return True

    base_s = spec.get("scale", 1.0)
    own = pieces_of(work, key, spec.get("split"), spec.get("cuts"), (ax, ay), spec.get("grabs"), spec.get("regroup"))
    for nm in spec.get("upright", []):   # pieces named as upright (pennants on racks, standards): never turned or mirrored upside down
        if nm in own: own[nm]["upright"] = True
    sides = {}
    for name, p in own.items():
        h0, w0 = p["obj"].shape
        sides[name] = wall_side(p["x"], p["y"], w0, h0, ax, ay, aw, ah)
        op = spec.get("pieces", {}).get(name, {})
        if op == "drop" or p.get("grab"): continue
        s = op.get("s", p.get("s", base_s))
        c, o, h = xform(p, s, op.get("rot", 0), op.get("flip"))
        nh_, nw_ = o.shape; x, y = p["x"], p["y"]
        nx = x if x - ax < tol else (x + w0 - nw_ if ax + aw - (x + w0) < tol else round(x + w0 / 2 - nw_ / 2))
        ny = y if y - ay < tol else (y + h0 - nh_ if ay + ah - (y + h0) < tol else round(y + h0 / 2 - nh_ / 2))
        nx += round(op.get("dx", 0) * FT); ny += round(op.get("dy", 0) * FT)
        if not put(name, nx, ny, c, o, h, keep=op.get("keep", False), gap=round(spec.get("gap", 0.6) * FT)): dropped.append(name)

    for n, a in enumerate(spec.get("add", []), 1):
        pp, s_src, _ = resolve(work, key, spec, a["p"], floor_root)
        if "crop" in a:   # [x0, y0, x1, y1] in feet inside the piece: a straight cut, only where the edge is already straight
            c0, r0, c1, r1 = [round(v * FT) for v in a["crop"]]
            pp = dict(x=pp["x"] + c0, y=pp["y"] + r0, col=pp["col"][r0:r1, c0:c1], obj=pp["obj"][r0:r1, c0:c1], sh=pp["sh"][r0:r1, c0:c1])
        c, o, h = xform(pp, a.get("s", 1.0) * s_src, a.get("rot", 0), a.get("flip"))
        hh, ww = o.shape; off = round(a.get("off", 0) * FT)
        if "wall" in a:
            at = round(a["at"] * FT)
            nx, ny = {"n": (ax + at, ay + off), "s": (ax + at, ay + ah - hh - off), "w": (ax + off, ay + at), "e": (ax + aw - ww - off, ay + at)}[a["wall"]]
        else: nx, ny = ax + round(a["x"] * FT), ay + round(a["y"] * FT)
        if not put(f"+{n}", nx, ny, c, o, h, keep=a.get("keep", False), gap=round(spec.get("gap", 0.6) * FT)): dropped.append(f"+{n}")

    for ln in spec.get("lines", []):   # a row of copies: {"p": ["14", "17"], "from": [x, y], "dir": "s", "len": 60, "gap": 1, "rot": 0}
        names = ln["p"] if isinstance(ln["p"], list) else [ln["p"]]
        t, i = 0.0, 0
        while t < ln["len"]:
            pp, s_src, _ = resolve(work, key, spec, names[i % len(names)], floor_root)
            c, o, h = xform(pp, ln.get("s", 1.0) * s_src, ln.get("rot", 0), ln.get("flip") if (i % 2 == 0 or not ln.get("alt")) else ("h" if ln.get("flip") != "h" else None))
            hh, ww = o.shape; length = (hh if ln.get("dir", "s") == "s" else ww) / FT
            if t + length > ln["len"] + 0.01: break
            fx, fy = ln["from"]
            nx, ny = (ax + round(fx * FT), ay + round((fy + t) * FT)) if ln.get("dir", "s") == "s" else (ax + round((fx + t) * FT), ay + round(fy * FT))
            if ln.get("center"):   # `from` is the line's centre line, not its edge
                if ln.get("dir", "s") == "s": nx -= ww // 2
                else: ny -= hh // 2
            if not put(f"={i + 1}", nx, ny, c, o, h, check_occ=ln.get("check", True), gap=round(0.3 * FT)): dropped.append(f"={i + 1}")
            t += length + ln.get("gap", 1.0); i += 1

    pk = spec.get("pack")
    if pk:   # fill the free stretches of the walls with copies of wall pieces, each turned to put its back to the wall
        rng = np.random.default_rng(pk.get("seed", 1))
        names = pk.get("palette") or [nm for nm, sd in sides.items() if sd and spec.get("pieces", {}).get(nm) != "drop"]
        pal = []
        for nm in names:
            pp, s_src, src = resolve(work, key, spec, nm, floor_root)
            if src == (work, key): sd = sides.get(nm.split(":")[-1])
            else:
                m2 = json.load(open(os.path.join(src[0], "crops", f"crop-{src[1]}.json"))); bx, by, bw, bh = room_px(L if src[0] == work else _layout(LAYOUT_OF[src[0]]), m2)
                sd = wall_side(pp["x"], pp["y"], pp["obj"].shape[1], pp["obj"].shape[0], bx, by, bw, bh)
            if not sd: continue
            pal.append((nm, pp, s_src, sd))
        # the painted room can sit a little inside its rectangle (a wall drawn into the crop): pack against the painted walls
        rr = rm[ay:ay + ah, ax:ax + aw]
        rows = np.nonzero(rr.mean(1) > 0.5)[0]; cols = np.nonzero(rr.mean(0) > 0.5)[0]
        ex, ey = ax + int(cols.min()), ay + int(rows.min()); ew, eh = int(cols.max() - cols.min() + 1), int(rows.max() - rows.min() + 1)
        maxd = pk.get("maxdepth", 6) * FT; gap = round(pk.get("gap", 0.8) * FT); step = round(FT)
        used = {}; last = None
        for wall in pk.get("walls", "nesw"):
            run = ew if wall in "ns" else eh
            t = round(pk.get("inset", 0) * FT)
            while t < run - step:
                ok = False
                wts = np.array([max(pp["obj"].shape) for _, pp, _, _ in pal], float) ** pk.get("bias", 1.5)
                order = rng.choice(len(pal), size=len(pal), replace=False, p=wts / wts.sum())
                for i in order:
                    nm, pp, s_src, sd = pal[i]
                    if nm == last or used.get(nm, 0) >= pk.get("maxeach", 2): continue
                    rot = ((SIDES.index(wall) - SIDES.index(sd)) % 4) * 90
                    flip = ("h" if wall in "ns" else "v") if rng.random() < 0.5 else None
                    if upright(pp):   # banners and pennants: same wall side only, never upside down
                        if rot: continue
                        flip = "h" if (wall in "ns" and rng.random() < 0.5) else None
                    c, o, h = xform(pp, s_src * pk.get("s", 1.0), rot, flip)
                    hh, ww = o.shape
                    depth = hh if wall in "ns" else ww; length = ww if wall in "ns" else hh
                    if depth > maxd or length > pk.get("maxlen", 14) * FT or t + length > run: continue
                    nx, ny = {"n": (ex + t, ey), "s": (ex + t, ey + eh - hh), "w": (ex, ey + t), "e": (ex + ew - ww, ey + t)}[wall]
                    if put(f"~{nm}", nx, ny, c, o, h, check_occ=True, gap=gap):
                        t += length + gap; ok = True; used[nm] = used.get(nm, 0) + 1; last = nm; break
                if not ok: t += step
    obj *= rm; sh *= rm
    return meta, rm, col, obj, sh, dropped, lanes, boxes


def paint(final, base, meta, rm, col, obj, sh, L):
    x0, y0, N = meta["x0"], meta["y0"], meta["N"]
    by0, bx0 = max(0, y0), max(0, x0); by1, bx1 = min(L.H, y0 + N), min(L.W, x0 + N)
    sl = (slice(by0 - y0, by1 - y0), slice(bx0 - x0, bx1 - x0))
    m = rm[sl]
    sub = final[by0:by1, bx0:bx1]
    sub[m] = base[by0:by1, bx0:bx1][m]
    s = sub.astype(np.float32) * (1 - sh[sl][..., None])
    o = obj[sl][..., None]
    s = s * (1 - o) + col[sl] * o
    final[by0:by1, bx0:bx1] = np.where(m[..., None], np.clip(s, 0, 255), sub).astype(np.uint8)


def preview(final, L, meta, lanes, key, work, boxes=(), k=2, tag="after"):
    ax, ay, aw, ah = room_px(L, meta); x0, y0 = meta["x0"], meta["y0"]; m = S // 2
    im = Image.fromarray(final[y0 + ay - m:y0 + ay + ah + m, x0 + ax - m:x0 + ax + aw + m])
    im = im.resize((im.width // k, im.height // k), Image.LANCZOS).convert("RGBA")
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); dr = ImageDraw.Draw(ov)
    for (a1, b1, a2, b2) in lanes: dr.rectangle([(a1 - ax + m) / k, (b1 - ay + m) / k, (a2 - ax + m) / k, (b2 - ay + m) / k], fill=(255, 0, 0, 60))
    for g in range(0, aw + 1, S // 2): dr.line([((m + g) / k, m / k), ((m + g) / k, (m + ah) / k)], fill=(0, 255, 255, 110), width=1)
    for g in range(0, ah + 1, S // 2): dr.line([(m / k, (m + g) / k), ((m + aw) / k, (m + g) / k)], fill=(0, 255, 255, 110), width=1)
    im = Image.alpha_composite(im, ov).convert("RGB")
    if boxes:
        d2 = ImageDraw.Draw(im); font = ImageFont.load_default(size=18)
        for name, nx, ny, ww, hh in boxes:
            bx, by = (nx - ax + m) / k, (ny - ay + m) / k
            d2.rectangle([bx, by, bx + ww / k, by + hh / k], outline=(255, 70, 70) if not name.startswith("+") else (80, 255, 80), width=1)
            d2.text((bx + 2, by), name, fill=(255, 255, 0), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
        im.save(os.path.join(work, "dress", f"{tag}-{key}-ids.jpg"), quality=82)
    else: im.save(os.path.join(work, "dress", f"{tag}-{key}.jpg"), quality=82)


if __name__ == "__main__":
    work, L = os.path.abspath(sys.argv[1]), Layout(sys.argv[2]); spec = json.load(open(sys.argv[3]))
    for fl in ("ground", "basement", "upper"):     # sibling floors' specs, by convention <spec dir>/dress-<floor>.json
        sp = os.path.join(os.path.dirname(os.path.abspath(sys.argv[3])), f"dress-{fl}.json")
        if os.path.exists(sp): SPEC_OF[os.path.join(os.path.dirname(os.path.abspath(work)), fl)] = sp
        lj = os.path.join(os.path.dirname(os.path.abspath(sys.argv[2])), f"{fl}.json")
        if os.path.exists(lj): LAYOUT_OF[os.path.join(os.path.dirname(os.path.abspath(work)), fl)] = lj
    base = np.array(Image.open(sys.argv[4]).convert("RGB")); final = np.array(Image.open(sys.argv[5]).convert("RGB"))
    keys = sys.argv[7:] or sorted(spec)
    os.makedirs(os.path.join(work, "dress"), exist_ok=True)
    allkeys = sorted(f[6:8] for f in os.listdir(work) if f.startswith("layer-"))
    if os.environ.get("PREVIEW_ONLY"): allkeys = [k for k in allkeys if k in keys]
    occ_all = np.zeros((final.shape[0] // 14 + 1, final.shape[1] // 14 + 1), np.float32)   # furniture cover, 10 px per 5-ft square (for token spots)
    for key in allkeys:   # every furnished room is repainted (so stair art and lane clearing reach all of them)
        meta, rm, col, obj, sh, dropped, lanes, boxes = dress_room(work, L, key, spec.get(key, {}), os.path.dirname(work))
        pt = spec.get(key, {}).get("patina", {})
        if pt is not False:   # floor patina under the furniture (patina/patina.py)
            x0_, y0_, N_ = meta["x0"], meta["y0"], meta["N"]
            by0, bx0 = max(0, y0_), max(0, x0_); by1, bx1 = min(L.H, y0_ + N_), min(L.W, x0_ + N_)
            prm = rm[by0 - y0_:by1 - y0_, bx0 - x0_:bx1 - x0_].copy()
            for st in L.stairs:   # never on the stair art
                a_, b_ = int((st["x"] - L.X0) * S) - bx0, int((st["y"] - L.Y0) * S) - by0
                prm[max(0, b_):max(0, b_ + st["h"] * S), max(0, a_):max(0, a_ + st["w"] * S)] = False
            reg = base[by0:by1, bx0:bx1].copy()
            _patina.apply(reg, prm, seed=zlib.crc32(f"{os.path.basename(work)}-{key}".encode()), straw=pt.get("straw", 0), grime=pt.get("grime", 1.0), blood=pt.get("blood", 0.0))
            base[by0:by1, bx0:bx1][prm] = reg[prm]
        paint(final, base, meta, rm, col, obj, sh, L)
        small = cv2.resize(((obj > 0.5) & rm).astype(np.float32), (meta["N"] // 14, meta["N"] // 14), interpolation=cv2.INTER_AREA)
        oy, ox = meta["y0"] // 14, meta["x0"] // 14
        Y0, X0 = max(0, oy), max(0, ox); Y1, X1 = min(occ_all.shape[0], oy + small.shape[0]), min(occ_all.shape[1], ox + small.shape[1])
        occ_all[Y0:Y1, X0:X1] = np.maximum(occ_all[Y0:Y1, X0:X1], small[Y0 - oy:Y1 - oy, X0 - ox:X1 - ox])
        if key in keys or not sys.argv[7:]:
            preview(final, L, meta, lanes, key, work)
            preview(final, L, meta, lanes, key, work, boxes)
        print(key, "cover %.1f%%" % (100 * (obj > 0.5).sum() / max(1, rm.sum())), "dropped", dropped)
    for st in L.stairs:   # stair art from the new base
        a, b = int((st["x"] - L.X0) * S), int((st["y"] - L.Y0) * S)
        final[b:b + st["h"] * S, a:a + st["w"] * S] = base[b:b + st["h"] * S, a:a + st["w"] * S]
    if not os.environ.get("PREVIEW_ONLY"):
        Image.fromarray(final).save(sys.argv[6])
        Image.fromarray((occ_all * 255).astype(np.uint8)).save(os.path.join(work, "furniture_cover.png"))
