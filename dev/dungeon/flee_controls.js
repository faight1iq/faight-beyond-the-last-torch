// Place a GM-only Flee control for every room that holds trash (5LH3-1). Run as GM: cfg = { key: "ims", code: "5LH3-1" }.
// One hidden tile in the wall band just above the room's north-east corner (only the GM sees hidden tiles), with a small
// light on it so it shows in the dark.
// Clicking it (Monk's Active Tiles click trigger, GM only) runs api.fleeRoom(tile) from scripts/flee.js: the room's
// living servants, legionnaires and guard units run out of the nearest door and leave the map; chat tells the GM how many.
// Re-running replaces the controls.
const MOD = cfg.mod || "faight-beyond-the-last-torch", code = cfg.code, S = 280, X0 = cfg.x0 ?? -1, Y0 = cfg.y0 ?? -1, IC = 84;
const TRASH = ["ironmark-servant", "ironmark-legionnaire", "legion-squad", "legion-platoon", "legion-company"];
const icon = (await foundry.utils.srcExists("icons/svg/wing.svg")) ? "icons/svg/wing.svg" : "icons/svg/terror.svg";
const report = {};
for (const f of ["ground", "basement", "upper"]) {
  const scene = game.scenes.find(s => s.getFlag(MOD, "adventure") === code && s.getFlag(MOD, "floor") === f); if (!scene) continue;
  const get = async (n) => (await fetch(`/modules/${MOD}/dev/dungeon/${cfg.key}/${n}?${Date.now()}`)).json();
  const SD = await get(`scene-${f}.json`), ENC = await get(`encounters-${f}.json`), ROOMS = await get(`rooms-${f}.json`);
  const old = scene.tiles.filter(t => t.getFlag(MOD, "role") === "flee").map(t => t.id);
  if (old.length) await scene.deleteEmbeddedDocuments("Tile", old);
  const oldL = scene.lights.filter(l => l.getFlag(MOD, "role") === "flee-light").map(l => l.id);
  if (oldL.length) await scene.deleteEmbeddedDocuments("AmbientLight", oldL);
  const tiles = [];
  for (const [n, list] of Object.entries(ENC.rooms)) {
    if (!list.some(([slug]) => TRASH.includes(slug))) continue;
    const r = SD.rooms[n]; if (!r) continue;
    const [x, y, w, h] = r.rect, px = [(x - X0) * S, (y - Y0) * S, w * S, h * S];
    const meta = ROOMS.find(q => String(q.n) === String(n)) ?? {};
    tiles.push({ texture: { src: icon, tint: "#ffb347" }, x: px[0] + px[2] - IC - 14, y: px[1] - IC - 30, width: IC, height: IC, hidden: true,
      flags: { [MOD]: { role: "flee", room: Number(n), code: meta.code, name: meta.name, rect: px },
        "monks-active-tiles": { active: true, trigger: ["click"], restriction: "gm", controlled: "all", pertoken: false, minrequired: 0, chance: 100,
          name: `Flee: ${meta.code ?? n}`, actions: [{ id: foundry.utils.randomID(), action: "runcode", data: { code: `game.modules.get("${MOD}").api.fleeRoom(tile);` } }] } } });
  }
  await scene.createEmbeddedDocuments("Tile", tiles);
  // a small warm light on each control so the GM can see it in the dark (John, 2026-11-11). It sits in the masonry
  // above the room's wall and is stopped by walls; vision: false, so it never lets a player see through anything.
  await scene.createEmbeddedDocuments("AmbientLight", tiles.map(t => ({ x: t.x + IC / 2, y: t.y + IC / 2, walls: true, vision: false,
    config: { bright: 1, dim: 3, color: "#ffb347", alpha: 0.35, luminosity: 0.5 }, flags: { [MOD]: { role: "flee-light", room: t.flags[MOD].room } } })));
  report[f] = tiles.length;
}
return { icon, ...report };
