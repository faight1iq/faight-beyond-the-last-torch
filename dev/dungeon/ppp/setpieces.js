// 5LGX-1 set pieces (run in Foundry as GM, after build_scene.js):
// - room 12: the four pin-rail ropes that hold Mistress Tangle's strings, each with a faint silver glow.
//   Cutting a rope: set its tile texture to icons/svg/cancel.svg and flag cut: true (GM, by hand or script).
// Re-running replaces the ropes.
const MOD = "faight-beyond-the-last-torch";
const sc = game.scenes.find(s => s.getFlag(MOD, "adventure") === "5LGX-1" && s.getFlag(MOD, "role") === "dungeon-scene");
if (!sc) throw new Error("5LGX-1 scene not found");
const old = sc.tiles.filter(t => t.getFlag(MOD, "role") === "pin-rope").map(t => t.id);
if (old.length) await sc.deleteEmbeddedDocuments("Tile", old);
const oldL = sc.lights.filter(l => l.getFlag(MOD, "role") === "rope-light").map(l => l.id);
if (oldL.length) await sc.deleteEmbeddedDocuments("AmbientLight", oldL);
const IMG = "icons/sundries/survival/rope-wrapped-loops-grey.webp";
// rope centres along the west wall of the Fly Loft (room 12: x 1400-2240, y 1400-2520); half a square (70 px) each
const P = { 1: [1484, 1540], 2: [1484, 1820], 3: [1484, 2100], 4: [1484, 2380] };
await sc.createEmbeddedDocuments("Tile", Object.entries(P).map(([k, [x, y]]) => ({
  texture: { src: IMG }, x: x - 35, y: y - 35, width: 70, height: 70, elevation: 0, sort: 5, locked: false,
  flags: { [MOD]: { role: "pin-rope", room: 12, rope: Number(k), cut: false } } })));
await sc.createEmbeddedDocuments("AmbientLight", Object.entries(P).map(([k, [x, y]]) => ({
  x, y, config: { bright: 0, dim: 10, color: "#dfe6ff", alpha: 0.35, animation: { type: "pulse", speed: 2, intensity: 3 } },
  flags: { [MOD]: { role: "rope-light", room: 12, rope: Number(k) } } })));
return { ropes: sc.tiles.filter(t => t.getFlag(MOD, "role") === "pin-rope").length, lights: sc.lights.filter(l => l.getFlag(MOD, "role") === "rope-light").length };
