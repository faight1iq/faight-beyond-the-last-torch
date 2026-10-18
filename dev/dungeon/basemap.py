"""Base map: floor and wall tops drawn in code from the Watabou layout (step 8.2).

usage: python3 basemap.py <watabou.json> <floor.png> <wall.png> <out_dir> [theme]
themes: frost (Icefall), sand (desert / sandstone). Writes base_map.png and base_small.png.
"""
import sys, os
import numpy as np, cv2
from PIL import Image
from layout import Layout, S
Image.MAX_IMAGE_PIXELS = None

THEMES = {
    "frost": dict(wall_tint=(0.62, 0.66, 0.74), bevel=(200, 208, 218), dust=(225, 235, 245), dust_amt=0.12, rock=(16, 17, 20)),
    "jungle": dict(wall_tint=(0.66, 0.74, 0.60), bevel=(160, 170, 130), dust=(96, 120, 70), dust_amt=0.18, rock=(12, 15, 11)),
    "storm": dict(wall_tint=(0.70, 0.74, 0.76), bevel=(176, 184, 190), dust=(150, 160, 150), dust_amt=0.14, rock=(14, 15, 17)),
    "sand":  dict(wall_tint=(0.80, 0.72, 0.62), bevel=(196, 170, 132), dust=(214, 186, 140), dust_amt=0.22, rock=(22, 18, 14)),
}


def build(json_path, floor_tex, wall_tex, out_dir, theme="frost", seed=5):
    th = THEMES[theme]
    L = Layout(json_path)
    rng = np.random.default_rng(seed)
    tex = lambda p, n: np.array(Image.open(p).convert("RGB").resize((n, n), Image.LANCZOS)).astype(np.float32)
    FT = tex(floor_tex, 560)
    WT = tex(wall_tex, 420) * np.array(th["wall_tint"], np.float32)
    W, H, T = L.W, L.H, S // 2
    floor = L.floor_mask()
    water = L.water_mask()
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * T + 1, 2 * T + 1))
    wall = ((cv2.dilate(floor, k) > 0) & (floor == 0)).astype(np.uint8)
    dfl = cv2.distanceTransform(floor, cv2.DIST_L2, 5)
    dwl = cv2.distanceTransform((1 - floor).astype(np.uint8), cv2.DIST_L2, 5)
    dwa = cv2.distanceTransform(water, cv2.DIST_L2, 5) if water.any() else None   # distance inside the pool to its edge
    outer = ((cv2.dilate(wall, np.ones((5, 5), np.uint8)) > 0) & (wall == 0) & (floor == 0))
    out = np.zeros((H, W, 3), np.uint8)
    STRIP = 1024
    for y0 in range(0, H, STRIP):
        y1 = min(H, y0 + STRIP); h = y1 - y0
        yy = np.arange(y0, y1)[:, None]; xx = np.arange(W)[None, :]
        fl = FT[yy % 560, xx % 560]; wt = WT[yy % 420, xx % 420]
        img = np.empty((h, W, 3), np.float32); img[:] = np.array(th["rock"], np.float32)
        img += rng.normal(0, 3, (h, W, 1)).astype(np.float32)
        f = floor[y0:y1].astype(bool); w = wall[y0:y1].astype(bool)
        df = dfl[y0:y1]; dw = dwl[y0:y1]
        img[w] = wt[w] * (1.0 - 0.25 * np.clip((dw[w] - 8) / (T - 8), 0, 1))[:, None]
        bev = w & (dw < 6); img[bev] = img[bev] * 0.6 + np.array(th["bevel"]) * 0.4
        edge = w & (dw >= 6) & (dw < 9); img[edge] *= 0.55
        img[outer[y0:y1]] *= 0.4
        img[f] = fl[f]
        sh = 0.70 * np.exp(-df / 34.0); img[f] *= (1 - sh[f])[:, None]
        fn = cv2.GaussianBlur(rng.random((h, W)).astype(np.float32), (0, 0), 3)
        dust = np.clip(np.exp(-df / 9.0) * (fn * 1.6 - 0.3), 0, 1) * th["dust_amt"]
        fr = f & (df > 2); img[fr] = img[fr] * (1 - dust[fr][:, None]) + np.array(th["dust"]) * dust[fr][:, None]
        line = f & (df < 3); img[line] *= 0.25
        if dwa is not None:   # still dark water: deep teal, lighter at the rim, faint ripples
            wa = water[y0:y1].astype(bool)
            if wa.any():
                dd = dwa[y0:y1]
                depth = np.clip(dd / (S * 0.8), 0, 1)
                rip = (cv2.GaussianBlur(rng.normal(0, 1, (h, W)).astype(np.float32), (0, 0), 5) * 14
                       + cv2.GaussianBlur(rng.normal(0, 1, (h, W)).astype(np.float32), (0, 0), 18) * 22)
                glint = np.clip(rip - 18, 0, 30) * 1.5
                col = np.stack([10 + 34 * (1 - depth) + rip * 0.5 + glint,
                                26 + 44 * (1 - depth) + rip * 0.7 + glint,
                                34 + 48 * (1 - depth) + rip * 0.8 + glint], -1)
                shore = np.clip(1 - dd / 22, 0, 1)[..., None]          # dark wet band at the edge
                col = col * (1 - 0.45 * shore)
                rim = wa & (dd < 5)
                img[wa] = col[wa]
                img[rim] = img[rim] * 0.6 + np.array(th["bevel"]) * 0.25
        out[y0:y1] = np.clip(img, 0, 255).astype(np.uint8)
    # columns: round stone pillars with a contact shadow
    for (x, y) in L.columns:
        cx, cy = [int(v) for v in L.px(x + 0.5, y + 0.5)]
        r = int(S * 0.28)
        cv2.circle(out, (cx + 10, cy + 12), r + 8, (0, 0, 0), -1, cv2.LINE_AA)
        out[cy - r - 30:cy + r + 30, cx - r - 30:cx + r + 30] = cv2.GaussianBlur(out[cy - r - 30:cy + r + 30, cx - r - 30:cx + r + 30], (0, 0), 6)
        cv2.circle(out, (cx, cy), r, tuple(int(c) for c in th["bevel"]), -1, cv2.LINE_AA)
        cv2.circle(out, (cx, cy), int(r * 0.78), tuple(int(c * 0.82) for c in th["bevel"]), -1, cv2.LINE_AA)
        cv2.circle(out, (cx, cy), r, (40, 34, 28), 3, cv2.LINE_AA)
    os.makedirs(out_dir, exist_ok=True)
    Image.fromarray(out).save(os.path.join(out_dir, "base_map.png"))
    Image.fromarray(out).resize((W // 10, H // 10), Image.LANCZOS).save(os.path.join(out_dir, "base_small.png"))
    return W, H


if __name__ == "__main__":
    print(build(*sys.argv[1:5], *(sys.argv[5:6] or ["frost"])))
