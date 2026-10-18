// Builds the 5LEI-4 Darkspear Mausoleum treasure items (run in the Foundry console as GM).
// Items are copied from the dnd5e system compendiums by exact name when they exist, otherwise created here.
// Each is flagged {adventure, room} (and story: true for story items) so build_scene.js links it from the room journal.
const MOD = "faight-beyond-the-last-torch", CODE = "5LEI-4", NAME = "5LEI-4: Darkspear Mausoleum";
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
  "Mithral Breastplate": { type: "equipment", img: "icons/equipment/chest/breastplate-banded-steel.webp", system: { type: { value: "medium", baseItem: "breastplate" }, rarity: "uncommon", properties: ["mgc"], armor: { value: 14, dex: 2 },
    description: { value: P("<em>Armor (breastplate), uncommon.</em> Mithral is a light, flexible metal. This dwarf-made breastplate doesn't impose Disadvantage on Dexterity (Stealth) checks and has no Strength requirement.") } } },
  "Ornate Rapier": { type: "weapon", img: "icons/weapons/swords/shortsword-guard-gold.webp", system: { type: { value: "martialM", baseItem: "rapier" }, rarity: "common", properties: ["mgc", "fin"],
    damage: { base: { number: 1, denomination: 8, types: ["piercing"] } },
    description: { value: P("<em>Weapon (rapier), common.</em> A gilded dwarf-made rapier. In darkness, the unsheathed blade sheds moonlight, creating Bright Light in a 15-foot radius and Dim Light for an additional 15 feet.") } } },
  "Clockwork Amulet": { type: "equipment", img: "icons/equipment/neck/amulet-round-engraved-gold.webp", system: { type: { value: "trinket" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, common.</em> This copper amulet ticks faintly. When you make an attack roll while wearing it, you can forgo rolling the d20 to get a 10 on the die. Once used, this property can't be used again until the next dawn.") } } },
  "Golden Key": { type: "loot", img: "icons/sundries/misc/key-short-gold.webp", system: { type: { value: "treasure" },
    description: { value: P("One of the two golden keys to the Thane's treasury. The massive double door in the Hall of Two Keys opens only when both keys turn together.") } } },
  "The Darkspear": { type: "loot", img: "icons/weapons/polearms/spear-flared-worn-grey.webp", system: { type: { value: "treasure" },
    description: { value: P("Thane Brokk Darkspear's black iron spear, pulled from the Elder Ursa. Returning it to the Thane's sarcophagus lays the Darkspear Wardens to rest. It is not a magic item for player use.") } } }
};
// [name, room, story]
const LIST = [["Mithral Breastplate", 5], ["Ornate Rapier", 5], ["Golden Key", 8, true], ["Gloves of Swimming and Climbing", 8], ["Potion of Healing", 8],
  ["Bag of Holding", 9], ["Potion of Climbing", 11], ["Ring of Protection", 12], ["Potion of Healing", 12], ["The Darkspear", 14, true], ["Potion of Healing", 14],
  ["Golden Key", 15, true], ["Clockwork Amulet", 13]];
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
