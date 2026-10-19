// Builds the 5LEI-5 Tomb of the Storm Witch treasure items (run in the Foundry console as GM).
// Items are copied from the dnd5e system compendiums by exact name when they exist, otherwise created here.
// Each is flagged {adventure, room} (and story: true for story items) so build_scene.js links it from the room journal.
const MOD = "faight-beyond-the-last-torch", CODE = "5LEI-5", NAME = "5LEI-5: Tomb of the Storm Witch";
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
  "Storm Witch's Comb": { type: "equipment", img: "icons/equipment/neck/collar-carved-bone-teeth.webp", system: { type: { value: "trinket" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, common.</em> A comb of black horn with tiny copper lightning bolts set along its spine. Hair combed with it stays dry and neat in any weather. As a Bonus Action you can comb a creature's hair to end the Deafened condition on it.") } } },
  "Scarf of Clear Breath": { type: "equipment", img: "icons/equipment/head/headwrap-cloth-white.webp", system: { type: { value: "clothing" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, common.</em> A long grey wool scarf that never gets damp. While it is worn over your mouth and nose, you have Advantage on saving throws against inhaled gases and spores.") } } },
  "Silver Tongue Key": { type: "loot", img: "icons/sundries/misc/key-angular-white.webp", system: { type: { value: "treasure" },
    description: { value: P("A silver key shaped like a long tongue. It opens the Mouth, the carved double door in the west wall of the Chamber of the Mouth, without waking the Biting Mouth trap.") } } },
  "Soride, the Storm Lantern": { type: "loot", img: "icons/sundries/lights/lantern-bullseye-signal-copper.webp", system: { type: { value: "treasure" },
    description: { value: P("The Storm Witch's legendary lantern: a cage of green copper around a pale, cold light that flickers like distant lightning. It was swallowed by the Corpse Worm and is recovered when the worm dies or is cut free. It is a story relic, not a magic item for player use.") } } }
};
// [name, room, story]
const LIST = [["Silver Tongue Key", 2, true], ["Wand of Magic Missiles", 2], ["Potion of Healing", 1], ["Potion of Healing", 5], ["Potion of Climbing", 7],
  ["Storm Witch's Comb", 8], ["Scarf of Clear Breath", 10], ["Javelin of Lightning", 11], ["Potion of Healing", 14], ["Cloak of Protection", 14],
  ["Wand of Lightning Bolts", 9], ["Soride, the Storm Lantern", 9, true]];
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
