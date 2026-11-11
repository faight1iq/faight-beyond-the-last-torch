"""Room dressing, step 1: number every furnishing piece of a room and report its size in feet.
usage: python3 pieces.py <work_dir> <layout.json> NN [NN ...]  -> <work_dir>/dress/pieces-NN.jpg + pieces-NN.json
Pieces are the connected objects (with their shadows) of the room's saved layer (composite.py SAVE_LAYERS=1)."""
import sys, os, json
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from layout import Layout, S
Image.MAX_IMAGE_PIXELS = None


def label(obj, sh, min_area=400, reach=45):
    """Objects are split on the object alpha alone (shadows join neighbours); each shadow pixel within `reach` px
    goes to its nearest object. Returns lab (0 = nothing), stats, the kept labels."""
    core = cv2.morphologyEx((obj > 0.45).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, cl, st, _ = cv2.connectedComponentsWithStats(core, 8)
    good = np.zeros(n, bool); good[1:] = st[1:, 4] >= min_area
    core = good[cl]
    dist, idx = cv2.distanceTransformWithLabels((~core).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(core); seed = np.zeros(idx.max() + 1, np.int32)
    seed[idx[ys, xs]] = cl[ys, xs]
    lab = seed[idx]
    lab[~((np.maximum(obj, sh) > 0.04) & (dist < reach))] = 0
    lab[core] = cl[core]
    keep = [i for i in range(1, n) if good[i]]
    stats = np.zeros((n, 5), int)
    for i in keep:
        ys, xs = np.nonzero(lab == i)
        stats[i] = [xs.min(), ys.min(), xs.max() - xs.min() + 1, ys.max() - ys.min() + 1, len(xs)]
    return lab, stats, keep


def room_px(L, meta):
    rx, ry, rw, rh = meta["rect"]
    return int((rx - L.X0) * S - meta["x0"]), int((ry - L.Y0) * S - meta["y0"]), rw * S, rh * S


if __name__ == "__main__":
    work, L = sys.argv[1], Layout(sys.argv[2])
    final = Image.open(os.path.join(work, "final.png")).convert("RGB")
    os.makedirs(os.path.join(work, "dress"), exist_ok=True)
    font = ImageFont.load_default(size=22)
    for key in sys.argv[3:]:
        meta = json.load(open(os.path.join(work, "crops", f"crop-{key}.json")))
        d = np.load(os.path.join(work, f"layer-{key}.npz"))
        obj, sh = d["obj"].astype(np.float32), d["sh"].astype(np.float32)
        lab, stats, keep = label(obj, sh)
        ax, ay, aw, ah = room_px(L, meta)
        x0, y0 = meta["x0"], meta["y0"]
        m = S // 2
        im = final.crop((x0 + ax - m, y0 + ay - m, x0 + ax + aw + m, y0 + ay + ah + m))
        k = 3; im = im.resize((im.width // k, im.height // k), Image.LANCZOS)
        dr = ImageDraw.Draw(im)
        for g in range(0, aw + 1, S // 2): dr.line([((m + g) / k, m / k), ((m + g) / k, (m + ah) / k)], fill=(0, 255, 255), width=1)
        for g in range(0, ah + 1, S // 2): dr.line([(m / k, (m + g) / k), ((m + aw) / k, (m + g) / k)], fill=(0, 255, 255), width=1)
        out = []
        for j, i in enumerate(keep, 1):
            x, y, w, h, a = stats[i]
            fx, fy = (x - ax) / S * 10, (y - ay) / S * 10
            out.append(dict(id=j, lab=int(i), x=round(fx, 1), y=round(fy, 1), w=round(w / S * 10, 1), h=round(h / S * 10, 1)))
            bx, by = (x - ax + m) / k, (y - ay + m) / k
            dr.rectangle([bx, by, bx + w / k, by + h / k], outline=(255, 60, 60), width=2)
            dr.text((bx + 3, by + 1), str(j), fill=(255, 255, 0), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
        im.save(os.path.join(work, "dress", f"pieces-{key}.jpg"), quality=82)
        json.dump(out, open(os.path.join(work, "dress", f"pieces-{key}.json"), "w"))
        print(key, f"{meta['rect'][2]*10}x{meta['rect'][3]*10} ft", " ".join(f"{p['id']}:{p['w']}x{p['h']}" for p in out))
