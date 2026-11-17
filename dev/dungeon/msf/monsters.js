// Builds the 5LH8-1 Mystery Sepulcher of the Fallen King monsters (run in the Foundry console as GM).
// Numbers come from BTLT Monster Design rows 75-81 (HP, AC, hit, standard damage, alpha damage), with role-based
// Hit Pct / Dmg Pct dials. Each creature has its own role and mechanic.
const MOD = "faight-beyond-the-last-torch", CODE = "5LH8-1", NAME = "5LH8-1: Mystery Sepulcher of the Fallen King";
const ART = `modules/${MOD}/assets/tokens/mystery-sepulcher-of-the-fallen-king`;
let folder = game.folders.find(f => f.type === "Actor" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Actor" });
const T = "icons/skills/targeting/crosshair-arrowhead-blue.webp";
const ICONS = {
  "Init 10 (Epic Boss)": "icons/svg/clockwork.svg",
  "Epic Boss Resistance": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "Response": "icons/magic/control/energy-stream-link-white.webp",
  "Response: Movement": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Disposition: Defender": T, "Disposition: Swarm": T, "Disposition: Artillery": T, "Disposition: Duelist": T, "Disposition: Ambusher": T, "Disposition: Commander": T, "Disposition: Tyrant": T,
  "Shield Wall": "icons/equipment/shield/heater-steel-worn.webp", "Spear": "icons/weapons/polearms/spear-flared-steel.webp",
  "Shield Rush": "icons/equipment/shield/heater-steel-worn.webp", "Intercept": "icons/magic/defensive/shield-barrier-blue.webp",
  "Swarm": "icons/creatures/invertebrates/scorpion-yellow.webp", "Blood in the Water": "icons/skills/wounds/blood-drip-droplet-red.webp",
  "Split the Tide": "icons/creatures/invertebrates/scorpion-yellow.webp", "Pincers": "icons/creatures/invertebrates/scorpion-yellow.webp", "Strip the Bone": "icons/commodities/bones/bone-broken-grey-red.webp",
  "Phalanx Spotter": "icons/skills/targeting/target-strike-triple-blue.webp", "Fire Bolt": "icons/magic/fire/projectile-fireball-orange.webp",
  "Devastation Orb": "icons/magic/fire/explosion-fireball-large-orange.webp", "Arcane Step": "icons/magic/movement/portal-vortex-orange.webp",
  "Oath of Challenge": "icons/skills/melee/swords-parry-block-blue.webp", "Undying Oath": "icons/magic/death/undead-skeleton-rags-fire-green.webp",
  "Grave Blade": "icons/weapons/swords/sword-guard-worn-brown.webp", "Life Drain": "icons/magic/unholy/hand-claw-glow-orange.webp", "Parry": "icons/skills/melee/swords-parry-block-blue.webp",
  "Incorporeal Movement": "icons/magic/control/silhouette-hold-change-blue.webp", "Light-Shy": "icons/magic/light/explosion-star-glow-silhouette.webp",
  "Last Whisper": "icons/magic/control/fear-fright-shadow-monster-purple.webp", "Chill Touch": "icons/magic/unholy/hand-claw-fire-blue.webp",
  "Steal the Shadow": "icons/magic/unholy/silhouette-evil-horned-giant.webp", "Shadow Stealth": "icons/magic/perception/shadow-stealth-eyes-purple.webp",
  "Melt into Stone": "icons/magic/earth/barrier-stone-explosion-debris.webp",
  "Martial Advantage": "icons/skills/melee/strike-axe-blood-red.webp", "War Axe": "icons/weapons/axes/axe-battle-black.webp",
  "Executioner's Cleave": "icons/skills/melee/strike-axe-blood-red.webp", "Command": "icons/skills/social/intimidation-impressing.webp",
  "Hold the Line!": "icons/environment/people/charge.webp", "Response: Shield Slam": "icons/equipment/shield/heater-steel-worn.webp",
  "The Four Urns": "icons/containers/kitchenware/vase-clay-brown-large.webp", "Drowned Body": "icons/magic/water/water-drop-swirl-blue.webp",
  "Trident of the Deep": "icons/weapons/polearms/trident-silver-blue.webp", "Drowning Decree": "icons/magic/water/wave-water-blue.webp",
  "Kneel Before Me": "icons/magic/control/fear-fright-monster-grin-red-orange.webp", "Response: Undertow": "icons/magic/water/vortex-water-whirlpool.webp",
  "Response: Royal Contempt": "icons/magic/control/fear-fright-white.webp"
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
// ---- Hobgoblin Shieldbearer (defender; PL 8, Dur 4, Hit 45, Dmg 20): HP 143, AC 16, hit +8, std 16, alpha 32 ----
M.push(npc({ name: "Hobgoblin Shieldbearer", slug: "hobgoblin-shieldbearer", size: "med", type: "humanoid", cr: 8, ac: 16, hp: 143, speed: 30,
  abil: { str: 18, dex: 12, con: 16, int: 10, wis: 12, cha: 10 }, senses: { darkvision: 60 }, langs: "Common, Goblin", skills: { ath: { value: 1 } },
  bio: P("A legionary of Warlord Vrask Ironjaw's warband in scaled iron armour, behind a tall red-painted tower shield. Shieldbearers fight in pairs and never step out of the line.") + ROW(75, 8, 4, 45, 20, "defender"),
  items: [
    feat("Disposition: Defender", "The shieldbearer keeps its shield locked beside another hobgoblin and steps in front of whichever comrade is hurt worst."),
    feat("Shield Wall", "While the shieldbearer is within 5 feet of another hobgoblin, it and that hobgoblin have Half Cover (+2 AC) against ranged attacks."),
    attack("Spear", "<em>Melee or Ranged Attack Roll:</em> +8, reach 10 ft or range 20/60 ft. <em>Hit:</em> 16 (2d8 + 7) Piercing damage.", { hit: 8, dice: "2d8", bonus: 7, dtype: "piercing", reach: 10, wtype: "simpleM" }),
    attack("Shield Rush (Recharge 5–6)", "The shieldbearer moves up to 20 feet in a straight line and slams its shield into a creature at the end of that move. <em>Melee Attack Roll:</em> +8, reach 5 ft. <em>Hit:</em> 32 (4d8 + 14) Bludgeoning damage, the target is pushed 10 feet away and has the Prone condition.", { hit: 8, dice: "4d8", bonus: 14, dtype: "bludgeoning", rech: 5 }),
    feat("Intercept", "When another hobgoblin within 5 feet of the shieldbearer is hit by an attack, the shieldbearer becomes the target instead and takes the damage. If the attacker is within 10 feet, the shieldbearer then jabs it for 8 (1d8 + 4) Piercing damage.", "reaction")
  ] }));
// ---- Gravecrawler Swarm (swarm; PL 9, Dur 4.5, Hit 60, Dmg 15): HP 180, AC 18, hit +11, std 13, alpha 26 ----
M.push(npc({ name: "Gravecrawler Swarm", slug: "gravecrawler-swarm", size: "med", type: "beast", cr: 9, ac: 18, hp: 180, speed: 30, climb: 30, swim: 30,
  abil: { str: 10, dex: 16, con: 14, int: 1, wis: 10, cha: 2 }, dr: ["bludgeoning", "piercing", "slashing"],
  ci: ["charmed", "frightened", "grappled", "paralyzed", "petrified", "prone", "restrained", "stunned"], senses: { blindsight: 30 },
  bio: P("Hundreds of pale carrion crabs with barnacled shells that crawl up from the sea caves to feed on the dead of the sepulcher. The hobgoblins' fighting has stirred them up, and they follow the smell of fresh blood.") + ROW(76, 9, 4.5, 60, 15, "swarm"),
  items: [
    feat("Disposition: Swarm", "The crabs pour toward the creature with the fewest Hit Points that they can smell, and stay on it until it stops moving."),
    feat("Swarm", "The swarm can occupy another creature's space and vice versa, and it can move through any opening large enough for a Tiny creature. It can't regain Hit Points or gain Temporary Hit Points."),
    feat("Blood in the Water", "The swarm has Advantage on attack rolls against a creature that is Bloodied."),
    feat("Split the Tide", "The first time the swarm is Bloodied, it splits into two swarms, each with half its current Hit Points; the new swarm appears in an unoccupied space within 5 feet and acts on the same initiative."),
    attack("Pincers", "<em>Melee Attack Roll:</em> +11, reach 0 ft (a creature in the swarm's space). <em>Hit:</em> 13 (2d6 + 6) Slashing damage.", { hit: 11, dice: "2d6", bonus: 6, dtype: "slashing", reach: 0 }),
    attack("Strip the Bone (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 0 ft (a creature in the swarm's space). <em>Hit:</em> 26 (4d6 + 12) Slashing damage, and crabs cling to the target: its Speed is halved until the end of its next turn.", { hit: 11, dice: "4d6", bonus: 12, dtype: "slashing", reach: 0, rech: 5 })
  ] }));
// ---- Hobgoblin Devastator (artillery; PL 9, Dur 6, Hit 55, Dmg 25): HP 240, AC 19, hit +10, std 21, alpha 42 ----
M.push(npc({ name: "Hobgoblin Devastator", slug: "hobgoblin-devastator", size: "med", type: "humanoid", cr: 9, ac: 19, hp: 240, speed: 30,
  abil: { str: 12, dex: 14, con: 16, int: 18, wis: 12, cha: 12 }, senses: { darkvision: 60 }, langs: "Common, Goblin", skills: { arc: { value: 1 } },
  bio: P("A battle-mage of Vrask's warband in a red war-robe over chain mail, carrying a staff topped with a burning orb. Devastators fight from behind the shield line and burn whatever the shieldbearers hold in place.") + ROW(77, 9, 6, 55, 25, "artillery"),
  items: [
    feat("Disposition: Artillery", "The devastator stays 30 feet or more behind the shield line and burns whoever the shieldbearers are holding."),
    feat("Phalanx Spotter", "The devastator has Advantage on attack rolls against a creature within 5 feet of a Hobgoblin Shieldbearer or Warlord Vrask Ironjaw."),
    attack("Fire Bolt", "<em>Ranged Attack Roll:</em> +10, range 120 ft. <em>Hit:</em> 21 (4d6 + 7) Fire damage.", { hit: 10, dice: "4d6", bonus: 7, dtype: "fire", range: "ranged", rng: [120, 120] }),
    save("Devastation Orb (Recharge 5–6)", "The devastator hurls the orb from its staff to a point within 120 feet, where it bursts in a 20-foot-radius Sphere. Each creature in the Sphere makes a DC 14 Dexterity saving throw. <em>Failure:</em> 42 (8d6 + 14) Fire damage, and the creature has the Prone condition. <em>Success:</em> Half damage only.", { ability: "dex", dc: 14, dice: "8d6", bonus: 14, dtype: "fire", rech: 5, tmpl: { type: "sphere", size: "20", units: "ft" } }),
    feat("Arcane Step", "The devastator teleports up to 20 feet to an unoccupied space it can see.", "bonus")
  ] }));
// ---- Barrow Wight (duelist; PL 10, Dur 6, Hit 60, Dmg 30): HP 270, AC 20, hit +12, std 27, alpha 54 ----
M.push(npc({ name: "Barrow Wight", slug: "barrow-wight", size: "med", type: "undead", cr: 10, ac: 20, hp: 270, speed: 30,
  abil: { str: 18, dex: 16, con: 18, int: 12, wis: 14, cha: 16 }, dr: ["necrotic"], di: ["poison"], ci: ["exhaustion", "poisoned"], senses: { darkvision: 60 }, langs: "Common (an old island dialect)",
  bio: P("A knight of the Fallen King's honour guard, the Fallen Legion, in corroded bronze scale armour and a tattered sea-green cloak. Bound by the oath the King broke, the wights still guard his tomb and fight with the formal courtesy of a duel.") + ROW(78, 10, 6, 60, 30, "duelist"),
  items: [
    feat("Disposition: Duelist", "The wight salutes one foe, fights that foe alone and ignores the rest until its challenger falls."),
    feat("Oath of Challenge", "When the wight hits a creature, that creature is its challenger until the wight challenges another. Its challenger has Disadvantage on attack rolls against targets other than the wight."),
    feat("Undying Oath", "The first time the wight drops to 0 Hit Points, it drops to 1 Hit Point instead, unless the damage was Radiant or the attacker wears the Fallen King's Signet."),
    attack("Grave Blade", "<em>Melee Attack Roll:</em> +12, reach 5 ft. <em>Hit:</em> 27 (4d8 + 9) Slashing damage.", { hit: 12, dice: "4d8", bonus: 9, dtype: "slashing", wtype: "martialM" }),
    attack("Life Drain (Recharge 5–6)", "<em>Melee Attack Roll:</em> +12, reach 5 ft. <em>Hit:</em> 54 (8d8 + 18) Necrotic damage, and the target can't regain Hit Points until the start of the wight's next turn.", { hit: 12, dice: "8d8", bonus: 18, dtype: "necrotic", rech: 5 }),
    feat("Parry", "The wight adds 4 to its AC against one melee attack that would hit it. If the attack then misses, the wight ripostes for 13 (2d8 + 4) Slashing damage against the attacker.", "reaction")
  ] }));
// ---- Court Shade (ambusher; PL 11, Dur 6, Hit 55, Dmg 30): HP 300, AC 20, hit +11, std 29, alpha 58 ----
M.push(npc({ name: "Court Shade", slug: "court-shade", size: "med", type: "undead", cr: 11, ac: 20, hp: 300, speed: 0, fly: 40,
  abil: { str: 6, dex: 18, con: 14, int: 14, wis: 14, cha: 16 }, dr: ["acid", "bludgeoning", "cold", "fire", "lightning", "piercing", "slashing", "thunder"], di: ["necrotic", "poison"], dv: ["radiant"],
  ci: ["charmed", "exhaustion", "frightened", "grappled", "paralyzed", "petrified", "poisoned", "prone", "restrained"], senses: { darkvision: 120 }, langs: "understands Common but speaks only in whispers",
  bio: P("The lingering shadow of one of the Fallen King's courtiers, who knew the truth painted on the ceiling and said nothing. The shades sleep in the walls of the fresco chamber and rise when someone looks up at the truth.") + ROW(79, 11, 6, 55, 30, "ambusher"),
  items: [
    feat("Disposition: Ambusher", "The shade sinks into the walls and rises behind spellcasters and anyone standing alone."),
    feat("Incorporeal Movement", "The shade can move through other creatures and objects as if they were Difficult Terrain. It takes 5 (1d10) Force damage if it ends its turn inside an object."),
    feat("Light-Shy", "While in Bright Light, the shade has Disadvantage on attack rolls."),
    feat("Last Whisper", "When the shade drops to 0 Hit Points, it whispers a courtier's secret. Each creature within 10 feet makes a DC 17 Wisdom saving throw, taking 14 (2d8 + 5) Psychic damage on a failure."),
    attack("Chill Touch", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 29 (4d8 + 11) Necrotic damage.", { hit: 11, dice: "4d8", bonus: 11, dtype: "necrotic" }),
    attack("Steal the Shadow (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 5 ft, with Advantage if the shade was hidden. <em>Hit:</em> 58 (8d8 + 22) Necrotic damage, and the shade tears away the target's shadow: the target has the Blinded condition until the end of its next turn.", { hit: 11, dice: "8d8", bonus: 22, dtype: "necrotic", rech: 5 }),
    feat("Shadow Stealth", "While in Dim Light or Darkness, the shade takes the Hide action.", "bonus"),
    feat("Melt into Stone", "When the shade is hit by an attack while it is within 5 feet of a wall, it halves the damage and sinks into the wall, moving up to 10 feet inside it.", "reaction")
  ] }));
// ---- Warlord Vrask Ironjaw (commander, Epic; PL 11, Dur 8, Hit 55, Dmg 25): HP 400, AC 20, hit +11, std 25, alpha 50 ----
M.push(npc({ name: "Warlord Vrask Ironjaw", slug: "warlord-vrask", size: "med", type: "humanoid", cr: 11, ac: 20, hp: 400, speed: 30,
  abil: { str: 20, dex: 12, con: 18, int: 14, wis: 14, cha: 16 }, senses: { darkvision: 60 }, langs: "Common, Goblin", skills: { ath: { value: 2 }, itm: { value: 1 } },
  bio: P("The scarred warlord who brought his warband across the sea for the sepulcher's magic. An iron plate replaces the jaw a sea-king's sailor once broke. He has looted every room he can reach and now wants the huge bronze door open.") + P("<em>BTLT Monster Design row 80: Power Level 11, Durability 8, Hit Pct 55, Dmg Pct 25, Epic Boss commander. Commands the hobgoblins of his war camp.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "Vrask never rolls initiative. On initiative count 10 he rolls for recharges, then moves up to his Speed and takes one action."),
    feat("Epic Boss Resistance", "If Vrask fails a saving throw, he can choose to succeed instead. He has Advantage on saving throws against effects that would remove him from the fight."),
    feat("Response", "After each player character's turn, Vrask takes one Response (one only, not one per enemy). Each Response other than Movement deals 12 (1d12 + 6) damage, half a standard hit, to its target."),
    feat("Response: Movement", "Vrask moves up to half his Speed without provoking Opportunity Attacks.", "special"),
    feat("Disposition: Commander", "Vrask fights from the middle of his camp, sends his hobgoblins at the strongest-looking enemy and respects anyone who can promise him gold."),
    feat("Martial Advantage", "Once per turn, Vrask deals an extra 7 (2d6) damage to a creature he hits with a weapon attack if that creature is within 5 feet of another hobgoblin."),
    attack("War Axe", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 25 (2d12 + 12) Slashing damage.", { hit: 11, dice: "2d12", bonus: 12, dtype: "slashing", wtype: "martialM" }),
    attack("Executioner's Cleave (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 50 (6d12 + 11) Slashing damage, and the target has the Prone condition.", { hit: 11, dice: "6d12", bonus: 11, dtype: "slashing", rech: 5 }),
    feat("Command (Recharge 5–6)", "Each hobgoblin of Vrask's group moves up to its Speed and makes one attack, using none of its own actions.", "action", 5),
    feat("Hold the Line!", "One hobgoblin within 30 feet that can hear Vrask gains 12 Temporary Hit Points.", "bonus"),
    save("Response: Shield Slam", "One creature within 5 feet of Vrask makes a DC 17 Strength saving throw. <em>Failure:</em> 12 (1d12 + 6) Bludgeoning damage, and the target is pushed 10 feet away.", { ability: "str", dc: 17, dice: "1d12", bonus: 6, dtype: "bludgeoning", onSave: "none", activation: "special" })
  ] }));
// ---- The Fallen King (Epic Boss; PL 12, Dur 12, Hit 60, Dmg 35): HP 660, AC 20, hit +13, std 37, alpha 74 ----
M.push(npc({ name: "The Fallen King", slug: "the-fallen-king", size: "lg", type: "undead", cr: 12, ac: 20, hp: 660, speed: 30, swim: 40,
  abil: { str: 22, dex: 12, con: 20, int: 16, wis: 16, cha: 22 }, dr: ["cold", "necrotic"], di: ["poison"], dv: ["radiant"], ci: ["exhaustion", "frightened", "poisoned"], senses: { truesight: 60, darkvision: 120 }, langs: "Common (an old island dialect)",
  bio: P("The drowned sea-king of the island, in rotting royal robes and a tarnished bronze crown, seaweed in his beard and seawater running from him. He broke his oath to his own honour guard and drowned for it; his oath lies sealed in the four bronze funeral urns around his sarcophagus, and while they stand he cannot truly be ended.") + P("<em>BTLT Monster Design row 81: Power Level 12, Durability 12, Hit Pct 60, Dmg Pct 35, Epic Boss. Fights with one Barrow Wight.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The King never rolls initiative. On initiative count 10 he rolls for recharges, then moves up to his Speed and takes one action: his standard attack or one of his charged actions."),
    feat("Epic Boss Resistance", "While at least one of the four funeral urns stands, if the King fails a saving throw, he can choose to succeed instead. He has Advantage on saving throws against effects that would remove him from the fight."),
    feat("Response", "After each player character's turn, the King takes one Response (one only, not one per enemy). Each Response other than Movement deals 18 (2d8 + 9) damage, half a standard hit, to its target."),
    feat("Response: Movement", "The King moves up to half his Speed without provoking Opportunity Attacks.", "special"),
    feat("Disposition: Tyrant", "The King stays beside his sarcophagus, punishes anyone who lays a hand on his urns, and demands that the living kneel."),
    feat("The Four Urns", "Four bronze funeral urns stand around the sarcophagus. Each urn has AC 15 and 25 Hit Points (immune to Poison and Psychic damage); or a creature within 5 feet can take an action to topple and smash one (DC 16 Strength (Athletics)); or pour the Flask of Holy Water into one to destroy it outright. Each urn destroyed deals 11 (2d10) Radiant damage to the King. When the fourth urn is destroyed, he loses his Epic Boss Resistance."),
    feat("Drowned Body", "The King doesn't need to breathe. Seawater runs from him; the ground within 10 feet of him is Difficult Terrain for creatures other than the King."),
    attack("Trident of the Deep", "<em>Melee Attack Roll:</em> +13, reach 10 ft. <em>Hit:</em> 37 (4d12 + 11) Piercing damage.", { hit: 13, dice: "4d12", bonus: 11, dtype: "piercing", reach: 10, wtype: "martialM" }),
    save("Drowning Decree (Recharge 5–6)", "The King speaks a royal decree. Each creature of his choice within 30 feet that can hear him makes a DC 19 Constitution saving throw. <em>Failure:</em> 74 (8d12 + 22) Cold damage, and its lungs fill with seawater: until the end of its next turn it can't speak or cast spells with a Verbal component. <em>Success:</em> Half damage only.", { ability: "con", dc: 19, dice: "8d12", bonus: 22, dtype: "cold", rech: 5, tmpl: { type: "sphere", size: "30", units: "ft" } }),
    save("Kneel Before Me (Recharge 6)", "One creature within 60 feet that can see the King makes a DC 19 Wisdom saving throw. <em>Failure:</em> 74 (8d12 + 22) Psychic damage, and the target has the Prone condition and a Speed of 0 until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "wis", dc: 19, dice: "8d12", bonus: 22, dtype: "psychic", rech: 6 }),
    save("Response: Undertow", "One creature within 15 feet makes a DC 19 Strength saving throw. <em>Failure:</em> 18 (2d8 + 9) Cold damage, and the target is pulled up to 10 feet toward the King.", { ability: "str", dc: 19, dice: "2d8", bonus: 9, dtype: "cold", onSave: "none", activation: "special" }),
    save("Response: Royal Contempt", "One creature within 60 feet that damaged or touched an urn since the King's last turn makes a DC 19 Charisma saving throw. <em>Failure:</em> 18 (2d8 + 9) Psychic damage, and the target is pushed 15 feet away from the urns.", { ability: "cha", dc: 19, dice: "2d8", bonus: 9, dtype: "psychic", onSave: "none", activation: "special" })
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
