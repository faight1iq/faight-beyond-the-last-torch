"""Split a final map into scene tiles, downscaled for a lighter scene (5LH3-1: 0.7 = about 98 px per 5 ft).
The Foundry tiles keep their full scene size; only the image files are smaller.
usage: python3 split_scaled.py <layout.json> <final.png> <out_dir> <name_prefix> <scale> [prefix letter]"""
import sys, os
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from layout import Layout
Image.MAX_IMAGE_PIXELS = None
L = Layout(sys.argv[1]); im = Image.open(sys.argv[2]).convert("RGB"); out, slug, k = sys.argv[3], sys.argv[4], float(sys.argv[5])
pre = sys.argv[6] if len(sys.argv) > 6 else "m"
for ix, iy, x, y, w, h in L.tiles():
    p = os.path.join(out, f"{slug}-{pre}{ix}{iy}.webp")
    im.crop((x, y, x + w, y + h)).resize((round(w * k), round(h * k)), Image.LANCZOS).save(p, quality=82, method=6)
    print(p, os.path.getsize(p))
