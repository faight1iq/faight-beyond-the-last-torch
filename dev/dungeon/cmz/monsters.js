// Builds the 5LES-1 The Hollow King's Maze monsters (run in the Foundry console as GM).
// Numbers come from BTLT Monster Design rows 42-47 (HP, AC, hit, standard damage, alpha damage), with role-based
// Hit Pct / Dmg Pct dials. Each creature has its own role and mechanic (next-version notes, monster variety).
const MOD = "faight-beyond-the-last-torch", CODE = "5LES-1", NAME = "5LES-1: The Hollow King's Maze";
const ART = `modules/${MOD}/assets/tokens/the-hollow-kings-maze`;
let folder = game.folders.find(f => f.type === "Actor" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Actor" });
const ICONS = {
  "Disposition: Swarmer": "icons/skills/targeting/crosshair-arrowhead-blue.webp",
  "Disposition: Ambusher": "icons/skills/targeting/crosshair-arrowhead-blue.webp",
  "Disposition: Artillery": "icons/skills/targeting/crosshair-arrowhead-blue.webp",
  "Disposition: Controller": "icons/skills/targeting/crosshair-arrowhead-blue.webp",
  "Disposition: Commander": "icons/skills/targeting/crosshair-arrowhead-blue.webp",
  "Disposition: Tyrant": "icons/skills/targeting/crosshair-arrowhead-blue.webp",
  "Swarm": "icons/creatures/birds/corvid-call-sound-blue.webp",
  "Murder of Crows": "icons/creatures/birds/corvid-watchful-glowing-green.webp",
  "Thinning Flock": "icons/creatures/birds/corvid-call-sound-glowing.webp",
  "False Appearance": "icons/magic/control/fear-fright-mask-orange.webp",
  "Ambush Recharge": "icons/magic/control/fear-fright-mask-yellow.webp",
  "Go Still": "icons/magic/control/fear-fright-mask-orange.webp",
  "Slip Into the Rows": "icons/magic/nature/barrier-shield-wood-vines.webp",
  "Gutter Out": "icons/creatures/magical/spirit-fire-orange.webp",
  "Bob Away": "icons/creatures/magical/spirit-fire-yellow.webp",
  "Grasping Stalks": "icons/magic/nature/barrier-shield-wood-vines.webp",
  "Shed Husks": "icons/magic/nature/elemental-plant-humanoid.webp",
  "Sheaf Wall": "icons/magic/nature/leaf-armor-scale-worn-green.webp",
  "Bound Effigies": "icons/magic/control/fear-fright-shadow-monster-green.webp",
  "Response: Withering Hex": "icons/magic/perception/eye-ringed-green.webp",
  "The Harvest Ember": "icons/magic/control/fear-fright-jackolanter-orange.webp",
  "Mounted": "icons/environment/creatures/horse-brown.webp",
  "Response: Headsman's Swing": "icons/weapons/sickles/scythe-wrapped-worn-red.webp",
  "Response: Hellfire Gaze": "icons/magic/perception/eye-slit-orange.webp",
  "Init 10 (Epic Boss)": "icons/svg/clockwork.svg",
  "Epic Boss Resistance": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "Response": "icons/magic/control/energy-stream-link-white.webp",
  "Response: Movement": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Multiattack": "icons/skills/targeting/target-strike-triple-blue.webp",
  "Peck": "icons/creatures/birds/corvid-flying-wings-purple.webp",
  "Eye-Picker": "icons/creatures/birds/corvid-flying-wings-purple.webp",
  "Rusted Sickle": "icons/weapons/sickles/sickle-curved.webp",
  "Reaping Sickle": "icons/weapons/sickles/sickle-curved.webp",
  "Seed Spit": "icons/magic/fire/projectile-fireball-orange.webp",
  "Pumpkin Bomb": "icons/magic/fire/explosion-fireball-large-orange.webp",
  "Husk Lash": "icons/magic/nature/root-vine-entangle-foot-green.webp",
  "Bale and Bind": "icons/magic/nature/root-vine-entwined-thorns.webp",
  "Sickle": "icons/weapons/sickles/sickle-curved.webp",
  "Rotting Curse": "icons/magic/unholy/projectile-bolts-salvo-pink.webp",
  "Reap What Was Sown": "icons/magic/death/hand-undead-skeleton-fire-green.webp",
  "Command the Effigies": "icons/skills/social/intimidation-impressing.webp",
  "Great Scythe": "icons/weapons/sickles/scythe-curved-steel.webp",
  "Ride Down": "icons/environment/creatures/horse-brown.webp",
  "Hurl the Head": "icons/magic/death/projectile-skull-fire-orange.webp"
};
const FALLBACK = ["icons/magic/fire/flame-burning-skull-orange.webp", "icons/svg/fire.svg", "icons/svg/skull.svg"];
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
// ---- Murder Crow Swarm (swarm; PL 8, Dur 3, Hit 60, Dmg 15): HP 107, AC 15, hit +11, std 12, alpha 24 ----
M.push(npc({ name: "Murder Crow Swarm", slug: "murder-crow-swarm", size: "med", type: "beast", cr: 8, ac: 15, hp: 107, speed: 10, fly: 50,
  abil: { str: 6, dex: 16, con: 12, int: 4, wis: 14, cha: 6 }, dr: ["bludgeoning", "piercing", "slashing"], ci: ["charmed", "frightened", "grappled", "paralyzed", "petrified", "prone", "restrained", "stunned"], senses: { darkvision: 60 },
  bio: P("A screaming cloud of black crows with ember-orange eyes. The crows serve the scarecrows of the maze and pick over the dead of the festival.") + P("<em>BTLT Monster Design row 42: Power Level 8, Durability 3, Hit Pct 60, Dmg Pct 15. Role: swarm.</em>"),
  items: [
    feat("Disposition: Swarmer", "The swarms dive at whoever is bleeding or alone, and scatter upward when fire or area damage hits them."),
    feat("Swarm", "The swarm can occupy another creature's space and vice versa, and can move through any opening large enough for a crow. It can't regain Hit Points or gain Temporary Hit Points."),
    feat("Murder of Crows", "A creature that starts its turn in the space of two or more swarms has Disadvantage on attack rolls until the start of its next turn."),
    feat("Thinning Flock", "While the swarm is Bloodied, its Peck deals half damage."),
    attack("Peck", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 12 (2d6 + 5) Piercing damage.", { hit: 11, dice: "2d6", bonus: 5, dtype: "piercing" }),
    attack("Eye-Picker (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 5 ft., one creature in the swarm's space. <em>Hit:</em> 24 (4d8 + 6) Piercing damage, and the target has the Blinded condition until the end of its next turn.", { hit: 11, dice: "4d8", bonus: 6, dtype: "piercing", rech: 5 })
  ] }));
// ---- Scarecrow Stalker (ambusher; PL 9, Dur 4.5, Hit 55, Dmg 30): HP 180, AC 18, hit +10, std 25, alpha 50 ----
M.push(npc({ name: "Scarecrow Stalker", slug: "scarecrow-stalker", size: "med", type: "construct", cr: 9, ac: 18, hp: 180, speed: 30,
  abil: { str: 16, dex: 18, con: 14, int: 6, wis: 14, cha: 8 }, dv: ["fire"], di: ["poison", "psychic"], ci: ["charmed", "exhaustion", "frightened", "poisoned"], senses: { darkvision: 60 }, skills: { ste: { value: 2 } },
  bio: P("A scarecrow that walks. It stands on its pole among ordinary scarecrows, burlap face slack, until prey comes close; then it steps down with a rusted sickle.") + P("<em>BTLT Monster Design row 43: Power Level 9, Durability 4.5, Hit Pct 55, Dmg Pct 30. Role: ambusher.</em>"),
  items: [
    feat("Disposition: Ambusher", "The stalker waits until a creature passes it, strikes the one at the back, then slips into the corn and comes out somewhere else."),
    feat("False Appearance", "While the stalker is motionless, it is indistinguishable from an ordinary scarecrow (DC 18 Wisdom (Perception) within 10 feet to notice the fresh mud on its feet)."),
    feat("Ambush Recharge", "If the stalker starts its turn unseen by every enemy, its Reaping Sickle recharges."),
    attack("Rusted Sickle", "<em>Melee Attack Roll:</em> +10, reach 5 ft. <em>Hit:</em> 25 (2d12 + 12) Slashing damage.", { hit: 10, dice: "2d12", bonus: 12, dtype: "slashing", wtype: "simpleM" }),
    attack("Reaping Sickle (Recharge 5–6)", "<em>Melee Attack Roll:</em> +10, reach 5 ft. <em>Hit:</em> 50 (6d12 + 11) Slashing damage. If the target hadn't seen the stalker move this combat, the attack has Advantage.", { hit: 10, dice: "6d12", bonus: 11, dtype: "slashing", rech: 5 }),
    feat("Slip Into the Rows", "<em>Bonus Action.</em> The stalker moves up to 30 feet through the corn rows (it treats corn as Difficult Terrain instead of a wall) and can take the Hide action. The GM moves its token through the corn.", "bonus"),
    feat("Go Still", "<em>Reaction.</em> When the stalker is targeted by an attack and hasn't moved this turn, it freezes; the attack has Disadvantage.", "reaction")
  ] }));
// ---- Lantern Gourdling (artillery; PL 10, Dur 4, Hit 55, Dmg 25): HP 180, AC 18, hit +11, std 23, alpha 46 ----
M.push(npc({ name: "Lantern Gourdling", slug: "lantern-gourdling", size: "sm", type: "plant", cr: 10, ac: 18, hp: 180, speed: 0, fly: 30,
  abil: { str: 6, dex: 18, con: 16, int: 8, wis: 12, cha: 14 }, di: ["fire"], dv: ["cold"], ci: ["blinded", "prone"], senses: { blindsight: 60 },
  bio: P("A small carved jack-o'-lantern spirit that floats on a tail of vines and smoke. The gourdlings woke from sparks of the stolen Harvest Ember and spit burning seeds.") + P("<em>BTLT Monster Design row 44: Power Level 10, Durability 4, Hit Pct 55, Dmg Pct 25. Role: artillery.</em>"),
  items: [
    feat("Disposition: Artillery", "The gourdlings hang back above the corn line, keep 30 feet from enemies, and bombard whoever is grouped together."),
    feat("Gutter Out", "When the gourdling drops to 0 Hit Points, it bursts. Each creature within 5 feet takes 11 (2d6 + 4) Fire damage."),
    attack("Seed Spit", "<em>Ranged Attack Roll:</em> +11, range 60/120 ft. <em>Hit:</em> 23 (2d10 + 12) Fire damage.", { hit: 11, dice: "2d10", bonus: 12, dtype: "fire", range: "ranged", rng: [60, 120] }),
    save("Pumpkin Bomb (Recharge 5–6)", "The gourdling spits a burning pumpkin at a point within 90 feet. It bursts in a 10-foot-radius Sphere. Each creature there makes a DC 15 Dexterity saving throw. <em>Failure:</em> 46 (6d10 + 13) Fire damage. <em>Success:</em> Half damage. The ground in the Sphere burns until the end of the gourdling's next turn; a creature that enters it or ends its turn there takes 11 (2d6 + 4) Fire damage.", { ability: "dex", dc: 15, dice: "6d10", bonus: 13, dtype: "fire", rech: 5, tmpl: { type: "sphere", size: "10", units: "ft" } }),
    feat("Bob Away", "<em>Bonus Action.</em> The gourdling flies up to 15 feet without provoking Opportunity Attacks.", "bonus")
  ] }));
// ---- Husk Strangler (controller; PL 11, Dur 6, Hit 45, Dmg 20): HP 300, AC 20, hit +9, std 20, alpha 40 ----
M.push(npc({ name: "Husk Strangler", slug: "husk-strangler", size: "lg", type: "plant", cr: 11, ac: 20, hp: 300, speed: 30,
  abil: { str: 22, dex: 10, con: 18, int: 4, wis: 12, cha: 6 }, dr: ["bludgeoning", "piercing"], dv: ["fire"], ci: ["blinded", "deafened", "exhaustion"], senses: { blindsight: 60 },
  bio: P("A hunched mass of dry corn husks and stalks as big as a horse, with a hollow dark face and long husk tendrils. It drags prey into the corn and wraps it like a sheaf.") + P("<em>BTLT Monster Design row 45: Power Level 11, Durability 6, Hit Pct 45, Dmg Pct 20. Role: controller.</em>"),
  items: [
    feat("Disposition: Controller", "The strangler pulls the most dangerous-looking creature away from its friends and holds it, then turns its husks on anyone who comes to help."),
    feat("Grasping Stalks", "The ground within 10 feet of the strangler is Difficult Terrain for its enemies."),
    attack("Husk Lash", "<em>Melee Attack Roll:</em> +9, reach 15 ft. <em>Hit:</em> 20 (2d10 + 9) Bludgeoning damage. If the target is Large or smaller, it has the Grappled condition (escape DC 17), and the strangler pulls it up to 10 feet toward itself. The strangler can grapple two creatures at once.", { hit: 9, dice: "2d10", bonus: 9, dtype: "bludgeoning", reach: 15 }),
    save("Bale and Bind (Recharge 5–6)", "One creature Grappled by the strangler makes a DC 17 Strength saving throw. <em>Failure:</em> 40 (4d10 + 18) Bludgeoning damage, and the target has the Restrained condition while it is Grappled, wrapped in husks. <em>Success:</em> Half damage only.", { ability: "str", dc: 17, dice: "4d10", bonus: 18, dtype: "bludgeoning", rech: 5 }),
    feat("Shed Husks", "The first time the strangler is Bloodied, it sheds its outer husks: every grapple it holds ends, and it moves up to 15 feet without provoking Opportunity Attacks."),
    save("Sheaf Wall", "<em>Reaction.</em> When an ally within 15 feet is hit by an attack, husks whip up between them; the attacker makes a DC 17 Strength saving throw. <em>Failure:</em> 10 (1d8 + 6) Bludgeoning damage, and the hit becomes a miss.", { ability: "str", dc: 17, dice: "1d8", bonus: 6, dtype: "bludgeoning", onSave: "none", activation: "reaction" })
  ] }));
// ---- The Harvest Witch (commander, Epic; PL 11, Dur 8.5, Hit 55, Dmg 25): HP 425, AC 20, hit +11, std 25, alpha 50 ----
M.push(npc({ name: "The Harvest Witch", slug: "the-harvest-witch", size: "med", type: "fey", cr: 11, ac: 20, hp: 425, speed: 30,
  abil: { str: 14, dex: 12, con: 18, int: 16, wis: 18, cha: 20 }, dr: ["necrotic"], ci: ["charmed", "frightened"], senses: { darkvision: 120 }, langs: "Common, Sylvan, Infernal",
  bio: P("Mother Gristle, the hag who gave Jack Hollow his endless harvest and took his head on festival night. She tends the maze from her cauldron, stuffs new scarecrows with straw and the dead, and commands them.") + P("<em>BTLT Monster Design row 46: Power Level 11, Durability 8.5, Hit Pct 55, Dmg Pct 25, Epic Boss commander. Fights with two Scarecrow Stalkers.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Harvest Witch never rolls initiative. On initiative count 10 she rolls for recharges, then moves up to her Speed and takes one action."),
    feat("Epic Boss Resistance", "If the Harvest Witch fails a saving throw, she can choose to succeed instead. She has Advantage on saving throws against effects that would remove her from the fight."),
    feat("Response", "After each player character's turn, the Harvest Witch takes one Response (one only, not one per enemy). Each Response other than Movement deals 12 (1d12 + 6) damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Harvest Witch moves up to half her Speed.", "special"),
    feat("Disposition: Commander", "The witch stays behind her cauldron and her scarecrows, curses whoever hurts her effigies, and flees into the corn to room 14 if she is alone and Bloodied."),
    feat("Bound Effigies", "While the witch lives, a Scarecrow Stalker in her clearing that drops to 0 Hit Points rises again on initiative count 10 with half its Hit Points (once per stalker). Killing her first stops this."),
    attack("Sickle", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 25 (2d12 + 12) Slashing damage.", { hit: 11, dice: "2d12", bonus: 12, dtype: "slashing", wtype: "simpleM" }),
    attack("Rotting Curse", "<em>Ranged Attack Roll:</em> +11, range 60 ft. <em>Hit:</em> 25 (2d12 + 12) Necrotic damage.", { hit: 11, dice: "2d12", bonus: 12, dtype: "necrotic", range: "ranged", rng: [60, 60] }),
    save("Reap What Was Sown (Recharge 5–6)", "One creature the witch can see within 60 feet makes a DC 17 Constitution saving throw. <em>Failure:</em> 50 (6d12 + 11) Necrotic damage, and the target has the Frightened condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "con", dc: 17, dice: "6d12", bonus: 11, dtype: "necrotic", rech: 5 }),
    feat("Command the Effigies (Recharge 5–6)", "Each Scarecrow Stalker of her group moves up to its Speed and makes one Rusted Sickle attack, using none of its own actions.", "action", 5),
    save("Response: Withering Hex", "One creature within 60 feet makes a DC 17 Wisdom saving throw. <em>Failure:</em> 12 (1d12 + 6) Necrotic damage, and the target can't regain Hit Points until the end of its next turn.", { ability: "wis", dc: 17, dice: "1d12", bonus: 6, dtype: "necrotic", onSave: "none", activation: "special" })
  ] }));
// ---- The Hollow King (Epic Boss; PL 12, Dur 10, Hit 60, Dmg 35): HP 550, AC 20, hit +13, std 37, alpha 74 ----
M.push(npc({ name: "The Hollow King", slug: "the-hollow-king", size: "lg", type: "undead", cr: 12, ac: 20, hp: 550, speed: 60,
  abil: { str: 24, dex: 14, con: 22, int: 10, wis: 14, cha: 20 }, dr: ["necrotic", "bludgeoning"], di: ["fire", "poison"], ci: ["blinded", "charmed", "exhaustion", "frightened", "poisoned"], senses: { blindsight: 120 }, langs: "understands Common but can't speak",
  bio: P("Jack Hollow, the farmer who traded his head for an endless harvest. He rides a black nightmare horse with burning hooves, and a carved jack-o'-lantern sits where his head was, lit by the Harvest Ember, the stolen hearth-fire of the festival. He fights with a great scythe and the farm's old Flame Tongue Longsword at his saddle.") + P("<em>BTLT Monster Design row 47: Power Level 12, Durability 10, Hit Pct 60, Dmg Pct 35, Epic Boss. Fights with two Lantern Gourdlings.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Hollow King never rolls initiative. On initiative count 10 he rolls for recharges, then moves up to his Speed and takes one action: his standard attack or one of his charged actions."),
    feat("Epic Boss Resistance", "If the Hollow King fails a saving throw, he can choose to succeed instead. He has Advantage on saving throws against effects that would remove him from the fight."),
    feat("Response", "After each player character's turn, the Hollow King takes one Response (one only, not one per enemy). Each Response other than Movement deals 18 (2d8 + 9) damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Hollow King rides up to half his Speed without provoking Opportunity Attacks.", "special"),
    feat("Disposition: Tyrant", "The King rides down whoever carries the brightest light, then whoever stands between him and the Ember. He never leaves the heart of the maze."),
    feat("The Harvest Ember", "The Ember burns in the King's pumpkin head. A creature within 5 feet of him can use an action to pluck it out (DC 20 Strength (Athletics) or Dexterity (Sleight of Hand)). On a success the creature takes the Ember, and the King takes 22 (4d10) Radiant damage and loses his Epic Boss Resistance."),
    feat("Mounted", "The King and his nightmare horse are one creature. He can't be knocked Prone while mounted; an effect that would knock him Prone instead ends his Movement Response for the round."),
    attack("Great Scythe", "<em>Melee Attack Roll:</em> +13, reach 10 ft. <em>Hit:</em> 37 (4d12 + 11) Slashing damage.", { hit: 13, dice: "4d12", bonus: 11, dtype: "slashing", reach: 10, wtype: "martialM" }),
    save("Ride Down (Recharge 5–6)", "The King charges up to 60 feet in a straight line. Each creature in a 10-foot-wide line along the path makes a DC 19 Dexterity saving throw. <em>Failure:</em> 74 (8d12 + 22) Bludgeoning damage and the Prone condition. <em>Success:</em> Half damage only.", { ability: "dex", dc: 19, dice: "8d12", bonus: 22, dtype: "bludgeoning", rech: 5, tmpl: { type: "line", size: "60", width: "10", units: "ft" } }),
    attack("Hurl the Head (Recharge 6)", "<em>Ranged Attack Roll:</em> +13, range 60 ft. <em>Hit:</em> 74 (8d12 + 22) Fire damage. The blazing head then bounces to a second creature within 15 feet of the target, which takes 37 (4d12 + 11) Fire damage unless it succeeds on a DC 19 Dexterity saving throw, and flies back to the King's shoulders.", { hit: 13, dice: "8d12", bonus: 22, dtype: "fire", range: "ranged", rng: [60, 60], rech: 6 }),
    attack("Response: Headsman's Swing", "<em>Melee Attack Roll:</em> +13, reach 10 ft. <em>Hit:</em> 18 (2d8 + 9) Slashing damage.", { hit: 13, dice: "2d8", bonus: 9, dtype: "slashing", reach: 10, activation: "special" }),
    save("Response: Hellfire Gaze", "One creature within 60 feet that can see the King makes a DC 19 Wisdom saving throw. <em>Failure:</em> 18 (2d8 + 9) Fire damage, and the target has the Frightened condition until the end of its next turn.", { ability: "wis", dc: 19, dice: "2d8", bonus: 9, dtype: "fire", onSave: "none", activation: "special" })
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
