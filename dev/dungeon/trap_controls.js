// Place GM-only Arm / Disarm controls for every trap in a dungeon scene (Foundry v13, run as GM).
//
// Run with the script runner:  cfg = { scenes: ["<scene id>", ...] }   (default: every scene with traps)
// For each trap tile (flags.<mod>.role === "trap") this finds the nearest wall of its room (a ray
// from the trap's center in eight directions; plain walls preferred over doors), and puts
// two hidden tiles just outside that wall, a hidden text label with the trap's name and state, and a
// small light over them. Spots inside the sight area of any room-number pin are rejected, so players
// never see them (the scene is opened on the canvas to work that out):
//   Arm    (green trap icon)   flags.<mod>.role = "trap-arm"
//   Disarm (gray cross icon)   flags.<mod>.role = "trap-disarm"
// Clicking one (Monk's Active Tiles click trigger) runs api.trapControl(tile) from scripts/traps.js.
// Re-running replaces the controls for that scene.
const MOD = cfg.mod || "faight-beyond-the-last-torch";
const S = 112, GAP = 90, SPACE = 14;   // icon size, gap from the wall, space between the icons
const report = [];

// Distance along a ray from p in direction d to wall segment [x1,y1,x2,y2]; Infinity when it misses.
function hit(p, d, c) {
  const [x1, y1, x2, y2] = c, ex = x2 - x1, ey = y2 - y1;
  const den = d.x * ey - d.y * ex;
  if (Math.abs(den) < 1e-9) return Infinity;
  const t = ((x1 - p.x) * ey - (y1 - p.y) * ex) / den;
  const u = ((x1 - p.x) * d.y - (y1 - p.y) * d.x) / den;
  return t > 0 && u >= 0 && u <= 1 ? t : Infinity;
}

const scenes = (cfg.scenes?.length ? cfg.scenes.map((id) => game.scenes.get(id)) : game.scenes.contents)
  .filter((s) => s?.tiles.some((t) => t.getFlag(MOD, "role") === "trap"));

for (const scene of scenes) {
  const old = scene.tiles.filter((t) => ["trap-arm", "trap-disarm"].includes(t.getFlag(MOD, "role"))).map((t) => t.id);
  if (old.length) await scene.deleteEmbeddedDocuments("Tile", old);
  const oldLabels = scene.drawings.filter((d) => d.getFlag(MOD, "role") === "trap-label").map((d) => d.id);
  if (oldLabels.length) await scene.deleteEmbeddedDocuments("Drawing", oldLabels);
  const oldLights = scene.lights.filter((l) => l.getFlag(MOD, "role") === "trap-light").map((l) => l.id);
  if (oldLights.length) await scene.deleteEmbeddedDocuments("AmbientLight", oldLights);

  // Room walls only: drop pillars and other obstacles, i.e. groups of joined wall segments whose
  // whole extent is under two grid squares.
  const g = scene.grid.size;
  const blocking = scene.walls.filter((w) => w.move !== CONST.WALL_MOVEMENT_TYPES.NONE);
  const key = (x, y) => `${Math.round(x)},${Math.round(y)}`;
  const byPoint = new Map();
  for (const w of blocking) for (const k of [key(w.c[0], w.c[1]), key(w.c[2], w.c[3])]) byPoint.set(k, [...(byPoint.get(k) ?? []), w]);
  const group = new Map();
  for (const w of blocking) {
    if (group.has(w.id)) continue;
    const members = [], stack = [w];
    group.set(w.id, members);
    while (stack.length) {
      const x = stack.pop(); members.push(x);
      for (const k of [key(x.c[0], x.c[1]), key(x.c[2], x.c[3])]) for (const y of byPoint.get(k) ?? []) {
        if (!group.has(y.id)) { group.set(y.id, members); stack.push(y); }
      }
    }
  }
  const small = (m) => {
    const xs = m.flatMap((w) => [w.c[0], w.c[2]]), ys = m.flatMap((w) => [w.c[1], w.c[3]]);
    return Math.max(...xs) - Math.min(...xs) < 2 * g && Math.max(...ys) - Math.min(...ys) < 2 * g && m.length > 2;
  };
  const walls = blocking.filter((w) => !small(group.get(w.id)));

  // Everything a player can see from inside a room: the sight area from each room-number pin.
  // Controls, label and light must stay out of all of them. (Needs the scene on the canvas.)
  if (canvas.scene?.id !== scene.id) await scene.view();
  const Sweep = foundry.canvas.geometry.ClockwiseSweepPolygon;
  const roomSight = scene.notes.map((n) => Sweep.create({ x: n.x, y: n.y }, { type: "sight" }));
  const seen = (x0, y0, x1, y1) => {
    for (let x = x0; x <= x1; x += 35) for (let y = y0; y <= y1; y += 35) if (roomSight.some((poly) => poly.contains(x, y))) return true;
    return false;
  };
  const tiles = [], labels = [], lights = [];
  for (const trap of scene.tiles.filter((t) => t.getFlag(MOD, "role") === "trap")) {
    const name = trap.getFlag(MOD, "trap") ?? trap.getFlag(MOD, "name") ?? trap.flags?.["monks-active-tiles"]?.name ?? "", room = trap.getFlag(MOD, "room");
    const c = { x: trap.x + trap.width / 2, y: trap.y + trap.height / 2 };
    // Eight directions (diagonals catch round rooms whose straight-line sides are all doorways).
    const r = Math.SQRT1_2;
    const dirs = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
      "up-left": { x: -r, y: -r }, "up-right": { x: r, y: -r }, "down-left": { x: -r, y: r }, "down-right": { x: r, y: r } };
    const found = [];
    for (const [side, d] of Object.entries(dirs)) {
      let best = { dist: Infinity };
      for (const w of walls) { const t = hit(c, d, w.c); if (t < best.dist) best = { dist: t, door: w.door > 0 }; }
      if (best.dist < Infinity) found.push({ side, d, ...best });
    }
    if (!found.length) { report.push(`${scene.name}: ${name}: no walls found, skipped`); continue; }
    const byDist = (a, b) => a.dist - b.dist;
    // Everything must stay on the map: a room on the map edge has no room beyond that wall.
    const R = scene.dimensions.sceneRect;
    const onMap = (x, y, w, h) => x >= R.x && y >= R.y && x + w <= R.x + R.width && y + h <= R.y + R.height;
    const layout = (f) => {
      const diag = f.d.x !== 0 && f.d.y !== 0;
      // Center of the icon pair, just past the wall (a diagonal needs extra room for the row's width).
      const out = f.dist + GAP + S / 2 + (diag ? S / 2 : 0);
      const p = { x: c.x + f.d.x * out, y: c.y + f.d.y * out };
      const stacked = f.d.y === 0;   // left or right wall: icons stacked; otherwise side by side
      const pos = stacked
        ? [{ x: p.x - S / 2, y: p.y - S - SPACE / 2 }, { x: p.x - S / 2, y: p.y + SPACE / 2 }]
        : [{ x: p.x - S - SPACE / 2, y: p.y - S / 2 }, { x: p.x + SPACE / 2, y: p.y - S / 2 }];
      const x0 = Math.min(pos[0].x, pos[1].x), y0 = Math.min(pos[0].y, pos[1].y);
      const x1 = Math.max(pos[0].x, pos[1].x) + S, y1 = Math.max(pos[0].y, pos[1].y) + S;
      // Label: outward from the wall first, then the other free sides of the icons.
      const beside = [{ x: x0 - 16 - 280, y: p.y - 42 }, { x: x1 + 16, y: p.y - 42 }];
      const aboveBelow = [{ x: p.x - 140, y: y0 - 16 - 84 }, { x: p.x - 140, y: y1 + 16 }];
      const order = stacked ? (f.d.x < 0 ? [beside[0], ...aboveBelow] : [beside[1], ...aboveBelow])
        : (f.d.y < 0 ? [aboveBelow[0], ...beside] : [aboveBelow[1], ...beside]);
      const label = order.find((l) => onMap(l.x, l.y, 280, 84) && !seen(l.x - 20, l.y - 20, l.x + 300, l.y + 104));
      return { pos, label, ok: onMap(x0, y0, x1 - x0, y1 - y0) && !!label && !seen(x0 - 20, y0 - 20, x1 + 20, y1 + 20) };
    };
    const ranked = [...found.filter((f) => !f.door).sort(byDist), ...found.filter((f) => f.door).sort(byDist)];
    const pick = ranked.find((f) => layout(f).ok);
    if (!pick) { report.push(`${scene.name}: ${name}: no on-map spot, skipped`); continue; }
    const { pos, label } = layout(pick);
    const armed = trap.flags?.["monks-active-tiles"]?.active !== false;
    const ctl = (role, i, src, tint, verb) => ({
      texture: { src, tint }, x: Math.round(pos[i].x), y: Math.round(pos[i].y), width: S, height: S,
      hidden: true, alpha: (role === "trap-arm") === armed ? 1 : 0.35,
      flags: {
        [MOD]: { role, trap: name, room },
        "monks-active-tiles": {
          active: true, trigger: ["click"], restriction: "gm", controlled: "all", pertoken: false,
          minrequired: 0, chance: 100, name: `${verb}: ${name}`,
          actions: [{ id: foundry.utils.randomID(), action: "runcode", data: { code: `game.modules.get("${MOD}").api.trapControl(tile);` } }],
        },
      },
    });
    tiles.push(ctl("trap-arm", 0, "icons/svg/trap.svg", "#5fd35f", "Arm"), ctl("trap-disarm", 1, "icons/svg/cancel.svg", "#bbbbbb", "Disarm"));
    labels.push({
      x: Math.round(label.x), y: Math.round(label.y), shape: { type: "r", width: 280, height: 84 },
      text: `${name}\n${armed ? "ARMED" : "DISARMED"}`, fontSize: 32, fontFamily: "Signika", textColor: armed ? "#5fd35f" : "#ff6b6b", fillType: 1, fillColor: "#000000", fillAlpha: 1, strokeWidth: 0, hidden: true,
      flags: { [MOD]: { role: "trap-label", trap: name, room } },
    });
    // A small light over the icons and label so the GM can read them in a dark scene. It sits
    // outside the room walls, which block both the light and the players' sight of it.
    const bx = [pos[0].x, pos[1].x + S, label.x, label.x + 280], by = [pos[0].y, pos[1].y + S, label.y, label.y + 84];
    const lx = Math.min(Math.max((Math.min(...bx) + Math.max(...bx)) / 2, R.x + 10), R.x + R.width - 10);
    const ly = Math.min(Math.max((Math.min(...by) + Math.max(...by)) / 2, R.y + 10), R.y + R.height - 10);
    const reach = Math.hypot(Math.max(...bx) - Math.min(...bx), Math.max(...by) - Math.min(...by)) / 2 + 20;
    const ft = (px) => Math.ceil((px / g) * scene.grid.distance);
    lights.push({
      x: Math.round(lx), y: Math.round(ly), walls: true, vision: false,
      config: { bright: ft(reach * 0.7), dim: ft(reach), color: "#fff4d6", alpha: 0.25, luminosity: 0.5 },
      flags: { [MOD]: { role: "trap-light", trap: name, room } },
    });
    report.push(`${scene.name}: ${name} (room ${room}) → ${pick.side} wall${pick.door ? " (door)" : ""}, ${Math.round(pick.dist)} px from center`);
  }
  await scene.createEmbeddedDocuments("Tile", tiles);
  await scene.createEmbeddedDocuments("Drawing", labels);
  await scene.createEmbeddedDocuments("AmbientLight", lights);
}
return report;
