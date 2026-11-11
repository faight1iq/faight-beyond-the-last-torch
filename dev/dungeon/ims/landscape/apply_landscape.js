// 5LH3-1 ground floor into its landscape (John, 2026-11-11). Run once in the Foundry console:
//   new AsyncFunction("cfg", await (await fetch('/modules/faight-beyond-the-last-torch/dev/dungeon/ims/landscape/apply_landscape.js?'+Date.now())).text())({})
// Grows the scene to 13440 x 13160 and moves everything on it OFF px right and down (tokens, tiles, walls, lights,
// notes, drawings, the Flee rooms' rects, the Stairways landings, the entrance), swaps the four map tiles for the
// landscape (bg) and the cut-out fortress, moves the border walls to the new edge, and raises the drawbridge:
// a wall across the gate, the raised-bridge tile showing, the lowered-bridge tile hidden, and a hidden GM control
// that lowers / raises it. Keeps a copy of the scene's data in localStorage (btlt-ims-ground-before) first.
const M = "faight-beyond-the-last-torch";
const DIR = `modules/${M}/assets/scenes/the-ironmark-stockade`;
const geom = await (await fetch(`/modules/${M}/dev/dungeon/ims/landscape/geom.json?` + Date.now())).json();
const s = game.scenes.find((s) => s.getFlag(M, "adventure") === "5LH3-1" && s.getFlag(M, "floor") === "ground");
if (s.getFlag(M, "landscape")) return "already done";
try { localStorage.setItem("btlt-ims-ground-before", JSON.stringify(s.toObject())); } catch (e) {}
const O = geom.offset, [W, H] = geom.scene;

// 1. the scene grows; nothing may be moved off it first, so grow first, then move
await s.update({ width: W, height: H, padding: 0 });
const mv = (d) => ({ _id: d.id, x: d.x + O, y: d.y + O });
await s.updateEmbeddedDocuments("Token", s.tokens.map(mv), { animate: false, btltFlee: true });
await s.updateEmbeddedDocuments("AmbientLight", s.lights.map(mv));
await s.updateEmbeddedDocuments("Note", s.notes.map(mv));
await s.updateEmbeddedDocuments("Drawing", s.drawings.map(mv));
await s.updateEmbeddedDocuments("Tile", s.tiles.filter((t) => t.getFlag(M, "role") !== "map").map((t) => {
  const u = mv(t), r = t.getFlag(M, "rect");
  if (r) u[`flags.${M}.rect`] = [r[0] + O, r[1] + O, r[2], r[3]];
  return u;
}));
const border = s.walls.filter((w) => w.c.some((v) => v === 245 || v === 10395));
await s.updateEmbeddedDocuments("Wall", s.walls.filter((w) => !border.includes(w)).map((w) => ({ _id: w.id, c: w.c.map((v) => v + O) })));
const e = 140;
await s.updateEmbeddedDocuments("Wall", border.map((w, i) => ({ _id: w.id, c: [[e, e, e, H - e], [e, H - e, W - e, H - e], [W - e, H - e, W - e, e], [W - e, e, e, e]][i] })));
// Stairways landings; the adventure's own landing (the entrance) goes to the far bank
const data = foundry.utils.deepClone(s.flags.stairways?.data ?? []);
for (const d of data) { if (d.name === "btlt-5LH3-1") { d.x = geom.entrance.x; d.y = geom.entrance.y; } else { d.x += O; d.y += O; } }
await s.update({ "flags.stairways.data": data, [`flags.${M}.entrance`]: geom.entrance, [`flags.${M}.landscape`]: true });
// the G1 note sat on the old outer ground, now moat: put it on the bank by the entrance
const g1 = s.notes.find((n) => /^(G1\b|0?1\.)/.test(n.text || n.entry?.name || ""));
if (g1) await g1.update({ x: geom.entrance.x, y: geom.entrance.y + 280 });

// 2. map tiles: landscape under, fortress over
await s.deleteEmbeddedDocuments("Tile", s.tiles.filter((t) => t.getFlag(M, "role") === "map").map((t) => t.id));
const tile = (img, r, extra = {}) => ({ texture: { src: `${DIR}/${img}` }, x: r.x, y: r.y, width: r.w, height: r.h, locked: true, elevation: 0, ...extra });
await s.createEmbeddedDocuments("Tile", [
  tile(geom.bg.img, geom.bg, { sort: -10, flags: { [M]: { role: "map", part: "landscape" } } }),
  ...geom.fort.map((f) => tile(f.img, f, { sort: -5, flags: { [M]: { role: "map", part: "fortress" } } })),
  tile("the-ironmark-stockade-ground-bridge-up.webp", geom.bridge_up, { sort: -2, flags: { [M]: { role: "drawbridge-up" } } }),
  tile("the-ironmark-stockade-ground-bridge-down.webp", geom.bridge_down, { sort: -3, hidden: true, flags: { [M]: { role: "drawbridge-down" } } }),
]);

// 3. the raised bridge closes the gate
const bx0 = geom.bridge_up.x - 35, bx1 = geom.bridge_up.x + geom.bridge_up.w + 35, by = geom.bridge_down.y + 35;
await s.createEmbeddedDocuments("Wall", [{ c: [bx0, by, bx1, by], move: 20, sight: 20, light: 20, sound: 20, flags: { [M]: { role: "drawbridge" } } }]);

// 4. GM control: click to lower / raise
const code = `const M="${M}", sc=tile.parent;
const up=sc.tiles.find(t=>t.getFlag(M,"role")==="drawbridge-up"), dn=sc.tiles.find(t=>t.getFlag(M,"role")==="drawbridge-down"), w=sc.walls.find(w=>w.getFlag(M,"role")==="drawbridge");
const lower=!up.hidden, k=lower?0:20;
await sc.updateEmbeddedDocuments("Tile",[{_id:up.id,hidden:lower},{_id:dn.id,hidden:!lower}]);
await w.update({move:k,sight:k,light:k,sound:k});
const sfx=game.modules.get(M).api?.sfx; sfx?.("trap-metal"); sfx?.("blunt-hit-2",{delay:lower?1100:600});
ChatMessage.create({content:"<p><strong>Drawbridge</strong> "+(lower?"lowered: the moat can be crossed at the gate.":"raised: the gate is closed to the moat.")+"</p>",whisper:ChatMessage.getWhisperRecipients("GM").map(u=>u.id),speaker:{alias:"Gate"}});`;
const cx = geom.bridge_up.x + geom.bridge_up.w + 70, cy = geom.bridge_up.y + 60;
await s.createEmbeddedDocuments("Tile", [{
  texture: { src: "icons/svg/bridge.svg", tint: "#ffb347" }, x: cx, y: cy, width: 84, height: 84, hidden: true, elevation: 0, sort: 50,
  flags: { [M]: { role: "drawbridge-control" }, "monks-active-tiles": { active: true, trigger: ["click"], restriction: "gm", controlled: "all", actions: [{ action: "runcode", data: { code } }] } },
}]);
await s.createEmbeddedDocuments("AmbientLight", [{ x: cx + 42, y: cy + 42, walls: true, vision: false, config: { bright: 1, dim: 3, color: "#ffb347", alpha: 0.5 }, flags: { [M]: { role: "drawbridge-light" } } }]);
return JSON.stringify({ size: [s.width, s.height], tiles: s.tiles.size, walls: s.walls.size, tokens: s.tokens.size, g1: !!g1 });
