"""Furnish open yard ground that is not a room (5LH3-1: catapults, hitching rails; John, 2026-11-11).
A crop of the finished map has its open ground painted magenta (mask-<key>.npy), ChatGPT furnishes the magenta, and the
return is keyed (magenta out, shadows kept, as composite.py does) and laid back over the map inside the mask only.
usage: python3 yard.py <final_in.png> <final_out.png> <yard_dir> key [key ...]
yard_dir holds meta.json ({key: [x0, y0, x1, y1]} map px), mask-<key>.npy, crop-<key>.png and ret-<key>.png."""
import sys, os, json
import numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None


def key_out(al):
    al = al.astype(np.float32)
    R, G, B = al[..., 0], al[..., 1], al[..., 2]
    k = np.clip((np.minimum(R, B) - G) / np.maximum(np.maximum(R, B), 1), 0, 1)
    bg = k > 0.55
    shade = np.clip((R + B) / 2 / 255, 0, 1)
    shadow = np.where(bg, np.clip(1 - shade / 0.97, 0, 0.85), 0)
    obj = np.clip((0.55 - k) / 0.35, 0, 1)
    col = al.copy()
    col[..., 0] = np.minimum(col[..., 0], col[..., 1] * 1.08 + 12)
    col[..., 2] = np.minimum(col[..., 2], col[..., 1] * 1.18 + 18)
    semi = (k > 0.12) & (obj > 0)
    g = np.clip(G / np.maximum(obj, 0.2), 0, 255)
    col[semi] = np.stack([g * 0.97, g, np.minimum(g * 1.06, 255)], -1)[semi]
    return col, obj, shadow


if __name__ == "__main__":
    final = np.array(Image.open(sys.argv[1]).convert("RGB")); yd = sys.argv[3]
    meta = json.load(open(os.path.join(yd, "meta.json")))
    for key in sys.argv[4:]:
        x0, y0, x1, y1 = meta[key]; W, H = x1 - x0, y1 - y0
        mask = np.load(os.path.join(yd, f"mask-{key}.npy"))
        crop = np.array(Image.open(os.path.join(yd, f"crop-{key}.png")).convert("RGB"))
        ret = np.array(Image.open(os.path.join(yd, f"ret-{key}.png")).convert("RGB").resize((W, H), Image.LANCZOS))
        # small shift check on the untouched part of the crop (ChatGPT sometimes nudges the frame)
        outside = (~cv2.dilate(mask.astype(np.uint8), np.ones((41, 41), np.uint8)).astype(bool)).astype(np.float32)
        a = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY).astype(np.float32) * outside
        b = cv2.cvtColor(ret, cv2.COLOR_RGB2GRAY).astype(np.float32) * outside
        (dx, dy), resp = cv2.phaseCorrelate(a, b)
        if abs(dx) < 40 and abs(dy) < 40 and resp > 0.05:
            M = np.float32([[1, 0, -dx], [0, 1, -dy]]); ret = cv2.warpAffine(ret, M, (W, H), borderMode=cv2.BORDER_REPLICATE)
        col, obj, sh = key_out(ret)
        m = cv2.GaussianBlur(cv2.dilate(mask.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(np.float32), (9, 9), 0)
        magenta_left = float(((obj < 0.5) & mask).sum() + (sh > 0).sum()) / max(1, mask.sum())
        if magenta_left < 0.15:   # ChatGPT painted its own ground over the magenta: take its picture inside the mask as is
            col = ret.astype(np.float32); obj = cv2.GaussianBlur(mask.astype(np.float32), (31, 31), 0); sh = np.zeros_like(obj)
        obj *= m; sh *= m
        sub = final[y0:y1, x0:x1].astype(np.float32)
        sub = sub * (1 - sh[..., None]); sub = sub * (1 - obj[..., None]) + col * obj[..., None]
        final[y0:y1, x0:x1] = np.clip(sub, 0, 255).astype(np.uint8)
        Image.fromarray(final[y0:y1, x0:x1]).resize((W // 3, H // 3)).save(os.path.join(yd, f"after-{key}.jpg"), quality=82)
        print(key, "shift", round(dx, 1), round(dy, 1), "cover", round(float((obj > 0.5).sum() / max(1, mask.sum())), 2))
    Image.fromarray(final).save(sys.argv[2])
