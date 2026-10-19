// Builds the 5LEI-5 Tomb of the Storm Witch monsters (run in the Foundry console as GM).
// Numbers come from BTLT Monster Design rows 34-38 (HP, AC, hit, standard damage, alpha damage).
const MOD = "faight-beyond-the-last-torch", CODE = "5LEI-5", NAME = "5LEI-5: Tomb of the Storm Witch";
const ART = `modules/${MOD}/assets/tokens/tomb-of-the-storm-witch`;
let folder = game.folders.find(f => f.type === "Actor" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Actor" });
// Actions not listed above get this icon (checked to exist before use).
const ICONS = {
  "Init 10 (Epic Boss)": "icons/svg/clockwork.svg",
  "Epic Boss Resistance": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "Response": "icons/magic/control/energy-stream-link-white.webp",
  "Response: Movement": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Multiattack": "icons/skills/targeting/target-strike-triple-blue.webp",
  "Bite": "icons/creatures/abilities/fangs-teeth-bite.webp",
  "Slam": "icons/skills/melee/unarmed-punch-fist.webp",
  "Storm Touch": "icons/magic/lightning/bolt-strike-blue.webp",
  "Longsword": "icons/weapons/swords/sword-guard-steel-green.webp",
  "Heavy Crossbow": "icons/weapons/crossbows/crossbow-heavy-black.webp",
  "Disposition: Swarmer": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Brute": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Skirmisher": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Guardian": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Tyrant": "icons/skills/targeting/crosshair-ringed-gray.webp"
};
const STORM = ["icons/magic/lightning/bolt-strike-blue.webp", "icons/magic/nature/root-vine-entangle-foot-green.webp", "icons/creatures/mammals/bear-ear-scratch-brown.webp", "icons/svg/paw.svg", "icons/svg/acid.svg"];
const iconFor = n => ICONS[n.replace(/\s*\(Recharge[^)]*\)\s*$/, "")];
const rid = () => foundry.utils.randomID();
const P = t => `<p>${t}</p>`;
const uses = r => r ? { max: "1", spent: 0, recovery: [{ period: "recharge", formula: String(r) }] } : {};
const cons = r => r ? { targets: [{ type: "itemUses", target: "", value: "1" }], scaling: { allowed: false } } : undefined;
const act = type => ({ type, value: 1 });
function feat(name, text, activation = "") {
  const it = { name, type: "feat", system: { description: { value: P(`<strong><em>${name}.</em></strong> ${text}`) }, type: { value: "monster" } } };
  if (activation) { const id = rid(); it.system.activities = { [id]: { _id: id, type: "utility", activation: act(activation), name: "" } }; }
  return it;
}
function attack(name, text, { hit, dice, bonus = "", dtype, range = "melee", reach = 5, rng = null, rech = null, activation = "action", wtype = "natural" }) {
  const id = rid(); const [n, d] = dice.split("d").map(Number);
  return { name, type: "weapon", system: {
    description: { value: P(`<strong><em>${name}.</em></strong> ${text}`) }, type: { value: wtype }, equipped: true, proficient: 1,
    range: range === "melee" ? { reach, units: "ft" } : { value: rng[0], long: rng[1], units: "ft" },
    damage: { base: { number: n, denomination: d, bonus: String(bonus), types: [dtype] } }, uses: uses(rech),
    activities: { [id]: { _id: id, type: "attack", activation: act(activation),
      attack: { flat: true, bonus: String(hit), type: { value: range === "melee" ? "melee" : "ranged", classification: "weapon" } },
      damage: { includeBase: true, parts: [] }, consumption: cons(rech) } } } };
}
function save(name, text, { ability, dc, dice, bonus = "", dtype, onSave = "half", rech = null, activation = "action", tmpl = null }) {
  const id = rid();
  const parts = dice ? [{ number: Number(dice.split("d")[0]), denomination: Number(dice.split("d")[1]), bonus: String(bonus), types: [dtype] }] : [];
  const a = { _id: id, type: "save", activation: act(activation), save: { ability: [ability], dc: { calculation: "", formula: String(dc) } }, damage: { onSave, parts }, consumption: cons(rech) };
  if (tmpl) a.target = { template: tmpl, affects: { type: "creature" } };
  return { name, type: "feat", system: { description: { value: P(`<strong><em>${name}.</em></strong> ${text}`) }, type: { value: "monster" }, uses: uses(rech), activities: { [id]: a } } };
}
const SIZE = { tiny: 0.5, sm: 1, med: 1, lg: 2, huge: 3, grg: 4 };
const HD = { tiny: 4, sm: 6, med: 8, lg: 10, huge: 12, grg: 20 };
function hpf(hp, size, con) {
  const d = HD[size], m = Math.floor((con - 10) / 2), n = Math.max(1, Math.round(hp / (d / 2 + 0.5 + m)));
  const b = hp - Math.floor(n * (d / 2 + 0.5)); return `${n}d${d} ${b >= 0 ? "+" : "-"} ${Math.abs(b)}`;
}
function npc({ name, slug, size, type, cr, ac, hp, speed, burrow = 0, climb = 0, fly = 0, swim = 0, abil, dr = [], di = [], ci = [], senses = {}, skills = {}, langs = "", bio, items }) {
  const ab = {}; for (const [k, v] of Object.entries(abil)) ab[k] = { value: v };
  return { name, type: "npc", folder: folder.id, img: `${ART}/${slug}.webp`,
    flags: { [MOD]: { adventure: CODE, role: "monster", slug } },
    system: { abilities: ab,
      attributes: { ac: { flat: ac, calc: "flat" }, hp: { value: hp, max: hp, formula: hpf(hp, size, abil.con) },
        movement: { walk: speed, burrow, climb, fly, swim, hover: fly > 0, units: "ft" }, senses: { units: "ft", ...senses } },
      details: { cr, type: { value: type }, biography: { value: bio } },
      traits: { size, dr: { value: dr }, di: { value: di }, ci: { value: ci }, languages: { custom: langs } }, skills },
    prototypeToken: { name, alpha: 1, texture: { src: `${ART}/${slug}-token.webp` }, width: SIZE[size], height: SIZE[size],
      actorLink: false, disposition: -1, displayName: 20, displayBars: 20, bar1: { attribute: "attributes.hp" }, sight: { enabled: true, range: 60 } },
    items: items.map(i => ({ ...i, img: iconFor(i.name) || i.img })) };
}


const M = [];
// ---- Venom Grub (PL 8, Durability 3): HP 107, AC 15, hit +5, standard 8, alpha 16 ----
M.push(npc({ name: "Venom Grub", slug: "venom-grub", size: "lg", type: "undead", cr: 8, ac: 15, hp: 107, speed: 30, burrow: 20,
  abil: { str: 18, dex: 10, con: 16, int: 1, wis: 8, cha: 3 }, di: ["poison"], ci: ["poisoned", "exhaustion", "charmed"], senses: { blindsight: 30, tremorsense: 60 },
  bio: P("A pale, bloated larva of the Corpse Worm, as large as a horse, with a round mouth ringed in needle teeth. Grubs hatch from leathery egg sacs in the Hall of Pillars and drip a bright green venom.") + P("<em>BTLT Monster Design: Power Level 8, Durability 3.</em>"),
  items: [
    feat("Disposition: Swarmer", "The grubs crawl toward the nearest warm creature, surround it, and keep biting the same target until it falls."),
    attack("Bite", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 8 (1d8 + 4) Piercing damage.", { hit: 5, dice: "1d8", bonus: 4, dtype: "piercing" }),
    save("Venom Spit (Recharge 5–6)", "The grub spits venom in a 30-foot line that is 5 feet wide. Each creature in the line makes a DC 14 Constitution saving throw. <em>Failure:</em> 16 (3d8 + 2) Poison damage, and the target has the Poisoned condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "con", dc: 14, dice: "3d8", bonus: 2, dtype: "poison", rech: 5, tmpl: { type: "line", size: "30", width: "5", units: "ft" } }),
    save("Burst Sac", "<em>Reaction.</em> When a creature within 5 feet hits the grub with a melee attack, venom sprays from the wound. The creature makes a DC 14 Constitution saving throw. <em>Failure:</em> 4 (1d8) Poison damage.", { ability: "con", dc: 14, dice: "1d8", dtype: "poison", onSave: "none", activation: "reaction" })
  ] }));
// ---- Wormridden Corpse (PL 9, Durability 4): HP 160, AC 17, hit +5, standard 9, alpha 18 ----
M.push(npc({ name: "Wormridden Corpse", slug: "wormridden-corpse", size: "med", type: "undead", cr: 9, ac: 17, hp: 160, speed: 30,
  abil: { str: 18, dex: 8, con: 20, int: 3, wis: 6, cha: 5 }, di: ["poison"], ci: ["poisoned", "exhaustion", "charmed", "frightened"], senses: { darkvision: 60 },
  bio: P("A victim of the Corpse Worm's venom, risen in its burial wrappings with venom grubs nesting inside its body. The grubs writhe out of its chest and face when it is struck.") + P("<em>BTLT Monster Design: Power Level 9, Durability 4.</em>"),
  items: [
    feat("Disposition: Brute", "The corpse shambles at the nearest creature and grapples anything that stays in reach. It never retreats."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    attack("Slam", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 9 (2d8) Bludgeoning damage.", { hit: 5, dice: "2d8", dtype: "bludgeoning" }),
    save("Grub Burst (Recharge 5–6)", "The corpse splits open and grubs spray out. Each creature within 10 feet makes a DC 14 Constitution saving throw. <em>Failure:</em> 18 (4d8) Poison damage, and the target has the Poisoned condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "con", dc: 14, dice: "4d8", dtype: "poison", rech: 5 }),
    feat("Lurch", "<em>Bonus Action.</em> The corpse moves up to 10 feet toward the nearest enemy.", "bonus"),
    save("Writhing Grubs", "<em>Reaction.</em> When a creature within 5 feet hits the corpse with a melee attack, grubs bite the attacker. The creature makes a DC 14 Constitution saving throw. <em>Failure:</em> 4 (1d8) Poison damage.", { ability: "con", dc: 14, dice: "1d8", dtype: "poison", onSave: "none", activation: "reaction" })
  ] }));
// ---- Tempest Wraith (PL 10, Durability 4): HP 180, AC 18, hit +6, standard 9, alpha 18 ----
M.push(npc({ name: "Tempest Wraith", slug: "tempest-wraith", size: "med", type: "undead", cr: 10, ac: 18, hp: 180, speed: 0, fly: 40,
  abil: { str: 8, dex: 18, con: 16, int: 12, wis: 14, cha: 18 }, dr: ["acid", "cold", "fire", "necrotic"], di: ["lightning", "thunder", "poison"], ci: ["exhaustion", "grappled", "paralyzed", "petrified", "poisoned", "prone", "restrained"], senses: { darkvision: 60 }, langs: "Common, Sylvan",
  bio: P("One of the Storm Witch's coven sisters, bound into the Hall of the Coven as a spirit of rain and storm cloud. Lightning crackles around her hands.") + P("<em>BTLT Monster Design: Power Level 10, Durability 4.</em>"),
  items: [
    feat("Disposition: Skirmisher", "The wraiths circle above the fight, strike whoever stands apart from the others, and drift away from anyone who closes in."),
    feat("Incorporeal Movement", "The wraith can move through other creatures and objects as if they were Difficult Terrain. It takes 5 (1d10) Force damage if it ends its turn inside an object."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    attack("Storm Touch", "<em>Melee or Ranged Attack Roll:</em> +6, reach 5 ft. or range 60 ft. <em>Hit:</em> 9 (2d8) Lightning damage.", { hit: 6, dice: "2d8", dtype: "lightning", reach: 5 }),
    save("Lightning Shriek (Recharge 5–6)", "The wraith shrieks and lightning bursts from her. Each creature within 15 feet makes a DC 15 Dexterity saving throw. <em>Failure:</em> 18 (4d8) Lightning damage, and the target can't take Reactions until the start of its next turn. <em>Success:</em> Half damage only.", { ability: "dex", dc: 15, dice: "4d8", dtype: "lightning", rech: 5 }),
    feat("Ride the Wind", "<em>Bonus Action.</em> The wraith flies up to 20 feet without provoking Opportunity Attacks.", "bonus"),
    save("Static Lash", "<em>Reaction.</em> When a creature within 10 feet hits the wraith, a spark leaps back at it. The creature makes a DC 15 Dexterity saving throw. <em>Failure:</em> 4 (1d8) Lightning damage.", { ability: "dex", dc: 15, dice: "1d8", dtype: "lightning", onSave: "none", activation: "reaction" })
  ] }));
// ---- Drowned Knight (PL 11, Durability 4.25): HP 213, AC 19, hit +6, standard 10, alpha 20 ----
M.push(npc({ name: "Drowned Knight", slug: "drowned-knight", size: "med", type: "undead", cr: 11, ac: 19, hp: 213, speed: 30, swim: 30,
  abil: { str: 20, dex: 10, con: 18, int: 10, wis: 12, cha: 12 }, dr: ["cold", "necrotic"], di: ["poison"], ci: ["exhaustion", "frightened", "poisoned"], senses: { darkvision: 120 }, langs: "Common",
  bio: P("One of the knights who defeated the Storm Witch. Her dying curse flooded the tomb and drowned them, and they rose in rusted plate draped in pondweed, bound to guard her tomb against everyone.") + P("<em>BTLT Monster Design: Power Level 11, Durability 4.25.</em>"),
  items: [
    feat("Disposition: Guardian", "The knight holds its post, fights whoever came farthest into the tomb, and never leaves the tomb. It cannot be reasoned with; the curse speaks for it."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    attack("Longsword", "<em>Melee Attack Roll:</em> +6, reach 5 ft. <em>Hit:</em> 10 (1d10 + 5) Slashing damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "slashing", wtype: "martialM" }),
    attack("Heavy Crossbow", "<em>Ranged Attack Roll:</em> +6, range 100/400 ft. <em>Hit:</em> 10 (1d10 + 5) Piercing damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "piercing", range: "ranged", rng: [100, 400], wtype: "martialR" }),
    save("Brackish Flood (Recharge 5–6)", "Black swamp water pours from the knight's helm in a 15-foot Cone. Each creature in the Cone makes a DC 17 Strength saving throw. <em>Failure:</em> 20 (4d8 + 2) Bludgeoning damage, and the target is pushed 10 feet away and has the Prone condition. <em>Success:</em> Half damage only.", { ability: "str", dc: 17, dice: "4d8", bonus: 2, dtype: "bludgeoning", rech: 5, tmpl: { type: "cone", size: "15", units: "ft" } }),
    feat("Oath of the Drowned", "<em>Bonus Action.</em> The knight marks one creature it can see within 30 feet. Until the start of the knight's next turn, that creature has Disadvantage on attack rolls against creatures other than the knight.", "bonus"),
    save("Waterlogged Riposte", "<em>Reaction.</em> When a creature within 5 feet misses the knight with a melee attack, that creature makes a DC 17 Dexterity saving throw. <em>Failure:</em> 5 (1d10) Slashing damage.", { ability: "dex", dc: 17, dice: "1d10", dtype: "slashing", onSave: "none", activation: "reaction" })
  ] }));
// ---- The Corpse Worm (PL 12, Durability 10, Epic Boss): HP 550, AC 20, hit +11, standard 11, alpha 22 ----
M.push(npc({ name: "The Corpse Worm", slug: "the-corpse-worm", size: "grg", type: "undead", cr: 12, ac: 20, hp: 550, speed: 50, burrow: 30,
  abil: { str: 28, dex: 7, con: 24, int: 1, wis: 8, cha: 4 }, dr: ["necrotic"], di: ["poison"], ci: ["exhaustion", "frightened", "poisoned", "charmed"], senses: { blindsight: 30, tremorsense: 60 },
  bio: P("A colossal worm that died in the swamp and rose again, its segmented hide rotting open over its ribs. It burrowed up into the Storm Witch's burial chamber and swallowed Soride, the Storm Lantern, whose pale light glows through its hide.") + P("<em>BTLT Monster Design: Power Level 12, Durability 10, Epic Boss. Fights with two Wormridden Corpses.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Corpse Worm never rolls initiative. On initiative count 10 it rolls for recharges, then moves up to its Speed and takes one action: its standard attack or one of its charged actions."),
    feat("Epic Boss Resistance", "If the Corpse Worm fails a saving throw, it can choose to succeed instead. It has Advantage on saving throws against effects that would remove it from the fight."),
    feat("Response", "After each player character's turn, the Corpse Worm takes one Response (one only, not one per enemy). Each Response other than Movement also deals 6 damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Corpse Worm moves or burrows up to half its Speed.", "special"),
    feat("Disposition: Tyrant", "The Corpse Worm attacks whoever is carrying the most light, then whoever hurt it last. It does not leave the burial chamber."),
    feat("Soride Within", "Soride's light glows through the worm's hide. A creature within 5 feet of the worm can use an action to cut toward the glow (DC 20 Strength (Athletics) or Dexterity (Sleight of Hand)). On a success the creature pulls Soride free, and the worm takes 22 (4d10) Radiant damage and loses its Epic Boss Resistance."),
    attack("Bite", "<em>Melee Attack Roll:</em> +11, reach 10 ft. <em>Hit:</em> 11 (1d10 + 6) Piercing damage plus 3 (1d6) Poison damage.", { hit: 11, dice: "1d10", bonus: 6, dtype: "piercing", reach: 10 }),
    save("Venom Spray (Recharge 5–6)", "The worm sprays venom in a 60-foot line that is 10 feet wide. Each creature in the line makes a DC 19 Constitution saving throw. <em>Failure:</em> 22 (4d10) Poison damage, and the target has the Poisoned condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "con", dc: 19, dice: "4d10", dtype: "poison", rech: 5, tmpl: { type: "line", size: "60", width: "10", units: "ft" } }),
    save("Swallow (Recharge 6)", "The worm lunges at one Large or smaller creature within 10 feet. The target makes a DC 19 Dexterity saving throw. <em>Failure:</em> 22 (4d10) Acid damage, and the target is swallowed: it has the Blinded and Restrained conditions, has Total Cover against attacks from outside, and takes 11 (2d10) Acid damage at the start of each of the worm's turns. If the worm takes 30 damage or more on a single turn from a creature inside it, it regurgitates every swallowed creature, which land Prone within 10 feet. <em>Success:</em> Half damage only.", { ability: "dex", dc: 19, dice: "4d10", dtype: "acid", rech: 6 }),
    save("Response: Tail Stinger", "One creature within 10 feet makes a DC 19 Constitution saving throw. <em>Failure:</em> 6 (1d12) Poison damage, and the target has the Poisoned condition until the end of its next turn.", { ability: "con", dc: 19, dice: "1d12", dtype: "poison", onSave: "none", activation: "special" }),
    save("Response: Thrash", "The worm thrashes its body. One creature within 10 feet makes a DC 19 Dexterity saving throw. <em>Failure:</em> 6 (1d12) Bludgeoning damage, and the target has the Prone condition.", { ability: "dex", dc: 19, dice: "1d12", dtype: "bludgeoning", onSave: "none", activation: "special" }),
    save("Response: Venom Spit", "One creature the worm can sense within 60 feet makes a DC 19 Dexterity saving throw. <em>Failure:</em> 6 (1d12) Acid damage, and the target's Speed is halved until the end of its next turn.", { ability: "dex", dc: 19, dice: "1d12", dtype: "acid", onSave: "none", activation: "special" })
  ] }));
// Resolve icons: any action without a valid icon gets a storm icon that exists in this install.
const exists = async p => p && (await fetch("/" + p, { method: "HEAD" })).ok;
let storm = "icons/svg/paw.svg"; for (const s of STORM) if (await exists(s)) { storm = s; break; }
for (const m of M) for (const it of m.items) if (!(await exists(it.img))) it.img = storm;
const made = [];
for (const data of M) {
  const old = game.actors.find(a => a.getFlag(MOD, "slug") === data.flags[MOD].slug);
  if (old) await old.delete();
  const a = await Actor.create(data);
  made.push(`${a.name}: HP ${a.system.attributes.hp.max} (${a.system.attributes.hp.formula}) AC ${a.system.attributes.ac.value} items ${a.items.size}`);
}
made;
