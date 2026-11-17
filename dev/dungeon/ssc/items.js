// Builds the 5LH9-1 Scarletskull Castle treasure items (run in the Foundry console as GM).
// Items are copied from the dnd5e system compendiums by exact name when they exist, otherwise created here.
// Each is flagged {adventure, room} (and story: true for story items) so build_scene.js links it from the room journal.
const MOD = "faight-beyond-the-last-torch", CODE = "5LH9-1", NAME = "5LH9-1: Scarletskull Castle";
let folder = game.folders.find(f => f.type === "Item" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Item" });
for (const i of game.items.filter(i => i.getFlag(MOD, "adventure") === CODE)) await i.delete();
const packs = game.packs.filter(p => p.documentName === "Item" && p.metadata.packageName === "dnd5e");
async function fromPack(name) {
  for (const p of packs) { const e = (await p.getIndex()).find(x => x.name === name); if (e) return (await p.getDocument(e._id)).toObject(); }
  return null;
}
const P = t => `<p>${t}</p>`;
async function fromPackAny(names) { for (const n of names) { const d = await fromPack(n); if (d) return d; } return null; }
const ALT = {};
const custom = {
  "Brass Key (Strongroom)": { type: "loot", img: "icons/sundries/misc/key-steel.webp", system: { type: { value: "" }, rarity: "",
    description: { value: P("<em>Story item.</em> A heavy brass key from the Steward's Strongbox, its bow cast as a small grinning red skull. It is one of the three keys to the double door with three keyholes in the Rear Postern, which opens into the Scarlet Vault.") } } },
  "Brass Key (Dwarf)": { type: "loot", img: "icons/sundries/misc/key-steel.webp", system: { type: { value: "" }, rarity: "",
    description: { value: P("<em>Story item.</em> A heavy brass key found beside a dead dwarf, its bow cast as a small grinning red skull. It is one of the three keys to the double door with three keyholes in the Rear Postern, which opens into the Scarlet Vault.") } } },
  "Brass Key (Coffer)": { type: "loot", img: "icons/sundries/misc/key-steel.webp", system: { type: { value: "" }, rarity: "",
    description: { value: P("<em>Story item.</em> A heavy brass key from a smashed coffer, its bow cast as a small grinning red skull. It is one of the three keys to the double door with three keyholes in the Rear Postern, which opens into the Scarlet Vault.") } } },
  "The Sunstone": { type: "equipment", img: "icons/commodities/gems/gem-rough-cushion-white.webp", system: { type: { value: "trinket" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Story item. Wondrous item, common.</em> A fist-sized pale stone that weighs nothing and floats a finger's breadth above an open palm. It sheds Bright Light in a 20-foot radius and Dim Light for a further 20 feet. While you hold it, you have Advantage on saving throws against being Petrified and against basilisk gazes, and its light shows the outline of the secret door into the Scarlet Vault. Held beside one of the Matriarch's bronze mirrors, it lets you turn the mirror on her without a check.") } } }
};
// [name, room, story]
const LIST = [["Potion of Healing", 1], ["Potion of Healing", 6], ["Potion of Healing", 14], ["Potion of Climbing", 13],
  ["The Sunstone", 10, true], ["Brass Key (Strongroom)", 11, true], ["Brass Key (Dwarf)", 14, true], ["Brass Key (Coffer)", 15, true],
  ["Sentinel Shield", 8], ["Eyes of the Eagle", 9], ["Gauntlets of Ogre Power", 3], ["Giant Slayer", 13]];
const ALT2 = { "Giant Slayer": ["Giant Slayer Battleaxe", "Giant Slayer"] };
Object.assign(ALT, ALT2);
const out = [];
for (const [name, room, story] of LIST) {
  let data = custom[name] ? { name, ...foundry.utils.deepClone(custom[name]) } : await fromPackAny(ALT[name] || [name]);
  if (!data) { out.push(`MISSING ${name}`); continue; }
  delete data._id; data.folder = folder.id;
  data.flags = { ...(data.flags || {}), [MOD]: { adventure: CODE, room, ...(story ? { story: true } : {}) } };
  if (!data.img || !(await fetch('/' + data.img, { method: 'HEAD' })).ok) data.img = 'icons/svg/item-bag.svg';
  const it = await Item.create(data);
  out.push(`${it.name} (room ${room}) ${it.system.rarity || ""}`);
}
out;
