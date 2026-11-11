"""Floor patina (John, 2026-11-11): a layer between the floor texture and the furniture — dust gathered along the walls
and in corners, blotchy discolouration, scuffs, spills and drag marks, and loose straw where the room calls for it.

apply(region, rm, seed, straw=0, grime=1.0) changes `region` (H x W x 3 uint8, the bare floor of one room crop) in place
inside the room mask `rm`. Decals: dev/dungeon/patina/decals (cut from ChatGPT sheets by decals.py):
grime-*.png are multiply marks (bootprints left out), straw-*.png are keyed straw scatters.
"""
import os, glob
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FT = 28.0     # px per foot at 280 px per 10 ft
_D = {}


def decals(kind):
    if kind not in _D:
        _D[kind] = [np.array(Image.open(p).convert("RGBA")).astype(np.float32) for p in sorted(glob.glob(os.path.join(HERE, "decals", f"{kind}-*.png")))]
    return _D[kind]


def _place(region, rm, img, cx, cy, scale, angle, opacity, mode):
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, scale)
    cos, sin = abs(M[0, 0]), abs(M[0, 1]); nw, nh = int(h * sin + w * cos) + 2, int(h * cos + w * sin) + 2
    M[0, 2] += nw / 2 - w / 2; M[1, 2] += nh / 2 - h / 2
    t = cv2.warpAffine(img, M, (nw, nh), flags=cv2.INTER_LINEAR, borderValue=(255, 255, 255, 0))
    x0, y0 = int(cx - nw / 2), int(cy - nh / 2)
    H, W = rm.shape
    X0, Y0, X1, Y1 = max(0, x0), max(0, y0), min(W, x0 + nw), min(H, y0 + nh)
    if X1 <= X0 or Y1 <= Y0: return
    sub = t[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0]
    a = sub[..., 3:4] / 255 * opacity * rm[Y0:Y1, X0:X1, None]
    dst = region[Y0:Y1, X0:X1].astype(np.float32)
    if mode == "multiply":
        out = dst * (1 - a) + dst * (sub[..., :3] / 255) * a
    else:   # straw: a faint drop shadow, then the straw itself
        sh = np.roll(np.roll(a, 3, 0), 3, 1) * 0.35
        dst = dst * (1 - sh)
        tint = sub[..., :3] * 0.82 + dst * 0.18     # sit the bright straw into the dim keep
        out = dst * (1 - a) + tint * a
    region[Y0:Y1, X0:X1] = np.clip(out, 0, 255).astype(np.uint8)


def apply(region, rm, seed, straw=0, grime=1.0, blood=0.0):
    rng = np.random.default_rng(seed)
    H, W = rm.shape
    m = rm.astype(np.float32)
    if m.sum() < 1000: return
    img = region.astype(np.float32)
    # 1. blotchy discolouration: soft multi-scale noise, darker and a little warmer in the low spots
    n = np.zeros((H, W), np.float32)
    for k, amp in ((48, 0.6), (16, 0.3), (6, 0.1)):
        g = rng.random((H // k + 2, W // k + 2)).astype(np.float32)
        n += amp * cv2.resize(g, (W, H), interpolation=cv2.INTER_CUBIC)
    n = (n - n.mean()) / (n.std() + 1e-6)
    dark = np.clip(n, 0, 2.5) * 0.045 * grime
    # 2. dust and grime along the walls and into the corners (distance to the room edge)
    dist = cv2.distanceTransform(rm.astype(np.uint8), cv2.DIST_L2, 5)
    edge = np.clip(1 - dist / (3.5 * FT), 0, 1) ** 1.6
    dark += edge * (0.16 + 0.06 * np.clip(n, -1, 1)) * grime
    warm = np.array([1.0, 0.97, 0.92], np.float32)
    img = np.where(m[..., None] > 0, img * (1 - dark[..., None]) * (1 - (1 - warm) * np.clip(dark[..., None] * 4, 0, 1)), img)
    region[...] = np.clip(img, 0, 255).astype(np.uint8)
    # 3. decals: scuffs, spills, drag marks; more near the walls and doors than in the open
    ys, xs = np.nonzero(rm)
    area_ft2 = len(ys) / (FT * FT)
    G = decals("grime")
    names = sorted(glob.glob(os.path.join(HERE, "decals", "grime-*.png")))
    blood_i = [i for i, p in enumerate(names) if p.endswith("grime-14.png")]
    pool = [i for i in range(len(G)) if i not in blood_i]
    for _ in range(int(area_ft2 / 120 * grime)):
        j = rng.integers(len(ys)); cx, cy = xs[j], ys[j]
        i = pool[rng.integers(len(pool))]
        _place(region, rm, G[i], cx, cy, rng.uniform(0.45, 0.9), rng.uniform(0, 360), rng.uniform(0.45, 0.8), "multiply")
    if blood and blood_i and rng.random() < blood:
        j = rng.integers(len(ys)); _place(region, rm, G[blood_i[0]], xs[j], ys[j], rng.uniform(0.5, 0.8), rng.uniform(0, 360), 0.55, "multiply")
    # 4. straw: clumps gathered toward the walls and corners, loose stalks anywhere
    if straw:
        Sd = decals("straw")
        wts = edge[ys, xs] + 0.15; wts = wts / wts.sum()
        for _ in range(int(area_ft2 / 160 * straw)):
            j = rng.choice(len(ys), p=wts)
            _place(region, rm, Sd[rng.integers(len(Sd))], xs[j], ys[j], rng.uniform(0.3, 0.6), rng.uniform(0, 360), rng.uniform(0.7, 0.95), "straw")
