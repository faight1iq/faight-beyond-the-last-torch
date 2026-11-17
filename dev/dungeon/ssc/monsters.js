// Builds the 5LH9-1 Scarletskull Castle monsters (run in the Foundry console as GM).
// Numbers come from BTLT Monster Design rows 82-88 (HP, AC, hit, standard damage, alpha damage), with role-based
// Hit Pct / Dmg Pct dials. Each creature has its own role and mechanic.
const MOD = "faight-beyond-the-last-torch", CODE = "5LH9-1", NAME = "5LH9-1: Scarletskull Castle";
const ART = `modules/${MOD}/assets/tokens/scarletskull-castle`;
let folder = game.folders.find(f => f.type === "Actor" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Actor" });
const T = "icons/skills/targeting/crosshair-arrowhead-blue.webp";
const ICONS = {
  "Init 10 (Epic Boss)": "icons/svg/clockwork.svg",
  "Epic Boss Resistance": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "Response": "icons/magic/control/energy-stream-link-white.webp",
  "Response: Movement": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Disposition: Swarm": T, "Disposition: Ambusher": T, "Disposition: Defender": T, "Disposition: Controller": T, "Disposition: Artillery": T, "Disposition: Commander": T, "Disposition: Matriarch": T,
  "Flock": "icons/creatures/birds/raptor-owl-flying-moon.webp", "Stiffening Pecks": "icons/magic/earth/strike-body-stone-crumble.webp",
  "Pecks": "icons/creatures/abilities/wing-batlike-red-pink.webp", "Stone Pecks": "icons/magic/earth/strike-body-stone-crumble.webp", "Scatter": "icons/creatures/birds/raptor-owl-flying-moon.webp",
  "Rubble Burrower": "icons/magic/earth/projectiles-stone-salvo-gray.webp", "Stone Jaws": "icons/creatures/abilities/mouth-teeth-rows-red.webp",
  "Burst from the Rubble": "icons/magic/earth/explosion-lava-stone-orange.webp", "Sink into Rubble": "icons/magic/earth/barrier-stone-explosion-debris.webp",
  "Anchored": "icons/magic/earth/barrier-stone-explosion-debris.webp", "Brood Bite": "icons/creatures/abilities/mouth-teeth-rows-red.webp",
  "Drive Them Back": "icons/creatures/abilities/bull-head-horns-glowing.webp", "Tail Lash": "icons/creatures/abilities/tail-strike-bone-orange.webp",
  "Petrifying Gaze": "icons/magic/perception/eye-ringed-glow-angry-small-red.webp", "Averting Eyes": "icons/magic/perception/eye-slit-orange.webp",
  "Mirror-Shy": "icons/magic/perception/eye-ringed-green.webp", "Bite": "icons/creatures/abilities/mouth-teeth-rows-red.webp", "Baleful Glare": "icons/magic/perception/eye-slit-orange.webp",
  "Mirror Scales": "icons/magic/light/beam-rays-yellow.webp", "Light Lance": "icons/magic/light/beam-rays-yellow.webp",
  "Searing Prism": "icons/magic/light/beam-rays-yellow-blue-large.webp", "Flash": "icons/magic/light/explosion-star-glow-silhouette.webp",
  "Shattering Death": "icons/magic/light/explosion-star-glow-silhouette.webp",
  "Blood-Mad": "icons/skills/wounds/blood-drip-droplet-red.webp", "Gore": "icons/creatures/abilities/bull-head-horns-glowing.webp",
  "Trampling Charge": "icons/environment/people/charge.webp", "Command": "icons/skills/social/intimidation-impressing.webp",
  "Pack Bellow": "icons/magic/sonic/scream-wail-shout-teal.webp", "Response: Crushing Step": "icons/skills/movement/feet-winged-boots-brown.webp",
  "The Four Mirrors": "icons/magic/light/beam-rays-yellow-blue-large.webp", "Molting Fury": "icons/magic/earth/strike-body-stone-crumble.webp",
  "Scarlet Gaze": "icons/magic/perception/eye-ringed-glow-angry-large-red.webp", "Matriarch's Bite": "icons/creatures/abilities/mouth-teeth-rows-red.webp",
  "Response: Tail Sweep": "icons/creatures/abilities/tail-strike-bone-orange.webp", "Response: Lingering Stare": "icons/magic/perception/eye-ringed-glow-angry-small-red.webp"
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
function npc({ name, slug, size, type, cr, ac, hp, speed, burrow = 0, climb = 0, fly = 0, swim = 0, abil, dr = [], di = [], dv = [], ci = [], senses = {}, skills = {}, langs = "", bio, items }) {
  const ab = {}; for (const [k, v] of Object.entries(abil)) ab[k] = { value: v };
  return { name, type: "npc", folder: folder.id, img: `${ART}/${slug}.webp`,
    flags: { [MOD]: { adventure: CODE, role: "monster", slug } },
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
const ROW = (r, pl, dur, hit, dmg, role) => P(`<em>BTLT Monster Design row ${r}: Power Level ${pl}, Durability ${dur}, Hit Pct ${hit}, Dmg Pct ${dmg}. Role: ${role}.</em>`);
const STONE = "A creature Petrified this way repeats the saving throw at the end of each of its turns, ending the effect on itself on a success; <em>greater restoration</em> or the gullet fluid of a dead basilisk also ends it.";
// ---- Cockatrice Flock (swarm; PL 8, Dur 4, Hit 60, Dmg 15): HP 143, AC 16, hit +11, std 12, alpha 24 ----
M.push(npc({ name: "Cockatrice Flock", slug: "cockatrice-flock", size: "med", type: "monstrosity", cr: 8, ac: 16, hp: 143, speed: 20, fly: 40,
  abil: { str: 6, dex: 16, con: 14, int: 2, wis: 12, cha: 5 }, dr: ["bludgeoning", "piercing", "slashing"],
  ci: ["charmed", "frightened", "grappled", "paralyzed", "petrified", "prone", "restrained", "stunned"], senses: { darkvision: 60 },
  bio: P("A screeching flock of cockatrices that roosts in the gatehouse rafters. They follow the basilisks for the scraps and peck at anything that moves; their pecks stiffen flesh toward stone.") + ROW(82, 8, 4, 60, 15, "swarm"),
  items: [
    feat("Disposition: Swarm", "The flock mobs whichever creature is already slowed or stiffening, and scatters into the rafters when hurt."),
    feat("Flock", "The flock can occupy another creature's space and vice versa, and it can move through any opening large enough for a Tiny creature. It can't regain Hit Points or gain Temporary Hit Points."),
    feat("Stiffening Pecks", "A creature hit by the flock's Pecks twice before the start of the flock's next turn has its Speed halved until the end of its next turn as its joints turn grey and stiff."),
    feat("Scatter", "While the flock is Bloodied, it has Disadvantage on attack rolls but its Fly Speed is 60 feet, and it doesn't provoke Opportunity Attacks."),
    attack("Pecks", "<em>Melee Attack Roll:</em> +11, reach 0 ft (a creature in the flock's space). <em>Hit:</em> 12 (2d6 + 5) Piercing damage.", { hit: 11, dice: "2d6", bonus: 5, dtype: "piercing", reach: 0 }),
    attack("Stone Pecks (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 0 ft (a creature in the flock's space). <em>Hit:</em> 24 (4d6 + 10) Piercing damage, and the target has the Restrained condition until the end of its next turn as its limbs harden.", { hit: 11, dice: "4d6", bonus: 10, dtype: "piercing", reach: 0, rech: 5 })
  ] }));
// ---- Rockfang Lizard (ambusher; PL 9, Dur 6, Hit 55, Dmg 30): HP 240, AC 19, hit +10, std 25, alpha 50 ----
M.push(npc({ name: "Rockfang Lizard", slug: "rockfang-lizard", size: "med", type: "beast", cr: 9, ac: 19, hp: 240, speed: 30, burrow: 20,
  abil: { str: 18, dex: 14, con: 16, int: 2, wis: 12, cha: 4 }, senses: { darkvision: 60, tremorsense: 60 }, skills: { ste: { value: 1 } },
  bio: P("A long grey lizard with stone-plated hide and fangs like chipped granite. Rockfangs follow the basilisks to feed on what they leave, and lie buried in fallen masonry until something walks over them.") + ROW(83, 9, 6, 55, 30, "ambusher"),
  items: [
    feat("Disposition: Ambusher", "The lizard waits under the rubble for a lone creature, drags it down and holds on."),
    feat("Rubble Burrower", "The lizard can burrow through rubble and loose stone, leaving no tunnel. While buried, it has Total Cover and can sense creatures with Tremorsense."),
    attack("Stone Jaws", "<em>Melee Attack Roll:</em> +10, reach 5 ft. <em>Hit:</em> 25 (4d8 + 7) Piercing damage, and the target has the Grappled condition (escape DC 15). While it grapples a creature, the lizard can bite only that creature.", { hit: 10, dice: "4d8", bonus: 7, dtype: "piercing" }),
    attack("Burst from the Rubble (Recharge 5–6)", "The lizard can use this only if it started its turn buried. It erupts beneath a creature within 20 feet. <em>Melee Attack Roll:</em> +10 with Advantage, reach 5 ft. <em>Hit:</em> 50 (8d8 + 14) Piercing damage, and the target has the Prone and Grappled conditions (escape DC 15).", { hit: 10, dice: "8d8", bonus: 14, dtype: "piercing", rech: 5 }),
    feat("Sink into Rubble", "If it is on rubble or loose stone, the lizard burrows out of sight and takes the Hide action. A creature it is grappling is released.", "bonus")
  ] }));
// ---- Basilisk Broodguard (defender, Large; PL 10, Dur 6, Hit 45, Dmg 20): HP 270, AC 20, hit +9, std 18, alpha 36 ----
M.push(npc({ name: "Basilisk Broodguard", slug: "basilisk-broodguard", size: "lg", type: "monstrosity", cr: 10, ac: 20, hp: 270, speed: 30,
  abil: { str: 20, dex: 8, con: 18, int: 2, wis: 10, cha: 7 }, senses: { darkvision: 60 },
  bio: P("A heavy, blind-eyed basilisk bred to guard the brood. Its eyes are milky and harmless, but its overlapping scarlet-brown scales are thick as plate, and it shoves intruders away from the young with its armoured head.") + ROW(84, 10, 6, 45, 20, "defender"),
  items: [
    feat("Disposition: Defender", "The broodguard plants itself between intruders and the nest or the Matriarch, and pushes back anyone who gets close."),
    feat("Anchored", "The broodguard can't be pushed, pulled or knocked Prone against its will."),
    attack("Brood Bite", "<em>Melee Attack Roll:</em> +9, reach 10 ft. <em>Hit:</em> 18 (2d10 + 7) Piercing damage.", { hit: 9, dice: "2d10", bonus: 7, dtype: "piercing", reach: 10 }),
    attack("Drive Them Back (Recharge 5–6)", "<em>Melee Attack Roll:</em> +9, reach 10 ft. <em>Hit:</em> 36 (4d10 + 14) Bludgeoning damage, the target is pushed 15 feet away from the broodguard and has the Prone condition.", { hit: 9, dice: "4d10", bonus: 14, dtype: "bludgeoning", reach: 10, rech: 5 }),
    feat("Tail Lash", "When a creature within 10 feet of the broodguard moves toward another basilisk, the broodguard lashes it: 9 (1d10 + 4) Bludgeoning damage, and the creature's Speed is 0 until the end of the turn.", "reaction")
  ] }));
// ---- Basilisk (controller; PL 10, Dur 6, Hit 45, Dmg 20): HP 270, AC 20, hit +9, std 18, alpha 36 ----
M.push(npc({ name: "Basilisk", slug: "basilisk", size: "med", type: "monstrosity", cr: 10, ac: 20, hp: 270, speed: 30,
  abil: { str: 16, dex: 8, con: 16, int: 2, wis: 12, cha: 7 }, senses: { darkvision: 60 },
  bio: P("An eight-legged reptile with dull green-brown scales and pale green eyes. Its gaze slowly turns flesh to stone; it gnaws its petrified prey and digests the stone.") + ROW(85, 10, 6, 45, 20, "controller"),
  items: [
    feat("Disposition: Controller", "The basilisk stares down the nearest creature that meets its eyes and leaves the stiffening ones for the pack."),
    feat("Averting Eyes", "A creature can avert its eyes from the basilisk at the start of its turn. Until the start of its next turn, it has Advantage on saving throws against the basilisk's gaze but Disadvantage on attack rolls against the basilisk."),
    feat("Mirror-Shy", "If the basilisk sees its own reflection in a polished mirror within 30 feet, it must succeed on a DC 15 Constitution saving throw or have the Restrained condition until the end of its next turn."),
    attack("Bite", "<em>Melee Attack Roll:</em> +9, reach 5 ft. <em>Hit:</em> 18 (2d10 + 7) Piercing damage.", { hit: 9, dice: "2d10", bonus: 7, dtype: "piercing" }),
    save("Petrifying Gaze (Recharge 5–6)", `Each creature in a 30-foot Cone that can see the basilisk makes a DC 15 Constitution saving throw. <em>Failure:</em> 36 (8d6 + 8) Necrotic damage, and the target has the Restrained condition as it starts to turn to stone; a creature that was already Restrained this way has the Petrified condition instead. ${STONE} <em>Success:</em> Half damage only.`, { ability: "con", dc: 15, dice: "8d6", bonus: 8, dtype: "necrotic", rech: 5, tmpl: { type: "cone", size: "30", units: "ft" } }),
    save("Baleful Glare", "When a creature within 30 feet that can see the basilisk hits it with an attack, the basilisk locks eyes with it. The creature makes a DC 15 Constitution saving throw. <em>Failure:</em> 9 (1d10 + 4) Necrotic damage, and its Speed is 0 until the end of its turn.", { ability: "con", dc: 15, dice: "1d10", bonus: 4, dtype: "necrotic", onSave: "none", activation: "reaction" })
  ] }));
// ---- Mirrorscale Basilisk (artillery; PL 11, Dur 6, Hit 55, Dmg 25): HP 300, AC 20, hit +11, std 25, alpha 50 ----
M.push(npc({ name: "Mirrorscale Basilisk", slug: "mirrorscale-basilisk", size: "med", type: "monstrosity", cr: 11, ac: 20, hp: 300, speed: 40, climb: 30,
  abil: { str: 14, dex: 18, con: 16, int: 3, wis: 14, cha: 8 }, senses: { darkvision: 60 },
  bio: P("A sleek basilisk whose silver scales are polished like mirrors. Its gaze doesn't petrify; instead the scales gather light and its eyes focus it into a searing beam. They hunt from the far end of long halls.") + ROW(86, 11, 6, 55, 25, "artillery"),
  items: [
    feat("Disposition: Artillery", "The mirrorscale keeps 40 feet or more from its prey, climbs the walls to get a clear line, and burns whoever is lit up."),
    feat("Mirror Scales", "When a ranged spell attack misses the mirrorscale, the spell glances off its scales and the mirrorscale can redirect it at another creature within 30 feet of it, using the original attack roll."),
    feat("Shattering Death", "When the mirrorscale dies, its scales burst. Each creature within 10 feet makes a DC 17 Dexterity saving throw, taking 12 (2d8 + 3) Slashing damage on a failure."),
    attack("Light Lance", "<em>Ranged Attack Roll:</em> +11, range 120 ft. <em>Hit:</em> 25 (4d8 + 7) Radiant damage.", { hit: 11, dice: "4d8", bonus: 7, dtype: "radiant", range: "ranged", rng: [120, 120] }),
    save("Searing Prism (Recharge 5–6)", "The mirrorscale fires a beam in a 90-foot-long, 5-foot-wide Line. Each creature in the Line makes a DC 17 Dexterity saving throw. <em>Failure:</em> 50 (8d8 + 14) Radiant damage, and the target has the Blinded condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "dex", dc: 17, dice: "8d8", bonus: 14, dtype: "radiant", rech: 5, tmpl: { type: "line", size: "90", width: "5", units: "ft" } }),
    save("Flash", "The mirrorscale flares its scales at one creature within 30 feet that can see it. The creature makes a DC 17 Constitution saving throw. <em>Failure:</em> it can't see beyond 10 feet until the end of its next turn.", { ability: "con", dc: 17, onSave: "none", activation: "bonus" })
  ] }));
// ---- Basilisk Packlord (commander, Large, Epic; PL 11, Dur 12, Hit 55, Dmg 25): HP 600, AC 20, hit +11, std 25, alpha 50 ----
M.push(npc({ name: "Basilisk Packlord", slug: "basilisk-packlord", size: "lg", type: "monstrosity", cr: 11, ac: 20, hp: 600, speed: 40,
  abil: { str: 22, dex: 10, con: 20, int: 3, wis: 12, cha: 10 }, senses: { darkvision: 60 }, skills: { ath: { value: 2 } },
  bio: P("The biggest bull of the pack, crested in scarlet and scarred from fights for the Matriarch's favour. He leads the hunting pack from his den in the north of the castle and bellows the others into the fight.") + P("<em>BTLT Monster Design row 87: Power Level 11, Durability 12, Hit Pct 55, Dmg Pct 25, Epic Boss commander. Leads one Basilisk.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Packlord never rolls initiative. On initiative count 10 he rolls for recharges, then moves up to his Speed and takes one action."),
    feat("Epic Boss Resistance", "If the Packlord fails a saving throw, he can choose to succeed instead. He has Advantage on saving throws against effects that would remove him from the fight."),
    feat("Response", "After each player character's turn, the Packlord takes one Response (one only, not one per enemy). Each Response other than Movement deals 12 (1d12 + 6) damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Packlord moves up to half his Speed without provoking Opportunity Attacks.", "special"),
    feat("Disposition: Commander", "The Packlord charges the biggest threat and bellows his basilisks onto whoever he knocks down."),
    feat("Blood-Mad", "While Bloodied, the Packlord's Gore deals an extra 7 (2d6) Piercing damage, and his Command recharges on a 4–6."),
    attack("Gore", "<em>Melee Attack Roll:</em> +11, reach 10 ft. <em>Hit:</em> 25 (2d12 + 12) Piercing damage.", { hit: 11, dice: "2d12", bonus: 12, dtype: "piercing", reach: 10 }),
    attack("Trampling Charge (Recharge 5–6)", "The Packlord moves up to 40 feet in a straight line, moving through the spaces of Medium or smaller creatures, and gores a creature at the end of the move. <em>Melee Attack Roll:</em> +11, reach 10 ft. <em>Hit:</em> 50 (6d12 + 11) Piercing damage, and the target has the Prone condition.", { hit: 11, dice: "6d12", bonus: 11, dtype: "piercing", reach: 10, rech: 5 }),
    feat("Command (Recharge 5–6)", "Each basilisk of the Packlord's group moves up to its Speed and makes one attack, using none of its own actions.", "action", 5),
    feat("Pack Bellow", "Each basilisk within 60 feet that can hear the Packlord ends the Restrained condition on itself and has Advantage on its next attack roll before the end of its next turn.", "bonus"),
    save("Response: Crushing Step", "One creature within 10 feet of the Packlord makes a DC 17 Dexterity saving throw. <em>Failure:</em> 12 (1d12 + 6) Bludgeoning damage, and the target has the Prone condition.", { ability: "dex", dc: 17, dice: "1d12", bonus: 6, dtype: "bludgeoning", onSave: "none", activation: "special" })
  ] }));
// ---- The Basilisk Matriarch (Epic Boss, Huge; PL 12, Dur 12, Hit 60, Dmg 35): HP 660, AC 20, hit +13, std 37, alpha 74 ----
M.push(npc({ name: "The Basilisk Matriarch", slug: "the-basilisk-matriarch", size: "huge", type: "monstrosity", cr: 12, ac: 20, hp: 660, speed: 40,
  abil: { str: 24, dex: 10, con: 22, int: 4, wis: 16, cha: 12 }, ci: ["petrified"], senses: { darkvision: 120, tremorsense: 30 },
  bio: P("The ancient scarlet queen of the pack, coiled on a nest of bones and broken statues in the Scarlet Vault. Her skull-like head is crowned with bony horns, and the castle's statues are the work of her line. Four bronze mirrors still stand around her nest from the castle's last defence; turned on her, they throw her gaze back at her.") + P("<em>BTLT Monster Design row 88: Power Level 12, Durability 12, Hit Pct 60, Dmg Pct 35, Epic Boss. Fights with one Basilisk Broodguard.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Matriarch never rolls initiative. On initiative count 10 she rolls for recharges, then moves up to her Speed and takes one action."),
    feat("Epic Boss Resistance", "While at least one of the four bronze mirrors is unturned, if the Matriarch fails a saving throw, she can choose to succeed instead. She has Advantage on saving throws against effects that would remove her from the fight."),
    feat("Response", "After each player character's turn, the Matriarch takes one Response (one only, not one per enemy). Each Response other than Movement deals 18 (2d8 + 9) damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Matriarch moves up to half her Speed without provoking Opportunity Attacks.", "special"),
    feat("Disposition: Matriarch", "The Matriarch guards her nest, stares down anyone who comes near the mirrors and eats whatever she has turned to stone."),
    feat("The Four Mirrors", "Four tall bronze mirrors stand on stands around the vault. A creature within 5 feet of one can take an action to swing it toward the Matriarch (DC 16 Strength (Athletics); automatic while holding the Sunstone beside it). Her gaze recoils: she takes 11 (2d10) Psychic damage and has the Blinded condition until the end of her next turn. Each mirror can be turned once, then cracks. When the fourth is turned, she loses her Epic Boss Resistance."),
    feat("Molting Fury", "The first time the Matriarch is Bloodied, she sheds her stone-hard outer scales: her AC becomes 18, her Speed becomes 50 feet, and Scarlet Gaze recharges."),
    attack("Matriarch's Bite", "<em>Melee Attack Roll:</em> +13, reach 10 ft. <em>Hit:</em> 37 (4d12 + 11) Piercing damage.", { hit: 13, dice: "4d12", bonus: 11, dtype: "piercing", reach: 10 }),
    save("Scarlet Gaze (Recharge 5–6)", `Each creature in a 60-foot Cone that can see the Matriarch makes a DC 19 Constitution saving throw (a creature holding the Sunstone has Advantage). <em>Failure:</em> 74 (8d12 + 22) Necrotic damage, and the target has the Restrained condition as it starts to turn to stone; a creature that was already Restrained has the Petrified condition instead. ${STONE} <em>Success:</em> Half damage only.`, { ability: "con", dc: 19, dice: "8d12", bonus: 22, dtype: "necrotic", rech: 5, tmpl: { type: "cone", size: "60", units: "ft" } }),
    save("Response: Tail Sweep", "One creature within 15 feet of the Matriarch makes a DC 19 Dexterity saving throw. <em>Failure:</em> 18 (2d8 + 9) Bludgeoning damage, and the target has the Prone condition.", { ability: "dex", dc: 19, dice: "2d8", bonus: 9, dtype: "bludgeoning", onSave: "none", activation: "special" }),
    save("Response: Lingering Stare", "One creature within 60 feet that can see the Matriarch and touched a mirror since her last turn makes a DC 19 Constitution saving throw. <em>Failure:</em> 18 (2d8 + 9) Necrotic damage, and its Speed is halved until the end of its next turn.", { ability: "con", dc: 19, dice: "2d8", bonus: 9, dtype: "necrotic", onSave: "none", activation: "special" })
  ] }));
const exists = async p => p && (await fetch("/" + p, { method: "HEAD" })).ok;
let fb = "icons/svg/skull.svg"; for (const s of FALLBACK) if (await exists(s)) { fb = s; break; }
for (const m of M) for (const it of m.items) if (!(await exists(it.img))) it.img = fb;
const made = [];
for (const data of M) {
  const old = game.actors.find(a => a.getFlag(MOD, "slug") === data.flags[MOD].slug);
  if (old) await old.delete();
  const a = await Actor.create(data);
  made.push(`${a.name}: HP ${a.system.attributes.hp.max} AC ${a.system.attributes.ac.value} items ${a.items.size}`);
}
console.log(made.join("\n"));
