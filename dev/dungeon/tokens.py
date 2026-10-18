"""Portraits and round tokens from ChatGPT creature images.
usage: python3 tokens.py <in_dir> <out_dir> slug [slug ...]
Reads <in_dir>/<slug>.png; writes <out_dir>/<slug>.webp (portrait, longest side 1024, aspect kept) and <slug>-token.webp (512 round token
with a bronze ring, transparent outside the ring)."""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def token(im, size=512, ring=(150, 120, 70)):
    w, h = im.size; s = min(w, h); top = max(0, min(h - s, int((h - s) * 0.35)))   # tall images: keep the upper-middle (the head)
    sq = im.crop(((w - s) // 2, top, (w + s) // 2, top + s)).resize((size, size), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((8, 8, size * 4 - 8, size * 4 - 8), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0)); out.paste(sq, (0, 0), mask)
    d = ImageDraw.Draw(out)
    for i, (c, wdt) in enumerate([((30, 24, 16, 255), 18), (ring + (255,), 12), ((220, 190, 120, 255), 3)]):
        d.ellipse((wdt // 2 + 2, wdt // 2 + 2, size - wdt // 2 - 3, size - wdt // 2 - 3), outline=c, width=wdt)
    return out


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
    for slug in sys.argv[3:]:
        im = Image.open(os.path.join(src, f"{slug}.png")).convert("RGB")
        p = im.copy(); p.thumbnail((1024, 1024), Image.LANCZOS); p.save(os.path.join(dst, f"{slug}.webp"), quality=88)
        token(im).save(os.path.join(dst, f"{slug}-token.webp"), quality=90)
        print(slug)
