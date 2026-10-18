// Builds the 5LEI-3 Basilica of the Thunder Crown monsters (paste into the Foundry console as GM).
// Numbers come from BTLT Monster Design rows 24-28 (HP, AC, hit, standard damage, alpha damage).
const MOD = "faight-beyond-the-last-torch", CODE = "5LEI-3", NAME = "5LEI-3: Basilica of the Thunder Crown";
const ART = `modules/${MOD}/assets/tokens/basilica-of-the-thunder-crown`;
let folder = game.folders.find(f => f.type === "Actor" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Actor" });
const ICONS = {
  "Init 10 (Epic Boss)": "icons/svg/clockwork.svg",
  "Epic Boss Resistance": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "Response": "icons/magic/control/energy-stream-link-white.webp",
  "Response: Movement": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Multiattack": "icons/skills/targeting/target-strike-triple-blue.webp",
  "Swarm": "icons/creatures/invertebrates/wasp-swarm-movement.webp",
  "Gnawing Bites": "icons/creatures/abilities/fangs-teeth-bite.webp",
  "Bite": "icons/creatures/abilities/fangs-teeth-bite.webp",
  "Kick": "icons/skills/melee/unarmed-punch-fist.webp",
  "Bound": "icons/creatures/mammals/deer-movement-leap-green.webp",
  "Hop": "icons/creatures/mammals/deer-movement-leap-green.webp",
  "Thunder Spear": "icons/weapons/polearms/spear-flared-steel.webp",
  "Bolt Javelin": "icons/weapons/thrown/javelin-steel.webp",
  "Antler Gore": "icons/creatures/mammals/deer-antlers-blue.webp",
  "Guard": "icons/magic/defensive/shield-barrier-glowing-blue.webp",
  "Response: Kick": "icons/magic/control/silhouette-fall-slip-prone.webp",
  "Response: Bounding Leap": "icons/creatures/mammals/deer-movement-leap-green.webp",
  "Response: Arc Lash": "icons/magic/control/energy-stream-link-spiral-blue.webp",
  "Disposition: Brute": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Skirmisher": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Guardian": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Tyrant": "icons/skills/targeting/crosshair-ringed-gray.webp"
};
// Lightning and thunder actions not listed above get this icon (checked to exist before use).
const STORM = ["icons/magic/lightning/bolt-strike-blue.webp", "icons/magic/lightning/bolt-forked-blue.webp", "icons/svg/lightning.svg"];
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
function npc({ name, slug, size, type, cr, ac, hp, speed, burrow = 0, climb = 0, abil, dr = [], di = [], ci = [], senses = {}, skills = {}, langs = "", bio, items }) {
  const ab = {}; for (const [k, v] of Object.entries(abil)) ab[k] = { value: v };
  return { name, type: "npc", folder: folder.id, img: `${ART}/${slug}.webp`,
    flags: { [MOD]: { adventure: CODE, role: "monster", slug } },
    system: { abilities: ab,
      attributes: { ac: { flat: ac, calc: "flat" }, hp: { value: hp, max: hp, formula: hpf(hp, size, abil.con) },
        movement: { walk: speed, burrow, climb, units: "ft" }, senses: { units: "ft", ...senses } },
      details: { cr, type: { value: type }, biography: { value: bio } },
      traits: { size, dr: { value: dr }, di: { value: di }, ci: { value: ci }, languages: { custom: langs } }, skills },
    prototypeToken: { name, alpha: 1, texture: { src: `${ART}/${slug}-token.webp` }, width: SIZE[size], height: SIZE[size],
      actorLink: false, disposition: -1, displayName: 20, displayBars: 20, bar1: { attribute: "attributes.hp" }, sight: { enabled: true, range: 60 } },
    items: items.map(i => ({ ...i, img: iconFor(i.name) || i.img })) };
}

const M = [];
// ---- Warren Swarm (PL 8, Durability 3): HP 107, AC 15, hit +5, standard 8, alpha 16 ----
M.push(npc({ name: "Warren Swarm", slug: "warren-swarm", size: "lg", type: "beast", cr: 8, ac: 15, hp: 107, speed: 40, burrow: 10,
  abil: { str: 8, dex: 16, con: 14, int: 2, wis: 12, cha: 4 }, dr: ["bludgeoning", "piercing", "slashing"],
  ci: ["charmed", "frightened", "grappled", "paralyzed", "petrified", "prone", "restrained", "stunned"], senses: { darkvision: 60 },
  bio: P("A boiling mass of feral basilica rabbits, sparks crackling in their fur from years of nesting near the Thunder Crown.") + P("<em>BTLT Monster Design: Power Level 8, Durability 3.</em>"),
  items: [
    feat("Swarm", "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny rabbit. The swarm can't regain Hit Points or gain Temporary Hit Points."),
    feat("Disposition: Brute", "The swarm pours into the nearest group of enemies and stays on them until it is destroyed."),
    attack("Gnawing Bites", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 8 (2d6 + 1) Piercing damage.", { hit: 5, dice: "2d6", bonus: 1, dtype: "piercing" }),
    save("Static Stampede (Recharge 5–6)", "The swarm moves up to its Speed. Each creature whose space it enters during this move makes a DC 14 Dexterity saving throw. <em>Failure:</em> 16 (3d8 + 2) Lightning damage, and the target has the Prone condition. <em>Success:</em> Half damage only.", { ability: "dex", dc: 14, dice: "3d8", bonus: 2, dtype: "lightning", rech: 5 }),
    save("Static Shock", "<em>Reaction.</em> When a creature within 5 feet hits the swarm with a melee attack, that creature makes a DC 14 Constitution saving throw. <em>Failure:</em> 4 (1d8) Lightning damage.", { ability: "con", dc: 14, dice: "1d8", dtype: "lightning", onSave: "none", activation: "reaction" })
  ] }));
// ---- Thunder Hare (PL 9, Durability 4): HP 160, AC 17, hit +5, standard 9, alpha 18 ----
M.push(npc({ name: "Thunder Hare", slug: "thunder-hare", size: "lg", type: "beast", cr: 9, ac: 17, hp: 160, speed: 60,
  abil: { str: 18, dex: 16, con: 15, int: 2, wis: 12, cha: 5 }, dr: ["lightning"], senses: { darkvision: 60 }, skills: { prc: { value: 1 } },
  bio: P("A horse-sized hare with static crackling through its bristling grey fur and pale blue light in its eyes.") + P("<em>BTLT Monster Design: Power Level 9, Durability 4.</em>"),
  items: [
    feat("Disposition: Skirmisher", "The hare bounds in, kicks the nearest enemy, and bounds away before it can be surrounded; it flees when Bloodied."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    attack("Bite", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 9 (1d10 + 4) Piercing damage.", { hit: 5, dice: "1d10", bonus: 4, dtype: "piercing" }),
    attack("Kick", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 9 (2d4 + 4) Bludgeoning damage, and the target is pushed 5 feet away.", { hit: 5, dice: "2d4", bonus: 4, dtype: "bludgeoning" }),
    save("Thunder Stomp (Recharge 5–6)", "The hare drums the floor. Each creature within 15 feet makes a DC 14 Constitution saving throw. <em>Failure:</em> 18 (4d8) Thunder damage, and the target has the Prone condition. <em>Success:</em> Half damage only.", { ability: "con", dc: 14, dice: "4d8", dtype: "thunder", rech: 5 }),
    feat("Bound", "<em>Bonus Action.</em> The hare leaps up to 30 feet without provoking Opportunity Attacks.", "bonus"),
    save("Static Fur", "<em>Reaction.</em> When a creature within 5 feet hits the hare with a melee attack, that creature makes a DC 14 Constitution saving throw. <em>Failure:</em> 4 (1d8) Lightning damage.", { ability: "con", dc: 14, dice: "1d8", dtype: "lightning", onSave: "none", activation: "reaction" })
  ] }));
// ---- Stormguard Sentinel (PL 10, Durability 4): HP 180, AC 18, hit +6, standard 9, alpha 18 ----
M.push(npc({ name: "Stormguard Sentinel", slug: "stormguard-sentinel", size: "lg", type: "construct", cr: 10, ac: 18, hp: 180, speed: 30,
  abil: { str: 20, dex: 10, con: 18, int: 6, wis: 12, cha: 3 }, di: ["lightning", "poison"],
  ci: ["charmed", "exhaustion", "frightened", "paralyzed", "petrified", "poisoned"], senses: { darkvision: 120 }, langs: "understands Celestial but can't speak",
  bio: P("A bronze temple guardian green with verdigris, still keeping its watch over Vauroth's basilica. Blue light burns in its eye slits.") + P("<em>BTLT Monster Design: Power Level 10, Durability 4.</em>"),
  items: [
    feat("Disposition: Guardian", "The sentinel holds its post, attacks the nearest creature that is not a priest of Vauroth (hares included), and never pursues beyond the room it guards. It will not attack a creature holding the Thunder Crown."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    attack("Thunder Spear", "<em>Melee Attack Roll:</em> +6, reach 10 ft. <em>Hit:</em> 9 (1d8 + 5) Piercing damage.", { hit: 6, dice: "1d8", bonus: 5, dtype: "piercing", reach: 10, wtype: "martialM" }),
    attack("Bolt Javelin", "<em>Ranged Attack Roll:</em> +6, range 40/80 ft. <em>Hit:</em> 9 (1d8 + 5) Lightning damage.", { hit: 6, dice: "1d8", bonus: 5, dtype: "lightning", range: "ranged", rng: [40, 80], wtype: "martialR" }),
    save("Shield Thunderclap (Recharge 5–6)", "The sentinel strikes its shield. Each creature in a 15-foot Cone makes a DC 15 Constitution saving throw. <em>Failure:</em> 18 (3d10 + 2) Thunder damage, and the target is pushed 10 feet away and has the Prone condition. <em>Success:</em> Half damage only.", { ability: "con", dc: 15, dice: "3d10", bonus: 2, dtype: "thunder", rech: 5, tmpl: { type: "cone", size: "15", units: "ft" } }),
    feat("Guard", "<em>Bonus Action.</em> The sentinel raises its shield over one ally within 5 feet. That ally has Half Cover until the start of the sentinel's next turn.", "bonus"),
    save("Retaliating Spark", "<em>Reaction.</em> When a creature within 10 feet hits the sentinel, that creature makes a DC 15 Dexterity saving throw. <em>Failure:</em> 4 (1d8) Lightning damage.", { ability: "dex", dc: 15, dice: "1d8", dtype: "lightning", onSave: "none", activation: "reaction" })
  ] }));
// ---- Galvanic Jackalope (PL 11, Durability 4.25): HP 213, AC 19, hit +6, standard 10, alpha 20 ----
M.push(npc({ name: "Galvanic Jackalope", slug: "galvanic-jackalope", size: "med", type: "monstrosity", cr: 11, ac: 19, hp: 213, speed: 50,
  abil: { str: 14, dex: 20, con: 16, int: 4, wis: 14, cha: 6 }, di: ["lightning"], senses: { darkvision: 60 },
  bio: P("A wolf-sized antlered hare. Its branching copper-green antlers arc with lightning drawn from the Thunder Crown.") + P("<em>BTLT Monster Design: Power Level 11, Durability 4.25.</em>"),
  items: [
    feat("Disposition: Skirmisher", "The jackalope keeps its distance, firing arc bolts at whoever wears the most metal, and hops away from anyone who closes in."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    attack("Antler Gore", "<em>Melee Attack Roll:</em> +6, reach 5 ft. <em>Hit:</em> 10 (1d10 + 5) Piercing damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "piercing" }),
    attack("Arc Bolt", "<em>Ranged Attack Roll:</em> +6, range 60/120 ft. <em>Hit:</em> 10 (3d6) Lightning damage.", { hit: 6, dice: "3d6", dtype: "lightning", range: "ranged", rng: [60, 120] }),
    save("Chain Lightning Antlers (Recharge 5–6)", "Lightning leaps from the jackalope's antlers to one creature within 60 feet, then to up to two other creatures within 15 feet of the first. Each target makes a DC 17 Dexterity saving throw. <em>Failure:</em> 20 (4d8 + 2) Lightning damage, and the target's Speed is 0 until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "dex", dc: 17, dice: "4d8", bonus: 2, dtype: "lightning", rech: 5 }),
    feat("Hop", "<em>Bonus Action.</em> The jackalope leaps up to 20 feet without provoking Opportunity Attacks.", "bonus"),
    save("Static Discharge", "<em>Reaction.</em> When a creature within 5 feet hits the jackalope with a melee attack, that creature makes a DC 17 Constitution saving throw. <em>Failure:</em> 5 (1d10) Lightning damage.", { ability: "con", dc: 17, dice: "1d10", dtype: "lightning", onSave: "none", activation: "reaction" })
  ] }));
// ---- The Thunderbuck (PL 12, Durability 10, Epic Boss): HP 550, AC 20, hit +11, standard 11, alpha 22 ----
M.push(npc({ name: "The Thunderbuck", slug: "the-thunderbuck", size: "huge", type: "monstrosity", cr: 12, ac: 20, hp: 550, speed: 50,
  abil: { str: 24, dex: 16, con: 22, int: 6, wis: 16, cha: 14 }, di: ["lightning", "thunder"], ci: ["frightened", "deafened"], senses: { darkvision: 120 },
  bio: P("The alpha of the basilica's warren: a hare-stag the size of an elk whose vast antlers have grown around the Thunder Crown. Storm static hangs around it like fog.") + P("<em>BTLT Monster Design: Power Level 12, Durability 10, Epic Boss. Fights with two Galvanic Jackalopes.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Thunderbuck never rolls initiative. On initiative count 10 it rolls for recharges, then moves up to its Speed and takes one action: its standard attack or one of its charged actions."),
    feat("Epic Boss Resistance", "If the Thunderbuck fails a saving throw, it can choose to succeed instead. It has Advantage on saving throws against effects that would remove it from the fight."),
    feat("Response", "After each player character's turn, the Thunderbuck takes one Response (one only, not one per enemy). Each Response other than Movement also deals 6 damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Thunderbuck moves up to half its Speed.", "special"),
    feat("Disposition: Tyrant", "The Thunderbuck stays on or beside the altar dais while the crown is in its antlers. It attacks whoever last damaged one of its jackalopes, then whoever stands closest to the altar."),
    feat("Crowned by Thunder", "While the Thunder Crown is in its antlers, Stormguard Sentinels will not attack the Thunderbuck, and the Thunderbuck can't be moved against its will."),
    attack("Antler Gore", "<em>Melee Attack Roll:</em> +11, reach 10 ft. <em>Hit:</em> 11 (1d10 + 6) Piercing damage plus 3 (1d6) Lightning damage.", { hit: 11, dice: "1d10", bonus: 6, dtype: "piercing", reach: 10 }),
    save("Crown Storm (Recharge 5–6)", "Lightning falls from the crown in a 20-foot-radius Sphere centered on a point within 60 feet. Each creature in it makes a DC 19 Dexterity saving throw. <em>Failure:</em> 22 (4d10) Lightning damage, and the target has the Blinded condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "dex", dc: 19, dice: "4d10", dtype: "lightning", rech: 5, tmpl: { type: "sphere", size: "20", units: "ft" } }),
    save("Earthshaker Stomp (Recharge 6)", "The Thunderbuck stamps its hind legs. Each enemy within 30 feet makes a DC 19 Constitution saving throw. <em>Failure:</em> 22 (5d8) Thunder damage, and the target is pushed 15 feet away and has the Deafened condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "con", dc: 19, dice: "5d8", dtype: "thunder", rech: 6 }),
    save("Response: Kick", "The Thunderbuck kicks one creature within 10 feet. It makes a DC 19 Dexterity saving throw. <em>Failure:</em> 6 (1d12) Bludgeoning damage, and the target has the Prone condition.", { ability: "dex", dc: 19, dice: "1d12", dtype: "bludgeoning", onSave: "none", activation: "special" }),
    save("Response: Arc Lash", "One creature the Thunderbuck can see within 60 feet makes a DC 19 Constitution saving throw. <em>Failure:</em> 6 (1d12) Lightning damage, and the target's Speed is halved until the end of its next turn.", { ability: "con", dc: 19, dice: "1d12", dtype: "lightning", onSave: "none", activation: "special" }),
    feat("Response: Bounding Leap", "The Thunderbuck leaps up to 30 feet to an unoccupied space it can see. One creature within 5 feet of where it lands takes 6 (1d12) Bludgeoning damage.", "special")
  ] }));
// Resolve icons: any action without a valid icon gets a storm icon that exists in this install.
const exists = async p => p && (await fetch("/" + p, { method: "HEAD" })).ok;
let storm = "icons/svg/lightning.svg"; for (const s of STORM) if (await exists(s)) { storm = s; break; }
for (const m of M) for (const it of m.items) if (!(await exists(it.img))) it.img = storm;
const made = [];
for (const data of M) {
  const old = game.actors.find(a => a.getFlag(MOD, "slug") === data.flags[MOD].slug);
  if (old) await old.delete();
  const a = await Actor.create(data);
  made.push(`${a.name}: HP ${a.system.attributes.hp.max} (${a.system.attributes.hp.formula}) AC ${a.system.attributes.ac.value} items ${a.items.size}`);
}
made;
