// Builds the 5LH3-1 The Ironmark Stockade monsters (run in the Foundry console as GM).
// Numbers come from BTLT Monster Design rows 60-74 (HP, AC, hit, standard damage, alpha damage), with John's
// fast-crawl roster: Standard Guard 0.5, Small/Medium/Large units 1/2/4, Elite 2, minibosses 4, Lieutenant 3, Boss 6.
// Re-running updates existing actors in place (tokens stay linked).
const MOD = "faight-beyond-the-last-torch", CODE = "5LH3-1", NAME = "5LH3-1: The Ironmark Stockade";
const ART = `modules/${MOD}/assets/tokens/the-ironmark-stockade`;
let folder = game.folders.find(f => f.type === "Actor" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Actor" });
const T = "icons/skills/targeting/crosshair-ringed-gray.webp", RESP = "icons/magic/control/energy-stream-link-white.webp";
const ICONS = {
  "Init 10 (Epic Boss)": "icons/svg/clockwork.svg", "Epic Boss Resistance": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "Response": RESP, "Response: Movement": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Disposition: Runner": T, "Disposition: Soldier": T, "Disposition: Lurker": T, "Disposition: Swarm": T, "Disposition: Squad": T, "Disposition: Pack": T,
  "Disposition: Shield Wall": T, "Disposition: Company": T, "Disposition: Duelist": T, "Disposition: Houndmaster": T, "Disposition: Smith": T,
  "Disposition: Veteran": T, "Disposition: Jailer": T, "Disposition: Chained Beast": T, "Disposition: Lieutenant": T, "Disposition: Warlord": T,
  "Raise the Alarm": "icons/skills/movement/figure-running-gray.webp",
  "Unit": "icons/environment/people/charge.webp", "Water Breathing": "icons/magic/water/snowflake-ice-blue-white.webp",
  "Spear": "icons/weapons/polearms/spear-flared-steel.webp", "Shield Bash": "icons/skills/melee/unarmed-punch-fist.webp",
  "Bite": "icons/creatures/abilities/fangs-teeth-bite.webp", "Coil": "icons/magic/control/debuff-chains-ropes-blue.webp",
  "Bites": "icons/creatures/abilities/fangs-teeth-bite.webp", "Drain": "icons/magic/death/mouth-bite-fangs-vampire.webp",
  "Spears": "icons/skills/melee/strike-slashes-red.webp", "Javelin Volley": "icons/skills/targeting/target-strike-triple-blue.webp",
  "Drag Down": "icons/magic/control/silhouette-fall-slip-prone.webp", "Spear Wall": "icons/skills/melee/strike-slashes-red.webp",
  "Shove Forward": "icons/environment/people/charge.webp", "Ranks of Spears": "icons/skills/melee/strike-slashes-red.webp",
  "Crossbow Volley": "icons/skills/targeting/target-strike-triple-blue.webp", "Halberd": "icons/skills/melee/strike-sword-slashing-red.webp",
  "Cleaving Arc": "icons/skills/melee/strike-sword-slashing-red.webp", "Riposte": "icons/magic/defensive/illusion-evasion-echo-purple.webp",
  "Barbed Whip": "icons/magic/control/debuff-chains-ropes-blue.webp", "Hamstring Lash": "icons/magic/control/silhouette-fall-slip-prone.webp",
  "Loose the Pack": "icons/creatures/abilities/cougar-pounce-stalk-black.webp", "Response: Whip Crack": RESP,
  "Red-Hot Tongs": "icons/magic/fire/flame-burning-hand-orange.webp", "Bellows Blast": "icons/magic/fire/beam-jet-stream-embers.webp",
  "Response: Hammer Back": "icons/skills/melee/unarmed-punch-fist.webp", "Thrown Weapon": "icons/skills/targeting/crosshair-pointed-orange.webp",
  "Weapon Storm": "icons/skills/targeting/target-strike-triple-blue.webp", "Response: Halberd Sweep": "icons/skills/melee/strike-sword-slashing-red.webp",
  "Chain Lash": "icons/magic/control/debuff-chains-ropes-blue.webp", "Branding Iron": "icons/magic/fire/flame-burning-hand-orange.webp",
  "Response: Rattle the Chains": "icons/magic/control/debuff-chains-ropes-blue.webp", "Regeneration": "icons/magic/life/heart-cross-green.webp",
  "Chain Flail": "icons/magic/control/debuff-chains-ropes-blue.webp", "Floodgate": "icons/magic/water/wave-water-blue.webp",
  "Drag Under": "icons/magic/water/tendrils-ice-thorns.webp", "Response: Rattle the Chain": "icons/magic/control/debuff-chains-ropes-blue.webp",
  "Longsword": "icons/skills/melee/strike-sword-slashing-red.webp", "Execution Stroke": "icons/skills/wounds/injury-triple-slash-bleed.webp",
  "Command": "icons/skills/social/intimidation-impressing.webp", "Response: Shield Slam": "icons/skills/melee/unarmed-punch-fist.webp",
  "Legion Standards": "icons/environment/settlement/watchtower-cliff.webp", "Sword of Wounding": "icons/skills/wounds/injury-triple-slash-bleed.webp",
  "Unbowed Charge": "icons/environment/people/charge.webp", "War Cry": "icons/magic/control/fear-fright-shadow-monster-purple.webp",
  "Response: Backhand": "icons/skills/melee/unarmed-punch-fist.webp"
};
const FALLBACK = ["icons/magic/lightning/bolt-strike-blue.webp", "icons/svg/lightning.svg", "icons/svg/skull.svg"];
const iconFor = n => ICONS[n.replace(/\s*\(Recharge[^)]*\)\s*$/, "")];
const rid = () => foundry.utils.randomID();
const P = t => `<p>${t}</p>`;
const uses = r => r ? { max: "1", spent: 0, recovery: [{ period: "recharge", formula: String(r), type: "recoverAll" }] } : {};
const cons = r => r ? { targets: [{ type: "itemUses", target: "", value: "1" }], scaling: { allowed: false } } : undefined;
const act = type => ({ type, value: 1 });
function feat(name, text, activation = "", rech = null) {
  const it = { name, type: "feat", system: { description: { value: P(`<strong><em>${name}.</em></strong> ${text}`) }, type: { value: "monster" }, uses: uses(rech) } };
  if (activation) { const id = rid(); it.system.activities = { [id]: { _id: id, type: "utility", activation: act(activation), name: "", consumption: cons(rech) } }; }
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
const TRASH = ["ironmark-servant", "ironmark-legionnaire", "legion-squad", "legion-platoon", "legion-company"];
function npc({ name, slug, size, type, cr, ac, hp, speed, burrow = 0, climb = 0, fly = 0, swim = 0, abil, dr = [], di = [], dv = [], ci = [], senses = {}, skills = {}, langs = "", bio, items }) {
  const ab = {}; for (const [k, v] of Object.entries(abil)) ab[k] = { value: v };
  return { name, type: "npc", folder: folder.id, img: `${ART}/${slug}.webp`,
    flags: { [MOD]: { adventure: CODE, role: "monster", slug, trash: TRASH.includes(slug) } },   // trash: the Flee control sends these running (scripts/flee.js)
    system: { abilities: ab,
      attributes: { ac: { flat: ac, calc: "flat" }, hp: { value: hp, max: hp, formula: hpf(hp, size, abil.con) },
        movement: { walk: speed, burrow, climb, fly, swim, hover: fly > 0, units: "ft" }, senses: { units: "ft", ...senses } },
      details: { cr, type: { value: type }, biography: { value: bio } },
      traits: { size, dr: { value: dr }, di: { value: di }, dv: { value: dv }, ci: { value: ci }, languages: { custom: langs } }, skills },
    prototypeToken: { name, alpha: 1, texture: { src: `${ART}/${slug}-token.webp` }, width: SIZE[size], height: SIZE[size],
      actorLink: false, disposition: -1, displayName: 20, displayBars: 20, bar1: { attribute: "attributes.hp" }, sight: { enabled: true, range: 60 } },
    items: items.map(i => ({ ...i, img: iconFor(i.name) || i.img })) };
}

const M = [];
// ---------- Epic Boss parts ----------
const epic = (who, act) => [
  feat("Init 10 (Epic Boss)", `${who} never rolls initiative. On initiative count 10 ${act}`),
  feat("Epic Boss Resistance", `If ${who} fails a saving throw, it can choose to succeed instead. It has Advantage on saving throws against effects that would remove it from the fight.`),
  feat("Response", `After each player character's turn, ${who} takes one Response (one only, not one per enemy). Each Response other than Movement has a target and deals half a standard hit to it.`),
  feat("Response: Movement", `${who} moves up to half its Speed without provoking Opportunity Attacks.`, "special")
];
const swarmTrait = (what) => feat("Unit", `The ${what} is one unit of several bodies. It can occupy another creature's space and vice versa, and it can't regain Hit Points or gain Temporary Hit Points. While it is Bloodied, its attacks deal half damage.`);

// ---- Ironmark Servant (commoner; 1 HP) ----
M.push(npc({ name: "Ironmark Servant", slug: "ironmark-servant", size: "sm", type: "humanoid", cr: 0, ac: 10, hp: 1, speed: 30,
  abil: { str: 8, dex: 14, con: 10, int: 10, wis: 10, cha: 8 }, senses: { darkvision: 60 }, langs: "Common, Goblin",
  bio: P("A goblin or hobgoblin servant of the stockade: cook, porter, stable hand, turnkey. Unarmed and terrified.") + P("<em>1 Hit Point. Every room has at least one. On its turn it runs to raise the alarm; the GM may add Doom when it escapes.</em>"),
  items: [
    feat("Disposition: Runner", "The servant does not fight. On its turn it runs for the nearest way out to raise the alarm."),
    feat("Raise the Alarm", "The servant takes the Dash action and moves away from the nearest enemy toward a door or stair.", "action")
  ] }));

// ---- Ironmark Legionnaire (standard guard; PL 8, Dur 0.5, Hit 50, Dmg 12): HP 18, AC 13, +9, std 10, alpha 20 ----
M.push(npc({ name: "Ironmark Legionnaire", slug: "ironmark-legionnaire", size: "med", type: "humanoid", cr: 2, ac: 13, hp: 18, speed: 30,
  abil: { str: 14, dex: 14, con: 12, int: 10, wis: 10, cha: 9 }, senses: { darkvision: 60 }, langs: "Common, Goblin",
  bio: P("A hobgoblin soldier of Gharrek's holdout legion in red-and-black scale, spear and round shield.") + P("<em>BTLT Monster Design row 60: Power Level 8, Durability 0.5, Hit Pct 50, Dmg Pct 12.</em>"),
  items: [
    feat("Disposition: Soldier", "The legionnaire holds the door it was posted to and attacks the nearest enemy."),
    attack("Spear", "<em>Melee or Ranged Attack Roll:</em> +9, reach 5 ft or range 20/60 ft. <em>Hit:</em> 10 (1d8 + 6) Piercing damage.", { hit: 9, dice: "1d8", bonus: 6, dtype: "piercing" }),
    attack("Shield Bash (Recharge 5–6)", "<em>Melee Attack Roll:</em> +9, reach 5 ft. <em>Hit:</em> 20 (3d8 + 6) Bludgeoning damage, and the target has the Prone condition.", { hit: 9, dice: "3d8", bonus: 6, dtype: "bludgeoning", rech: 5 })
  ] }));

// ---- Moat Eel (PL 8, Dur 0.5, Hit 55, Dmg 12): HP 18, AC 13, +10, std 10, alpha 20 ----
M.push(npc({ name: "Moat Eel", slug: "moat-eel", size: "lg", type: "beast", cr: 2, ac: 13, hp: 18, speed: 5, swim: 40,
  abil: { str: 16, dex: 14, con: 12, int: 1, wis: 10, cha: 3 }, senses: { darkvision: 60 },
  bio: P("A long grey eel fattened on the stockade's refuse, living in the moat.") + P("<em>BTLT Monster Design row 61: Power Level 8, Durability 0.5, Hit Pct 55, Dmg Pct 12.</em>"),
  items: [
    feat("Disposition: Lurker", "The eel strikes at the nearest swimmer and stays in the water."),
    feat("Water Breathing", "The eel can breathe only underwater."),
    attack("Bite", "<em>Melee Attack Roll:</em> +10, reach 10 ft. <em>Hit:</em> 10 (1d8 + 6) Piercing damage.", { hit: 10, dice: "1d8", bonus: 6, dtype: "piercing", reach: 10 }),
    attack("Coil (Recharge 5–6)", "<em>Melee Attack Roll:</em> +10, reach 10 ft. <em>Hit:</em> 20 (3d8 + 6) Bludgeoning damage, and the target has the Grappled condition (escape DC 14) and is pulled 10 feet toward the eel.", { hit: 10, dice: "3d8", bonus: 6, dtype: "bludgeoning", reach: 10, rech: 5 })
  ] }));

// ---- Leech Swarm (PL 8, Dur 1, Hit 60, Dmg 15): HP 36, AC 13, +11, std 12, alpha 24 ----
M.push(npc({ name: "Leech Swarm", slug: "leech-swarm", size: "med", type: "beast", cr: 3, ac: 13, hp: 36, speed: 5, swim: 30,
  abil: { str: 6, dex: 14, con: 14, int: 1, wis: 8, cha: 1 }, dr: ["bludgeoning", "piercing", "slashing"], ci: ["charmed", "frightened", "grappled", "paralyzed", "prone", "restrained", "stunned"], senses: { blindsight: 30 },
  bio: P("A writhing mass of finger-long moat leeches under the drawbridge.") + P("<em>BTLT Monster Design row 62: Power Level 8, Durability 1, Hit Pct 60, Dmg Pct 15.</em>"),
  items: [
    feat("Disposition: Swarm", "The leeches go for the nearest warm body in the water."),
    swarmTrait("swarm"),
    attack("Bites", "<em>Melee Attack Roll:</em> +11, reach 0 ft (a creature in the swarm's space). <em>Hit:</em> 12 (2d6 + 5) Piercing damage.", { hit: 11, dice: "2d6", bonus: 5, dtype: "piercing", reach: 0 }),
    attack("Drain (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 0 ft. <em>Hit:</em> 24 (4d6 + 10) Necrotic damage, and the target has the Poisoned condition until the end of its next turn.", { hit: 11, dice: "4d6", bonus: 10, dtype: "necrotic", reach: 0, rech: 5 })
  ] }));

// ---- Legion Squad (PL 8, Dur 1, Hit 60, Dmg 15): HP 36, AC 13, +11, std 12, alpha 24 ----
M.push(npc({ name: "Legion Squad", slug: "legion-squad", size: "med", type: "humanoid", cr: 3, ac: 13, hp: 36, speed: 30,
  abil: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 9 }, dr: ["bludgeoning", "piercing", "slashing"], ci: ["charmed", "frightened", "grappled", "paralyzed", "prone", "restrained", "stunned"], senses: { darkvision: 60 }, langs: "Common, Goblin",
  bio: P("Five hobgoblin legionnaires fighting shield to shield as one unit.") + P("<em>BTLT Monster Design row 63: Power Level 8, Durability 1, Hit Pct 60, Dmg Pct 15.</em>"),
  items: [
    feat("Disposition: Squad", "The squad advances on the closest enemy as one."),
    swarmTrait("squad"),
    attack("Spears", "<em>Melee Attack Roll:</em> +11, reach 10 ft. <em>Hit:</em> 12 (2d6 + 5) Piercing damage.", { hit: 11, dice: "2d6", bonus: 5, dtype: "piercing", reach: 10 }),
    attack("Javelin Volley (Recharge 5–6)", "<em>Ranged Attack Roll:</em> +11, range 30/120 ft. <em>Hit:</em> 24 (4d6 + 10) Piercing damage, and the target's Speed is halved until the end of its next turn.", { hit: 11, dice: "4d6", bonus: 10, dtype: "piercing", range: "ranged", rng: [30, 120], rech: 5 })
  ] }));

// ---- War Hound Pack (PL 8, Dur 1, Hit 60, Dmg 15): HP 36, AC 13, +11, std 12, alpha 24 ----
M.push(npc({ name: "War Hound Pack", slug: "war-hound-pack", size: "lg", type: "beast", cr: 3, ac: 13, hp: 36, speed: 50,
  abil: { str: 14, dex: 16, con: 14, int: 3, wis: 12, cha: 6 }, dr: ["bludgeoning", "piercing", "slashing"], ci: ["charmed", "frightened", "grappled", "paralyzed", "prone", "restrained", "stunned"], senses: { darkvision: 60 }, skills: { prc: { value: 1 } },
  bio: P("A pack of scarred war dogs in spiked collars, trained to run down escaped prisoners.") + P("<em>BTLT Monster Design row 64: Power Level 8, Durability 1, Hit Pct 60, Dmg Pct 15.</em>"),
  items: [
    feat("Disposition: Pack", "The pack runs at whoever is farthest from their allies."),
    swarmTrait("pack"),
    attack("Bites", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 12 (2d6 + 5) Piercing damage.", { hit: 11, dice: "2d6", bonus: 5, dtype: "piercing" }),
    attack("Drag Down (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 24 (4d6 + 10) Piercing damage, and the target has the Prone condition.", { hit: 11, dice: "4d6", bonus: 10, dtype: "piercing", rech: 5 })
  ] }));

// ---- Legion Platoon (PL 9, Dur 2, Hit 60, Dmg 18): HP 80, AC 15, +11, std 15, alpha 30 ----
M.push(npc({ name: "Legion Platoon", slug: "legion-platoon", size: "lg", type: "humanoid", cr: 5, ac: 15, hp: 80, speed: 30,
  abil: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 9 }, dr: ["bludgeoning", "piercing", "slashing"], ci: ["charmed", "frightened", "grappled", "paralyzed", "prone", "restrained", "stunned"], senses: { darkvision: 60 }, langs: "Common, Goblin",
  bio: P("Ten hobgoblin legionnaires in a shield wall.") + P("<em>BTLT Monster Design row 65: Power Level 9, Durability 2, Hit Pct 60, Dmg Pct 18.</em>"),
  items: [
    feat("Disposition: Shield Wall", "The platoon blocks the widest way through the room and pushes forward."),
    swarmTrait("platoon"),
    attack("Spear Wall", "<em>Melee Attack Roll:</em> +11, reach 10 ft. <em>Hit:</em> 15 (2d8 + 6) Piercing damage.", { hit: 11, dice: "2d8", bonus: 6, dtype: "piercing", reach: 10 }),
    attack("Shove Forward (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 10 ft. <em>Hit:</em> 30 (4d8 + 12) Bludgeoning damage; the target is pushed 15 feet and has the Prone condition.", { hit: 11, dice: "4d8", bonus: 12, dtype: "bludgeoning", reach: 10, rech: 5 })
  ] }));

// ---- Legion Company (PL 10, Dur 4, Hit 60, Dmg 20): HP 180, AC 18, +12, std 18, alpha 36 ----
M.push(npc({ name: "Legion Company", slug: "legion-company", size: "huge", type: "humanoid", cr: 8, ac: 18, hp: 180, speed: 30,
  abil: { str: 16, dex: 12, con: 16, int: 10, wis: 10, cha: 9 }, dr: ["bludgeoning", "piercing", "slashing"], ci: ["charmed", "frightened", "grappled", "paralyzed", "prone", "restrained", "stunned"], senses: { darkvision: 60 }, langs: "Common, Goblin",
  bio: P("Twenty hobgoblin legionnaires in ranks with spears, shields and a war drum.") + P("<em>BTLT Monster Design row 66: Power Level 10, Durability 4, Hit Pct 60, Dmg Pct 20.</em>"),
  items: [
    feat("Disposition: Company", "The company fills the gallery and advances to the beat of its drum."),
    swarmTrait("company"),
    attack("Ranks of Spears", "<em>Melee Attack Roll:</em> +12, reach 10 ft. <em>Hit:</em> 18 (2d10 + 7) Piercing damage.", { hit: 12, dice: "2d10", bonus: 7, dtype: "piercing", reach: 10 }),
    save("Crossbow Volley (Recharge 5–6)", "The rear rank fires into a 20-foot-radius sphere within 120 feet. Each creature in it makes a DC 15 Dexterity saving throw. <em>Failure:</em> 36 (6d8 + 9) Piercing damage, and the target has the Prone condition. <em>Success:</em> Half damage only.", { ability: "dex", dc: 15, dice: "6d8", bonus: 9, dtype: "piercing", rech: 5, tmpl: { type: "radius", size: "20", units: "ft" } })
  ] }));

// ---- Iron Guard (PL 11, Dur 2, Hit 60, Dmg 20): HP 100, AC 15, +12, std 20, alpha 40 ----
M.push(npc({ name: "Iron Guard", slug: "iron-guard", size: "med", type: "humanoid", cr: 8, ac: 15, hp: 100, speed: 30,
  abil: { str: 18, dex: 12, con: 16, int: 10, wis: 12, cha: 10 }, senses: { darkvision: 60 }, langs: "Common, Goblin",
  bio: P("One of Gharrek's honor guard in black iron plate with a halberd.") + P("<em>BTLT Monster Design row 67: Power Level 11, Durability 2, Hit Pct 60, Dmg Pct 20. Role: duelist.</em>"),
  items: [
    feat("Disposition: Duelist", "The guard picks the enemy who last hurt an ally and fights it until one of them falls."),
    attack("Halberd", "<em>Melee Attack Roll:</em> +12, reach 10 ft. <em>Hit:</em> 20 (2d10 + 9) Slashing damage.", { hit: 12, dice: "2d10", bonus: 9, dtype: "slashing", reach: 10 }),
    attack("Cleaving Arc (Recharge 5–6)", "<em>Melee Attack Roll:</em> +12, reach 10 ft. <em>Hit:</em> 40 (6d10 + 7) Slashing damage, and the target has the Prone condition.", { hit: 12, dice: "6d10", bonus: 7, dtype: "slashing", reach: 10, rech: 5 }),
    attack("Riposte", "<em>Reaction</em> when an enemy within 10 feet hits the guard with a melee attack. <em>Melee Attack Roll:</em> +12 against that enemy. <em>Hit:</em> 10 (1d10 + 5) Slashing damage.", { hit: 12, dice: "1d10", bonus: 5, dtype: "slashing", reach: 10, activation: "reaction" })
  ] }));

// ---- Kennelmaster Vosk (Epic; PL 10, Dur 4, Hit 55, Dmg 25): HP 180, AC 18, +11, std 23, alpha 46 ----
M.push(npc({ name: "Kennelmaster Vosk", slug: "kennelmaster-vosk", size: "med", type: "humanoid", cr: 9, ac: 18, hp: 180, speed: 30,
  abil: { str: 16, dex: 18, con: 16, int: 10, wis: 14, cha: 12 }, senses: { darkvision: 60 }, skills: { prc: { value: 1 }, ani: { value: 2 } }, langs: "Common, Goblin",
  bio: P("The hobgoblin houndmaster of Ironmark, all scars and barbed whip. His war hounds run down escaped prisoners.") + P("<em>BTLT Monster Design row 68: Power Level 10, Durability 4, Hit Pct 55, Dmg Pct 25, Epic Boss (miniboss). Fights with a War Hound Pack.</em>"),
  items: [
    ...epic("Vosk", "he rolls for recharges, then moves up to his Speed and takes one action."),
    feat("Disposition: Houndmaster", "Vosk keeps his distance, whips anyone who comes near and sends the pack at the weakest-looking enemy."),
    attack("Barbed Whip", "<em>Melee Attack Roll:</em> +11, reach 15 ft. <em>Hit:</em> 23 (4d6 + 9) Slashing damage.", { hit: 11, dice: "4d6", bonus: 9, dtype: "slashing", reach: 15 }),
    attack("Hamstring Lash (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 15 ft. <em>Hit:</em> 46 (8d6 + 18) Slashing damage; the target is pulled 10 feet toward Vosk and has the Prone condition.", { hit: 11, dice: "8d6", bonus: 18, dtype: "slashing", reach: 15, rech: 5 }),
    feat("Loose the Pack (Recharge 5–6)", "Each War Hound Pack within 60 feet of Vosk moves up to its Speed and makes one Bites attack, using none of its own actions.", "action", 5),
    attack("Response: Whip Crack", "One creature within 15 feet. <em>Melee Attack Roll:</em> +11. <em>Hit:</em> 12 (2d6 + 5) Slashing damage.", { hit: 11, dice: "2d6", bonus: 5, dtype: "slashing", reach: 15, activation: "special" })
  ] }));

// ---- Forgemaster Ulgra Coalhand (Epic; PL 10, Dur 4, Hit 45, Dmg 25): HP 180, AC 18, +9, std 23, alpha 46 ----
M.push(npc({ name: "Forgemaster Ulgra Coalhand", slug: "forgemaster-ulgra", size: "lg", type: "humanoid", cr: 9, ac: 18, hp: 180, speed: 30,
  abil: { str: 20, dex: 10, con: 18, int: 10, wis: 12, cha: 10 }, dr: ["fire"], senses: { darkvision: 60 }, langs: "Common, Goblin",
  bio: P("The bugbear smith of Ironmark, arms black with soot. She has armed the legion for twenty years.") + P("<em>BTLT Monster Design row 69: Power Level 10, Durability 4, Hit Pct 45, Dmg Pct 25, Epic Boss (miniboss). Role: controller.</em>"),
  items: [
    ...epic("Ulgra", "she rolls for recharges, then moves up to her Speed and takes one action."),
    feat("Disposition: Smith", "Ulgra grabs the nearest enemy with her tongs and holds it while her apprentices run."),
    attack("Red-Hot Tongs", "<em>Melee Attack Roll:</em> +9, reach 10 ft. <em>Hit:</em> 23 (4d6 + 9) Fire damage, and the target has the Grappled condition (escape DC 15). A creature Grappled by the tongs takes 7 (2d6) Fire damage at the start of each of its turns.", { hit: 9, dice: "4d6", bonus: 9, dtype: "fire", reach: 10 }),
    save("Bellows Blast (Recharge 5–6)", "Ulgra pumps the forge bellows into a 30-foot Cone. Each creature in it makes a DC 15 Dexterity saving throw. <em>Failure:</em> 46 (8d6 + 18) Fire damage. <em>Success:</em> Half damage. The Cone is burning ground until the end of Ulgra's next turn: a creature that enters it or starts its turn there takes 7 (2d6) Fire damage.", { ability: "dex", dc: 15, dice: "8d6", bonus: 18, dtype: "fire", rech: 5, tmpl: { type: "cone", size: "30", units: "ft" } }),
    attack("Response: Hammer Back", "One creature within 10 feet. <em>Melee Attack Roll:</em> +9. <em>Hit:</em> 12 (2d6 + 5) Bludgeoning damage, and the target is pushed 10 feet.", { hit: 9, dice: "2d6", bonus: 5, dtype: "bludgeoning", reach: 10, activation: "special" })
  ] }));

// ---- Sergeant-at-Arms Drekk (Epic; PL 11, Dur 4, Hit 55, Dmg 25): HP 200, AC 18, +11, std 25, alpha 50 ----
M.push(npc({ name: "Sergeant-at-Arms Drekk", slug: "sergeant-drekk", size: "med", type: "humanoid", cr: 10, ac: 18, hp: 200, speed: 30,
  abil: { str: 18, dex: 14, con: 16, int: 12, wis: 14, cha: 12 }, senses: { darkvision: 60 }, langs: "Common, Goblin",
  bio: P("A grizzled one-eyed hobgoblin veteran who has kept the armory for three wars and fights from its weapon racks.") + P("<em>BTLT Monster Design row 70: Power Level 11, Durability 4, Hit Pct 55, Dmg Pct 25, Epic Boss (miniboss). Role: artillery.</em>"),
  items: [
    ...epic("Drekk", "he rolls for recharges, then moves up to his Speed and takes one action."),
    feat("Disposition: Veteran", "Drekk stays by his racks and throws whatever is closest at whoever is farthest."),
    attack("Halberd", "<em>Melee Attack Roll:</em> +11, reach 10 ft. <em>Hit:</em> 25 (3d10 + 9) Slashing damage.", { hit: 11, dice: "3d10", bonus: 9, dtype: "slashing", reach: 10 }),
    attack("Thrown Weapon", "<em>Ranged Attack Roll:</em> +11, range 30/90 ft. <em>Hit:</em> 25 (3d10 + 9) Piercing damage.", { hit: 11, dice: "3d10", bonus: 9, dtype: "piercing", range: "ranged", rng: [30, 90] }),
    save("Weapon Storm (Recharge 5–6)", "Drekk hurls an armful of racked weapons into a 15-foot-radius sphere within 60 feet. Each creature in it makes a DC 17 Dexterity saving throw. <em>Failure:</em> 50 (9d8 + 9) Piercing damage, and the target's Speed is halved until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "dex", dc: 17, dice: "9d8", bonus: 9, dtype: "piercing", rech: 5, tmpl: { type: "radius", size: "15", units: "ft" } }),
    save("Response: Halberd Sweep", "Each creature in a 15-foot line from Drekk makes a DC 17 Strength saving throw. <em>Failure:</em> 12 (2d6 + 5) Slashing damage and the Prone condition.", { ability: "str", dc: 17, dice: "2d6", bonus: 5, dtype: "slashing", onSave: "none", activation: "special", tmpl: { type: "line", size: "15", width: "5", units: "ft" } })
  ] }));

// ---- Warden Skarn (Epic; PL 11, Dur 4, Hit 45, Dmg 25): HP 200, AC 18, +9, std 25, alpha 50 ----
M.push(npc({ name: "Warden Skarn", slug: "warden-skarn", size: "lg", type: "humanoid", cr: 10, ac: 18, hp: 200, speed: 30,
  abil: { str: 20, dex: 12, con: 18, int: 10, wis: 12, cha: 8 }, senses: { darkvision: 60 }, langs: "Common, Goblin",
  bio: P("The bugbear jailer of Ironmark. The Warden's Master Keys hang at his belt; his chain and branding iron do his talking.") + P("<em>BTLT Monster Design row 71: Power Level 11, Durability 4, Hit Pct 45, Dmg Pct 25, Epic Boss (miniboss). Role: grappler.</em>"),
  items: [
    ...epic("Skarn", "he rolls for recharges, then moves up to his Speed and takes one action."),
    feat("Disposition: Jailer", "Skarn chains the nearest enemy, drags it to him and brands it."),
    attack("Chain Lash", "<em>Melee Attack Roll:</em> +9, reach 15 ft. <em>Hit:</em> 25 (3d10 + 9) Bludgeoning damage, and the target has the Grappled condition (escape DC 17) and is pulled to a space next to Skarn.", { hit: 9, dice: "3d10", bonus: 9, dtype: "bludgeoning", reach: 15 }),
    attack("Branding Iron (Recharge 5–6)", "<em>Melee Attack Roll:</em> +9, reach 5 ft. <em>Hit:</em> 50 (9d8 + 9) Fire damage, and the target has the Frightened condition. It repeats a DC 17 Wisdom saving throw at the end of each of its turns, ending the effect on a success.", { hit: 9, dice: "9d8", bonus: 9, dtype: "fire", rech: 5 }),
    attack("Response: Rattle the Chains", "One creature within 15 feet. <em>Melee Attack Roll:</em> +9. <em>Hit:</em> 12 (2d6 + 5) Bludgeoning damage, and the target is pulled 5 feet toward Skarn.", { hit: 9, dice: "2d6", bonus: 5, dtype: "bludgeoning", reach: 15, activation: "special" })
  ] }));

// ---- Old Gutter (Epic; PL 10, Dur 4, Hit 40, Dmg 25): HP 180, AC 18, +8, std 23, alpha 46 ----
M.push(npc({ name: "Old Gutter", slug: "old-gutter", size: "lg", type: "giant", cr: 9, ac: 18, hp: 180, speed: 30, swim: 40,
  abil: { str: 22, dex: 10, con: 20, int: 5, wis: 9, cha: 5 }, senses: { darkvision: 60 },
  bio: P("A river troll chained in the sluice to guard the culvert. Its chain reaches every corner of the room.") + P("<em>BTLT Monster Design row 72: Power Level 10, Durability 4, Hit Pct 40, Dmg Pct 25, Epic Boss (miniboss). Role: brute.</em>"),
  items: [
    ...epic("Old Gutter", "it rolls for recharges, then moves up to its Speed and takes one action."),
    feat("Disposition: Chained Beast", "Gutter attacks whatever moves, nearest first."),
    feat("Regeneration", "Gutter regains 15 Hit Points at the start of each of its turns unless it took Fire or Acid damage since its last turn."),
    attack("Chain Flail", "<em>Melee Attack Roll:</em> +8, reach 15 ft. <em>Hit:</em> 23 (4d6 + 9) Bludgeoning damage.", { hit: 8, dice: "4d6", bonus: 9, dtype: "bludgeoning", reach: 15 }),
    save("Floodgate (Recharge 5–6)", "Gutter hauls the gate wheel and sends a 30-foot line of water, 10 feet wide, through the room. Each creature in it makes a DC 15 Strength saving throw. <em>Failure:</em> 46 (8d6 + 18) Bludgeoning damage; the target is pushed 15 feet and has the Prone condition. <em>Success:</em> Half damage only.", { ability: "str", dc: 15, dice: "8d6", bonus: 18, dtype: "bludgeoning", rech: 5, tmpl: { type: "line", size: "30", width: "10", units: "ft" } }),
    attack("Drag Under", "<em>Melee Attack Roll:</em> +8, reach 10 ft. <em>Hit:</em> 23 (4d6 + 9) Bludgeoning damage, and the target has the Grappled and Restrained conditions in the sluice channel (escape DC 17).", { hit: 8, dice: "4d6", bonus: 9, dtype: "bludgeoning", reach: 10 }),
    attack("Response: Rattle the Chain", "One creature within 15 feet. <em>Melee Attack Roll:</em> +8. <em>Hit:</em> 12 (2d6 + 5) Bludgeoning damage.", { hit: 8, dice: "2d6", bonus: 5, dtype: "bludgeoning", reach: 15, activation: "special" })
  ] }));

// ---- The Iron Captain (Epic commander; PL 12, Dur 3, Hit 55, Dmg 25): HP 165, AC 17, +12, std 26, alpha 52 ----
M.push(npc({ name: "The Iron Captain", slug: "the-iron-captain", size: "med", type: "humanoid", cr: 11, ac: 17, hp: 165, speed: 30,
  abil: { str: 18, dex: 14, con: 16, int: 14, wis: 14, cha: 16 }, senses: { darkvision: 60 }, langs: "Common, Goblin",
  bio: P("Gharrek's lieutenant, a professional soldier in blackened plate who has never lost a duel.") + P("<em>BTLT Monster Design row 73: Power Level 12, Durability 3, Hit Pct 55, Dmg Pct 25, Epic Boss (lieutenant).</em>"),
  items: [
    ...epic("The Iron Captain", "he rolls for recharges, then moves up to his Speed and takes one action."),
    feat("Disposition: Lieutenant", "The Captain stands between Gharrek and the strongest enemy."),
    attack("Longsword", "<em>Melee Attack Roll:</em> +12, reach 5 ft. <em>Hit:</em> 26 (3d10 + 10) Slashing damage.", { hit: 12, dice: "3d10", bonus: 10, dtype: "slashing" }),
    attack("Execution Stroke (Recharge 5–6)", "<em>Melee Attack Roll:</em> +12, reach 5 ft. <em>Hit:</em> 52 (9d10 + 2) Slashing damage, and the target has the Prone condition.", { hit: 12, dice: "9d10", bonus: 2, dtype: "slashing", rech: 5 }),
    feat("Command (Recharge 5–6)", "Each Ironmark creature within 60 feet that can hear the Captain moves up to its Speed and makes one attack, using none of its own actions.", "action", 5),
    attack("Response: Shield Slam", "One creature within 5 feet. <em>Melee Attack Roll:</em> +12. <em>Hit:</em> 13 (2d6 + 6) Bludgeoning damage, and the target is pushed 10 feet.", { hit: 12, dice: "2d6", bonus: 6, dtype: "bludgeoning", activation: "special" })
  ] }));

// ---- Gharrek the Unbowed (Epic Boss; PL 12, Dur 6, Hit 60, Dmg 30): HP 330, AC 20, +13, std 31, alpha 62 ----
M.push(npc({ name: "Gharrek the Unbowed", slug: "gharrek-the-unbowed", size: "lg", type: "humanoid", cr: 13, ac: 20, hp: 330, speed: 30,
  abil: { str: 22, dex: 14, con: 20, int: 14, wis: 14, cha: 18 }, ci: ["frightened"], senses: { darkvision: 60 }, langs: "Common, Goblin",
  bio: P("The hobgoblin warlord who refused the peace. He wields the Sword of Wounding and means to start the war again.") + P("<em>BTLT Monster Design row 74: Power Level 12, Durability 6, Hit Pct 60, Dmg Pct 30, Epic Boss. Fights with the Iron Captain.</em>"),
  items: [
    ...epic("Gharrek", "he rolls for recharges, then moves up to his Speed and takes one action."),
    feat("Disposition: Warlord", "Gharrek goes for whoever is tearing at his standards, then whoever hurt him last."),
    feat("Legion Standards", "Four Legion Standards stand in the throne room. Each has AC 15 and 25 Hit Points, or a creature within 5 feet can take an action to tear one down (DC 16 Strength (Athletics)). Each standard that falls deals 11 (2d10) Psychic damage to Gharrek. When the fourth falls, Gharrek loses his Epic Boss Resistance."),
    attack("Sword of Wounding", "<em>Melee Attack Roll:</em> +13, reach 10 ft. <em>Hit:</em> 31 (4d10 + 9) Slashing damage.", { hit: 13, dice: "4d10", bonus: 9, dtype: "slashing", reach: 10, wtype: "martialM" }),
    save("Unbowed Charge (Recharge 5–6)", "Gharrek charges in a 30-foot line, 10 feet wide. Each creature in it makes a DC 19 Strength saving throw. <em>Failure:</em> 62 (11d10 + 2) Slashing damage and the Prone condition. <em>Success:</em> Half damage only. Gharrek ends at the end of the line.", { ability: "str", dc: 19, dice: "11d10", bonus: 2, dtype: "slashing", rech: 5, tmpl: { type: "line", size: "30", width: "10", units: "ft" } }),
    save("War Cry (Recharge 6)", "Each enemy within 30 feet makes a DC 19 Wisdom saving throw. <em>Failure:</em> 31 (7d8) Psychic damage and the Frightened condition; it repeats the save at the end of each of its turns. <em>Success:</em> Half damage only.", { ability: "wis", dc: 19, dice: "7d8", dtype: "psychic", rech: 6, tmpl: { type: "radius", size: "30", units: "ft" } }),
    attack("Response: Backhand", "One creature within 10 feet. <em>Melee Attack Roll:</em> +13. <em>Hit:</em> 16 (2d8 + 7) Bludgeoning damage, and the target is pushed 10 feet.", { hit: 13, dice: "2d8", bonus: 7, dtype: "bludgeoning", reach: 10, activation: "special" })
  ] }));

const exists = async p => p && (await fetch("/" + p, { method: "HEAD" })).ok;
let fb = "icons/svg/skull.svg"; for (const s of FALLBACK) if (await exists(s)) { fb = s; break; }
const missing = new Set();
for (const m of M) for (const it of m.items) if (!(await exists(it.img))) { missing.add(it.name); it.img = fb; }
const made = [];
for (const data of M) {
  const old = game.actors.find(a => a.getFlag(MOD, "slug") === data.flags[MOD].slug && a.getFlag(MOD, "adventure") === CODE);
  if (old) { await old.update({ system: data.system, img: data.img, prototypeToken: data.prototypeToken, name: data.name, flags: data.flags }); await old.deleteEmbeddedDocuments("Item", old.items.map(i => i.id)); await old.createEmbeddedDocuments("Item", data.items); made.push(`${old.name} (updated)`); continue; }
  const a = await Actor.create(data);
  made.push(`${a.name}: HP ${a.system.attributes.hp.max} AC ${a.system.attributes.ac.value}`);
}
return { made, fallbackIcons: [...missing] };
