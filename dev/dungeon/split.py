"""Split final.png into the scene tiles (no side over 8192 px) as WebP: <slug>-q{ix}{iy}.webp.
usage: python3 split.py <watabou.json> <final.png> <out_dir> <slug>"""
import sys, os
from PIL import Image
from layout import Layout
Image.MAX_IMAGE_PIXELS = None

L = Layout(sys.argv[1]); im = Image.open(sys.argv[2]).convert("RGB"); out, slug = sys.argv[3], sys.argv[4]
os.makedirs(out, exist_ok=True)
for ix, iy, x, y, w, h in L.tiles():
    p = os.path.join(out, f"{slug}-q{ix}{iy}.webp")
    im.crop((x, y, x + w, y + h)).save(p, quality=86, method=4)
    print(p, w, h, os.path.getsize(p))
im.resize((L.W // 10, L.H // 10), Image.LANCZOS).save(os.path.join(out, f"{slug}-preview.jpg"), quality=85)
