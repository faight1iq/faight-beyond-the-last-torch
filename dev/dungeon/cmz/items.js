// Builds the 5LES-1 The Hollow King's Maze treasure items (run in the Foundry console as GM).
// Items are copied from the dnd5e system compendiums by exact name when they exist, otherwise created here.
// Each is flagged {adventure, room} (and story: true for story items) so build_scene.js links it from the room journal.
const MOD = "faight-beyond-the-last-torch", CODE = "5LES-1", NAME = "5LES-1: The Hollow King's Maze";
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
  "Scarecrow's Straw Hat": { type: "equipment", img: "icons/equipment/head/hat-belted-simple.webp", system: { type: { value: "clothing" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, common.</em> The prize from the festival's costume contest: a battered straw hat with a crow feather in the band. While you wear it and stand still in a field or garden, birds take you for a scarecrow and will not land within 10 feet of you.") } } },
  "Ivory Harvest Necklace": { type: "equipment", img: "icons/equipment/neck/necklace-carved-bone-skull.webp", system: { type: { value: "trinket" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, common.</em> The Harvest Queen's necklace: ivory beads carved as ears of wheat. While you wear it, you always know which way you came into a maze, field or forest, and the way back out along the path you walked.") } } },
  "Iron Harvest Key": { type: "loot", img: "icons/sundries/misc/key-ornate-iron-black.webp", system: { type: { value: "treasure" },
    description: { value: P("The old iron key to the Hollowmere farm gate. It opens the locked gate on the east side of the Witch's Cauldron (room 10) into the Hollow King's Clearing.") } } },
  "The Harvest Ember": { type: "loot", img: "icons/magic/fire/flame-burning-campfire-orange.webp", system: { type: { value: "treasure" },
    description: { value: P("The hearth-fire of the Hollowmere Harvest Festival, stolen by the Harvest Witch and set in the Hollow King's pumpkin head. It is a coal that never cools and never burns the hand that carries it. Returned to the farmhouse hearth, it ends the curse on the maze. It is a story relic, not a magic item for player use.") } } }
};
// [name, room, story]
const LIST = [["Potion of Healing", 1], ["Potion of Healing", 2], ["Scarecrow's Straw Hat", 5], ["Ivory Harvest Necklace", 7], ["Potion of Climbing", 8],
  ["Rapier +1", 9], ["Wand of Web", 10], ["Lantern of Revealing", 11], ["Potion of Healing", 12], ["Iron Harvest Key", 14, true],
  ["Flame Tongue Longsword", 13], ["The Harvest Ember", 13, true]];
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
