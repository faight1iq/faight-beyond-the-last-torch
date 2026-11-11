// Links the floors of a multi-floor dungeon with Monk's Active Tiles teleport tiles on every stair (5LH3-1).
// Run in the Foundry console as GM after build_scene.js has built every floor:
//   await run({ key: "ims", code: "5LH3-1" })
// Reads dev/dungeon/<key>/links.json: [[{floor, id, rect:[x,y,w,h], arrive:[x,y], secret}, {...}], ...] (scene pixels).
// Each stair gets a hidden tile that sends any token entering it to the arrival square beside the paired stair.
// A secret passage tile on the ground floor starts inactive: the GM activates it once the party finds the grate.
const MOD = cfg.mod || "faight-beyond-the-last-torch", code = cfg.code;
const LINKS = await (await fetch(`/modules/${MOD}/dev/dungeon/${cfg.key}/links.json?${Date.now()}`)).json();
const scene = f => game.scenes.find(s => s.getFlag(MOD, "adventure") === code && s.getFlag(MOD, "floor") === f);
const report = {};
for (const f of ["ground", "basement", "upper"]) {
  const s = scene(f); if (!s) continue;
  const old = s.tiles.filter(t => t.getFlag(MOD, "role") === "stair-link").map(t => t.id);
  if (old.length) await s.deleteEmbeddedDocuments("Tile", old);
}
const add = {};
for (const pair of LINKS) for (const [from, to] of [[pair[0], pair[1]], [pair[1], pair[0]]]) {
  const src = scene(from.floor), dst = scene(to.floor);
  if (!src || !dst) { report.missing = (report.missing || 0) + 1; continue; }
  const [x, y, w, h] = from.rect;
  const inactive = from.secret && from.floor === "ground";
  (add[src.id] ??= []).push({ texture: { src: "icons/svg/door-exit.svg" }, alpha: 0.5, hidden: true, x, y, width: w, height: h,
    flags: { [MOD]: { role: "stair-link", link: `${from.id}->${to.id}`, to: to.floor, ...(inactive ? { startInactive: true } : {}) },
      "monks-active-tiles": { active: !inactive, trigger: ["enter"], restriction: "all", controlled: "all", pertoken: false, minrequired: 0, chance: 100,
        name: `${from.id} to ${to.id}`,
        actions: [{ id: foundry.utils.randomID(), action: "teleport", data: { entity: { id: "token", name: "Triggering Token" },
          location: { x: to.arrive[0], y: to.arrive[1], sceneId: dst.id }, position: "center", remotesnap: true, animatepan: true,
          triggerremote: false, deletesource: true, preservesettings: true, avoidtokens: true, colour: "#6b4a2b" } }] } } });
}
for (const [sid, tiles] of Object.entries(add)) { const s = game.scenes.get(sid); await s.createEmbeddedDocuments("Tile", tiles); report[s.getFlag(MOD, "floor")] = tiles.length; }
return report;
