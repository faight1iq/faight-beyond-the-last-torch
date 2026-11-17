// Builds the 5LH8-1 Mystery Sepulcher of the Fallen King treasure items (run in the Foundry console as GM).
// Items are copied from the dnd5e system compendiums by exact name when they exist, otherwise created here.
// Each is flagged {adventure, room} (and story: true for story items) so build_scene.js links it from the room journal.
const MOD = "faight-beyond-the-last-torch", CODE = "5LH8-1", NAME = "5LH8-1: Mystery Sepulcher of the Fallen King";
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
  "Flask of Holy Water": { type: "consumable", img: "icons/consumables/potions/bottle-round-corked-blue.webp", system: { type: { value: "potion" }, rarity: "common", uses: { max: "1", spent: 0, autoDestroy: true },
    description: { value: P("<em>Story item.</em> A glass flask of holy water blessed by the tide-monks of the island, found in a rotten wicker basket. Poured into one of the Fallen King's four bronze funeral urns (an action within 5 feet), it destroys that urn outright. Thrown as a splash at an Undead within 20 feet (Ranged Attack, +proficiency +Dexterity), it deals 2d8 Radiant damage. One use.") } } },
  "Fallen King's Signet": { type: "equipment", img: "icons/equipment/finger/ring-band-engraved-gold.webp", system: { type: { value: "ring" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item (ring), common.</em> A heavy bronze signet with the Fallen King's crowned wave. While you wear it, a Barrow Wight of the Fallen Legion takes you for a royal messenger: it must succeed on a DC 15 Wisdom saving throw before it can attack you first, and its Undying Oath does not save it from your attacks.") } } }
};
// [name, room, story]
const LIST = [["Potion of Healing", 1], ["Potion of Healing", 9], ["Cloak of the Manta Ray", 9], ["Potion of Healing", 5], ["Bracers of Archery", 5],
  ["Fallen King's Signet", 7], ["Flask of Holy Water", 11, true], ["Cloak of Protection", 12], ["Potion of Climbing", 14], ["Mace of Disruption", 15]];
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
