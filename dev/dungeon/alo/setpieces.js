// 5LEV-1 set pieces (run in Foundry as GM, after build_scene.js):
// - room 12: the Oracle's four prophecy piles, each with its blue brazier light
// - room 3: a candle on each reading desk, and the three Rot Scribes seated at the desks (2026-11-01 playtest)
// - room 2: the orcs' campfire light on the painted fire
// Burning a pile: set its tile texture to icons/svg/fire.svg and flag burned: true (GM, by hand
// or script). Re-running replaces the piles.
const MOD = "faight-beyond-the-last-torch";
const sc = game.scenes.find(s => s.getFlag(MOD, "adventure") === "5LEV-1");
if (!sc) throw new Error("5LEV-1 scene not found");
const old = sc.tiles.filter(t => t.getFlag(MOD, "role") === "prophecy-pile").map(t => t.id);
if (old.length) await sc.deleteEmbeddedDocuments("Tile", old);
const oldL = sc.lights.filter(l => ["pile-light", "candle", "campfire"].includes(l.getFlag(MOD, "role"))).map(l => l.id);
if (oldL.length) await sc.deleteEmbeddedDocuments("AmbientLight", oldL);
const IMG = `modules/${MOD}/assets/tiles/prophecy-pile.webp`;
// pile centres around the dais (room 12 centre about 6383, 1055); half a square (70 px) each
const P = { N: [6377, 763], E: [6665, 1055], S: [6377, 1338], W: [6102, 1055] };
await sc.createEmbeddedDocuments("Tile", Object.entries(P).map(([k, [x, y]]) => ({
  texture: { src: IMG }, x: x - 35, y: y - 35, width: 70, height: 70, elevation: 0, sort: 5, locked: false,
  flags: { [MOD]: { role: "prophecy-pile", room: 12, pile: k, burned: false } } })));
await sc.createEmbeddedDocuments("AmbientLight", Object.entries(P).map(([k, [x, y]]) => ({
  x, y, config: { bright: 5, dim: 20, color: "#6f9bff", alpha: 0.4, animation: { type: "torch", speed: 2, intensity: 2 } },
  flags: { [MOD]: { role: "pile-light", room: 12, pile: k } } })));
// room 3 desk candles and scribes at their desks; room 2 campfire
const DESKS = [[1830, 6870], [2380, 6870], [1830, 7340], [2380, 7340]];
await sc.createEmbeddedDocuments("AmbientLight", [
  ...DESKS.map(([x, y]) => ({ x, y, config: { bright: 0, dim: 12, color: "#ffcf8a", alpha: 0.3, animation: { type: "torch", speed: 1, intensity: 1 } }, flags: { [MOD]: { role: "candle", room: 3 } } })),
  { x: 2400, y: 3920, config: { bright: 10, dim: 30, color: "#ff8a3d", alpha: 0.45, animation: { type: "torch", speed: 3, intensity: 4 } }, flags: { [MOD]: { role: "campfire", room: 2 } } }]);
const scribes = sc.tokens.filter(t => t.getFlag(MOD, "room") === 3);
const SEATS = [[1820, 6720], [2240, 6720], [2240, 7140]];
await sc.updateEmbeddedDocuments("Token", scribes.map((t, i) => ({ _id: t.id, x: SEATS[i][0], y: SEATS[i][1] })), { animate: false });
return { scribes: scribes.length, candles: DESKS.length, piles: sc.tiles.filter(t => t.getFlag(MOD, "role") === "prophecy-pile").length, lights: sc.lights.filter(l => l.getFlag(MOD, "role") === "pile-light").length };
