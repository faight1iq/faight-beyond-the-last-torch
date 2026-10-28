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
       "Sizes: a person is about {p5} pixels across; a chair about {h5} pixels; a table about {p5} by {p10} pixels; a cart or wagon about {p10} by {p20} pixels; nothing is larger than the sizes given. "
       "Its doorways are: {doors}. Keep a clear lane from every doorway into the room. Contents: {art} "
       "{style} "
       "Leave every other magenta area (corridors and neighboring rooms) completely empty. "
       "IMPORTANT: every bit of floor not covered by an object stays flat, pure, untextured magenta (#FF00FF). Do not paint floor stones, sand, dust or debris onto the magenta. "
       "Muted, desaturated colors; even neutral light from directly above; no colored light pools. Clean CG look, not hand-painted. No text, no grid.")


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
    im = base.copy(); im[mag] = (255, 0, 255)
    prompts = {}
    for rm in L.rooms():
        n = rm["n"]; x, y, w, h = rm["rect"]; key = f"{n:02d}"
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
        if rm["columns"]: kept.append("The round stone columns are already drawn; keep them exactly where they are. ")
        shape = "round room" if rm["rotunda"] else "room"
        size = (f"a circle {w} squares of 10 feet across ({w*10} feet)" if rm["rotunda"]
                else f"{w} by {h} squares of 10 feet, {w*10} by {h*10} feet")
        doors = "; ".join(L.openings(rm["rect"])) or "none"
        p5 = round(1254 / N / 2)
        prompts[key] = TPL.format(walls=plan.get("wall_text", WALLS), p5=p5, h5=round(p5 / 2), p10=2 * p5, p20=4 * p5, kept="".join(kept), shape=shape, size=size, px=round(1254 / N), doors=doors,
                                  art=plan["rooms"][str(n)]["art"], style=plan["prompt_style"])
    json.dump(prompts, open(os.path.join(work, "prompts.json"), "w"), indent=1)
    return len(prompts)


if __name__ == "__main__":
    print(run(*sys.argv[1:4]))
