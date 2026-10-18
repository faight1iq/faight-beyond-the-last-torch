"""Animated water tiles: a seamless looping WebM (VP9 with alpha) for each pool, cut to the pool's shape in final.png.

usage: python3 water.py <watabou.json> <final.png> <out_dir> <slug>
Writes <slug>-water-N.webm and water.json ([{img, x, y, w, h}], scene pixels). build_scene.js places them
as locked tiles just above the map tiles. The video carries its own colour, so the tile can sit over the
painted pool and the still image shows through only at the soft edge.
"""
import sys, os, json, subprocess, tempfile
import numpy as np, cv2
from PIL import Image
from layout import Layout, S
Image.MAX_IMAGE_PIXELS = None

FPS, SECONDS = 24, 6


def pools(L, img):
    """Connected pool areas: the layout's water mask, refined to the painted water (dark, blue-green) in final.png."""
    wm = L.water_mask()
    if not wm.any(): return []
    grown = cv2.dilate(wm, np.ones((41, 41), np.uint8))
    n, lab = cv2.connectedComponents(grown)
    out = []
    for i in range(1, n):
        ys, xs = np.nonzero(lab == i)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        x1 -= (x1 - x0) % 2; y1 -= (y1 - y0) % 2                # VP9 4:2:0 needs even sides
        crop = img[y0:y1, x0:x1].astype(np.int16)
        r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
        painted = (b > r + 8) & (g > r) & (r < 90)            # the teal water the base map paints
        m = (painted & (lab[y0:y1, x0:x1] == i)).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
        out.append((x0, y0, crop.astype(np.uint8), m))
    return out


def frames(base, mask, seed=3):
    """Yield RGBA frames of one loop. Every moving term completes a whole number of cycles per loop."""
    h, w = mask.shape
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    N = FPS * SECONDS
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    edge = np.clip(dist / 10.0, 0, 1)                         # soft 10 px edge so the painted rim shows
    depth = np.clip(dist / 160.0, 0, 1)
    alpha = (edge * 255).astype(np.uint8)
    waves = []
    for _ in range(7):                                         # slow swell: long waves in several directions
        ang = rng.uniform(0, 2 * np.pi); lam = rng.uniform(140, 320)
        waves.append((np.cos(ang) * 2 * np.pi / lam, np.sin(ang) * 2 * np.pi / lam, int(rng.integers(1, 3)), rng.uniform(0, 2 * np.pi)))
    fine = []
    for _ in range(9):                                         # fine ripples for the glints
        ang = rng.uniform(0, 2 * np.pi); lam = rng.uniform(38, 80)
        fine.append((np.cos(ang) * 2 * np.pi / lam, np.sin(ang) * 2 * np.pi / lam, int(rng.integers(2, 5)), rng.uniform(0, 2 * np.pi)))
    base_f = base.astype(np.float32)
    for f in range(N):
        t = 2 * np.pi * f / N
        swell = sum(np.sin(kx * xx + ky * yy - c * t + p) for kx, ky, c, p in waves) / len(waves)
        rip = sum(np.sin(kx * xx + ky * yy - c * t + p) for kx, ky, c, p in fine) / len(fine)
        swell = swell.astype(np.float32); rip = rip.astype(np.float32)
        # refraction: shift the painted water a few pixels along the swell gradient
        gx = cv2.Sobel(swell, cv2.CV_32F, 1, 0, ksize=5); gy = cv2.Sobel(swell, cv2.CV_32F, 0, 1, ksize=5)
        mx = np.clip(xx + gx * 0.35, 0, w - 1); my = np.clip(yy + gy * 0.35, 0, h - 1)
        img = cv2.remap(base_f, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        img *= (1 + 0.22 * swell)[..., None]
        # caustic net: thin bright lines where the ripple field crosses zero, brighter in the shallows
        caustic = np.clip(1 - np.abs(rip * 2.2 + swell * 0.8), 0, 1) ** 9
        img += (caustic * (1 - 0.55 * depth))[..., None] * np.array([20, 40, 46], np.float32)
        glint = np.clip(rip + swell - 1.15, 0, 1) * 2.5
        img += (glint * (1 - 0.4 * depth))[..., None] * np.array([60, 90, 100], np.float32)
        img = np.clip(img, 0, 255).astype(np.uint8)
        yield np.dstack([img, alpha])


def encode(gen, w, h, path):
    with tempfile.TemporaryDirectory() as td:
        for i, fr in enumerate(gen):
            Image.fromarray(fr, "RGBA").save(os.path.join(td, f"f{i:04d}.png"), compress_level=1)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(td, "f%04d.png"),
                        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "34", "-row-mt", "1",
                        "-auto-alt-ref", "0", "-an", path], check=True)


def run(json_path, final_png, out_dir, slug):
    L = Layout(json_path)
    img = np.array(Image.open(final_png).convert("RGB"))
    os.makedirs(out_dir, exist_ok=True)
    placed = []
    for i, (x0, y0, crop, m) in enumerate(pools(L, img)):
        h, w = m.shape
        name = f"{slug}-water-{i}.webm"
        encode(frames(crop, m), w, h, os.path.join(out_dir, name))
        Image.fromarray(np.dstack([crop, m * 255]), "RGBA").save(os.path.join(out_dir, f"water-{i}-mask-check.png"))
        placed.append({"img": name, "x": int(x0), "y": int(y0), "w": int(w), "h": int(h)})
    json.dump(placed, open(os.path.join(out_dir, "water.json"), "w"))
    return placed


if __name__ == "__main__":
    print(run(*sys.argv[1:5]))
