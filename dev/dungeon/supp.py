"""Supplement crops for the refill step (furnishing-scale-fix step 2): the room crop with its shrunk, keyed objects
painted back onto the magenta floor. usage: python3 supp.py <work_dir> NN [NN ...]  -> <work_dir>/crops/sup-NN.png (1254 px)"""
import sys, os
import numpy as np
from PIL import Image
work = sys.argv[1]
for key in sys.argv[2:]:
    d = np.load(os.path.join(work, f"layer-{key}.npz"))
    col = d["col"].astype(np.float32); obj = d["obj"].astype(np.float32)[..., None]; sh = d["sh"].astype(np.float32)[..., None]; rm = d["rm"].astype(bool)
    crop = np.array(Image.open(os.path.join(work, "crops", f"room-{key}.png")).convert("RGB")).astype(np.float32)
    mag = np.array([255, 0, 255], np.float32)
    fl = mag * (1 - sh)
    room = fl * (1 - obj) + col * obj
    out = crop.copy(); out[rm] = room[rm]
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).resize((1254, 1254), Image.LANCZOS).save(os.path.join(work, "crops", f"sup-{key}.png"))
    print(key, "ok")
