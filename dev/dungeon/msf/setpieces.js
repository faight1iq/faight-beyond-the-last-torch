// 5LH8-1 set pieces (run in Foundry as GM, after build_scene.js):
// - room 15: the four bronze funeral urns around the Fallen King's sarcophagus, each with a faint cold-blue glow.
//   Destroying an urn: set its tile texture to icons/svg/cancel.svg and flag broken: true (GM, by hand or script).
// Re-running replaces the urns.
const MOD = "faight-beyond-the-last-torch";
const sc = game.scenes.find(s => s.getFlag(MOD, "adventure") === "5LH8-1" && s.getFlag(MOD, "role") === "dungeon-scene");
if (!sc) throw new Error("5LH8-1 scene not found");
const old = sc.tiles.filter(t => t.getFlag(MOD, "role") === "funeral-urn").map(t => t.id);
if (old.length) await sc.deleteEmbeddedDocuments("Tile", old);
const oldL = sc.lights.filter(l => l.getFlag(MOD, "role") === "urn-light").map(l => l.id);
if (oldL.length) await sc.deleteEmbeddedDocuments("AmbientLight", oldL);
const IMG = "icons/containers/kitchenware/vase-clay-brown-large.webp";
// urn centres around the sarcophagus in the Tomb of the Fallen King (room 15: x 7280-8120, y 8120-8960, centre 7700, 8540)
const P = { N: [7700, 8302], E: [7938, 8540], S: [7700, 8778], W: [7462, 8540] };
await sc.createEmbeddedDocuments("Tile", Object.entries(P).map(([k, [x, y]]) => ({
  texture: { src: IMG }, x: x - 35, y: y - 35, width: 70, height: 70, elevation: 0, sort: 5, locked: false, alpha: 0.6,
  flags: { [MOD]: { role: "funeral-urn", room: 15, urn: k, broken: false } } })));
await sc.createEmbeddedDocuments("AmbientLight", Object.entries(P).map(([k, [x, y]]) => ({
  x, y, config: { bright: 0, dim: 10, color: "#8fd4ff", alpha: 0.35, animation: { type: "pulse", speed: 2, intensity: 3 } },
  flags: { [MOD]: { role: "urn-light", room: 15, urn: k } } })));
return { urns: sc.tiles.filter(t => t.getFlag(MOD, "role") === "funeral-urn").length, lights: sc.lights.filter(l => l.getFlag(MOD, "role") === "urn-light").length };
