// Links the floors of a multi-floor dungeon with Stairways module stairways (5LH3-1 rework; replaces link_floors.js).
// Run in the Foundry console as GM after build_scene.js has built every floor:  cfg = { key: "ims", code: "5LH3-1" }
// Reads dev/dungeon/<key>/links.json: [[{floor, id, rect:[x,y,w,h], arrive, secret}, {...}], ...] (scene pixels).
// Each pair becomes two stairways with one shared name, one at the centre of each stair, each pointing at the other
// floor's scene. A secret passage's ground-floor end starts hidden: the GM shows it once the party finds the grate.
// Stairways keeps them in scene.flags.stairways.data; ours carry flags.<mod>.role = "floor-link" (ship.js keeps those).
const MOD = cfg.mod || "faight-beyond-the-last-torch", code = cfg.code;
const LINKS = await (await fetch(`/modules/${MOD}/dev/dungeon/${cfg.key}/links.json?${Date.now()}`)).json();
const FLOOR = { ground: "Ground Floor", basement: "Basement", upper: "Upper Floor" };
const scene = f => game.scenes.find(s => s.getFlag(MOD, "adventure") === code && s.getFlag(MOD, "floor") === f);
const rec = (d) => ({ scene: null, name: "", label: "", icon: null, textColor: null, fontFamily: null, fontSize: null,
  width: null, height: null, disabled: false, hidden: false, animate: false, partnerSceneLabel: false, flags: {}, ...d });
const data = {};
for (const f of Object.keys(FLOOR)) { const s = scene(f); if (s) data[s.id] = (s.flags.stairways?.data ?? []).filter(r => r.flags?.[MOD]?.role !== "floor-link"); }
// the old Monk's Active Tiles stair teleports go
for (const f of Object.keys(FLOOR)) {
  const s = scene(f); if (!s) continue;
  const old = s.tiles.filter(t => t.getFlag(MOD, "role") === "stair-link").map(t => t.id);
  if (old.length) await s.deleteEmbeddedDocuments("Tile", old);
}
let n = 0;
for (const pair of LINKS) {
  const name = `${code}-${pair[0].id}-${pair[1].id}`;
  for (const [from, to] of [[pair[0], pair[1]], [pair[1], pair[0]]]) {
    const src = scene(from.floor), dst = scene(to.floor); if (!src || !dst) continue;
    const [x, y, w, h] = from.rect;
    const label = from.secret ? (to.floor === "basement" ? "Culvert: down to the dungeon" : "Culvert: out to the moat")
      : to.floor === "upper" ? "Up to the Upper Floor" : to.floor === "basement" ? "Down to the Basement"
      : from.floor === "upper" ? "Down to the Ground Floor" : "Up to the Ground Floor";
    data[src.id].push(rec({ _id: foundry.utils.randomID(16), x: x + w / 2, y: y + h / 2, name, scene: dst.id, label,
      hidden: !!(from.secret && from.floor === "ground"), flags: { [MOD]: { role: "floor-link", link: `${from.id}->${to.id}`, ...(from.secret ? { secret: true } : {}) } } }));
    n++;
  }
}
for (const [sid, list] of Object.entries(data)) await game.scenes.get(sid).update({ "flags.stairways.data": list });
return { stairways: n, perScene: Object.fromEntries(Object.entries(data).map(([k, v]) => [game.scenes.get(k).getFlag(MOD, "floor"), v.length])) };
