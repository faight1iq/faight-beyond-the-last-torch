// Builds the 5LET-1 The Laboratory of Dr. Varnholt treasure items (run in the Foundry console as GM).
// Items are copied from the dnd5e system compendiums by exact name when they exist, otherwise created here.
// Each is flagged {adventure, room} (and story: true for story items) so build_scene.js links it from the room journal.
const MOD = "faight-beyond-the-last-torch", CODE = "5LET-1", NAME = "5LET-1: The Laboratory of Dr. Varnholt";
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
  "Galvanic Lantern": { type: "equipment", img: "icons/sundries/lights/lantern-iron-yellow.webp", system: { type: { value: "trinket" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, common.</em> A brass lantern with a glass bulb in place of a flame, wound by a small crank. Ten turns of the crank (an action) make it shed bright light in a 20-foot radius and dim light for a further 20 feet for 1 hour. It works in wind and rain and underwater.") } } },
  "Elsa's Locket": { type: "equipment", img: "icons/equipment/neck/amulet-heart.webp", system: { type: { value: "trinket" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, common.</em> A silver locket holding a curl of dark hair. While you wear it, you have Advantage on saving throws against the Frightened condition caused by Undead.") } } },
  "Bird-Shaped Key": { type: "loot", img: "icons/sundries/misc/key-ornate-iron-black.webp", system: { type: { value: "treasure" },
    description: { value: P("An iron key with a bow shaped like a raven, the Varnholt crest. It opens the round stone gate in the Vestibule of the Sealed Gate (room 3).") } } },
  "The Galvanic Heart": { type: "loot", img: "icons/magic/lightning/orb-ball-blue.webp", system: { type: { value: "treasure" },
    description: { value: P("The core of the tower coil: a glass heart full of trapped lightning. Pulling it from the wrecked coil (or from the coil after the Bride is destroyed) breaks the storm over Grausbach before dawn. It is a story relic, not a magic item for player use.") } } }
};
// [name, room, story]
const LIST = [["Galvanic Lantern", 2], ["Potion of Healing", 4], ["Goggles of Night", 6], ["Potion of Climbing", 7], ["Hat of Disguise", 8],
  ["Potion of Healing", 10], ["Bird-Shaped Key", 11, true], ["Potion of Healing", 13], ["Eyes of Minute Seeing", 13], ["Elsa's Locket", 14],
  ["Amulet of Health", 12], ["The Galvanic Heart", 12, true]];
const out = [];
for (const [name, room, story] of LIST) {
  let data = custom[name] ? { name, ...foundry.utils.deepClone(custom[name]) } : await fromPack(name);
  if (!data) { out.push(`MISSING ${name}`); continue; }
  delete data._id; data.folder = folder.id;
  data.flags = { ...(data.flags || {}), [MOD]: { adventure: CODE, room, ...(story ? { story: true } : {}) } };
  if (!data.img || !(await fetch('/' + data.img, { method: 'HEAD' })).ok) data.img = 'icons/svg/item-bag.svg';
  const it = await Item.create(data);
  out.push(`${it.name} (room ${room}) ${it.system.rarity || ""}`);
}
out;
