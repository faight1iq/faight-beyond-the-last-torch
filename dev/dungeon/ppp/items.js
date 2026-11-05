// Builds the 5LGX-1 The Puppeteer's Playhouse treasure items (run in the Foundry console as GM).
// Items are copied from the dnd5e system compendiums by exact name when they exist, otherwise created here.
// Each is flagged {adventure, room} (and story: true for story items) so build_scene.js links it from the room journal.
const MOD = "faight-beyond-the-last-torch", CODE = "5LGX-1", NAME = "5LGX-1: The Puppeteer's Playhouse";
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
const ALT = { "Bag of Tricks": ["Bag of Tricks", "Bag of Tricks, Gray", "Gray Bag of Tricks"] };
const custom = {
  "Ashgrove Silk Scarf": { type: "equipment", img: "icons/commodities/cloth/cloth-bolt-grey.webp", system: { type: { value: "clothing" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, common.</em> A long scarf of grey silk embroidered with the Ashgrove oak leaf. It belonged to Mirabel Ashgrove. While you wear it, you can't be pulled or moved against your will by strings, threads or webs more than 10 feet at a time.") } } },
  "Quill's Music Box": { type: "equipment", img: "icons/tools/instruments/harp-red.webp", system: { type: { value: "trinket" }, rarity: "common", properties: ["mgc"],
    description: { value: P("<em>Wondrous item, common.</em> A small painted music box with a turning dancer on its lid. Wound as an action, it plays a lullaby for 1 minute; Constructs within 30 feet that can hear it have Disadvantage on Wisdom (Perception) checks while it plays.") } } },
  "Stage Manager's Key": { type: "loot", img: "icons/sundries/misc/key-ornate-iron-black.webp", system: { type: { value: "treasure" },
    description: { value: P("A heavy iron key on a ring stamped GILDED THIMBLE \u2014 FIRE CURTAIN. It opens the locked iron fire curtain between the Stage Wings (room 11) and the Fly Loft (room 12).") } } },
  "The Soul Spool": { type: "loot", img: "icons/magic/control/energy-stream-link-spiral-blue.webp", system: { type: { value: "treasure" },
    description: { value: P("A great wooden spool wound with glittering soul-thread. Cutting it free (an action, once Mistress Tangle is dead) frees every soul in the playhouse: the dolls and puppets go still, the vanished townsfolk wake on the stage floor, and Lord Ashgrove's hands turn back to flesh. It is a story relic, not a magic item for player use.") } } }
};
// [name, room, story]
const LIST = [["Potion of Healing", 3], ["Ashgrove Silk Scarf", 5], ["Potion of Healing", 7], ["Quill's Music Box", 7], ["Eyes of Charming", 8],
  ["Bag of Tricks", 10], ["Potion of Healing", 10], ["Stage Manager's Key", 14, true], ["Rope of Climbing", 14], ["Potion of Climbing", 15],
  ["Ring of Free Action", 12], ["The Soul Spool", 12, true]];
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
