"""Composite ChatGPT room returns onto the base map (steps 8.5-8.7).

usage: python3 composite.py <watabou.json> <work_dir> <returns_dir> [chosen.json]
  returns_dir holds r-NN.png (one per room). chosen.json may map "NN" -> [file, fitmask|null]
  to override the file or force a translation-only fit on part of the crop (x0,y0,x1,y1 as fractions).
Writes final.png (with doors drawn) and final_small.png into work_dir, plus dbg-NN.png per room.
"""
import sys, os, json, glob
import numpy as np, cv2
from PIL import Image
from layout import Layout, S
import doors as doorart
Image.MAX_IMAGE_PIXELS = None


def magmask(a):
    a = a.astype(int)
    return (a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 120)


def shrink_objects(col, obj_a, sh_a, rect, f, min_area=150, tol=40):
    """Cut each furnished object (with its shadow) out of the room and shrink it by f in place (5LET-1, John's method).
    Objects within `tol` px of a room edge stay against that edge; others shrink about their own centre."""
    m = (np.maximum(obj_a, sh_a) > 0.08).astype(np.uint8)
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    col2 = np.zeros_like(col); o2 = np.zeros_like(obj_a); s2 = np.zeros_like(sh_a)
    rx0, ry0, rx1, ry1 = rect
    H, W = obj_a.shape
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a < min_area: continue
        sel = (lab[y:y + h, x:x + w] == i).astype(np.float32)
        ff = 1.0 if (w >= 0.8 * (rx1 - rx0) and h >= 0.8 * (ry1 - ry0)) else f   # pieces spanning the whole room (cell walls) are architecture: keep full size
        nw, nh = max(1, int(round(w * ff))), max(1, int(round(h * ff)))
        rs = lambda arr: cv2.resize(arr, (nw, nh), interpolation=cv2.INTER_AREA)
        pc = rs(col[y:y + h, x:x + w]); po = rs(obj_a[y:y + h, x:x + w] * sel); ps = rs(sh_a[y:y + h, x:x + w] * sel)
        nx = x if x - rx0 < tol else (x + w - nw if rx1 - (x + w) < tol else int(round(x + w / 2 - nw / 2)))
        ny = y if y - ry0 < tol else (y + h - nh if ry1 - (y + h) < tol else int(round(y + h / 2 - nh / 2)))
        nx, ny = min(max(nx, 0), W - nw), min(max(ny, 0), H - nh)
        reg = (slice(ny, ny + nh), slice(nx, nx + nw))
        take = po > o2[reg]
        col2[reg][take] = pc[take]
        o2[reg] = np.maximum(o2[reg], po); s2[reg] = np.maximum(s2[reg], ps)
    return col2, o2, s2


def place(L, key, meta, crop, ret, base, fitmask=None, dbg=None):
    x0, y0, N = meta["x0"], meta["y0"], meta["N"]
    ret = np.array(Image.fromarray(ret).resize((N, N), Image.LANCZOS))

    def struct(a):
        g = cv2.cvtColor(a.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
        g[magmask(a)] = 1.0
        return cv2.GaussianBlur(g, (0, 0), 2)

    warp = np.eye(2, 3, dtype=np.float32)
    try:
        M = None
        if fitmask:
            M = np.zeros((N, N), np.uint8); a, b, c, d = [int(v * N) for v in fitmask]; M[b:d, a:c] = 1
        cc, warp = cv2.findTransformECC(struct(crop), struct(ret), warp,
                                        cv2.MOTION_TRANSLATION if fitmask else cv2.MOTION_AFFINE,
                                        (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), M, 5)
    except cv2.error:
        cc = None
    bad = (not fitmask) and (cc is None or abs(warp[0, 0] - 1) > 0.03 or abs(warp[1, 1] - 1) > 0.03 or abs(warp[0, 1]) > 0.01 or abs(warp[1, 0]) > 0.01)
    how = "walls"
    if bad:   # fall back to fitting the magenta floor shapes
        f = lambda a: cv2.GaussianBlur(magmask(a).astype(np.float32), (0, 0), 4)
        warp = np.eye(2, 3, dtype=np.float32)
        try:
            cc, warp = cv2.findTransformECC(f(crop), f(ret), warp, cv2.MOTION_AFFINE,
                                            (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 500, 1e-7), None, 5)
            how = "magenta"
        except cv2.error:
            warp = np.eye(2, 3, dtype=np.float32); how = "identity"
    al = cv2.warpAffine(ret, warp, (N, N), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)

    # room region in crop coords (circle for rotundas); keep base where it isn't magenta in the crop (water, columns)
    rx, ry, rw, rh = meta["rect"]
    ax, ay = L.px(rx, ry); ax -= x0; ay -= y0
    rm = np.zeros((N, N), np.uint8)
    if meta.get("rotunda"):
        cv2.ellipse(rm, (int(ax + rw * S / 2), int(ay + rh * S / 2)), (int(rw * S / 2), int(rh * S / 2)), 0, 0, 360, 1, -1)
    else:
        rm[max(0, ay):ay + rh * S, max(0, ax):ax + rw * S] = 1
    rm = rm.astype(bool) & magmask(crop)
    rm = cv2.erode(rm.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) | (rm & False)

    R, G, B = al[..., 0], al[..., 1], al[..., 2]
    k = np.clip((np.minimum(R, B) - G) / np.maximum(np.maximum(R, B), 1), 0, 1)
    bg = k > 0.55
    shade = np.clip((R + B) / 2 / 255, 0, 1)
    shadow_a = np.where(bg, np.clip(1 - shade / 0.97, 0, 0.85), 0)
    obj_a = np.clip((0.55 - k) / 0.35, 0, 1)
    col = al.copy()
    col[..., 0] = np.minimum(col[..., 0], col[..., 1] * 1.08 + 12)
    col[..., 2] = np.minimum(col[..., 2], col[..., 1] * 1.18 + 18)
    pur = (col[..., 0] > col[..., 1] + 6) & (col[..., 2] > col[..., 1] + 6)
    gg = col[..., 1]
    col[..., 0] = np.where(pur, np.minimum(col[..., 0], gg + 4), col[..., 0])
    col[..., 2] = np.where(pur, np.minimum(col[..., 2], gg * 1.06 + 8), col[..., 2])
    semi = (k > 0.12) & (obj_a > 0)
    g = np.clip(G / np.maximum(obj_a, 0.2), 0, 255)
    neutral = np.stack([g * 0.97, g, np.minimum(g * 1.06, 255)], -1)
    col[semi] = neutral[semi]
    shrink = os.environ.get("SHRINK", "")          # "auto": f = 3 / crop size in squares, 0.45-0.9; or a number
    if key in os.environ.get("SHRINK_SKIP", "").split(","): shrink = ""   # rooms already at true scale (supplement returns)
    if shrink:
        f = float(shrink) if shrink != "auto" else min(0.9, max(0.45, 3.0 / (N / S)))
        rmf = rm.astype(np.float32)
        col, obj_a, shadow_a = shrink_objects(col, obj_a * rmf, shadow_a * rmf, (ax, ay, ax + rw * S, ay + rh * S), f)

    if os.environ.get("SAVE_LAYERS") and dbg:   # per-room keyed layer, for building supplement crops
        np.savez_compressed(os.path.join(os.path.dirname(dbg), f"layer-{key}.npz"), col=col.astype(np.uint8),
                            obj=(obj_a * rm).astype(np.float16), sh=(shadow_a * rm).astype(np.float16), rm=rm)
    by0, bx0 = max(0, y0), max(0, x0); by1, bx1 = min(L.H, y0 + N), min(L.W, x0 + N)
    sl = (slice(by0 - y0, by1 - y0), slice(bx0 - x0, bx1 - x0))
    sub = base[by0:by1, bx0:bx1].astype(np.float32)
    m = rm[sl][..., None]
    s = sub * (1 - shadow_a[sl][..., None] * m)
    o = obj_a[sl][..., None] * m
    s = s * (1 - o) + col[sl] * o
    base[by0:by1, bx0:bx1] = np.clip(s, 0, 255).astype(np.uint8)
    objfrac = float((obj_a * rm).sum() / max(1, rm.sum()))
    if dbg:
        Image.fromarray(base[by0:by1, bx0:bx1]).resize(((bx1 - bx0) // 3, (by1 - by0) // 3), Image.LANCZOS).save(dbg)
    return dict(key=key, fit=how, ecc=None if cc is None else round(float(cc), 3), objfrac=round(objfrac, 3),
                scale=[round(float(warp[0, 0]), 3), round(float(warp[1, 1]), 3)], shift=[round(float(warp[0, 2])), round(float(warp[1, 2]))])


def run(json_path, work, returns, chosen_path=None):
    L = Layout(json_path)
    chosen = json.load(open(chosen_path)) if chosen_path and os.path.exists(chosen_path) else {}
    base = np.array(Image.open(os.path.join(work, "base_map.png")).convert("RGB"))
    report = []
    for meta_path in sorted(glob.glob(os.path.join(work, "crops", "crop-*.json"))):
        key = meta_path[-7:-5]
        f, fm = chosen.get(key, [f"r-{key}.png", None])
        rp = os.path.join(returns, f)
        if not os.path.exists(rp):
            report.append(dict(key=key, missing=f)); continue
        meta = json.load(open(meta_path))
        crop = np.array(Image.open(os.path.join(work, "crops", f"room-{key}.png")).convert("RGB"))
        ret = np.array(Image.open(rp).convert("RGB"))
        report.append(place(L, key, meta, crop, ret, base, fm, os.path.join(work, f"dbg-{key}.png")))
    img = doorart.draw_doors(L, base.astype(np.float32))
    out = np.clip(img, 0, 255).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(work, "final.png"))
    Image.fromarray(out).resize((L.W // 8, L.H // 8), Image.LANCZOS).save(os.path.join(work, "final_small.png"))
    return report


if __name__ == "__main__":
    for r in run(*sys.argv[1:5]): print(r)
