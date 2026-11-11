// 5LH3-1 set piece: the four Legion Standards in the Throne Room (upper floor, room U5), with a faint red glow each.
// Run after build_scene.js has built the upper floor. Re-running replaces them.
const MOD = "faight-beyond-the-last-torch", CODE = "5LH3-1";
const scene = game.scenes.find(s => s.getFlag(MOD, "adventure") === CODE && s.getFlag(MOD, "floor") === "upper");
const old = scene.tiles.filter(t => t.getFlag(MOD, "role") === "legion-standard").map(t => t.id);
if (old.length) await scene.deleteEmbeddedDocuments("Tile", old);
const oldL = scene.lights.filter(l => l.getFlag(MOD, "role") === "legion-standard").map(l => l.id);
if (oldL.length) await scene.deleteEmbeddedDocuments("AmbientLight", oldL);
const S = 280, X0 = -1, Y0 = -1, size = 210;                    // 7.5 ft across (three 2.5-ft squares)
const spots = [[15, 11.2], [15, 12.8], [21, 11.2], [21, 12.8]];   // centres, in 10-ft squares (two each side of the carpet)
const img = `modules/${MOD}/assets/scenes/the-ironmark-stockade/legion-standard.webp`;
const tiles = spots.map(([x, y], i) => ({ texture: { src: img }, x: (x - X0) * S - size / 2, y: (y - Y0) * S - size / 2, width: size, height: size,
  elevation: 0, sort: 5, locked: false, flags: { [MOD]: { role: "legion-standard", n: i + 1, room: 6 } } }));
await scene.createEmbeddedDocuments("Tile", tiles);
await scene.createEmbeddedDocuments("AmbientLight", spots.map(([x, y], i) => ({ x: (x - X0) * S, y: (y - Y0) * S,
  config: { dim: 10, bright: 0, color: "#b0302a", alpha: 0.3, animation: { type: "torch", speed: 2, intensity: 2 } }, flags: { [MOD]: { role: "legion-standard", n: i + 1 } } })));
return { standards: tiles.length, scene: scene.name };
