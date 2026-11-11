"""Ironmark Stockade (5LH3-1): John's hand-drawn castle plan -> one Watabou-format layout per floor.

usage: python3 convert.py   (writes ground.json, basement.json, upper.json beside this file)
Every floor shares the same frame (bounds), so the upper floor can show the ground floor below it.
Extra keys read by the patched layout.py / basemap.py / crops.py / scenedata.py:
  rect.code      room code (G3, B6, U5 ...); rooms are numbered in rect order (fixed_order)
  rect.noroom    an auxiliary rect (yard pieces, moat pieces): floor, but not a room of its own
  surfaces       {"yard": [[x,y]...], "bridge": [[x,y]...]}  cells painted with another texture
  stairs         [{x,y,w,h,dir,down}]  stair blocks drawn in code and kept out of the magenta
  links          stair / secret-passage teleports between floors (build_scene.js / link_floors.js)
"""
import json, os, runpy
HERE = os.path.dirname(os.path.abspath(__file__))
P = runpy.run_path(os.path.join(HERE, "stockade_plan.py"), run_name="plan")   # also re-renders the plan images
DX = DY = 2                                    # room for a 20-ft bank around the moat
BOUNDS = [-1, -1, 37, 35]                      # X0, Y0, X1, Y1 in squares, same for all floors


def sh(x, y): return (x + DX, y + DY)


def rects_of(cells):
    """Greedy decomposition of a cell set into rectangles (largest first)."""
    cells = set(cells); out = []
    while cells:
        best = None
        for (x, y) in cells:
            w = 1
            while (x + w, y) in cells: w += 1
            h = 1
            while all((x + i, y + h) in cells for i in range(w)): h += 1
            if best is None or w * h > best[2] * best[3]: best = (x, y, w, h)
        x, y, w, h = best
        out.append(best)
        cells -= {(x + i, y + j) for i in range(w) for j in range(h)}
    return out


def r(x0, y0, x1, y1, **kw):
    x, y = sh(x0, y0)
    return dict(x=x, y=y, w=x1 - x0 + 1, h=y1 - y0 + 1, **kw)


def door_rects(doors, floor_cells):
    rs, ds = [], []
    TYPE = {"door": 1, "arch": 2, "drawbridge": 6, "bridge": 0}
    for (x, y, k) in doors:
        X, Y = sh(x, y)
        horiz = ((X - 1, Y) in floor_cells or (X + 1, Y) in floor_cells)
        rs.append(dict(x=X, y=Y, w=1, h=1))
        ds.append(dict(x=X, y=Y, dir=dict(x=1 if horiz else 0, y=0 if horiz else 1), type=TYPE[k]))
    return rs, ds


def cells_of(rects):
    return {(a["x"] + i, a["y"] + j) for a in rects for i in range(a["w"]) for j in range(a["h"])}


def finish(name, rects, doors, extra):
    floor = cells_of(rects)
    drs, dds = door_rects(doors, floor)
    d = dict(title=f"The Ironmark Stockade — {name}", story="", rects=rects + drs, doors=dds, notes=[], columns=[],
             water=[], fixed_order=True, bounds=BOUNDS, **extra)
    return d


# ---------------- ground ----------------
G = {x["code"]: x for x in P["G"] if x["code"]}
pocket = {(x, y) for x in range(7, 13) for y in range(21, 26)}
court_rest = P["court"] - pocket
moat = P["moat"]
west_moat = {(x, y) for (x, y) in moat if x <= 1 and 2 <= y <= 26}
bridge = {(15, 27), (16, 27), (15, 28), (16, 28)}
# bank: a 2-square ring around the moat plus the south bank (3 deep), in shifted coordinates
bank_all = {(x, y) for x in range(0, 36) for y in range(0, 34)} - {(x + DX, y + DY) for x in range(0, 32) for y in range(0, 29)}
south_bank = {(x, y) for (x, y) in bank_all if y >= 31}
rects = []
order = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10", "G11", "G12", "G13", "G14", "G15", "G16"]
for code in order:
    if code == "G1":
        xs = [a for a, b in south_bank]; ys = [b for a, b in south_bank]
        rects.append(dict(x=min(xs), y=min(ys), w=max(xs) - min(xs) + 1, h=max(ys) - min(ys) + 1, code="G1"))
    elif code == "G2":
        rects.append(r(0, 2, 1, 26, code="G2"))
    elif code == "G4":
        rects.append(r(7, 21, 12, 25, code="G4"))
    else:
        g = G[code]; rects.append(r(g["x0"], g["y0"], g["x1"], g["y1"], code=code))
for (x, y, w, h) in rects_of(court_rest): rects.append(r(x, y, x + w - 1, y + h - 1, noroom=True))
for (x, y, w, h) in rects_of(moat - west_moat): rects.append(r(x, y, x + w - 1, y + h - 1, noroom=True))
for (x, y, w, h) in rects_of(bridge): rects.append(r(x, y, x + w - 1, y + h - 1, noroom=True))
for (x, y, w, h) in rects_of(bank_all - south_bank): rects.append(dict(x=x, y=y, w=w, h=h, noroom=True))
water = sorted([list(sh(x, y)) for (x, y) in moat])
yard = sorted([list(sh(x, y)) for (x, y) in P["court"]] + [list(c) for c in bank_all])
ground = finish("Ground Floor", rects, P["G_doors"], dict(
    surfaces={"yard": yard, "bridge": [list(sh(x, y)) for (x, y) in bridge] + [list(sh(15, 26)), list(sh(16, 26))]},
    stairs=[dict(x=17, y=11, w=2, h=2, dir="n", down=False, id="g16"),     # Grand Stair, up to the Upper Gallery
            dict(x=12, y=9, w=1, h=2, dir="n", down=True, id="g14"),       # Kitchen, down to the Cellar Stores
            dict(x=5, y=5, w=1, h=1, dir="n", down=False, id="g8"), dict(x=30, y=5, w=1, h=1, dir="n", down=False, id="g9"),
            dict(x=5, y=27, w=1, h=1, dir="s", down=False, id="g10"), dict(x=30, y=27, w=1, h=1, dir="s", down=False, id="g11")],
    secret=[dict(x=2, y=15, w=2, h=1, id="culvert")]))
ground["water"] = [dict(x=a, y=b) for a, b in water]

# ---------------- basement ----------------
brects = []
for x in P["B"]:
    brects.append(r(x["x0"], x["y0"], x["x1"], x["y1"], code=x["code"]))
basement = finish("Basement", brects, P["B_doors"], dict(
    surfaces={}, stairs=[dict(x=11, y=7, w=1, h=2, dir="n", down=False, id="b8")],
    secret=[dict(x=3, y=14, w=1, h=2, id="culvert-b")]))

# ---------------- upper ----------------
urects = []
for x in P["U"]:
    kw = dict(code=x["code"]) if x["kind"] != "walk" and x["code"] != "U6" else dict(noroom=True)
    urects.append(r(x["x0"], x["y0"], x["x1"], x["y1"], **kw))
upper = finish("Upper Floor", urects, [d for d in P["U_doors"] if d[2] != "bridge"] + [(15, 5, "arch"), (16, 5, "arch")], dict(
    surfaces={"walk": [list(sh(a, b)) for x in P["U"] if x["kind"] == "walk" for (a, b) in
                       {(i, j) for i in range(x["x0"], x["x1"] + 1) for j in range(x["y0"], x["y1"] + 1)}],
              "bridge": [list(sh(15, 5)), list(sh(16, 5))]},
    stairs=[dict(x=17, y=17, w=2, h=2, dir="s", down=True, id="u1"),
            dict(x=5, y=5, w=1, h=1, dir="n", down=True, id="w6"), dict(x=30, y=5, w=1, h=1, dir="n", down=True, id="w7"),
            dict(x=5, y=27, w=1, h=1, dir="s", down=True, id="w8"), dict(x=30, y=27, w=1, h=1, dir="s", down=True, id="w9")],
    under="ground"))

# links between floors: [floor, stair id] <-> [floor, stair id]; arrival is the free square beside the target stair
LINKS = [[["ground", "g16"], ["upper", "u1"]], [["ground", "g14"], ["basement", "b8"]],
         [["ground", "g8"], ["upper", "w6"]], [["ground", "g9"], ["upper", "w7"]],
         [["ground", "g10"], ["upper", "w8"]], [["ground", "g11"], ["upper", "w9"]],
         [["ground", "culvert"], ["basement", "culvert-b"]]]
for name, d in (("ground", ground), ("basement", basement), ("upper", upper)):
    d["links"] = LINKS
    json.dump(d, open(os.path.join(HERE, f"{name}.json"), "w"))
    rooms = [x for x in d["rects"] if x.get("code")]
    print(name, len(d["rects"]), "rects,", len(rooms), "rooms:", " ".join(x["code"] for x in rooms))
