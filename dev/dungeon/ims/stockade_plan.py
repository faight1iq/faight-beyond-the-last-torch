import json, textwrap
from PIL import Image, ImageDraw, ImageFont

S = 34          # px per 10-ft square
W, H = 32, 32   # site size in squares
PAD = 40

def font(sz, bold=False):
    for p in (["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"] if bold else []) + ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        try: return ImageFont.truetype(p, sz)
        except: pass
    return ImageFont.load_default()
F_CODE, F_NAME, F_SMALL, F_TITLE = font(13, True), font(10), font(9), font(20, True)

COL = {"room": (222, 205, 170), "yard": (180, 190, 160), "water": (120, 165, 200),
       "bridge": (150, 110, 70), "walk": (200, 195, 185), "rock": (60, 58, 56)}

def rect(code, name, x0, y0, x1, y1, kind="room"):
    return dict(code=code, name=name, x0=x0, y0=y0, x1=x1, y1=y1, kind=kind)

def cells(r): return {(x, y) for x in range(r["x0"], r["x1"] + 1) for y in range(r["y0"], r["y1"] + 1)}

def dil(cs, d=1): return {(x + i, y + j) for x, y in cs for i in range(-d, d + 1) for j in range(-d, d + 1)}

# ---------------- ground floor ----------------
G = [
    rect("G1", "Moat Bank", 0, 29, 31, 31, "yard"),
    rect("G3", "Gatehouse", 14, 22, 17, 25),
    rect("G8", "NW Tower", 3, 3, 5, 5), rect("G9", "NE Tower", 26, 3, 28, 5),
    rect("G10", "SW Tower", 3, 23, 5, 25), rect("G11", "SE Tower", 26, 23, 28, 25),
    rect("G5", "Barracks", 3, 9, 6, 17), rect("G6", "Kennels", 25, 9, 28, 13),
    rect("G7", "Smithy", 25, 15, 28, 19),
    rect("G12", "Entry Hall", 14, 15, 17, 18), rect("G16", "Grand Stair", 14, 9, 17, 13),
    rect("G13", "Mess Hall", 10, 12, 12, 18), rect("G14", "Kitchen", 10, 7, 12, 10),
    rect("G15", "Armory", 19, 12, 21, 18),
    rect("", "", 15, 27, 16, 28, "bridge"),
]
moat = {(x, y) for x in range(0, 32) for y in range(0, 29) if x <= 1 or x >= 30 or y <= 1 or y >= 27} - cells(G[-1])
keep_box = cells(rect("", "", 10, 7, 21, 18))
blocked = dil(keep_box)
for r in G:
    if r["code"] in ("G3", "G5", "G6", "G7", "G8", "G9", "G10", "G11"): blocked |= dil(cells(r))
court = {(x, y) for x in range(3, 29) for y in range(3, 26)} - blocked
G_doors = [(15, 26, "drawbridge"), (16, 26, "drawbridge"), (15, 21, "arch"), (16, 21, "arch"),
           (15, 19, "door"), (16, 19, "door"), (7, 13, "door"), (24, 11, "door"), (24, 17, "door"),
           (6, 4, "door"), (25, 4, "door"), (6, 24, "door"), (25, 24, "door"),
           (11, 11, "door"), (13, 16, "door"), (15, 14, "arch"), (18, 16, "door")]
G_marks = [(0.4, 13, "secret", "to B1"), (15.5, 10, "up", "U1"), (11, 8, "down", "B8"),
           (4, 4, "up", "W6"), (27, 4, "up", "W7"), (4, 24, "up", "W8"), (27, 24, "up", "W9"),
           (9.5, 22.5, "gallows", "Gallows")]
G_extra = [("G2", "Moat", 0.6, 15.5), ("G4", "Outer Courtyard", 8.5, 5)]

# ---------------- basement ----------------
B = [
    rect("B1", "Moat Culvert", 1, 12, 7, 13, "walk"),
    rect("B2", "Sluice Room", 9, 10, 11, 15),
    rect("B8", "Cellar Stores", 9, 5, 11, 8),
    rect("B3", "Guard Room", 13, 11, 17, 14),
    rect("B4", "North Cell Block", 13, 5, 17, 9),
    rect("B5", "South Cell Block", 13, 16, 17, 20),
    rect("B6", "Interrogation", 19, 11, 22, 14),
    rect("B7", "Warden's Office", 24, 11, 26, 13),
]
B_doors = [(8, 12, "door"), (8, 13, "door"), (10, 9, "door"), (12, 12, "door"),
           (15, 10, "door"), (15, 15, "door"), (18, 12, "door"), (23, 12, "door")]
B_marks = [(1, 12.5, "secret", "from G2"), (10, 6, "up", "G14")]

# ---------------- upper floor ----------------
U = [
    rect("W6", "NW Top", 3, 3, 5, 5), rect("W7", "NE Top", 26, 3, 28, 5),
    rect("W8", "SW Top", 3, 23, 5, 25), rect("W9", "SE Top", 26, 23, 28, 25),
    rect("W2", "North Wall-walk", 7, 4, 24, 4, "walk"),
    rect("W5", "West Wall-walk", 4, 7, 4, 21, "walk"),
    rect("W3", "East Wall-walk", 27, 7, 27, 21, "walk"),
    rect("W4", "South Walk (W)", 7, 24, 12, 24, "walk"),
    rect("W4", "South Walk (E)", 19, 24, 24, 24, "walk"),
    rect("W1", "Winch Room", 14, 22, 17, 25),
    rect("U6", "Balcony", 14, 6, 17, 6),
    rect("U5", "Throne Room", 11, 8, 20, 11),
    rect("U1", "Upper Gallery", 13, 13, 18, 16),
    rect("U2", "War Room", 9, 13, 11, 17),
    rect("U3", "Gharrek's Quarters", 20, 13, 22, 17),
    rect("U4", "Treasury", 20, 19, 22, 21),
]
U_doors = [(6, 4, "door"), (25, 4, "door"), (4, 6, "door"), (4, 22, "door"), (27, 6, "door"), (27, 22, "door"),
           (6, 24, "door"), (13, 24, "door"), (18, 24, "door"), (25, 24, "door"),
           (15, 5, "bridge"), (16, 5, "bridge"), (15, 7, "door"), (16, 7, "door"),
           (15, 12, "door"), (16, 12, "door"), (12, 14, "door"), (19, 14, "door"), (21, 18, "door")]
U_marks = [(15.5, 15, "down", "G16"), (4, 4, "down", "G8"), (27, 4, "down", "G9"),
           (4, 24, "down", "G10"), (27, 24, "down", "G11"), (15.5, 10.5, "throne", "Throne")]
U_extra = [("", "open air above courtyard", 13.5, 20)]

def draw(title, rooms, doors, marks, fname, water=(), yard=(), extra=()):
    img = Image.new("RGB", (W * S + 2 * PAD, H * S + 2 * PAD + 60), (245, 242, 235))
    d = ImageDraw.Draw(img)
    ox, oy = PAD, PAD + 40
    d.text((PAD, 10), title, fill=(40, 40, 40), font=F_TITLE)
    d.rectangle([ox, oy, ox + W * S, oy + H * S], fill=COL["rock"])
    def cell(x, y, c): d.rectangle([ox + x * S, oy + y * S, ox + (x + 1) * S - 1, oy + (y + 1) * S - 1], fill=c)
    for x, y in water: cell(x, y, COL["water"])
    for x, y in yard: cell(x, y, COL["yard"])
    for r in rooms:
        for x, y in cells(r): cell(x, y, COL[r["kind"]])
    for x in range(W + 1): d.line([ox + x * S, oy, ox + x * S, oy + H * S], fill=(0, 0, 0, 0) if False else (90, 88, 84), width=1)
    for y in range(H + 1): d.line([ox, oy + y * S, ox + W * S, oy + y * S], fill=(90, 88, 84), width=1)
    for x, y, k in doors:
        c = {"door": (120, 70, 30), "arch": (222, 205, 170), "drawbridge": (150, 110, 70), "bridge": (150, 110, 70)}[k]
        cell(x, y, c)
        if k == "door":
            d.rectangle([ox + x * S + 8, oy + y * S + 8, ox + (x + 1) * S - 9, oy + (y + 1) * S - 9], outline=(240, 220, 180), width=2)
    for r in rooms:
        if not r["code"]: continue
        cx = ox + (r["x0"] + r["x1"] + 1) * S / 2; cy = oy + (r["y0"] + r["y1"] + 1) * S / 2
        w = (r["x1"] - r["x0"] + 1) * S
        lines = textwrap.wrap(r["name"], max(4, int(w / 7)))
        if r["kind"] == "walk" and r["x0"] == r["x1"]:
            lines = [r["code"]]
        else:
            lines = [r["code"]] + lines
        th = len(lines) * 13
        for i, ln in enumerate(lines):
            f = F_CODE if i == 0 else F_NAME
            tw = d.textlength(ln, font=f)
            d.text((cx - tw / 2, cy - th / 2 + i * 13), ln, fill=(40, 30, 20), font=f)
    for code, name, x, y in extra:
        txt = f"{code} {name}".strip()
        d.text((ox + x * S, oy + y * S), txt, fill=(30, 40, 60), font=F_CODE)
    for x, y, k, lab in marks:
        px, py = ox + x * S + S / 2, oy + y * S + S / 2
        if k in ("up", "down"):
            pts = [(px, py - 9), (px - 9, py + 7), (px + 9, py + 7)] if k == "up" else [(px, py + 9), (px - 9, py - 7), (px + 9, py - 7)]
            d.polygon(pts, fill=(110, 60, 160))
            d.text((px + 10, py - 6), lab, fill=(110, 60, 160), font=F_SMALL)
        elif k == "secret":
            d.ellipse([px - 8, py - 8, px + 8, py + 8], outline=(200, 30, 30), width=3)
            d.text((px + 10, py - 6), lab, fill=(200, 30, 30), font=F_SMALL)
        else:
            d.rectangle([px - 8, py - 8, px + 8, py + 8], outline=(60, 30, 20), width=2)
            d.text((px + 10, py - 6), lab, fill=(60, 30, 20), font=F_SMALL)
    ly = oy + H * S + 12
    items = [("Room", COL["room"]), ("Yard", COL["yard"]), ("Water", COL["water"]), ("Walk / passage", COL["walk"]),
             ("Bridge", COL["bridge"]), ("Door", (120, 70, 30))]
    lx = PAD
    for lab, c in items:
        d.rectangle([lx, ly, lx + 14, ly + 14], fill=c, outline=(80, 80, 80))
        d.text((lx + 18, ly), lab, fill=(40, 40, 40), font=F_NAME); lx += 30 + d.textlength(lab, font=F_NAME) + 20
    d.polygon([(lx + 7, ly), (lx, ly + 14), (lx + 14, ly + 14)], fill=(110, 60, 160)); d.text((lx + 18, ly), "Stairs (teleport)", fill=(40, 40, 40), font=F_NAME); lx += 130
    d.ellipse([lx, ly, lx + 14, ly + 14], outline=(200, 30, 30), width=3); d.text((lx + 18, ly), "Secret passage", fill=(40, 40, 40), font=F_NAME)
    d.text((W * S + 2 * PAD - 200, ly), "1 square = 10 ft", fill=(40, 40, 40), font=F_NAME)
    img.save(fname)

draw("Ironmark Stockade: ground floor", G, G_doors, G_marks, "plan-ground.png", water=moat, yard=court, extra=G_extra)
draw("Ironmark Stockade: basement", B, B_doors, B_marks, "plan-basement.png")
draw("Ironmark Stockade: upper floor (walls and fortress floor 2)", U, U_doors, U_marks, "plan-upper.png", extra=U_extra)

json.dump({"ground": {"rooms": G, "doors": G_doors, "moat": sorted(moat), "court": sorted(court)},
           "basement": {"rooms": B, "doors": B_doors}, "upper": {"rooms": U, "doors": U_doors}},
          open("stockade_plan.json", "w"))
