"""5LH3-1: paint the solid masonry inside the keep (ground floor dead space between rooms) as wall top instead of black rock.
usage: python3 fill_solid.py <layout.json> <final.png> <wall_texture.png> x0 y0 x1 y1   (rect in squares, inclusive)"""
import sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, __file__.rsplit("/", 2)[0])
from layout import Layout, S
Image.MAX_IMAGE_PIXELS = None
L = Layout(sys.argv[1]); fin = sys.argv[2]
x0, y0, x1, y1 = [int(v) for v in sys.argv[4:8]]
img = np.array(Image.open(fin).convert("RGB"))
floor = L.floor_mask()
T = S // 2
band = cv2.dilate(floor, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * T + 1, 2 * T + 1))) > 0
reg = np.zeros(floor.shape, bool)
a, b = int((x0 - L.X0) * S), int((y0 - L.Y0) * S); c, d = int((x1 + 1 - L.X0) * S), int((y1 + 1 - L.Y0) * S)
reg[b:d, a:c] = True
dark = img.astype(np.int32).sum(-1) < 75
m = reg & (~band | (dark & ~(floor > 0)))
tex = np.array(Image.open(sys.argv[3]).convert("RGB").resize((420, 420), Image.LANCZOS)).astype(np.float32) * np.array([0.74, 0.73, 0.72], np.float32)
ys, xs = np.nonzero(m)
img[ys, xs] = np.clip(tex[ys % 420, xs % 420] * 0.82, 0, 255).astype(np.uint8)
Image.fromarray(img).save(fin)
print("filled", int(m.sum()))
