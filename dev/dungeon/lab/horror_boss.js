// Builds the 5LET-1 The Laboratory of Dr. Varnholt monsters (run in the Foundry console as GM).
// Numbers come from BTLT Monster Design rows 48-53 (HP, AC, hit, standard damage, alpha damage), with role-based
// Hit Pct / Dmg Pct dials. Each creature has its own role and mechanic.
const MOD = "faight-beyond-the-last-torch", CODE = "5LET-1", NAME = "5LET-1: The Laboratory of Dr. Varnholt";
const ART = `modules/${MOD}/assets/tokens/the-laboratory-of-dr-varnholt`;
let folder = game.folders.find(f => f.type === "Actor" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Actor" });
const T = "icons/skills/targeting/crosshair-arrowhead-blue.webp";
const ICONS = {
  "Init 10 (Epic Boss)": "icons/svg/clockwork.svg",
  "Epic Boss Resistance": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "Response": "icons/magic/control/energy-stream-link-white.webp",
  "Response: Movement": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Disposition: Pack": T, "Disposition: Brute": T, "Disposition: Artillery": T, "Disposition: Controller": T, "Disposition: Commander": T, "Disposition: Tyrant": T,
  "Pack Hunter": "icons/creatures/abilities/fangs-teeth-bite.webp", "Bite": "icons/creatures/abilities/fangs-teeth-bite.webp",
  "Drag Down": "icons/creatures/abilities/fangs-teeth-bite.webp", "Lope": "icons/skills/movement/figure-running-gray.webp",
  "Lurching Slam": "icons/skills/melee/unarmed-punch-fist.webp", "Crushing Embrace": "icons/skills/melee/unarmed-punch-fist.webp",
  "Comes Apart": "icons/magic/death/hand-withered-gray.webp", "Split Seams": "icons/magic/death/hand-withered-gray.webp",
  "Slab Sweep": "icons/skills/melee/unarmed-punch-fist.webp", "Response: Fling Aside": "icons/skills/melee/unarmed-punch-fist.webp", "Unfeeling Flesh": "icons/magic/defensive/armor-stone-skin.webp",
  "Arc Bolt": "icons/magic/lightning/bolt-strike-blue.webp", "Relay Lightning": "icons/magic/lightning/bolt-strike-blue.webp",
  "Galvanic Link": "icons/magic/control/energy-stream-link-white.webp", "Shamble Back": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Psychic Lash": "icons/magic/perception/eye-ringed-green.webp", "Telekinetic Throw": "icons/magic/perception/eye-tendrils-web-purple.webp",
  "Direct": "icons/magic/perception/eye-ringed-glow-angry-teal.webp", "Thought Shield": "icons/magic/defensive/shield-barrier-glowing-blue.webp",
  "Glass Jar": "icons/magic/defensive/shield-barrier-glowing-blue.webp",
  "Field Repairs": "icons/magic/control/energy-stream-link-white.webp", "Flee to Elsa": "icons/skills/movement/figure-running-gray.webp",
  "Scalpel": "icons/weapons/daggers/dagger-straight-blue.webp", "Galvanic Rod": "icons/magic/lightning/bolt-strike-blue.webp",
  "Overcharge": "icons/magic/lightning/bolt-strike-blue.webp", "Command the Servants": "icons/skills/social/intimidation-impressing.webp",
  "Response: Galvanic Jolt": "icons/magic/lightning/bolt-strike-blue.webp",
  "Coil Arcs": "icons/magic/lightning/bolt-strike-blue.webp", "Wreck the Coil": "icons/magic/lightning/bolt-strike-blue.webp",
  "Stitched Fist": "icons/skills/melee/unarmed-punch-fist.webp", "Lightning Embrace": "icons/magic/lightning/bolt-strike-blue.webp",
  "Bridal Leap": "icons/skills/movement/figure-running-gray.webp", "Response: Grasping Grief": "icons/magic/death/hand-withered-gray.webp",
  "Response: Static Shriek": "icons/magic/perception/eye-slit-orange.webp"
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
// ---- Stitched Hound (pack; PL 8, Dur 3, Hit 60, Dmg 15): HP 107, AC 15, hit +11, std 12, alpha 24 ----
M.push(npc({ name: "Stitched Hound", slug: "stitched-hound", size: "med", type: "construct", cr: 8, ac: 15, hp: 107, speed: 50,
  abil: { str: 16, dex: 16, con: 14, int: 3, wis: 12, cha: 4 }, di: ["poison"], dv: ["fire"], ci: ["charmed", "frightened", "poisoned"], senses: { darkvision: 60 },
  bio: P("A hound sewn together from the parts of several dead dogs, with a metal bolt through its neck. Varnholt's packs hunt intruders through the castle halls.") + P("<em>BTLT Monster Design row 48: Power Level 8, Durability 3, Hit Pct 60, Dmg Pct 15. Role: pack hunter.</em>"),
  items: [
    feat("Disposition: Pack", "The hounds circle the weakest-looking creature, bring it down together, and drag it away from its friends."),
    feat("Pack Hunter", "The hound has Advantage on attack rolls against a creature if another hound is within 5 feet of that creature."),
    attack("Bite", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 12 (2d6 + 5) Piercing damage.", { hit: 11, dice: "2d6", bonus: 5, dtype: "piercing" }),
    attack("Drag Down (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 24 (4d8 + 6) Piercing damage, the target has the Prone condition, and the hound drags it up to 10 feet.", { hit: 11, dice: "4d8", bonus: 6, dtype: "piercing", rech: 5 }),
    feat("Lope", "<em>Bonus Action.</em> The hound takes the Dash action.", "bonus")
  ] }));
// ---- Patchwork Horror (brute, Epic Boss; PL 9, Dur 13.5, Hit 55, Dmg 33): HP 540, AC 18, hit +10, std 28, alpha 56 ----
M.push(npc({ name: "Patchwork Horror", slug: "patchwork-horror", size: "huge", type: "construct", cr: 9, ac: 18, hp: 540, speed: 30,
  abil: { str: 24, dex: 8, con: 22, int: 3, wis: 8, cha: 3 }, dr: ["lightning"], di: ["poison"], dv: ["fire"], ci: ["charmed", "exhaustion", "frightened", "poisoned"], senses: { darkvision: 60 },
  bio: P("Varnholt's one finished giant: a hulking body sewn together from many of Grausbach's dead, held with iron staples and lying under a sheet the size of a sail in the Morgue. When its seams split, its parts keep grabbing.") + P("<em>BTLT Monster Design row 49: Power Level 9, Durability 13.5, Hit Pct 55, Dmg Pct 33, Epic Boss. Role: brute. Fights alone.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Horror never rolls initiative. On initiative count 10 it rolls for recharges, then moves up to its Speed and takes one action."),
    feat("Epic Boss Resistance", "If the Horror fails a saving throw, it can choose to succeed instead. It has Advantage on saving throws against effects that would remove it from the fight."),
    feat("Response", "After each player character's turn, the Horror takes one Response (one only, not one per enemy). Each Response other than Movement deals 14 (2d6 + 7) damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Horror moves up to half its Speed.", "special"),
    feat("Disposition: Brute", "The Horror lurches at whoever is closest and crushes whatever it gets hold of. It never retreats and never leaves the Morgue."),
    feat("Split Seams", "While the Horror is Bloodied, its stitches split and severed hands and arms grab at everything around it. A creature that starts its turn within 10 feet of the Horror makes a DC 15 Strength saving throw. <em>Failure:</em> 14 (2d6 + 7) Bludgeoning damage, and its Speed is 0 until the end of its turn."),
    feat("Comes Apart", "When the Horror drops to 0 Hit Points, it bursts apart. Each creature within 10 feet makes a DC 15 Dexterity saving throw. <em>Failure:</em> 14 (2d6 + 7) Bludgeoning damage, and the target has the Grappled condition (escape DC 15) from a crawling hand until it escapes."),
    attack("Lurching Slam", "<em>Melee Attack Roll:</em> +10, reach 15 ft. <em>Hit:</em> 28 (3d10 + 12) Bludgeoning damage.", { hit: 10, dice: "3d10", bonus: 12, dtype: "bludgeoning", reach: 15 }),
    attack("Crushing Embrace (Recharge 5–6)", "<em>Melee Attack Roll:</em> +10, reach 10 ft. <em>Hit:</em> 56 (6d10 + 23) Bludgeoning damage, and the target has the Grappled condition (escape DC 15). While Grappled this way, the target has the Restrained condition.", { hit: 10, dice: "6d10", bonus: 23, dtype: "bludgeoning", reach: 10, rech: 5 }),
    save("Slab Sweep (Recharge 6)", "The Horror tears a stone slab from the floor and sweeps it in a 15-foot Cone. Each creature in the Cone makes a DC 15 Dexterity saving throw. <em>Failure:</em> 56 (6d10 + 23) Bludgeoning damage, and the target is pushed 10 feet away from the Horror. <em>Success:</em> Half damage only.", { ability: "dex", dc: 15, dice: "6d10", bonus: 23, dtype: "bludgeoning", rech: 6, tmpl: { type: "cone", size: "15", units: "ft" } }),
    save("Response: Fling Aside", "One creature within 15 feet makes a DC 15 Strength saving throw. <em>Failure:</em> 14 (2d6 + 7) Bludgeoning damage, and the target is thrown up to 15 feet away from the Horror.", { ability: "str", dc: 15, dice: "2d6", bonus: 7, dtype: "bludgeoning", onSave: "none", activation: "special" })
  ] }));
// ---- Galvanic Servant (artillery; PL 10, Dur 4, Hit 55, Dmg 25): HP 180, AC 18, hit +11, std 23, alpha 46 ----
M.push(npc({ name: "Galvanic Servant", slug: "galvanic-servant", size: "med", type: "undead", cr: 10, ac: 18, hp: 180, speed: 30,
  abil: { str: 12, dex: 16, con: 16, int: 6, wis: 10, cha: 6 }, di: ["lightning", "poison"], ci: ["charmed", "exhaustion", "poisoned"], senses: { darkvision: 60 },
  bio: P("A dead servant of the castle kept moving by copper electrodes bolted to its temples. Lightning arcs between its hands, and between it and any other servant nearby.") + P("<em>BTLT Monster Design row 50: Power Level 10, Durability 4, Hit Pct 55, Dmg Pct 25. Role: artillery.</em>"),
  items: [
    feat("Disposition: Artillery", "The servants spread out across the room so that their lightning crosses the space between them, and keep away from melee."),
    feat("Galvanic Link", "When another Galvanic Servant within 30 feet is destroyed, this servant's Relay Lightning recharges."),
    attack("Arc Bolt", "<em>Ranged Attack Roll:</em> +11, range 60/120 ft. <em>Hit:</em> 23 (2d10 + 12) Lightning damage.", { hit: 11, dice: "2d10", bonus: 12, dtype: "lightning", range: "ranged", rng: [60, 120] }),
    save("Relay Lightning (Recharge 5–6)", "Lightning leaps from the servant to another Galvanic Servant or Dr. Varnholt within 60 feet. Each creature in the 5-foot-wide line between them makes a DC 15 Dexterity saving throw. <em>Failure:</em> 46 (6d10 + 13) Lightning damage. <em>Success:</em> Half damage.", { ability: "dex", dc: 15, dice: "6d10", bonus: 13, dtype: "lightning", rech: 5, tmpl: { type: "line", size: "60", width: "5", units: "ft" } }),
    feat("Shamble Back", "<em>Bonus Action.</em> The servant moves up to 10 feet without provoking Opportunity Attacks.", "bonus")
  ] }));
// ---- Brain in a Jar (controller; PL 11, Dur 6, Hit 45, Dmg 20): HP 300, AC 20, hit +9, std 20, alpha 40 ----
M.push(npc({ name: "Brain in a Jar", slug: "brain-in-a-jar", size: "sm", type: "aberration", cr: 11, ac: 20, hp: 300, speed: 20,
  abil: { str: 3, dex: 10, con: 16, int: 20, wis: 16, cha: 14 }, dv: ["bludgeoning"], di: ["psychic", "poison"], ci: ["blinded", "charmed", "deafened", "frightened", "poisoned", "prone"], senses: { blindsight: 120 }, langs: "telepathy 120 ft.",
  bio: P("The living brain of one of Grausbach's dead, kept in glowing fluid on a brass wheeled stand. It hurls things with its mind and guides Varnholt's creations.") + P("<em>BTLT Monster Design row 51: Power Level 11, Durability 6, Hit Pct 45, Dmg Pct 20. Role: controller.</em>"),
  items: [
    feat("Disposition: Controller", "The brain stays behind the other creations, throws whoever threatens them, and turns spellcasters' magic aside."),
    feat("Glass Jar", "The brain is Vulnerable to Bludgeoning damage. A critical hit against it cracks the jar: its Speed becomes 0 until the end of its next turn."),
    attack("Psychic Lash", "<em>Ranged Attack Roll:</em> +9, range 60 ft. <em>Hit:</em> 20 (2d10 + 9) Psychic damage.", { hit: 9, dice: "2d10", bonus: 9, dtype: "psychic", range: "ranged", rng: [60, 60] }),
    save("Telekinetic Throw (Recharge 5–6)", "One creature the brain can sense within 60 feet makes a DC 17 Strength saving throw. <em>Failure:</em> 40 (4d10 + 18) Bludgeoning damage, and the target is thrown up to 20 feet and has the Prone condition. <em>Success:</em> Half damage only.", { ability: "str", dc: 17, dice: "4d10", bonus: 18, dtype: "bludgeoning", rech: 5 }),
    feat("Direct", "<em>Bonus Action.</em> One ally the brain can sense within 60 feet has Advantage on its next attack roll before the end of its next turn.", "bonus"),
    save("Thought Shield", "<em>Reaction.</em> When a creature within 60 feet casts a spell of 3rd level or lower, that creature makes a DC 17 Intelligence saving throw. <em>Failure:</em> 10 (1d8 + 6) Psychic damage, and the spell fails and is wasted.", { ability: "int", dc: 17, dice: "1d8", bonus: 6, dtype: "psychic", onSave: "none", activation: "reaction" })
  ] }));
// ---- Dr. Emeric Varnholt (commander, Epic; PL 11, Dur 8.5, Hit 55, Dmg 25): HP 425, AC 20, hit +11, std 25, alpha 50 ----
M.push(npc({ name: "Dr. Emeric Varnholt", slug: "dr-emeric-varnholt", size: "med", type: "humanoid", cr: 11, ac: 20, hp: 425, speed: 30,
  abil: { str: 12, dex: 14, con: 16, int: 22, wis: 12, cha: 14 }, dr: ["lightning"], ci: ["frightened"], senses: { darkvision: 60 }, langs: "Common, Elvish, Draconic",
  bio: P("A brilliant surgeon who lost his wife Elsa to fever ten years ago and has robbed Grausbach's graveyard ever since to learn to raise the dead with lightning. Tonight's storm is the one he has waited for.") + P("<em>BTLT Monster Design row 52: Power Level 11, Durability 8.5, Hit Pct 55, Dmg Pct 25, Epic Boss commander. Fights with two Galvanic Servants.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "Dr. Varnholt never rolls initiative. On initiative count 10 he rolls for recharges, then moves up to his Speed and takes one action."),
    feat("Epic Boss Resistance", "If Dr. Varnholt fails a saving throw, he can choose to succeed instead. He has Advantage on saving throws against effects that would remove him from the fight."),
    feat("Response", "After each player character's turn, Dr. Varnholt takes one Response (one only, not one per enemy). Each Response other than Movement deals 12 (1d12 + 6) damage, half a standard hit, to its target."),
    feat("Response: Movement", "Dr. Varnholt moves up to half his Speed.", "special"),
    feat("Disposition: Commander", "Varnholt keeps his servants between himself and the party, repairs whatever is losing, and saves himself for Elsa."),
    feat("Field Repairs", "On initiative count 10, one Construct or Undead ally within 30 feet of Varnholt regains 25 Hit Points."),
    feat("Flee to Elsa", "If Varnholt drops to 0 Hit Points while the Bride lives, he drops to 1 Hit Point instead and flees up the stairs to the Tower Laboratory, where he works the coil."),
    attack("Scalpel", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 25 (2d12 + 12) Slashing damage.", { hit: 11, dice: "2d12", bonus: 12, dtype: "slashing", wtype: "simpleM" }),
    attack("Galvanic Rod", "<em>Ranged Attack Roll:</em> +11, range 30 ft. <em>Hit:</em> 25 (2d12 + 12) Lightning damage.", { hit: 11, dice: "2d12", bonus: 12, dtype: "lightning", range: "ranged", rng: [30, 30] }),
    save("Overcharge (Recharge 5–6)", "One creature within 30 feet makes a DC 17 Constitution saving throw. <em>Failure:</em> 50 (6d12 + 11) Lightning damage, and the target's Speed is 0 and it can't take Reactions until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "con", dc: 17, dice: "6d12", bonus: 11, dtype: "lightning", rech: 5 }),
    feat("Command the Servants (Recharge 5–6)", "Each Galvanic Servant of his group moves up to its Speed and makes one Arc Bolt attack, using none of its own actions.", "action", 5),
    save("Response: Galvanic Jolt", "One creature within 30 feet makes a DC 17 Constitution saving throw. <em>Failure:</em> 12 (1d12 + 6) Lightning damage, and the target can't take Reactions until the start of its next turn.", { ability: "con", dc: 17, dice: "1d12", bonus: 6, dtype: "lightning", onSave: "none", activation: "special" })
  ] }));
// ---- The Bride (Epic Boss; PL 12, Dur 10, Hit 60, Dmg 35): HP 550, AC 20, hit +13, std 37, alpha 74 ----
M.push(npc({ name: "The Bride", slug: "the-bride", size: "lg", type: "undead", cr: 12, ac: 20, hp: 550, speed: 40,
  abil: { str: 24, dex: 16, con: 22, int: 8, wis: 12, cha: 18 }, dr: ["necrotic"], di: ["lightning", "poison"], ci: ["charmed", "exhaustion", "frightened", "poisoned"], senses: { darkvision: 120 }, langs: "understands Common but speaks only in screams",
  bio: P("Elsa Varnholt, raised in a body stitched together from Grausbach's dead and powered by the lightning of the tower coil. She wears a veil of lace from her own wedding dress. She does not remember her husband.") + P("<em>BTLT Monster Design row 53: Power Level 12, Durability 10, Hit Pct 60, Dmg Pct 35, Epic Boss. Fights with two Galvanic Servants.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Bride never rolls initiative. On initiative count 10 she rolls for recharges, then moves up to her Speed and takes one action: her standard attack or one of her charged actions."),
    feat("Epic Boss Resistance", "If the Bride fails a saving throw, she can choose to succeed instead. She has Advantage on saving throws against effects that would remove her from the fight."),
    feat("Response", "After each player character's turn, the Bride takes one Response (one only, not one per enemy). Each Response other than Movement deals 18 (2d8 + 9) damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Bride moves up to half her Speed.", "special"),
    feat("Disposition: Tyrant", "The Bride attacks whoever is nearest the coil, then whoever hurt her last. She never leaves the Tower Laboratory."),
    feat("Coil Arcs", "While the tower coil runs, lightning arcs between its coils. When the Bride enters or starts her turn in the arcs (within 10 feet of them), she regains 20 Hit Points. Any other creature that does so makes a DC 19 Constitution saving throw, taking 18 (2d8 + 9) Lightning damage on a failure or half as much on a success."),
    feat("Wreck the Coil", "The coil has AC 18 and 60 Hit Points; or a creature within 5 feet of it can take an action to wreck it (DC 20 Strength (Athletics) or Intelligence (Arcana)). When the coil is wrecked, the arcs die and the Bride loses her Epic Boss Resistance. The Galvanic Heart can then be pulled from the coil as an action."),
    attack("Stitched Fist", "<em>Melee Attack Roll:</em> +13, reach 10 ft. <em>Hit:</em> 37 (4d12 + 11) Bludgeoning damage.", { hit: 13, dice: "4d12", bonus: 11, dtype: "bludgeoning", reach: 10 }),
    save("Lightning Embrace (Recharge 5–6)", "The Bride seizes one creature within 10 feet. It makes a DC 19 Constitution saving throw. <em>Failure:</em> 74 (8d12 + 22) Lightning damage, and the target has the Grappled condition (escape DC 19). <em>Success:</em> Half damage only.", { ability: "con", dc: 19, dice: "8d12", bonus: 22, dtype: "lightning", rech: 5 }),
    save("Bridal Leap (Recharge 6)", "The Bride leaps up to 40 feet and lands with a crash of lightning. Each creature within 10 feet of where she lands makes a DC 19 Dexterity saving throw. <em>Failure:</em> 74 (8d12 + 22) Bludgeoning damage and the Prone condition. <em>Success:</em> Half damage only.", { ability: "dex", dc: 19, dice: "8d12", bonus: 22, dtype: "bludgeoning", rech: 6, tmpl: { type: "circle", size: "10", units: "ft" } }),
    save("Response: Grasping Grief", "One creature within 10 feet makes a DC 19 Strength saving throw. <em>Failure:</em> 18 (2d8 + 9) Bludgeoning damage, and the target is pulled up to 10 feet toward the Bride.", { ability: "str", dc: 19, dice: "2d8", bonus: 9, dtype: "bludgeoning", onSave: "none", activation: "special" }),
    save("Response: Static Shriek", "One creature within 30 feet makes a DC 19 Constitution saving throw. <em>Failure:</em> 18 (2d8 + 9) Thunder damage, and the target has the Deafened condition until the end of its next turn.", { ability: "con", dc: 19, dice: "2d8", bonus: 9, dtype: "thunder", onSave: "none", activation: "special" })
  ] }));

const exists = async p => p && (await fetch("/" + p, { method: "HEAD" })).ok;
const d = M.find(m => m.flags[MOD].slug === "patchwork-horror");
for (const it of d.items) if (!(await exists(it.img))) it.img = "icons/svg/skull.svg";
const a = game.actors.find(x => x.getFlag(MOD, "slug") === "patchwork-horror" && x.getFlag(MOD, "adventure") === CODE);
await a.deleteEmbeddedDocuments("Item", a.items.map(i => i.id));
await a.update({ system: d.system, prototypeToken: d.prototypeToken });
await a.createEmbeddedDocuments("Item", d.items);
const srv = game.actors.find(x => x.getFlag(MOD, "slug") === "galvanic-servant" && x.getFlag(MOD, "adventure") === CODE);
const scene = game.scenes.find(s => s.getFlag(MOD, "adventure") === CODE && s.getFlag(MOD, "role") === "dungeon-scene");
const old = scene.tokens.filter(t => t.actorId === a.id);
const r13 = old.filter(t => t.getFlag(MOD, "room") === 13).map(t => ({ x: t.x + 70, y: t.y + 70 }));
await scene.deleteEmbeddedDocuments("Token", old.map(t => t.id));
const nt = [(await a.getTokenDocument({ x: 5390, y: 5390, hidden: true, flags: { [MOD]: { room: 10 } } })).toObject()];
for (const p of r13) nt.push((await srv.getTokenDocument({ x: p.x, y: p.y, hidden: true, flags: { [MOD]: { room: 13 } } })).toObject());
await scene.createEmbeddedDocuments("Token", nt);
const NOTES = {"10": "<p>Varnholt keeps the bodies from the Grausbach churchyard here until he needs them. The toe tags give the names of the village dead. The largest shape, under a sheet the size of a sail, is the finished Patchwork Horror.</p><h3>Encounter (Power Level 9, Epic Boss, Durability 13.5)</h3><p>One <strong>Patchwork Horror</strong>, an Epic Boss sewn from many of the village dead, lies under the great sheet. It rises when a creature reaches the middle of the room and fights until destroyed. It acts on initiative count 10 and takes one Response after each character's turn. When Bloodied its seams split and grasping parts reach out around it; when it drops to 0 Hit Points it comes apart, as its stat block describes.</p><p><strong>Treasure:</strong> a <strong>Potion of Healing</strong> on the cart among the saws.</p><p><strong>Exits:</strong> Burned Gallery (8, door), Operating Theatre (13, door). The door in the middle of the east side opens into the Burned Gallery. The door in the south side, west of the middle, opens into the Operating Theatre.</p>", "13": "<p>Varnholt built his Patchwork Horror here. The lamp gives bright white light around the table. The brain is that of the old village doctor of Grausbach, Varnholt's teacher, who now assists him.</p><h3>Encounter (Power Level 11, Durability 18)</h3><p>One <strong>Brain in a Jar</strong> and three <strong>Galvanic Servants</strong>. The Servants stand along the walls and spread out so their lightning crosses the room; the Brain stays behind the operating table and throws trays and tools with its mind. They fight until destroyed.</p><p><strong>Treasure:</strong> a <strong>Potion of Healing</strong> on a tray of tools, and a pair of <strong>Eyes of Minute Seeing</strong> (Varnholt's surgical lenses) on the lamp stand.</p><p><strong>Exits:</strong> Morgue (10, door), Lady Varnholt's Chamber (14, barred iron door), Holding Cells (15, stairs). The door in the middle of the north side opens into the Morgue. The barred iron door near the north end of the east side opens into Lady Varnholt's Chamber; see room 14 for its brass knob. Stairs near the north end of the west side lead down to the Holding Cells.</p>"};
const actors = Object.fromEntries(game.actors.filter(x => x.getFlag(MOD, "adventure") === CODE).map(x => [x.name, x]));
const items = game.items.filter(i => i.getFlag(MOD, "adventure") === CODE);
const link = (html, room) => {
  for (const [n, x] of Object.entries(actors)) html = html.replaceAll(`<strong>${n}</strong>`, `@UUID[Actor.${x.id}]{${n}}`).replaceAll(`<strong>${n}s</strong>`, `@UUID[Actor.${x.id}]{${n}s}`);
  for (const i of [...items.filter(i => i.getFlag(MOD, "room") === room), ...items.filter(i => i.getFlag(MOD, "story"))]) html = html.replace(`<strong>${i.name}</strong>`, `@UUID[Item.${i.id}]{${i.name}}`);
  return html;
};
const out = [];
for (const [k, v] of Object.entries(NOTES)) {
  const j = game.journal.find(e => e.getFlag(MOD, "adventure") === CODE && e.getFlag(MOD, "room") === Number(k));
  const pg = j.pages.contents[0]; const t = pg.text.content;
  const i0 = t.indexOf("<h2>DM Notes</h2>") + 17, i1 = t.indexOf("<hr><p>Back to");
  await pg.update({ "text.content": t.slice(0, i0) + link(v, Number(k)) + t.slice(i1) });
  out.push(j.name);
}
`HP ${a.system.attributes.hp.max} items ${a.items.size} size ${a.system.traits.size}; tokens ${scene.tokens.filter(t => t.actorId === a.id).length} horror, ${scene.tokens.filter(t => t.actorId === srv.id).length} servants; journals ${out.join(", ")}`;
