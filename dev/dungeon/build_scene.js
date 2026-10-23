// Builds a dungeon's journals and scene in the world from dev/dungeon/<key>/ (run in the Foundry console as GM):
//   const run = new (Object.getPrototypeOf(async function(){}).constructor)("cfg", await (await fetch('/modules/faight-beyond-the-last-torch/dev/dungeon/build_scene.js?'+Date.now())).text());
//   await run({ key: "hvs", code: "5LEI-2", name: "Halls of the Void Savant", slug: "halls-of-the-void-savant" });
//   other modules: add mod: "<module id>" (default faight-beyond-the-last-torch)
// Needs: <key>/scene.json (scenedata.py), optional <key>/water.json (water.py), <key>/rooms.json, <key>/lore.md, map tiles assets/scenes/<slug>/<slug>-q{ix}{iy}.webp,
// monster actors flagged {adventure: code, slug}, items flagged {adventure: code, room}.
const MOD = cfg.mod || "faight-beyond-the-last-torch";   // module id: pass cfg.mod for other modules (e.g. "faight-anchester-by-torchlight")
const { key, code, name, slug } = cfg;
const NAME = `${code}: ${name}`;
const BASE = `modules/${MOD}/dev/dungeon/${key}`;   // inputs live in the module's own dev/dungeon/<key>/
const get = async (f, json = true) => { const r = await fetch(`/${BASE}/${f}?${Date.now()}`); return json ? r.json() : r.text(); };
const S = await get("scene.json"), ROOMS = await get("rooms.json"), LORE = await get("lore.md", false);
const folder = (type) => game.folders.find(f => f.type === type && f.name === NAME);
for (const t of ["JournalEntry", "Scene"]) if (!folder(t)) await Folder.create({ name: NAME, type: t });
const report = {};

// ---------- journals ----------
for (const j of game.journal.filter(j => j.getFlag(MOD, "adventure") === code)) await j.delete();
const md = (s) => s.replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>")
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
  .split(/\n{2,}/).map(b => /^<h\d/.test(b) ? b : /^- /m.test(b) ? "<ul>" + b.split("\n").map(l => `<li>${l.replace(/^- /, "")}</li>`).join("") + "</ul>" : `<p>${b.replace(/\n/g, " ")}</p>`).join("");
const overview = await JournalEntry.create({ name: `${name} — Overview`, folder: folder("JournalEntry").id,
  flags: { [MOD]: { adventure: code, role: "overview" } }, pages: [{ name: "Overview", type: "text", text: { content: md(LORE) } }] });
const actors = Object.fromEntries(game.actors.filter(a => a.getFlag(MOD, "adventure") === code).map(a => [a.name, a]));
const items = game.items.filter(i => i.getFlag(MOD, "adventure") === code);
const link = (html, room) => {
  for (const [n, a] of Object.entries(actors)) html = html.replaceAll(`<strong>${n}</strong>`, `@UUID[Actor.${a.id}]{${n}}`).replaceAll(`<strong>${n}s</strong>`, `@UUID[Actor.${a.id}]{${n}s}`);
  // items: the copy found in this room first, then any mention of a story item elsewhere
  for (const i of [...items.filter(i => i.getFlag(MOD, "room") === room), ...items.filter(i => i.getFlag(MOD, "story"))]) html = html.replace(`<strong>${i.name}</strong>`, `@UUID[Item.${i.id}]{${i.name}}`);
  return html;
};
const journals = {};
for (const r of ROOMS) {
  const html = `<blockquote class="read-aloud"><p><em>${r.read}</em></p></blockquote><h2>DM Notes</h2>${link(r.notes, r.n)}<hr><p>Back to @UUID[JournalEntry.${overview.id}]{${name} — Overview}.</p>`;
  journals[r.n] = await JournalEntry.create({ name: `${String(r.n).padStart(2, "0")}. ${r.name}`, folder: folder("JournalEntry").id,
    flags: { [MOD]: { adventure: code, role: "room", room: r.n } }, pages: [{ name: r.name, type: "text", text: { content: html } }] });
}
const index = "<h2>Rooms</h2><ol>" + ROOMS.map(r => `<li>@UUID[JournalEntry.${journals[r.n].id}]{${r.name}}</li>`).join("") + "</ol>";
await overview.pages.contents[0].update({ "text.content": overview.pages.contents[0].text.content + index });
report.journals = 1 + ROOMS.length;

// ---------- scene ----------
for (const s of game.scenes.filter(s => s.getFlag(MOD, "adventure") === code)) await s.delete();
const art = `modules/${MOD}/assets/scenes/${slug}`;
const scene = await Scene.create({
  name, folder: folder("Scene").id, width: S.width, height: S.height, padding: 0, backgroundColor: "#000000",
  grid: { type: 0, size: 140, distance: 5, units: "ft" }, tokenVision: true, fog: { exploration: true },
  environment: { darknessLevel: 1, globalLight: { enabled: false } },
  flags: { [MOD]: { adventure: code, role: "dungeon-scene", slug, entrance: S.entrance } }
});
await scene.createEmbeddedDocuments("Tile", S.tiles.map(t => ({ texture: { src: `${art}/${slug}-${t.img}.webp` }, x: t.x, y: t.y, width: t.w, height: t.h, locked: true, elevation: 0, sort: 0,
  flags: { [MOD]: { role: "map" } } })));
// animated water (water.py), just above the map tiles; optional
const WATER = await fetch(`/${BASE}/water.json?${Date.now()}`).then(r => r.ok ? r.json() : []).catch(() => []);
if (WATER.length) await scene.createEmbeddedDocuments("Tile", WATER.map(t => ({ texture: { src: `${art}/${t.img}` }, x: t.x, y: t.y, width: t.w, height: t.h,
  locked: true, elevation: 0, sort: 1, video: { autoplay: true, loop: true, volume: 0 }, flags: { [MOD]: { role: "water" } } })));
report.water = WATER.length;
await scene.createEmbeddedDocuments("Wall", S.walls.map(w => ({ c: w.c, door: w.door ?? 0, ds: w.ds ?? 0, flags: w.flags ?? {} })));
await scene.createEmbeddedDocuments("Note", S.notes.map(n => ({ x: n.x, y: n.y, entryId: journals[n.n].id, pageId: journals[n.n].pages.contents[0].id,
  text: String(n.n), iconSize: 40, fontSize: 32, texture: { src: "icons/svg/book.svg" }, global: false })));
await scene.createEmbeddedDocuments("AmbientLight", S.lights.map(l => ({ x: l.x, y: l.y, config: { dim: l.dim, bright: l.bright, color: l.color, alpha: 0.35, animation: { type: "torch", speed: 2, intensity: 2 } },
  flags: { [MOD]: { role: "glow", room: l.room } } })));
const bySlug = Object.fromEntries(Object.values(actors).map(a => [a.getFlag(MOD, "slug"), a]));
const toks = [];
for (const t of S.tokens) {
  const a = bySlug[t.slug]; if (!a) continue;
  const td = await a.getTokenDocument({ x: t.x, y: t.y, hidden: true, flags: { [MOD]: { room: t.room } } });
  toks.push(td.toObject());
}
await scene.createEmbeddedDocuments("Token", toks);
report.tokens = toks.length;

// ---------- traps (Monk's Active Tiles + Monk's TokenBar) ----------
const deact = () => ({ id: foundry.utils.randomID(), action: "activate", data: { entity: { id: "tile", name: "This Tile" }, collection: "tiles", activate: "deactivate" } });
const cur = { id: "previous", name: "Current Tokens" };
const trapTiles = S.traps.map(t => {
  const fail = [{ id: foundry.utils.randomID(), action: "hurtheal", data: { entity: cur, value: `-[[${t.dice}]]`, chatMessage: true, rollmode: "roll", showdice: true } }];
  if (t.effect) fail.push({ id: foundry.utils.randomID(), action: "activeeffect", data: { entity: cur, effectid: t.effect, addeffect: "add", altereffect: "" } });
  const actions = [
    { id: foundry.utils.randomID(), action: "monks-tokenbar.requestroll", data: { entity: { id: "token", name: "Triggering Token" }, request: `save:${t.save}`, dc: String(t.dc), flavor: t.flavor, rollmode: "roll", silent: true, fastforward: false, usetokens: "all", continue: "always" } },
    { id: foundry.utils.randomID(), action: "monks-tokenbar.filterrequest", data: { failed: "fail", passed: "pass", resume: "" } },
    { id: foundry.utils.randomID(), action: "anchor", data: { tag: "fail", stop: true } }, ...fail, deact(),
    { id: foundry.utils.randomID(), action: "anchor", data: { tag: "pass", stop: true } },
    { id: foundry.utils.randomID(), action: "hurtheal", data: { entity: cur, value: `-[[floor((${t.dice})/2)]]`, chatMessage: true, rollmode: "roll", showdice: true } }, deact()
  ];
  return { texture: { src: `modules/${MOD}/assets/tiles/trap-red.webp`, tint: "#ff0000" }, alpha: 0.7, hidden: true, x: t.px[0], y: t.px[1], width: t.px[2], height: t.px[3],
    flags: { [MOD]: { role: "trap", room: t.room, trap: t.name, spotDC: t.spotDC ?? t.dc },
      "monks-active-tiles": { active: true, trigger: ["enter"], restriction: "player", controlled: "all", pertoken: false, minrequired: 0, chance: 100, actions, name: t.name } } };
});
if (S.teleport) {
  const t = S.teleport;
  trapTiles.push({ texture: { src: `modules/${MOD}/assets/tiles/trap-red.webp`, tint: "#8a5cff" }, alpha: 0.7, hidden: true, x: t.px[0], y: t.px[1], width: t.px[2], height: t.px[3],
    flags: { [MOD]: { role: "teleport", room: t.room },
      "monks-active-tiles": { active: true, trigger: ["enter"], restriction: "player", controlled: "all", pertoken: false, minrequired: 0, chance: 100, name: "Hearth of Leaving",
        actions: [{ id: foundry.utils.randomID(), action: "teleport", data: { entity: { id: "token", name: "Triggering Token" }, location: { x: t.dest[0] + 70, y: t.dest[1] + 70, sceneId: scene.id }, position: "center", remotesnap: true, animatepan: false, triggerremote: false, deletesource: false, preservesettings: false, avoidtokens: true, colour: "#8a5cff" } }] } } });
}
await scene.createEmbeddedDocuments("Tile", trapTiles);
report.traps = trapTiles.length;
report.scene = scene.id; report.walls = scene.walls.size; report.notes = scene.notes.size; report.overview = overview.id;
return report;
