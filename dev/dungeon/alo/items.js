// Builds the 5LEV-1 Archive of the Leper Oracle treasure items (run in the Foundry console as GM). Solo build.
const MOD = "faight-beyond-the-last-torch", CODE = "5LEV-1", NAME = "5LEV-1: Archive of the Leper Oracle";
let folder = game.folders.find(f => f.type === "Item" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Item" });
for (const i of game.items.filter(i => i.getFlag(MOD, "adventure") === CODE)) await i.delete();
const packs = game.packs.filter(p => p.documentName === "Item" && p.metadata.packageName === "dnd5e");
async function fromPack(name) {
  for (const p of packs) { const e = (await p.getIndex()).find(x => x.name === name); if (e) return (await p.getDocument(e._id)).toObject(); }
  return null;
}
const P = t => `<p>${t}</p>`;
const custom = {
  "Key of the Waxing Crown": { type: "loot", img: "icons/sundries/misc/key-ornate-iron-black.webp", system: { type: { value: "treasure" },
    description: { value: P("A heavy gold key whose bow is a crown with its points rising left to right, like the moon waxing. One of the two keys to the stone door in the Hall of the Stone Door (room 8); both must be turned within the same round.") } } },
  "Key of the Waning Crown": { type: "loot", img: "icons/sundries/misc/key-ornate-iron-black.webp", system: { type: { value: "treasure" },
    description: { value: P("A heavy gold key whose bow is a crown with its points falling left to right, like the moon waning. One of the two keys to the stone door in the Hall of the Stone Door (room 8); both must be turned within the same round.") } } },
  "The Oracle's Last Prophecy": { type: "loot", img: "icons/sundries/scrolls/scroll-bound-sealed-red.webp", system: { type: { value: "treasure" },
    description: { value: P("A scroll sealed with grey wax, found in the Leper Oracle's lap: the last prophecy Mother Ysolde spoke before she died. It is a story item; its words are the GM's to reveal.") } } }
};
const out = [];
async function make(data, name, room, story) {
  delete data._id; data.name = name; data.folder = folder.id;
  data.flags = { ...(data.flags || {}), [MOD]: { adventure: CODE, room, ...(story ? { story: true } : {}) } };
  if (!data.img || !(await fetch('/' + data.img, { method: 'HEAD' })).ok) data.img = 'icons/sundries/scrolls/scroll-rolled-white.webp';
  const it = await Item.create(data); out.push(`${it.name} (room ${room}) ${it.system.rarity || ""}`);
}
// [name, source name, room, story]
const LIST = [["Potion of Healing", "Potion of Healing", 1], ["Potion of Healing", "Potion of Healing", 3], ["Key of the Waxing Crown", null, 5, true],
  ["Key of the Waning Crown", null, 7, true], ["Potion of Invisibility", "Potion of Invisibility", 9], ["Potion of Greater Healing", "Potion of Healing (Greater)", 10],
  ["Robe of Eyes", "Robe of Eyes", 12], ["The Oracle's Last Prophecy", null, 12, true]];
for (const [name, src, room, story] of LIST) {
  const data = custom[name] ? foundry.utils.deepClone(custom[name]) : await fromPack(src);
  if (!data) { out.push(`MISSING ${name}`); continue; }
  await make(data, name, room, story);
}
// Room 6: a Spell Scroll of Lesser Restoration (cures the Grey Rot), named "Spell Scroll" so the journal link resolves
const lr = await fromUuid("Compendium.dnd5e.spells24.Item.phbsplLesserRest");
const sc = await dnd5e.documents.Item5e.createScrollFromSpell(lr, {}, { dialog: false });
const sd = sc.toObject ? sc.toObject() : sc; sd.system.description.value = P("<em>Lesser Restoration.</em> Found in a basket in the Basket Alcove.") + (sd.system.description.value || "");
await make(sd, "Spell Scroll", 6, false);
out;
