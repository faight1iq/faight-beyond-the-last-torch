// Builds the 5LH3-1 The Ironmark Stockade treasure items (run in the Foundry console as GM).
// Items are copied from the dnd5e system compendiums by exact name when they exist, otherwise created here.
// Each is flagged {adventure, floor, room} (and story: true for story items) so build_scene.js links it from its floor's room journal.
const MOD = "faight-beyond-the-last-torch", CODE = "5LH3-1", NAME = "5LH3-1: The Ironmark Stockade";
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
  "Crown Veteran's Medal": { type: "equipment", img: "icons/equipment/neck/pendant-bronze-gem-blue.webp", system: { type: { value: "trinket" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, common.</em> A bronze medal on a blue ribbon, struck for Crown soldiers who held the line in the last war. A prisoner hid it in the straw of his cell. While you wear it, you have Advantage on saving throws against the Frightened condition once per Long Rest (you choose when to use it, before you roll).") } } },
  "Warden's Master Keys": { type: "loot", img: "icons/sundries/misc/key-ring-long-silver.webp", system: { type: { value: "treasure" },
    description: { value: P("A heavy iron ring of keys from Warden Skarn's belt. They open every cell door in the North and South Cell Blocks and the Warden's Office strongbox.") } } },
  "The Forgotten Roll": { type: "loot", img: "icons/sundries/scrolls/scroll-bound-sealed-red.webp", system: { type: { value: "treasure" },
    description: { value: P("Gharrek's roll of the Crown prisoners held at Ironmark, name by name, with the order in which they are to hang at dawn. The marshal will want it: it is the list of everyone the party must bring home.") } } }
};
// [name, floor, room, story]
const LIST = [["Potion of Healing", "ground", 5], ["Gauntlets of Ogre Power", "ground", 7], ["Potion of Climbing", "ground", 8],
  ["Sentinel Shield", "ground", 15], ["Moon-Touched Sword", "ground", 15],
  ["Potion of Healing", "basement", 3], ["Crown Veteran's Medal", "basement", 5], ["Warden's Master Keys", "basement", 7, true],
  ["Sword of Wounding", "upper", 6], ["Potion of Healing", "upper", 7], ["The Forgotten Roll", "upper", 8, true], ["Cloak of Protection", "upper", 9]];
const out = [];
for (const [name, floor, room, story] of LIST) {
  let data = custom[name] ? { name, ...foundry.utils.deepClone(custom[name]) } : await fromPack(name);
  if (!data && name === "Moon-Touched Sword") {   // not in this install: a longsword made Moon-Touched
    data = await fromPack("Longsword");
    if (data) { data.name = name; data.system.rarity = "common"; data.system.properties = [...new Set([...(data.system.properties || []), "mgc"])];
      data.system.description.value = P("<em>Weapon (longsword), common.</em> In darkness, the unsheathed blade of this sword sheds moonlight, creating Bright Light in a 15-foot radius and Dim Light for an additional 15 feet. A Crown officer's sword, taken as a trophy and hung on the armory rack.") + (data.system.description.value || ""); }
  }
  if (!data) { out.push(`MISSING ${name}`); continue; }
  delete data._id; data.folder = folder.id;
  data.flags = { ...(data.flags || {}), [MOD]: { adventure: CODE, floor, room, ...(story ? { story: true } : {}) } };
  if (!data.img || !(await fetch('/' + data.img, { method: 'HEAD' })).ok) { out.push(`icon fallback ${name}`); data.img = 'icons/svg/item-bag.svg'; }
  const it = await Item.create(data);
  out.push(`${it.name} (${floor} ${room}) ${it.system.rarity || ""}`);
}
return out;
