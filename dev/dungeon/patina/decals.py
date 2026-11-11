"""Cut a ChatGPT decal sheet (decals on pure white) into numbered decals with alpha.
usage: python3 decals.py <sheet.png> <kind: grime|straw> <out_dir>   -> <out_dir>/<kind>-NN.png (RGBA) + <kind>-index.jpg
grime: kept as a multiply layer (alpha = how much darker than white); straw: keyed out of the white."""
import sys, os
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
src, kind, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
a = np.array(Image.open(src).convert("RGB")).astype(np.float32)
lum = a.mean(-1)
if kind == "grime":
    alpha = np.clip((250 - lum) / 120, 0, 1)
else:
    alpha = np.clip((245 - a[..., 2]) / 90, 0, 1) * np.clip((250 - lum) / 40, 0, 1)
m = cv2.dilate((alpha > 0.06).astype(np.uint8), np.ones((15, 15), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
keep = sorted([i for i in range(1, n) if st[i][4] > 1500], key=lambda i: (st[i][1] // 150, st[i][0]))
idx = Image.new("RGB", (1254, 1254), (120, 110, 100)); dr = ImageDraw.Draw(idx); font = ImageFont.load_default(size=28)
for k, i in enumerate(keep, 1):
    x, y, w, h, _ = st[i]
    sub = (lab[y:y + h, x:x + w] == i)
    al = alpha[y:y + h, x:x + w] * sub
    col = a[y:y + h, x:x + w]
    if kind == "grime":   # colour of the mark at full strength: un-multiply from white
        col = np.clip(255 - (255 - col) / np.maximum(al[..., None], 0.05), 0, 255)
    rgba = np.dstack([col, al * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(os.path.join(out, f"{kind}-{k:02d}.png"))
    tile = Image.fromarray(rgba, "RGBA"); idx.paste(tile, (x, y), tile)
    dr.text((x, y), str(k), fill=(255, 255, 0), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
idx.resize((627, 627)).save(os.path.join(out, f"{kind}-index.jpg"), quality=85)
print(kind, len(keep))
