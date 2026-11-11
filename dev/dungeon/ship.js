// Copies one dungeon's world documents into the module compendiums (fresh IDs) and builds its Adventure.
// Run in the Foundry console as GM:
//   const run = new (Object.getPrototypeOf(async function(){}).constructor)("cfg", await (await fetch('/modules/faight-beyond-the-last-torch/dev/dungeon/ship.js?'+Date.now())).text());
//   await run({ code: "5LEI-2", name: "Halls of the Void Savant", img: "modules/.../the-void-matriarch.webp", caption: "...", description: "<p>...</p>" });
const MOD = cfg.mod || "faight-beyond-the-last-torch", CODE = cfg.code, NAME = `${cfg.code}: ${cfg.name}`;
const rid = () => foundry.utils.randomID();
const is5 = d => d.getFlag(MOD, "adventure") === CODE || (CODE === "5LEI" && d.id === "vcq4X4Cb1Ez1Em0Y");
const W = {
  Actor: game.actors.filter(is5), Item: game.items.filter(is5),
  JournalEntry: game.journal.filter(is5), Scene: game.scenes.filter(is5)
};
const report = {};
const keepTok = (t) => !!game.actors.get(t.actorId)?.getFlag(MOD, "adventure"); // monsters only: never ship test/player tokens
// Scene cleanup for shipping: monster tokens only; stairways only the floor links between a dungeon's own floors
// (flags.<module>.role "floor-link", 5LH3-1; their scene ids are relinked below). The landing entrance is dropped:
// the Enter Dungeon macro rebuilds it from flags.<module>.entrance. Fresh IDs for walls, tiles, lights, drawings.
const scrub = (o) => { o.tokens = o.tokens.filter(keepTok); if (o.stairways) o.stairways = [];
  if (o.flags?.stairways) { const keep = (o.flags.stairways.data ?? []).filter((r) => r.flags?.[MOD]?.role === "floor-link"); if (keep.length) o.flags.stairways = { data: keep }; else delete o.flags.stairways; } for (const k of ["walls", "tiles", "lights", "drawings"]) for (const x of o[k] ?? []) x._id = rid();
  // Ship every Monk's Active Tiles tile armed, with no trigger history, whatever state play-testing left it in.
  for (const t of o.tiles) { const m = t.flags?.["monks-active-tiles"]; if (m?.actions?.length) { m.active = !t.flags?.[MOD]?.startInactive; delete m.history; } }   // a secret passage tile ships off (5LH3-1)
  // Traps ship hidden and unspotted; their Arm control lit, Disarm dimmed.
  for (const t of o.tiles) { const f = t.flags?.[MOD]; if (!f) continue;
    if (f.role === "trap") { t.hidden = true; delete f.noticed; }
    if (f.role === "trap-arm") t.alpha = 1; if (f.role === "trap-disarm") t.alpha = 0.35; }
  for (const d of o.drawings ?? []) { const f = d.flags?.[MOD]; if (f?.role === "trap-label") { d.text = `${f.trap}\nARMED`; d.textColor = "#5fd35f"; } } };

// Stair links between floors (5LH3-1): Monk's Active Tiles teleport actions point at the copied scene IDs.
function relinkTeleports(o, map) {
  for (const r of o.flags?.stairways?.data ?? []) { const n = map.get(r.scene); if (n) r.scene = typeof n === "string" ? n : n.id; }   // Stairways floor links
  for (const t of o.tiles ?? []) for (const ac of t.flags?.["monks-active-tiles"]?.actions ?? []) {
    const sid = ac.data?.location?.sceneId; if (!sid) continue; const n = map.get(sid); if (n) ac.data.location.sceneId = typeof n === "string" ? n : n.id;
  }
}
function patchText(s, map) {
  return s.replace(/@UUID\[(Actor|Item|JournalEntry)\.([A-Za-z0-9]{16})((?:\.JournalEntryPage\.)([A-Za-z0-9]{16}))?\]/g,
    (m, type, id, pg, pid) => {
      const n = map.get(id); if (!n) return m;
      const base = typeof n === "string" ? `${type}.${n}` : n.uuid;
      const pageNew = pid ? (map.get(pid) || pid) : null;
      return `@UUID[${base}${pageNew ? `.JournalEntryPage.${typeof pageNew === "string" ? pageNew : pageNew.id}` : ""}]`;
    });
}

// ---------- 1. Individual pack copies ----------
const packFor = { Actor: "actors", Item: "items", JournalEntry: "journals", Scene: "scenes" };
const packMap = new Map(); // worldId -> {id, uuid} in pack
for (const [type, docs] of Object.entries(W)) {
  const pack = game.packs.get(`${MOD}.${packFor[type]}`);
  for (const d of docs) { const nid = rid(); packMap.set(d.id, { id: nid, uuid: `Compendium.${pack.collection}.${type}.${nid}` });
    if (type === "JournalEntry") for (const p of d.pages) packMap.set(p.id, { id: rid() }); }
}
for (const [type, docs] of Object.entries(W)) {
  const pack = game.packs.get(`${MOD}.${packFor[type]}`);
  const wasLocked = pack.locked; if (wasLocked) await pack.configure({ locked: false });
  const folder = pack.folders.find(f => f.name === NAME) ?? await Folder.create({ name: NAME, type }, { pack: pack.collection });
  // remove earlier copies of this adventure
  const idx = await pack.getIndex({ fields: [`flags.${MOD}.adventure`] });
  const stale = idx.filter(e => foundry.utils.getProperty(e, `flags.${MOD}.adventure`) === CODE || (CODE === "5LEI" && e.name === "Icefall Pyramid — Overview")).map(e => e._id);
  if (stale.length) await pack.documentClass.deleteDocuments(stale, { pack: pack.collection });
  const data = docs.map(d => {
    const o = d.toObject(); o._id = packMap.get(d.id).id; o.folder = folder?.id ?? null;
    foundry.utils.setProperty(o, `flags.${MOD}.adventure`, CODE);
    if (type === "JournalEntry") for (const p of o.pages) { p._id = packMap.get(p._id).id; if (p.text?.content) p.text.content = patchText(p.text.content, packMap); }
    if (type === "Scene") {
      scrub(o);
      for (const t of o.tokens) { t._id = rid(); const n = packMap.get(t.actorId); t.actorId = n ? n.id : null; }
      relinkTeleports(o, packMap);
      for (const n of o.notes) { n._id = rid(); const e = packMap.get(n.entryId); n.entryId = e?.id ?? null; n.pageId = packMap.get(n.pageId)?.id ?? null; }
    }
    return o;
  });
  await pack.documentClass.createDocuments(data, { pack: pack.collection, keepId: true });
  if (wasLocked) await pack.configure({ locked: true });
  report[pack.collection] = data.length;
}

// ---------- 2. Adventure ----------
const advPack = game.packs.get(`${MOD}.${MOD}`);
const aMap = new Map();
for (const docs of Object.values(W)) for (const d of docs) { aMap.set(d.id, rid()); if (d.documentName === "JournalEntry") for (const p of d.pages) aMap.set(p.id, rid()); }
const folders = []; const fMap = new Map();
for (const type of Object.keys(W)) { const f = game.folders.find(x => x.type === type && x.name === NAME); if (f) { const nid = rid(); fMap.set(f.id, nid); folders.push({ ...f.toObject(), _id: nid, folder: null }); } }
const clone = (d) => {
  const o = d.toObject(); o._id = aMap.get(d.id); o.folder = fMap.get(o.folder) ?? null;
  if (d.documentName === "JournalEntry") for (const p of o.pages) { p._id = aMap.get(p._id); if (p.text?.content) p.text.content = patchText(p.text.content, aMap); }
  if (d.documentName === "Scene") {
    scrub(o);
    for (const t of o.tokens) { t._id = rid(); t.actorId = aMap.get(t.actorId) ?? null; }
    relinkTeleports(o, aMap);
    for (const n of o.notes) { n._id = rid(); n.entryId = aMap.get(n.entryId) ?? null; n.pageId = aMap.get(n.pageId) ?? null; }
  }
  return o;
};
const advData = {
  name: NAME, img: cfg.img, caption: cfg.caption, description: cfg.description,
  folders, actors: W.Actor.map(clone), items: W.Item.map(clone), journal: W.JournalEntry.map(clone), scenes: W.Scene.map(clone),
  flags: { [MOD]: { adventure: CODE } }
};
const wasLocked = advPack.locked; if (wasLocked) await advPack.configure({ locked: false });
const advIdx = await advPack.getIndex();
const oldAdv = advIdx.filter(e => e.name === NAME).map(e => e._id);
if (oldAdv.length) await Adventure.deleteDocuments(oldAdv, { pack: advPack.collection });
const adv = await Adventure.create(advData, { pack: advPack.collection });
if (wasLocked) await advPack.configure({ locked: true });

// ---------- 3. Verify ----------
const ids = new Set([...Object.values(W).flat().map(d => d.id)]);
const clash = [...packMap.values()].map(v => v.id).concat([...aMap.values()]).filter(i => ids.has(i));
const sc = adv.scenes.contents?.[0] ?? [...adv.scenes][0];
const aIds = new Set([...adv.actors].map(a => a._id ?? a.id));
const jIds = new Set([...adv.journal].map(j => j._id ?? j.id));
report.adventure = { id: adv.id, actors: adv.actors.size, items: adv.items.size, journal: adv.journal.size, scenes: adv.scenes.size, folders: adv.folders.size,
  scenesCheck: [...adv.scenes].map(sc => ({ name: sc.name, darkness: sc.environment?.darknessLevel, tokensLinked: sc.tokens.filter(t => aIds.has(t.actorId)).length + "/" + (sc.tokens.length ?? sc.tokens.size),
    notesLinked: sc.notes.filter(n => jIds.has(n.entryId)).length + "/" + (sc.notes.length ?? sc.notes.size),
    teleportsLinked: sc.tiles.filter(t => t.flags?.[MOD]?.role === "stair-link").filter(t => [...adv.scenes].some(x => (x._id ?? x.id) === t.flags["monks-active-tiles"].actions[0].data.location.sceneId)).length + "/" + sc.tiles.filter(t => t.flags?.[MOD]?.role === "stair-link").length })),
  idClashesWithWorld: clash.length };
return report;
