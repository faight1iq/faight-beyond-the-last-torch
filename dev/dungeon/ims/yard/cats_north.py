"""Replace the three north-yard catapults with ones that face north (John, 2026-11-11).
The old ones are removed by restoring the pre-yard map (final3b) inside each catapult's box where the yard pass changed it;
the new ones (ChatGPT, transparent background, cups at the rear = south) are cut by alpha, scaled alike and laid in
with a soft contact shadow. usage: python3 cats_north.py final4.png final3b.png cats.png out.png"""
import sys
import numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
cur = np.array(Image.open(sys.argv[1]).convert("RGB")); pre = np.array(Image.open(sys.argv[2]).convert("RGB"))
src = np.array(Image.open(sys.argv[3]).convert("RGBA"))
OLD = [(3150, 1670, 3610, 2270), (4505, 1670, 4975, 2270), (6625, 1665, 7095, 2270)]   # map px boxes of the old catapults
for x0, y0, x1, y1 in OLD:
    d = (np.abs(cur[y0:y1, x0:x1].astype(int) - pre[y0:y1, x0:x1].astype(int)).sum(-1) > 12).astype(np.uint8)
    d = cv2.dilate(d, np.ones((21, 21), np.uint8)).astype(np.float32)
    m = cv2.GaussianBlur(d, (21, 21), 0)[..., None]
    cur[y0:y1, x0:x1] = (cur[y0:y1, x0:x1] * (1 - m) + pre[y0:y1, x0:x1] * m).astype(np.uint8)
a = src[..., 3]
n, lab, st, _ = cv2.connectedComponentsWithStats((a > 20).astype(np.uint8), 8)
parts = sorted([i for i in range(1, n) if st[i][4] > 20000], key=lambda i: st[i][0])
assert len(parts) == 3, len(parts)
f = 560 / st[parts[0]][3]          # the mangonel as tall as the old catapults; the others scaled alike
SPOT = [(3380, 2250), (4720, 2250), (6860, 2250)]   # bottom-centre of each
for i, (cx, by) in zip(parts, SPOT):
    x, y, w, h, _ = st[i]
    p = src[y:y + h, x:x + w].copy(); p[..., 3] = np.where(lab[y:y + h, x:x + w] == i, p[..., 3], 0)
    p = cv2.resize(p, (int(w * f), int(h * f)), interpolation=cv2.INTER_AREA)
    H, W = p.shape[:2]; X, Y = cx - W // 2, by - H
    al = p[..., 3:4].astype(np.float32) / 255
    sh = cv2.GaussianBlur(np.roll(np.roll(al[..., 0], 14, 0), 10, 1), (31, 31), 0)[..., None] * 0.55
    reg = cur[Y:Y + H, X:X + W].astype(np.float32)
    reg = reg * (1 - sh); reg = reg * (1 - al) + p[..., :3] * al
    cur[Y:Y + H, X:X + W] = np.clip(reg, 0, 255).astype(np.uint8)
    print("placed", X, Y, W, H)
Image.fromarray(cur).save(sys.argv[4])
