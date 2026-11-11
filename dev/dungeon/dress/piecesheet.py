"""Show the grabbed / named pieces of a room one by one on a plain background, to check the cuts.
usage: python3 piecesheet.py <work_dir> <layout.json> <spec.json> NN out.jpg [names...]"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dress
from dress import pieces_of, room_px, Layout
work, L = os.path.abspath(sys.argv[1]), Layout(sys.argv[2]); spec = json.load(open(sys.argv[3])).get(sys.argv[4], {})
meta = json.load(open(os.path.join(work, "crops", f"crop-{sys.argv[4]}.json"))); ax, ay, _, _ = room_px(L, meta)
P = pieces_of(work, sys.argv[4], spec.get("split"), spec.get("cuts"), (ax, ay), spec.get("grabs"))
names = sys.argv[6:] or list(P)
tiles = []; font = ImageFont.load_default(size=20)
for n in names:
    q = P[n]; o = q["obj"][..., None]; h = q["sh"][..., None]
    bg = np.full(q["col"].shape, (120, 140, 120), np.float32)
    im = bg * (1 - h) * (1 - o) + q["col"] * o
    t = Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)); t = t.resize((max(1, t.width // 2), max(1, t.height // 2)))
    c = Image.new("RGB", (t.width + 10, t.height + 30), (40, 40, 40)); c.paste(t, (5, 25)); ImageDraw.Draw(c).text((5, 2), n, fill=(255, 255, 0), font=font); tiles.append(c)
W = sum(t.width for t in tiles); H = max(t.height for t in tiles)
rows, cur, x = [], [], 0
for t in tiles:
    if x + t.width > 1800 and cur: rows.append(cur); cur, x = [], 0
    cur.append(t); x += t.width
rows.append(cur)
out = Image.new("RGB", (1800, sum(max(t.height for t in r) for r in rows)), (25, 25, 25)); y = 0
for r in rows:
    x = 0
    for t in r: out.paste(t, (x, y)); x += t.width
    y += max(t.height for t in r)
out.save(sys.argv[5], quality=85)
