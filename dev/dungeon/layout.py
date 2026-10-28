"""Watabou One Page Dungeon JSON -> geometry helpers shared by every dungeon build step.

Scale: 1 Watabou square = 10 ft = S px (280). Foundry grid 140 px = 5 ft.
Handles rectangles, rotundas (round rooms inscribed in their rect), columns, water and every door type.

Watabou door types: 0 open passage, 1 door, 2 archway, 3 entrance double door, 4 secret door,
5 locked door, 6 portcullis / barred gate, 7 (treated as door), 8 stairs down, 9 stairs up.
"""
import json, math, collections, os
MOD = os.environ.get("DUNGEON_MOD", "faight-beyond-the-last-torch")   # module id used for wall flags
import numpy as np, cv2

S = 280            # px per Watabou square
MARGIN = 1         # squares of rock around the dungeon
DOOR = {1: "door", 3: "door", 5: "locked", 6: "gate", 7: "door", 4: "secret"}
NO_WALL_DOOR = {0, 2, 8, 9}


class Layout:
    def __init__(self, path):
        d = json.load(open(path))
        self.d = d
        self.title, self.story = d.get("title", ""), d.get("story", "")
        self.rects = d["rects"]
        self.doors = {(D["x"], D["y"]): D for D in d["doors"]}
        self.secret = {k for k, D in self.doors.items() if D["type"] == 4}
        self.columns = {(c["x"], c["y"]) for c in d.get("columns", [])}
        self.water = {(c["x"], c["y"]) for c in d.get("water", [])}
        self.notes = d.get("notes", [])
        xs = [r["x"] for r in self.rects] + [r["x"] + r["w"] for r in self.rects]
        ys = [r["y"] for r in self.rects] + [r["y"] + r["h"] for r in self.rects]
        self.X0, self.X1 = min(xs) - MARGIN, max(xs) + MARGIN
        self.Y0, self.Y1 = min(ys) - MARGIN, max(ys) + MARGIN
        self.W, self.H = (self.X1 - self.X0) * S, (self.Y1 - self.Y0) * S
        self._rooms = None

    # ---------- coordinates ----------
    def px(self, x, y):
        return (x - self.X0) * S, (y - self.Y0) * S

    def cells(self):
        out = {}
        for i, r in enumerate(self.rects):
            for x in range(r["x"], r["x"] + r["w"]):
                for y in range(r["y"], r["y"] + r["h"]):
                    out[(x, y)] = i
        return out

    # ---------- masks ----------
    def floor_mask(self, scale=1.0):
        """uint8 mask (1 = walkable floor) at S*scale px per square. Secret-door cells stay rock."""
        s = S * scale
        H, W = int(round((self.Y1 - self.Y0) * s)), int(round((self.X1 - self.X0) * s))
        m = np.zeros((H, W), np.uint8)
        for r in self.rects:
            if r["w"] == 1 and r["h"] == 1 and (r["x"], r["y"]) in self.secret:
                continue
            x0, y0 = (r["x"] - self.X0) * s, (r["y"] - self.Y0) * s
            if r.get("rotunda"):
                cx, cy = x0 + r["w"] * s / 2, y0 + r["h"] * s / 2
                cv2.ellipse(m, (int(round(cx)), int(round(cy))), (int(round(r["w"] * s / 2)), int(round(r["h"] * s / 2))), 0, 0, 360, 1, -1, lineType=cv2.LINE_8)
            else:
                m[int(round(y0)):int(round(y0 + r["h"] * s)), int(round(x0)):int(round(x0 + r["w"] * s))] = 1
        return m

    def water_mask(self, scale=1.0):
        s = S * scale
        m = np.zeros((int(round((self.Y1 - self.Y0) * s)), int(round((self.X1 - self.X0) * s))), np.uint8)
        for (x, y) in self.water:
            x0, y0 = int(round((x - self.X0) * s)), int(round((y - self.Y0) * s))
            m[y0:y0 + int(round(s)), x0:x0 + int(round(s))] = 1
        m = cv2.GaussianBlur(m.astype(np.float32), (0, 0), s * 0.25) > 0.5   # soften the pool outline
        return (m & (self.floor_mask(scale) > 0)).astype(np.uint8)

    # ---------- rooms ----------
    def rooms(self):
        """Rooms = rects at least 2x2, numbered in order of arrival (BFS from the exterior door)."""
        if self._rooms is not None:
            return self._rooms
        cell = self.cells()
        adj = collections.defaultdict(set)
        for (x, y), i in cell.items():
            for dx, dy in ((1, 0), (0, 1)):
                j = cell.get((x + dx, y + dy))
                if j is not None and j != i:
                    adj[i].add(j); adj[j].add(i)
        is_room = lambda i: min(self.rects[i]["w"], self.rects[i]["h"]) >= 2
        # start: the exterior door cell (a door rect with only one neighbour), else rect 0
        start = 0
        for i, r in enumerate(self.rects):
            if r["w"] == 1 and r["h"] == 1 and (r["x"], r["y"]) in self.doors and len(adj[i]) < 2:
                start = i; break
        order, seen, q = [], {start}, collections.deque([start])
        while q:
            c = q.popleft()
            if is_room(c): order.append(c)
            for j in sorted(adj[c]):
                if j not in seen: seen.add(j); q.append(j)
        order += [i for i in range(len(self.rects)) if is_room(i) and i not in order]
        rooms = []
        for n, i in enumerate(order, 1):
            r = self.rects[i]
            notes = [nt for nt in self.notes if cell.get((math.floor(nt["pos"]["x"]), math.floor(nt["pos"]["y"]))) == i]
            rooms.append(dict(n=n, idx=i, rect=(r["x"], r["y"], r["w"], r["h"]), rotunda=bool(r.get("rotunda")),
                              ending=bool(r.get("ending")), notes=notes,
                              columns=sorted(c for c in self.columns if r["x"] <= c[0] < r["x"] + r["w"] and r["y"] <= c[1] < r["y"] + r["h"]),
                              water=sorted(c for c in self.water if r["x"] <= c[0] < r["x"] + r["w"] and r["y"] <= c[1] < r["y"] + r["h"])))
        # room-to-room links through corridors and doors
        roomof = {rm["idx"]: rm["n"] for rm in rooms}
        for rm in rooms:
            links, seen, q = {}, {rm["idx"]}, collections.deque([(rm["idx"], [])])
            while q:
                c, path = q.popleft()
                for j in adj[c]:
                    if j in seen: continue
                    seen.add(j)
                    rr = self.rects[j]
                    step = path + ([self.doors[(rr["x"], rr["y"])]["type"]] if (rr["x"], rr["y"]) in self.doors and rr["w"] == 1 and rr["h"] == 1 else [])
                    if j in roomof: links.setdefault(roomof[j], step)
                    else: q.append((j, step))
            rm["links"] = links
        self._rooms = rooms
        return rooms

    def openings(self, rect):
        """Doorways of a room: floor cells just outside its rect, as 'north wall, middle' etc."""
        rx, ry, rw, rh = rect
        f = set(k for k in self.cells() if k not in self.secret)
        pos = lambda i, n: "left end" if i == 0 and n > 1 else ("right end" if i == n - 1 and n > 1 else "middle")
        out = []
        for i, x in enumerate(range(rx, rx + rw)):
            if (x, ry - 1) in f: out.append(f"north wall, {pos(i, rw)}")
            if (x, ry + rh) in f: out.append(f"south wall, {pos(i, rw)}")
        for j, y in enumerate(range(ry, ry + rh)):
            p = {"left end": "top end", "right end": "bottom end", "middle": "middle"}[pos(j, rh)]
            if (rx - 1, y) in f: out.append(f"west wall, {p}")
            if (rx + rw, y) in f: out.append(f"east wall, {p}")
        for (x, y) in self.secret:
            if rx - 1 <= x <= rx + rw and ry - 1 <= y <= ry + rh: out.append("(a secret door, drawn as solid wall)")
        return out

    # ---------- Foundry walls ----------
    def walls(self, eps=0.6, offset=0):
        """Foundry wall data: the outline of the floor (rectangles and rotundas) plus doors.
        Computed from the floor mask at 1/20 scale, so rectangle corners land exactly on the grid.
        offset > 0 (px, used from 5LES-1 on): every wall sits that far out into the painted wall band, so
        players see the face of the wall. The outline is then the exact union of every rect grown by `offset`
        (square corners) and every rotunda grown radially; secret-door cells are part of the outline and get a
        secret door on both faces, moved out with the walls; doors span the cell plus `offset` at each end."""
        if offset:
            return self._walls_offset(offset)
        k = 20
        m = self.floor_mask(scale=1 / k)
        # include secret-door cells as floor for the outline (the doors close them)
        cs, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        walls = []
        for c in cs:
            c = cv2.approxPolyDP(c, eps, True).reshape(-1, 2).astype(float)
            # pixel-edge correction: contour runs through pixel centres; shift outward by half a pixel
            pts = [((x + 0.5) * k, (y + 0.5) * k) for x, y in c]
            pts = [(round(x / k) * k if abs(x / k - round(x / k)) < 0.3 else x, round(y / k) * k if abs(y / k - round(y / k)) < 0.3 else y) for x, y in pts]
            for a, b in zip(pts, pts[1:] + pts[:1]):
                if a != b: walls.append({"c": [round(a[0]), round(a[1]), round(b[0]), round(b[1])]})
        P = lambda x, y: [round((x - self.X0) * S), round((y - self.Y0) * S)]
        for (x, y), D in self.doors.items():
            t = D["type"]
            if t in NO_WALL_DOOR: continue
            dx = D["dir"]["x"]
            ds = 2 if t == 5 else 0
            door = 2 if t == 4 else 1
            if t == 4:
                cs_ = [P(x, y) + P(x, y + 1), P(x + 1, y) + P(x + 1, y + 1)] if dx != 0 else [P(x, y) + P(x + 1, y), P(x, y + 1) + P(x + 1, y + 1)]
            elif dx != 0:
                cs_ = [P(x + 0.5, y) + P(x + 0.5, y + 1)]
            else:
                cs_ = [P(x, y + 0.5) + P(x + 1, y + 0.5)]
            for c in cs_:
                walls.append({"c": c, "door": door, "ds": ds, "flags": {MOD: {"watabou": t}}})
        # columns: a small square of sight-blocking wall per column cell
        for (x, y) in self.columns:
            r = 0.28
            q = [P(x + 0.5 - r, y + 0.5 - r), P(x + 0.5 + r, y + 0.5 - r), P(x + 0.5 + r, y + 0.5 + r), P(x + 0.5 - r, y + 0.5 + r)]
            for a, b in zip(q, q[1:] + q[:1]): walls.append({"c": a + b})
        return walls

    def _walls_offset(self, d, col_r=0.16):
        from shapely.geometry import box, Point
        from shapely.ops import unary_union
        P = lambda x, y: [round((x - self.X0) * S), round((y - self.Y0) * S)]
        shapes = []
        for r in self.rects:
            x0, y0 = (r["x"] - self.X0) * S, (r["y"] - self.Y0) * S
            x1, y1 = x0 + r["w"] * S, y0 + r["h"] * S
            if r.get("rotunda"):
                shapes.append(Point((x0 + x1) / 2, (y0 + y1) / 2).buffer(r["w"] * S / 2 + d, quad_segs=8))
            else:
                shapes.append(box(x0 - d, y0 - d, x1 + d, y1 + d))
        u = unary_union(shapes).simplify(0.5)
        polys = list(u.geoms) if hasattr(u, "geoms") else [u]
        walls = []
        for pg in polys:
            for ring in [pg.exterior, *pg.interiors]:
                pts = [(round(x), round(y)) for x, y in ring.coords][:-1]
                for a, b in zip(pts, pts[1:] + pts[:1]):
                    if a != b: walls.append({"c": [a[0], a[1], b[0], b[1]]})
        f = d / S
        for (x, y), D in self.doors.items():
            t = D["type"]
            if t in NO_WALL_DOOR: continue
            dx = D["dir"]["x"]
            ds = 2 if t == 5 else 0
            door = 2 if t == 4 else 1
            if t == 4:      # both faces of the cell, each moved `d` into the cell, spanning the grown passage
                cs_ = ([P(x + f, y - f) + P(x + f, y + 1 + f), P(x + 1 - f, y - f) + P(x + 1 - f, y + 1 + f)] if dx != 0
                       else [P(x - f, y + f) + P(x + 1 + f, y + f), P(x - f, y + 1 - f) + P(x + 1 + f, y + 1 - f)])
            elif dx != 0:
                cs_ = [P(x + 0.5, y - f) + P(x + 0.5, y + 1 + f)]
            else:
                cs_ = [P(x - f, y + 0.5) + P(x + 1 + f, y + 0.5)]
            for c in cs_:
                walls.append({"c": c, "door": door, "ds": ds, "flags": {MOD: {"watabou": t}}})
        for (x, y) in self.columns:     # smaller than the drawn column so its top shows
            r = col_r
            q = [P(x + 0.5 - r, y + 0.5 - r), P(x + 0.5 + r, y + 0.5 - r), P(x + 0.5 + r, y + 0.5 + r), P(x + 0.5 - r, y + 0.5 + r)]
            for a, b in zip(q, q[1:] + q[:1]): walls.append({"c": a + b})
        return walls

    def tiles(self, limit=8192):
        """Split the map into the fewest equal tiles with no side over `limit` px."""
        nx, ny = math.ceil(self.W / limit), math.ceil(self.H / limit)
        tw, th = math.ceil(self.W / nx), math.ceil(self.H / ny)
        return [(ix, iy, ix * tw, iy * th, min(tw, self.W - ix * tw), min(th, self.H - iy * th)) for iy in range(ny) for ix in range(nx)]
