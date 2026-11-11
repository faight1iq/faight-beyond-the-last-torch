"""Scene data for Foundry (steps 9-13): map tiles, walls, room notes, token spots, trap tiles, lights.

usage: python3 scenedata.py <watabou.json> <encounters.json> <out scene.json> <slug>
encounters.json: {"rooms": {"5": [["dune-scorpion", 5]], ...},
                  "traps": {"6": {"name":..., "save":"con", "dc":15, "dice":"10d10", "type":"force", "effect":"", "flavor":..., "spot":[dx,dy,w,h]}},
                  "teleport": {"room": 4, "spot":[dx,dy,w,h], "to":[x,y]}, "lights": [[room, color, dim, bright]]}
Spots are in Watabou squares relative to the room's top-left corner. Positions out are Foundry pixels.
"""
import sys, json, math, os
from layout import Layout, S
OCC = None
if os.environ.get("OCC"):
    import numpy as _np
    from PIL import Image as _I
    OCC = _np.asarray(_I.open(os.environ["OCC"]).convert("L"), _np.float32) / 255


def spots(L, rm, n, size):
    """n token positions (top-left px) for a creature of `size` grid units (140 px) inside the room."""
    x, y, w, h = rm["rect"]
    g = S // 2                          # 140 px grid
    cells = []
    sq = size * g
    for gy in range(int(h * 2 - size) + 1):
        for gx in range(int(w * 2 - size) + 1):
            px, py = (x - L.X0) * S + gx * g, (y - L.Y0) * S + gy * g
            cx, cy = px + sq / 2, py + sq / 2
            if rm["rotunda"]:
                ox, oy = (x - L.X0) * S + w * S / 2, (y - L.Y0) * S + h * S / 2
                if math.hypot(cx - ox, cy - oy) > w * S / 2 - sq / 2: continue
            cellx, celly = x + (gx * g + sq / 2) / S, y + (gy * g + sq / 2) / S
            if (math.floor(cellx), math.floor(celly)) in L.columns | L.water: continue
            if OCC is not None:   # keep tokens off the furniture (dress.py furniture_cover.png, 1/14 scale)
                a, b = int(px // 14), int(py // 14); k = max(1, int(sq // 14))
                if OCC[b:b + k, a:a + k].mean() > 0.3: continue
            cells.append((px, py))
    if not cells: return []
    # spread: greedy farthest-point from the room centre outward, keeping tokens apart
    ox, oy = (x - L.X0 + w / 2) * S, (y - L.Y0 + h / 2) * S
    chosen = [min(cells, key=lambda c: math.hypot(c[0] + sq / 2 - ox, c[1] + sq / 2 - oy))]
    while len(chosen) < n and len(chosen) < len(cells):
        best = max((c for c in cells if c not in chosen),
                   key=lambda c: min(math.hypot(c[0] - d[0], c[1] - d[1]) for d in chosen) - 0.15 * math.hypot(c[0] + sq / 2 - ox, c[1] + sq / 2 - oy))
        chosen.append(best)
    return [[int(a), int(b)] for a, b in chosen]


def run(json_path, enc_path, out_path, slug):
    L = Layout(json_path); E = json.load(open(enc_path))
    WALL_OFFSET = int(E.get("wall_offset", 0))   # px into the painted wall band (35 from 5LES-1 on)
    rooms = {rm["n"]: rm for rm in L.rooms()}
    tiles = [{"img": f"{os.environ.get('TILE_PREFIX', 'q')}{ix}{iy}", "x": x, "y": y, "w": w, "h": h} for ix, iy, x, y, w, h in L.tiles()]
    notes = [{"n": n, "code": rm.get("code", str(n)), "x": int((rm["rect"][0] - L.X0 + rm["rect"][2] / 2) * S), "y": int((rm["rect"][1] - L.Y0 + rm["rect"][3] / 2) * S)} for n, rm in rooms.items()]
    size_of = E.get("sizes", {})
    tokens = []
    for n, groups in E["rooms"].items():
        rm = rooms[int(n)]
        spec = [(slug_, size_of.get(slug_, 2)) for slug_, cnt in groups for _ in range(cnt)]
        big = sorted(spec, key=lambda s: -s[1])
        placed = []
        for sz in sorted({s[1] for s in big}, reverse=True):
            group = [s for s in big if s[1] == sz]
            ps = spots(L, rm, len(group) + len(placed), sz)
            # keep a spot only if it doesn't overlap any token already placed (compare true extents of both sizes)
            ps = [p for p in ps if all(p[0] + sz * 140 <= q[0] or q[0] + qs[1] * 140 <= p[0] or
                                       p[1] + sz * 140 <= q[1] or q[1] + qs[1] * 140 <= p[1] for q, qs in placed)]
            for s, p in zip(group, ps): placed.append((p, s))
        for p, (sl, sz) in placed: tokens.append({"slug": sl, "room": int(n), "x": p[0], "y": p[1]})
    for sl, sx, sy, *rn in E.get("place", []):    # hand-placed tokens, absolute squares (5LH3-1); optional room number
        tokens.append({"slug": sl, "room": int(rn[0]) if rn else 0, "x": int((sx - L.X0) * S), "y": int((sy - L.Y0) * S)})
    def rect_px(n, spot):
        x, y, w, h = rooms[int(n)]["rect"]; dx, dy, sw, sh = spot
        return [int((x - L.X0 + dx) * S), int((y - L.Y0 + dy) * S), int(sw * S), int(sh * S)]
    traps = [{**t, "room": int(n), "px": rect_px(n, t["spot"])} for n, t in E["traps"].items()]
    tp = E.get("teleport")
    teleport = None
    if tp:
        teleport = {**tp, "px": rect_px(tp["room"], tp["spot"]), "dest": [int((tp["to"][0] - L.X0) * S), int((tp["to"][1] - L.Y0) * S)]}
    lights = []
    for n, color, dim, bright in E.get("lights", []):
        x, y, w, h = rooms[int(n)]["rect"]
        lights.append({"x": int((x - L.X0 + w / 2) * S), "y": int((y - L.Y0 + h / 2) * S), "color": color, "dim": dim, "bright": bright, "room": int(n)})
    ent = E.get("entrance")
    entrance = {"x": int((ent[0] - L.X0) * S), "y": int((ent[1] - L.Y0) * S)} if ent else None
    sq = lambda st: {**st, "px": [int((st["x"] - L.X0) * S), int((st["y"] - L.Y0) * S), int(st["w"] * S), int(st["h"] * S)]}
    stairs = [sq(st) for st in L.stairs + L.d.get("secret", [])]
    out = {"stairs": stairs, "links": L.d.get("links", []), "slug": slug, "width": L.W, "height": L.H, "tiles": tiles, "walls": L.walls(offset=WALL_OFFSET), "notes": notes,
           "tokens": tokens, "traps": traps, "teleport": teleport, "lights": lights, "entrance": entrance,
           "rooms": {n: {"rect": rm["rect"], "rotunda": rm["rotunda"]} for n, rm in rooms.items()}}
    json.dump(out, open(out_path, "w"))
    return {k: (len(v) if isinstance(v, list) else v) for k, v in out.items() if k not in ("rooms",)}


if __name__ == "__main__":
    print(run(*sys.argv[1:5]))
