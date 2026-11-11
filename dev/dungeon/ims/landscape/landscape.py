"""Set the ground-floor fortress into a ChatGPT landscape (John, 2026-11-11: rocky highland, organic moat, bridge raised).
The ChatGPT picture's flat grey fortress footprint (its wall faces, FP) is stretched onto the real curtain wall
(REAL, map px of the old 10640 x 10080 map), the picture is cropped to the new scene (the old map moves by OFF),
ChatGPT's own wall buttresses that stick out past the real wall are painted out, and the real fortress is cut from the
old map at its wall faces and laid on top with a soft shadow.
Outputs (out_dir): bg.webp (whole scene at BG_SCALE, one tile), fort-<ix><iy>.webp (the fortress at 0.7, alpha),
bridge-down.png / bridge-up.png (full-res drawbridge art, laid by Foundry as tiles), preview.jpg, geom.json.
usage: python3 landscape.py <old final.png> <chatgpt.png> <out_dir> <tile prefix>"""
import sys, os, json
import numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
FP = (342, 291, 913, 836)            # ChatGPT wall faces (x0, y0, x1, y1) in its 1254 px picture
REAL = (1400, 1400, 9240, 8400)      # the real curtain wall's outer faces on the old map
OFF = 1400                            # the old map moves right and down by this much
W, H = 13440, 13160                   # new scene
BG_SCALE, FORT_SCALE = 0.35, 0.7
GATE = (5040, 5600)                   # old-map x of the drawbridge deck (the gate opening)

old_p, gpt_p, out, pre = sys.argv[1:5]
os.makedirs(out, exist_ok=True)
gpt = np.array(Image.open(gpt_p).convert("RGB"))
sx = (REAL[2] - REAL[0]) / (FP[2] - FP[0]); sy = (REAL[3] - REAL[1]) / (FP[3] - FP[1])
# where the ChatGPT picture's origin lands in the new scene
ox = REAL[0] + OFF - FP[0] * sx; oy = REAL[1] + OFF - FP[1] * sy
# 1. paint out ChatGPT's grey walls outside the real footprint (buttresses, the gate notch) with what is around them
g = gpt.astype(np.float32); sat = g.max(-1) - g.min(-1)
grey = (sat < 28) & (g.mean(-1) > 70)
box = np.zeros(grey.shape, bool); box[FP[1] - 24:FP[3] + 24, FP[0] - 24:FP[2] + 24] = True
inner = np.zeros(grey.shape, bool); inner[FP[1] + 2:FP[3] - 2, FP[0] + 2:FP[2] - 2] = True
m = (box & ~inner).astype(np.uint8)     # the whole ring just outside the faces (buttresses and their shadows)
fill = gpt.copy(); fill[inner] = (26, 46, 54)        # under the fortress: moat water, never seen
gpt2 = cv2.inpaint(fill, m * 255, 9, cv2.INPAINT_TELEA)
# 2. the background at BG_SCALE
bw, bh = round(W * BG_SCALE), round(H * BG_SCALE)
M = np.float32([[sx * BG_SCALE, 0, ox * BG_SCALE], [0, sy * BG_SCALE, oy * BG_SCALE]])
bg = cv2.warpAffine(gpt2, M, (bw, bh), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
# the fortress's shadow on the water and ground
fx0, fy0, fx1, fy1 = [round((v + OFF) * BG_SCALE) for v in REAL]
sh = np.zeros((bh, bw), np.float32); sh[fy0:fy1, fx0:fx1] = 1
sh = cv2.GaussianBlur(np.roll(np.roll(sh, 10, 0), 8, 1), (0, 0), 12) * 0.55
bg = (bg * (1 - sh[..., None])).astype(np.uint8)
Image.fromarray(bg).save(os.path.join(out, f"{pre}-bg.webp"), quality=84, method=6)
# 3. the fortress, cut at its wall faces, in four tiles at FORT_SCALE
old = Image.open(old_p).convert("RGB")
fort = old.crop(REAL)
fw, fh = fort.size; tiles = []
for iy in range(2):
    for ix in range(2):
        x0, x1 = ix * fw // 2, (ix + 1) * fw // 2; y0, y1 = iy * fh // 2, (iy + 1) * fh // 2
        t = fort.crop((x0, y0, x1, y1)); t = t.resize((round(t.width * FORT_SCALE), round(t.height * FORT_SCALE)), Image.LANCZOS)
        name = f"{pre}-fort-{ix}{iy}.webp"; t.save(os.path.join(out, name), quality=82, method=6)
        tiles.append({"img": name, "x": REAL[0] + OFF + x0, "y": REAL[1] + OFF + y0, "w": x1 - x0, "h": y1 - y0})
# 4. drawbridge art. Down: the old bridge's planks repeated from the gate to the far bank. Up: the bridge raised
#    against the gate, seen from above as its thick top edge with the chains running up into the gatehouse.
oldn = np.array(old)
planks = oldn[8510:8846, GATE[0]:GATE[1]]                      # three clean plank courses of the old bridge deck
# far bank below the gate: first row (going south) where the background stops being water
cx = round((sum(GATE) / 2 + OFF) * BG_SCALE)
col = bg[fy1:, cx - 6:cx + 6].astype(np.float32).mean(1)
water = (col[:, 0] < 60) & (col[:, 2] > col[:, 0])
bank = next((i for i in range(30, len(water)) if not water[i:i + 8].any()), 300)
length = round(bank / BG_SCALE) + 140                          # onto the bank a little
reps = int(np.ceil(length / planks.shape[0]))
down = np.concatenate([planks] * reps, 0)[:length]
Image.fromarray(down).save(os.path.join(out, "bridge-down.png"))
# raised: the deck's thick top edge standing against the wall, iron-shod, its shadow on the water, chains to the wall
bwid = GATE[1] - GATE[0]; up = np.zeros((130, bwid, 4), np.uint8)
wood = cv2.resize(np.ascontiguousarray(planks[:, :, :].transpose(1, 0, 2)), (60, bwid)).transpose(1, 0, 2)   # grain runs across
shade = np.linspace(1.15, 0.55, 60)[:, None, None]
up[10:70, :, :3] = np.clip(wood * shade, 0, 255).astype(np.uint8); up[10:70, :, 3] = 255
up[10:16, :, :3] = (150, 150, 155); up[64:70, :, :3] = (40, 40, 44)          # iron shoe on top, dark lower lip
for xb in range(28, bwid, 112): up[10:70, xb:xb + 10, :3] = (62, 62, 68)    # iron straps
up[70:130, :, :3] = 0; up[70:130, :, 3] = np.linspace(170, 0, 60).astype(np.uint8)[:, None]   # shadow on the water
for cxp in (24, bwid - 24):                                                   # chains up to the wall
    for yy in range(0, 16, 8): cv2.ellipse(up, (cxp, yy + 3), (5, 4), 0, 0, 360, (150, 150, 156, 255), 2)
    up[0:10, cxp - 6:cxp + 6, 3] = np.maximum(up[0:10, cxp - 6:cxp + 6, 3], 230)
Image.fromarray(up).save(os.path.join(out, "bridge-up.png"))
geom = {"scene": [W, H], "offset": OFF, "bg": {"img": f"{pre}-bg.webp", "x": 0, "y": 0, "w": W, "h": H}, "fort": tiles,
        "bridge_down": {"x": GATE[0] + OFF, "y": REAL[3] + OFF, "w": GATE[1] - GATE[0], "h": length},
        "bridge_up": {"x": GATE[0] + OFF, "y": REAL[3] + OFF - 10, "w": GATE[1] - GATE[0], "h": 130},
        "entrance": {"x": round(sum(GATE) / 2 + OFF), "y": REAL[3] + OFF + length + 280}}
json.dump(geom, open(os.path.join(out, "geom.json"), "w"), indent=1)
# preview
pv = Image.fromarray(bg).resize((bw // 3, bh // 3)); f = fort.resize((fw * BG_SCALE // 3 // 1, fh * BG_SCALE // 3 // 1) if False else (round(fw * BG_SCALE / 3), round(fh * BG_SCALE / 3)))
pv.paste(f, (round((REAL[0] + OFF) * BG_SCALE / 3), round((REAL[1] + OFF) * BG_SCALE / 3)))
d = Image.fromarray(down).resize((max(1, round(down.shape[1] * BG_SCALE / 3)), round(length * BG_SCALE / 3)))
pv.paste(d, (round((GATE[0] + OFF) * BG_SCALE / 3), round((REAL[3] + OFF) * BG_SCALE / 3)))
pv.save(os.path.join(out, "preview.jpg"), quality=85)
print(json.dumps(geom))
