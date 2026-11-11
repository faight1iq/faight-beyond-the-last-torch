"""5LH3-1: paint the leftover black strip along the keep's outer wall (ground floor) as wall top.
usage: python3 fill_dark.py <image.png> <wall_texture.png> x0 y0 x1 y1  (layout squares, may be fractional)"""
import sys
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
p = sys.argv[1]; img = np.array(Image.open(p).convert("RGB"))
x0, y0, x1, y1 = [float(v) for v in sys.argv[3:7]]; S = 280
a, b, c, d = int((x0 + 1) * S), int((y0 + 1) * S), int((x1 + 1) * S), int((y1 + 1) * S)
sub = img[b:d, a:c]
m = sub.astype(np.int16).sum(-1) < 60
tex = np.array(Image.open(sys.argv[2]).convert("RGB").resize((420, 420), Image.LANCZOS)).astype(np.float32) * 0.74 * 0.82
ys, xs = np.nonzero(m)
sub[ys, xs] = np.clip(tex[(ys + b) % 420, (xs + a) % 420], 0, 255).astype(np.uint8)
Image.fromarray(img).save(p); print("filled", len(ys))
