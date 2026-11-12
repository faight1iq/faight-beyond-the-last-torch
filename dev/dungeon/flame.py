"""Looping top-down flame (brazier fire / torch flame) as RGBA frames -> VP9 webm with alpha."""
import numpy as np, cv2, sys, os, subprocess
N, S = 32, int(sys.argv[2]); out = sys.argv[1]; kind = sys.argv[3]
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32); c = S / 2
def noise(t, scale, seed):
    # periodic noise in time: blend of two fixed fields with cos/sin weights
    g = np.random.default_rng(seed)
    a = cv2.resize(g.random((S // scale + 2, S // scale + 2)).astype(np.float32), (S, S), interpolation=cv2.INTER_CUBIC)
    b = cv2.resize(g.random((S // scale + 2, S // scale + 2)).astype(np.float32), (S, S), interpolation=cv2.INTER_CUBIC)
    return a * np.cos(t) + b * np.sin(t)
d = os.path.dirname(out); fr = os.path.join(d, kind + "_%03d.png")
for i in range(N):
    t = 2 * np.pi * i / N
    n1 = noise(t, 8, 1) + 0.5 * noise(2 * t, 4, 2)
    dx = n1 * S * 0.05; dy = noise(t + 1, 8, 3) * S * 0.05
    r = np.hypot(xx + dx - c, (yy + dy - c) * (1.15 if kind == "torch" else 1.0)) / (S * (0.30 if kind == "brazier" else 0.24))
    r = r * (1 + 0.35 * noise(t, 5, 4) + 0.2 * noise(2 * t, 3, 5))           # ragged tongues
    core = np.clip(1 - r, 0, 1)
    heat = core ** 0.8
    col = np.zeros((S, S, 4), np.float32)
    col[..., 0] = 255 * np.clip(0.55 + heat * 2.5, 0, 1) * (heat > 0)
    col[..., 1] = 255 * np.clip(heat ** 1.7 * 1.7 + 0.12 * (heat > 0), 0, 1)
    col[..., 2] = 255 * np.clip(heat ** 5 * 1.6, 0, 1)
    col[..., 3] = 255 * np.clip(heat * 3.0, 0, 1) * (0.85 + 0.15 * np.cos(t * 2))
    # sparks
    for k in range(6):
        ph = (t / (2 * np.pi) + k / 6) % 1
        sx = c + np.cos(k * 2.1) * S * 0.12 * (1 + ph); sy = c + np.sin(k * 2.1) * S * 0.12 * (1 + ph)
        cv2.circle(col, (int(sx), int(sy)), max(1, S // 90), (255, 200, 120, 255 * (1 - ph)), -1)
    cv2.imwrite(fr % i, cv2.cvtColor(np.clip(col, 0, 255).astype(np.uint8), cv2.COLOR_RGBA2BGRA))
subprocess.run(["ffmpeg", "-y", "-nostdin", "-loglevel", "error", "-framerate", "16", "-i", fr, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "34", "-auto-alt-ref", "0", out], check=True)
print(out, os.path.getsize(out))
