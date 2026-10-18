"""Door, gate, arch and stair art drawn at the Watabou door cells (step 8.7)."""
import numpy as np, cv2
from layout import S

_rng = np.random.default_rng(11)


def wood(h, w, frost=False):
    base = np.zeros((h, w, 3), np.float32); base[:] = (88, 64, 44)
    n = cv2.GaussianBlur(_rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), sigmaX=1, sigmaY=6)
    base += n[..., None] * 18
    plank = max(1, w // 5)
    for x in range(plank, w, plank): base[:, max(0, x - 2):x + 1] *= 0.45
    for y in (h // 5, h * 4 // 5): base[max(0, y - 6):y + 6, :] = (58, 60, 64)
    return base


def bars(h, w):
    """Portcullis / barred gate: iron bars across the opening on a transparent field."""
    arr = np.zeros((h, w, 3), np.float32); a = np.zeros((h, w), np.float32)
    step = max(6, h // 7)
    for y in range(step // 2, h, step): arr[y - 5:y + 5, :] = (62, 64, 70); a[y - 5:y + 5, :] = 1
    for x in (w // 4, w * 3 // 4): arr[:, x - 4:x + 4] = (52, 54, 60); a[:, x - 4:x + 4] = 1
    return arr, a


def stone_bands(h, w, n=5, dark_end=False):
    base = np.zeros((h, w, 3), np.float32); base[:] = (120, 114, 104)
    for i in range(n):
        y0 = i * h // n; y1 = (i + 1) * h // n
        base[y0:y1] *= (1 - 0.18 * i) if dark_end else (1 - 0.12 * i)
        base[y1 - 4:y1] *= 0.45
    base += cv2.GaussianBlur(_rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), 2)[..., None] * 6
    return base


def paste(img, arr, x, y, alpha=None):
    h, w = arr.shape[:2]
    if alpha is None: img[y:y + h, x:x + w] = arr
    else: img[y:y + h, x:x + w] = img[y:y + h, x:x + w] * (1 - alpha[..., None]) + arr * alpha[..., None]


def draw_doors(L, img):
    for (x, y), D in L.doors.items():
        t = D["type"]; cx, cy = [int(v) for v in L.px(x, y)]; dx, dy = D["dir"]["x"], D["dir"]["y"]
        horiz = dx != 0     # passage runs east-west -> door slab is vertical
        if t in (1, 3, 5, 7):
            th = 48 if t in (1, 7) else 64
            if horiz:
                xx = cx + S // 2 - th // 2
                img[cy:cy + S, xx + th:xx + th + 14] *= 0.6
                paste(img, wood(S, th), xx, cy)
                if t == 5: img[cy + S // 2 - 10:cy + S // 2 + 10, xx - 20:xx + th + 20] = (50, 52, 56)
            else:
                yy = cy + S // 2 - th // 2
                img[yy + th:yy + th + 14, cx:cx + S] *= 0.6
                paste(img, np.transpose(wood(S, th), (1, 0, 2)), cx, yy)
                if t == 5: img[yy - 20:yy + th + 20, cx + S // 2 - 10:cx + S // 2 + 10] = (50, 52, 56)
            if t in (3, 5):
                if horiz: img[cy + S // 2 - 2:cy + S // 2 + 2, cx + S // 2 - th // 2:cx + S // 2 + th // 2] *= 0.3
                else: img[cy + S // 2 - th // 2:cy + S // 2 + th // 2, cx + S // 2 - 2:cx + S // 2 + 2] *= 0.3
        elif t == 6:
            th = 40
            arr, a = bars(S, th)
            if horiz: paste(img, arr, cx + S // 2 - th // 2, cy, a)
            else: paste(img, np.transpose(arr, (1, 0, 2)), cx, cy + S // 2 - th // 2, a.T)
        elif t in (8, 9):
            arr = stone_bands(S, S, 7 if t == 8 else 4, dark_end=(t == 8))
            if horiz: arr = np.transpose(arr, (1, 0, 2))
            if dx < 0 or dy < 0: arr = arr[::-1, ::-1]
            paste(img, arr, cx, cy)
        elif t == 2:
            j = 40; col = np.array([150, 142, 128], np.float32)
            if horiz:
                img[cy:cy + j, cx:cx + S] = col; img[cy + S - j:cy + S, cx:cx + S] = col
                img[cy + j:cy + j + 10, cx:cx + S] *= 0.6
            else:
                img[cy:cy + S, cx:cx + j] = col; img[cy:cy + S, cx + S - j:cx + S] = col
                img[cy:cy + S, cx + j:cx + j + 10] *= 0.6
    return img
