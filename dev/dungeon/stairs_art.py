"""Paint stair art (ChatGPT top-down stair images) over the code-drawn stairs in base_map.png (5LH3-1 rework).
usage: python3 stairs_art.py <layout.json> <base_map.png> <art_dir>
art_dir holds st_up, st_down (1x2 stairs), gr_up, gr_down (2x2), spiral (1x1) as .png or .webp (dev/dungeon/art/stairs).
Each image is drawn with its bottom edge at floor level (the end you step on from); the stair's `dir` is the way you
walk onto it, so 'n' keeps the image as is, 's' turns it 180, 'e'/'w' turn it 90."""
import sys, os
import numpy as np, cv2
from PIL import Image
from layout import Layout, S
Image.MAX_IMAGE_PIXELS = None
L = Layout(sys.argv[1]); path = sys.argv[2]; art = sys.argv[3]
out = np.array(Image.open(path).convert("RGB"))
for st in L.stairs:
    w, h = st["w"], st["h"]
    kind = "spiral" if (w, h) == (1, 1) else ("gr_" if w == h else "st_") + ("down" if st["down"] else "up")
    fn = next(os.path.join(art, kind + e) for e in (".png", ".webp") if os.path.exists(os.path.join(art, kind + e)))
    im = Image.open(fn).convert("RGB")
    rot = {"n": 0, "w": 90, "s": 180, "e": 270}[st["dir"]]      # PIL rotates anticlockwise
    if rot: im = im.rotate(rot, expand=True)
    a, b = int((st["x"] - L.X0) * S), int((st["y"] - L.Y0) * S); W, H = w * S, h * S
    arr = np.array(im.resize((W, H), Image.LANCZOS)).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    edge = np.minimum(np.minimum(xx, W - 1 - xx), np.minimum(yy, H - 1 - yy)).astype(np.float32)
    arr *= (0.55 + 0.45 * np.clip(edge / 18, 0, 1))[..., None]     # soft inner shadow where the stair meets the floor
    out[b:b + H, a:a + W] = np.clip(arr, 0, 255).astype(np.uint8)
    cv2.rectangle(out, (a, b), (a + W - 1, b + H - 1), (40, 36, 32), 4)
    print(st["id"], kind, st["dir"])
Image.fromarray(out).save(path)
