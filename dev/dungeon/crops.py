"""Room crops with magenta floor + ChatGPT prompts (steps 8.3-8.4).
usage: python3 crops.py <watabou.json> <plan.json> <work_dir>
Writes <work_dir>/crops/room-NN.png (full res), up-NN.png (1254 px upload), crop-NN.json, prompts.json."""
import sys, os, json
import numpy as np, cv2
from PIL import Image
from layout import Layout, S
Image.MAX_IMAGE_PIXELS = None

TPL = ("Create an image, square, exactly the same framing as this image. This is a top-down crop of a dungeon battle map, camera pointing straight down. "
       "{walls}"
       "{kept}"
       "The magenta areas are floor. Furnish ONLY the {shape} in the center of the image ({size}; one 10-foot square is about {px} pixels). "
       "{sizes}"
       "Its doorways are: {doors}. Keep a clear lane from every doorway into the room. Contents: {art} "
       "{style} "
       "Leave every other magenta area (corridors and neighboring rooms) completely empty. "
       "IMPORTANT: every bit of floor not covered by an object stays flat, pure, untextured magenta (#FF00FF). Do not paint floor stones, sand, dust or debris onto the magenta. "
       "{strict}"
       "Muted, desaturated colors; even neutral light from directly above; no colored light pools. Clean CG look, not hand-painted. No text, no grid.")


# True-scale sizes (5LH8-1 lesson): tokens fill a 2.5-ft grid square, so a standing person is ~0.45 of a 5-ft square.
SIZES = ("Draw everything at true real-world scale; objects are SMALL compared with the room. One 5-foot floor square is {p5} pixels, so: "
         "a standing person seen from above is about {a} pixels across; a chair {b}; a table {c} by {d}; a bed or bedroll {c} by {d}; "
         "a sarcophagus or stone coffin {c} by {e}; a chest {c} by {f}; a barrel, urn or pot {f}; a statue {c}; a person lying down {g} by {d}. "
         "Nothing is larger than these sizes. Leave most of the floor open. Use many small objects (a dozen or more), mostly along the walls. ")
STRICT = ("STRICT: the output must be pixel-aligned with the input: same size, same scale, no zoom, no crop, no reframing. Every wall stays exactly "
          "where it is in the input. Do not draw any new walls, borders, kerbs or ledges inside the room; objects stand directly on the magenta floor. ")


def sizes(p5):
    r = lambda f: round(p5 * f)
    return SIZES.format(p5=p5, a=r(0.45), b=r(0.35), c=r(0.6), d=r(1.2), e=r(1.3), f=r(0.4), g=r(0.5))


WALLS = ("The stone blocks around the floor are wall tops and the near-black is solid rock: keep them exactly as they are; "
         "do not move, redraw or extend any wall. ")


def run(json_path, plan_path, work):
    L = Layout(json_path); plan = json.load(open(plan_path))
    out = os.path.join(work, "crops"); os.makedirs(out, exist_ok=True)
    base = np.array(Image.open(os.path.join(work, "base_map.png")))
    mag = (L.floor_mask() > 0) & ~(L.water_mask() > 0)
    for (x, y) in L.columns:                     # keep drawn columns out of the magenta
        cx, cy = [int(v) for v in L.px(x + 0.5, y + 0.5)]
        cv2.circle(mag.view(np.uint8), (cx, cy), int(S * 0.28) + 4, 0, -1)
    for st in L.stairs:                          # stairs are drawn by basemap.py (5LH3-1)
        a, b = int((st["x"] - L.X0) * S), int((st["y"] - L.Y0) * S); mag[b:b + st["h"] * S, a:a + st["w"] * S] = False
    im = base.copy(); im[mag] = (255, 0, 255)
    prompts = {}
    for rm in L.rooms():
        n = rm["n"]; x, y, w, h = rm["rect"]; key = f"{n:02d}"
        if plan["rooms"].get(str(n), {}).get("furnish") is False: continue
        N = max(w, h) + 1
        x0 = int(round((x + w / 2 - N / 2 - L.X0) * S)); y0 = int(round((y + h / 2 - N / 2 - L.Y0) * S)); NP = N * S
        c = np.zeros((NP, NP, 3), np.uint8); c[:] = plan.get("crop_fill", (16, 17, 20))
        sx0, sy0 = max(0, x0), max(0, y0); sx1, sy1 = min(L.W, x0 + NP), min(L.H, y0 + NP)
        c[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = im[sy0:sy1, sx0:sx1]
        Image.fromarray(c).save(os.path.join(out, f"room-{key}.png"))
        Image.fromarray(c).resize((1254, 1254), Image.LANCZOS).save(os.path.join(out, f"up-{key}.png"))
        json.dump({"x0": x0, "y0": y0, "N": NP, "rect": [x, y, w, h], "rotunda": rm["rotunda"]}, open(os.path.join(out, f"crop-{key}.json"), "w"))
        kept = []
        if rm["water"]: kept.append("The dark water pool is already drawn; keep it exactly as it is. ")
        if any(x <= st["x"] < x + w and y <= st["y"] < y + h for st in L.stairs): kept.append("The stone staircase is already drawn; keep it exactly as it is and keep the floor in front of it clear. ")
        if rm["columns"]: kept.append("The round stone columns are already drawn; keep them exactly where they are. ")
        shape = "round room" if rm["rotunda"] else "room"
        size = (f"a circle {w} squares of 10 feet across ({w*10} feet)" if rm["rotunda"]
                else f"{w} by {h} squares of 10 feet, {w*10} by {h*10} feet")
        doors = "; ".join(L.openings(rm["rect"])) or "none"
        p5 = round(1254 / N / 2)
        small = min(w, h) <= 2 and max(w, h) <= 3
        prompts[key] = TPL.format(walls=plan.get("wall_text", WALLS), sizes=sizes(p5), strict=STRICT if (small or rm["rotunda"]) else "", kept="".join(kept), shape=shape, size=size, px=round(1254 / N), doors=doors,
                                  art=plan["rooms"][str(n)]["art"], style=plan["prompt_style"])
    json.dump(prompts, open(os.path.join(work, "prompts.json"), "w"), indent=1)
    return len(prompts)


if __name__ == "__main__":
    print(run(*sys.argv[1:4]))
