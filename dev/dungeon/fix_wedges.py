"""Fill small enclosed black patches in the wall band (the wedges left at rounded tower corners) with wall texture.
usage: python3 fix_wedges.py <layout.json> <image.png> <wall_texture.png> [max_area]   (in place)
Only the wall band (within 5 ft outside a floor cell) is touched."""
import sys
import numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
from layout import Layout, S
L = Layout(sys.argv.pop(1))
p = sys.argv[1]; img = np.array(Image.open(p).convert("RGB")); amax = int(sys.argv[3]) if len(sys.argv) > 3 else 120000
floor = L.floor_mask() > 0
small = cv2.resize(floor.astype(np.uint8), (floor.shape[1] // 4, floor.shape[0] // 4), interpolation=cv2.INTER_NEAREST)
near = cv2.distanceTransform((1 - small).astype(np.uint8), cv2.DIST_L2, 3) < S * 1.1 / 4
band = cv2.resize(near.astype(np.uint8), (floor.shape[1], floor.shape[0]), interpolation=cv2.INTER_NEAREST).astype(bool) & ~floor
dark = ((img.astype(np.int16).sum(-1) < 45) & band).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(dark, 8)
H, W = dark.shape
tex = np.array(Image.open(sys.argv[2]).convert("RGB").resize((420, 420), Image.LANCZOS)).astype(np.float32) * 0.74 * 0.82
fill = np.zeros(n, bool)
for i in range(1, n):
    x, y, w, h, a = st[i]
    if 300 < a < amax and x > 0 and y > 0 and x + w < W and y + h < H: fill[i] = True
m = fill[lab]
m = cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & (img.astype(np.int16).sum(-1) < 160) & band
ys, xs = np.nonzero(m)
img[ys, xs] = np.clip(tex[ys % 420, xs % 420], 0, 255).astype(np.uint8)
Image.fromarray(img).save(p); print(p, "filled", int(fill.sum()), "patches", len(ys), "px")
