// 5LH9-1 set pieces (run in Foundry as GM, after build_scene.js):
// - room 3: the four tarnished bronze mirrors around the Basilisk Matriarch's nest, each with a faint green glint.
//   Turning a mirror: set its tile texture to icons/svg/cancel.svg and flag turned: true (GM, by hand or script).
// Re-running replaces the mirrors.
const MOD = "faight-beyond-the-last-torch";
const sc = game.scenes.find(s => s.getFlag(MOD, "adventure") === "5LH9-1" && s.getFlag(MOD, "role") === "dungeon-scene");
if (!sc) throw new Error("5LH9-1 scene not found");
const old = sc.tiles.filter(t => t.getFlag(MOD, "role") === "bronze-mirror").map(t => t.id);
if (old.length) await sc.deleteEmbeddedDocuments("Tile", old);
const oldL = sc.lights.filter(l => l.getFlag(MOD, "role") === "mirror-light").map(l => l.id);
if (oldL.length) await sc.deleteEmbeddedDocuments("AmbientLight", oldL);
const IMG = "icons/magic/light/beam-rays-yellow.webp";
// mirror centres in the Scarlet Vault (room 3: x 840-1960, y 1680-2520); N and S stand where the art draws them
const P = { N: [1362, 1761], E: [1890, 1930], S: [1161, 2416], W: [1200, 2200] };
await sc.createEmbeddedDocuments("Tile", Object.entries(P).map(([k, [x, y]]) => ({
  texture: { src: IMG }, x: x - 35, y: y - 35, width: 70, height: 70, elevation: 0, sort: 5, locked: false, alpha: 0.6,
  flags: { [MOD]: { role: "bronze-mirror", room: 3, mirror: k, turned: false } } })));
await sc.createEmbeddedDocuments("AmbientLight", Object.entries(P).map(([k, [x, y]]) => ({
  x, y, config: { dim: 5, bright: 0, color: "#9effc9", alpha: 0.3, animation: { type: "torch", speed: 2, intensity: 2 } },
  flags: { [MOD]: { role: "mirror-light", room: 3, mirror: k } } })));
return { mirrors: sc.tiles.filter(t => t.getFlag(MOD, "role") === "bronze-mirror").length, lights: sc.lights.filter(l => l.getFlag(MOD, "role") === "mirror-light").length };
