// Builds the 5LEI-3 Basilica of the Thunder Crown treasure items (run in the Foundry console as GM).
// Items are copied from the dnd5e system compendiums by exact name when they exist, otherwise created here.
// Each is flagged {adventure, room} (and story: true for story items) so build_scene.js links it from the room journal.
const MOD = "faight-beyond-the-last-torch", CODE = "5LEI-3", NAME = "5LEI-3: Basilica of the Thunder Crown";
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
  "Moon-Touched Sword": { type: "weapon", img: "icons/weapons/swords/sword-guard-blue.webp", system: { type: { value: "martialM", baseItem: "longsword" }, rarity: "common", properties: ["mgc", "ver"],
    damage: { base: { number: 1, denomination: 8, types: ["slashing"] }, versatile: { number: 1, denomination: 10, types: ["slashing"] } },
    description: { value: P("<em>Weapon (longsword), common.</em> In darkness, the unsheathed blade of this sword sheds moonlight, creating Bright Light in a 15-foot radius and Dim Light for an additional 15 feet.") } } },
  "Cloak of Many Fashions": { type: "equipment", img: "icons/equipment/back/cloak-collared-blue.webp", system: { type: { value: "clothing" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, common.</em> While wearing this cloak, you can take a Bonus Action to change the style, color, and apparent quality of the garment. The cloak's weight doesn't change, and it can't be made to look like anything other than a cloak.") } } },
  "Helm of Comprehending Languages": { type: "equipment", img: "icons/equipment/head/helm-barbute-engraved.webp", system: { type: { value: "trinket" }, rarity: "uncommon", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, uncommon.</em> While wearing this dented iron helm, you can cast <em>Comprehend Languages</em> from it at will. This was the goblin Snikkit's prize.") } } },
  "Iron Key": { type: "loot", img: "icons/sundries/misc/key-steel.webp", system: { type: { value: "treasure" },
    description: { value: P("A heavy iron key, green with age. It opens the battered gate between the Narthex of the Gate and the Treasury of Offerings.") } } },
  "The Thunder Crown": { type: "loot", img: "icons/equipment/head/crown-gold-blue.webp", system: { type: { value: "treasure" },
    description: { value: P("The relic of the storm god Vauroth: a bronze crown that crackles with lightning. Whoever holds it can speak with the basilica's Stormguard Sentinels and command them to stand down. It is not a magic item for player use.") } } }
};
// [name, room, story]
const LIST = [["Potion of Healing", 2], ["Javelin of Lightning", 3], ["Potion of Healing", 5], ["Cloak of Many Fashions", 7],
  ["The Thunder Crown", 9, true], ["Ring of Resistance", 9], ["Lantern of Revealing", 11], ["Potion of Climbing", 12],
  ["Iron Key", 14, true], ["Potion of Healing", 14], ["Helm of Comprehending Languages", 15], ["Moon-Touched Sword", 15]];
const out = [];
for (const [name, room, story] of LIST) {
  let data = custom[name] ? { name, ...foundry.utils.deepClone(custom[name]) } : await fromPack(name);
  if (!data) { out.push(`MISSING ${name}`); continue; }
  delete data._id; data.folder = folder.id;
  if (name === "Ring of Resistance") { data.name = "Ring of Resistance"; data.system.description.value = P("<em>Ring, rare (requires attunement).</em> You have Resistance to Lightning damage while wearing this ring. A sapphire set in it crackles faintly.") + (data.system.description.value || ""); }
  data.flags = { ...(data.flags || {}), [MOD]: { adventure: CODE, room, ...(story ? { story: true } : {}) } };
  const it = await Item.create(data);
  out.push(`${it.name} (room ${room}) ${it.system.rarity || ""}`);
}
out;
