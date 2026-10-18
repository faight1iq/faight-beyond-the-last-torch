// Builds the 5LEI-2 Halls of the Void Savant monsters (paste into the Foundry console as GM).
// Numbers come from BTLT Monster Design rows 18-23 (HP, AC, hit, standard damage, alpha damage).
const MOD = "faight-beyond-the-last-torch", CODE = "5LEI-2", NAME = "5LEI-2: Halls of the Void Savant";
const ART = `modules/${MOD}/assets/tokens/halls-of-the-void-savant`;
let folder = game.folders.find(f => f.type === "Actor" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Actor" });
const ICONS = {
  "Init 10 (Epic Boss)": "icons/svg/clockwork.svg",
  "Epic Boss Resistance": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "Response: Movement": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Multiattack": "icons/skills/targeting/target-strike-triple-blue.webp",
  "Sting": "icons/creatures/abilities/stinger-poison-green.webp",
  "Claw": "icons/creatures/claws/claw-hooked-curved.webp",
  "Pincer": "icons/creatures/claws/claw-hooked-curved.webp",
  "Stings": "icons/creatures/invertebrates/wasp-swarm-attack.webp",
  "Swarm": "icons/creatures/invertebrates/wasp-swarm-movement.webp",
  "Burrow Ambush": "icons/magic/earth/projectile-stone-landslide.webp",
  "Sand Spray": "icons/magic/earth/projectiles-stone-salvo-gray.webp",
  "Dig In": "icons/magic/earth/barrier-stone-explosion-debris.webp",
  "Club": "icons/weapons/clubs/club-heavy-barbed-brown.webp",
  "Maul": "icons/weapons/hammers/hammer-double-stone.webp",
  "Rock": "icons/magic/earth/projectile-stone-boulder-orange.webp",
  "Sweeping Blow": "icons/skills/melee/strike-hammer-destructive-orange.webp",
  "Bone Rattle": "icons/commodities/bones/skull-hollow-white.webp",
  "Kick Aside": "icons/skills/melee/unarmed-punch-fist.webp",
  "Void Sting": "icons/magic/unholy/strike-body-explode-disintegrate.webp",
  "Star-Glass Shell": "icons/magic/defensive/shield-barrier-glowing-triangle-blue.webp",
  "Blink": "icons/magic/movement/portal-vortex-orange.webp",
  "Void Wake": "icons/magic/unholy/projectile-missile-green.webp",
  "Void Rend": "icons/magic/unholy/strike-body-explode-disintegrate.webp",
  "Starless Dark": "icons/magic/unholy/orb-hands-pink.webp",
  "Rift Pull": "icons/magic/control/energy-stream-link-spiral-blue.webp",
  "Response: Tail Lash": "icons/creatures/abilities/stinger-poison-green.webp",
  "Response: Void Step": "icons/magic/movement/portal-vortex-orange.webp",
  "Brood Call": "icons/consumables/eggs/egg-cracked-white.webp",
  "Bound to the Shard": "icons/magic/symbols/runes-star-pentagon-blue.webp",
  "Desert Born": "icons/magic/earth/barrier-stone-brown-green.webp",
  "Disposition: Pack Hunter": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Brute": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Leader": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Skirmisher": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Tyrant": "icons/skills/targeting/crosshair-ringed-gray.webp"
};
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
// ---- Dune Scorpion (PL 8, Durability 3): HP 107, AC 15, hit +5, standard 8, alpha 16 ----
M.push(npc({ name: "Dune Scorpion", slug: "dune-scorpion", size: "lg", type: "beast", cr: 8, ac: 15, hp: 107, speed: 40, burrow: 20,
  abil: { str: 16, dex: 14, con: 15, int: 1, wis: 10, cha: 2 }, senses: { blindsight: 60 }, skills: { ste: { value: 1 } },
  bio: P("A horse-sized desert scorpion with a sand-colored shell. Packs of them hunt through the Savant's halls.") + P("<em>BTLT Monster Design: Power Level 8, Durability 3.</em>"),
  items: [
    feat("Disposition: Pack Hunter", "The scorpion waits under the sand, bursts out next to a creature that is apart from its allies, and fights only while another scorpion is within 30 feet of it."),
    feat("Desert Born", "The scorpion can burrow through sand and loose rubble, leaving no tunnel."),
    attack("Sting", "<em>Melee Attack Roll:</em> +5, reach 10 ft. <em>Hit:</em> 8 (1d8 + 4) Piercing damage, and the target has the Poisoned condition until the end of its next turn.", { hit: 5, dice: "1d8", bonus: 4, dtype: "piercing", reach: 10 }),
    save("Burrow Ambush (Recharge 5–6)", "The scorpion burrows up to its burrow Speed and erupts under one creature. The target makes a DC 14 Dexterity saving throw. <em>Failure:</em> 16 (3d8 + 2) Piercing damage, and the target has the Prone condition. <em>Success:</em> Half damage only.", { ability: "dex", dc: 14, dice: "3d8", bonus: 2, dtype: "piercing", rech: 5 }),
    feat("Dig In", "<em>Bonus Action.</em> The scorpion burrows into the sand where it stands. Until it moves, it has Half Cover.", "bonus"),
    save("Sand Spray", "<em>Reaction.</em> When a creature within 10 feet hits the scorpion, the scorpion flings sand at it. The creature makes a DC 14 Constitution saving throw. <em>Failure:</em> 4 (1d8) Bludgeoning damage, and the creature has the Blinded condition until the start of its next turn.", { ability: "con", dc: 14, dice: "1d8", dtype: "bludgeoning", onSave: "none", activation: "reaction" })
  ] }));
// ---- Scorpion Swarm (PL 9, Durability 4): HP 160, AC 17, hit +5, standard 9, alpha 18 ----
M.push(npc({ name: "Scorpion Swarm", slug: "scorpion-swarm", size: "lg", type: "beast", cr: 9, ac: 17, hp: 160, speed: 30, burrow: 10,
  abil: { str: 6, dex: 16, con: 14, int: 1, wis: 10, cha: 2 }, dr: ["bludgeoning", "piercing", "slashing"],
  ci: ["charmed", "frightened", "grappled", "paralyzed", "petrified", "prone", "restrained", "stunned"], senses: { blindsight: 30 },
  bio: P("A tide of hand-sized scorpions pouring out of the sand.") + P("<em>BTLT Monster Design: Power Level 9, Durability 4.</em>"),
  items: [
    feat("Swarm", "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny scorpion. The swarm can't regain Hit Points or gain Temporary Hit Points."),
    feat("Disposition: Brute", "The swarm moves into the largest group of enemies and stays there."),
    attack("Stings", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 9 (2d8) Piercing damage, and the target has the Poisoned condition until the end of its next turn.", { hit: 5, dice: "2d8", dtype: "piercing" }),
    save("Sand Tide (Recharge 5–6)", "The swarm moves up to its Speed. Each creature whose space it enters during this move makes a DC 14 Dexterity saving throw. <em>Failure:</em> 18 (4d8) Poison damage, and the target has the Prone condition. <em>Success:</em> Half damage only.", { ability: "dex", dc: 14, dice: "4d8", dtype: "poison", rech: 5 }),
    save("Scatter", "<em>Reaction.</em> When the swarm takes damage from an effect that covers an area, it moves up to 10 feet without provoking opportunity attacks, and one creature it moves through makes a DC 14 Constitution saving throw. <em>Failure:</em> 4 (1d8) Poison damage.", { ability: "con", dc: 14, dice: "1d8", dtype: "poison", onSave: "none", activation: "reaction" })
  ] }));
// ---- Ogre Brute (PL 10, Durability 4): HP 180, AC 18, hit +6, standard 9, alpha 18 ----
M.push(npc({ name: "Ogre Brute", slug: "ogre-brute", size: "lg", type: "giant", cr: 10, ac: 18, hp: 180, speed: 40,
  abil: { str: 21, dex: 8, con: 18, int: 5, wis: 8, cha: 7 }, senses: { darkvision: 60 }, langs: "Common, Giant",
  bio: P("A hulking ogre that loots the north halls of the Savant's ruin.") + P("<em>BTLT Monster Design: Power Level 10, Durability 4.</em>"),
  items: [
    feat("Disposition: Brute", "The ogre charges the creature that looks strongest, fights until it is Bloodied, then flees to the Bone-Chief."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    attack("Club", "<em>Melee Attack Roll:</em> +6, reach 10 ft. <em>Hit:</em> 9 (1d8 + 5) Bludgeoning damage.", { hit: 6, dice: "1d8", bonus: 5, dtype: "bludgeoning", reach: 10, wtype: "simpleM" }),
    attack("Rock", "<em>Ranged Attack Roll:</em> +6, range 30/120 ft. <em>Hit:</em> 9 (1d8 + 5) Bludgeoning damage.", { hit: 6, dice: "1d8", bonus: 5, dtype: "bludgeoning", range: "ranged", rng: [30, 120], wtype: "simpleR" }),
    save("Sweeping Blow (Recharge 5–6)", "The ogre swings its club through a 15-foot Cone. Each creature in the Cone makes a DC 15 Strength saving throw. <em>Failure:</em> 18 (3d10 + 2) Bludgeoning damage, and the target is pushed 10 feet away and has the Prone condition. <em>Success:</em> Half damage only.", { ability: "str", dc: 15, dice: "3d10", bonus: 2, dtype: "bludgeoning", rech: 5, tmpl: { type: "cone", size: "15", units: "ft" } }),
    save("Kick Aside", "<em>Reaction.</em> When a creature moves within 5 feet of the ogre, the ogre kicks it. The creature makes a DC 15 Strength saving throw. <em>Failure:</em> 4 (1d8) Bludgeoning damage, and the creature is pushed 10 feet away.", { ability: "str", dc: 15, dice: "1d8", dtype: "bludgeoning", onSave: "none", activation: "reaction" })
  ] }));
// ---- Ogre Bone-Chief (PL 11, Durability 8): HP 400, AC 20, hit +10, standard 10, alpha 20 ----
M.push(npc({ name: "Ogre Bone-Chief", slug: "ogre-bone-chief", size: "lg", type: "giant", cr: 11, ac: 20, hp: 400, speed: 40,
  abil: { str: 23, dex: 8, con: 20, int: 8, wis: 10, cha: 12 }, senses: { darkvision: 60 }, langs: "Common, Giant",
  bio: P("The ogres' leader, hung with the bones of everyone he has eaten. His band killed the shaman in the north hall.") + P("<em>BTLT Monster Design: Power Level 11, Durability 8. Fights with two Ogre Brutes.</em>"),
  items: [
    feat("Disposition: Leader", "The Bone-Chief stays behind his brutes, sends them at spellcasters, and offers to let the party pass for 100 gp before the fight starts."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    attack("Maul", "<em>Melee Attack Roll:</em> +10, reach 10 ft. <em>Hit:</em> 10 (1d10 + 5) Bludgeoning damage.", { hit: 10, dice: "1d10", bonus: 5, dtype: "bludgeoning", reach: 10, wtype: "martialM" }),
    attack("Rock", "<em>Ranged Attack Roll:</em> +10, range 30/120 ft. <em>Hit:</em> 10 (1d10 + 5) Bludgeoning damage.", { hit: 10, dice: "1d10", bonus: 5, dtype: "bludgeoning", range: "ranged", rng: [30, 120], wtype: "simpleR" }),
    save("Bone Rattle (Recharge 5–6)", "The Bone-Chief shakes his cloak of bones and roars. Each enemy within 30 feet makes a DC 17 Wisdom saving throw. <em>Failure:</em> 20 (3d12 + 1) Psychic damage, and the target has the Frightened condition until the end of its next turn. <em>Success:</em> Half damage only. Each Ogre Brute that can hear him can move up to half its Speed.", { ability: "wis", dc: 17, dice: "3d12", bonus: 1, dtype: "psychic", rech: 5 }),
    feat("Command", "<em>Bonus Action.</em> One Ogre Brute within 30 feet that can hear the Bone-Chief makes one Club attack.", "bonus"),
    save("Kick Aside", "<em>Reaction.</em> When a creature moves within 5 feet of the Bone-Chief, he kicks it. The creature makes a DC 17 Strength saving throw. <em>Failure:</em> 5 (1d10) Bludgeoning damage, and the creature is pushed 10 feet away.", { ability: "str", dc: 17, dice: "1d10", dtype: "bludgeoning", onSave: "none", activation: "reaction" })
  ] }));
// ---- Void-Touched Scorpion (PL 11, Durability 4.25): HP 213, AC 19, hit +6, standard 10, alpha 20 ----
M.push(npc({ name: "Void-Touched Scorpion", slug: "void-touched-scorpion", size: "lg", type: "monstrosity", cr: 11, ac: 19, hp: 213, speed: 40, burrow: 20,
  abil: { str: 18, dex: 16, con: 16, int: 3, wis: 12, cha: 4 }, dr: ["cold", "force"], senses: { blindsight: 60, truesight: 10 },
  bio: P("A giant scorpion mutated by void energy; its shell is black glass flecked with starlight.") + P("<em>BTLT Monster Design: Power Level 11, Durability 4.25.</em>"),
  items: [
    feat("Disposition: Skirmisher", "The scorpion blinks next to the most wounded enemy, stings, and blinks away before it can be surrounded."),
    feat("Star-Glass Shell", "When the scorpion is hit by a critical hit, the attacker takes 5 (1d10) Cold damage from the shattering glass."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    attack("Pincer", "<em>Melee Attack Roll:</em> +6, reach 5 ft. <em>Hit:</em> 10 (1d10 + 5) Bludgeoning damage, and the target has the Grappled condition (escape DC 15).", { hit: 6, dice: "1d10", bonus: 5, dtype: "bludgeoning" }),
    attack("Void Sting", "<em>Melee Attack Roll:</em> +6, reach 10 ft. <em>Hit:</em> 10 (1d10 + 5) Force damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "force", reach: 10 }),
    save("Void Wake (Recharge 5–6)", "The scorpion teleports up to 30 feet to a space it can see. Each creature within 10 feet of the space it left makes a DC 17 Constitution saving throw. <em>Failure:</em> 20 (4d8 + 2) Cold damage, and the target's Speed is halved until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "con", dc: 17, dice: "4d8", bonus: 2, dtype: "cold", rech: 5 }),
    feat("Blink", "<em>Bonus Action.</em> The scorpion teleports up to 15 feet to an unoccupied space it can see.", "bonus"),
    save("Void Recoil", "<em>Reaction.</em> When a creature within 10 feet hits the scorpion with a melee attack, that creature makes a DC 17 Constitution saving throw. <em>Failure:</em> 5 (1d10) Force damage.", { ability: "con", dc: 17, dice: "1d10", dtype: "force", onSave: "none", activation: "reaction" })
  ] }));
// ---- The Void Matriarch (PL 12, Durability 10, Epic Boss): HP 550, AC 20, hit +11, standard 11, alpha 22 ----
M.push(npc({ name: "The Void Matriarch", slug: "the-void-matriarch", size: "huge", type: "monstrosity", cr: 12, ac: 20, hp: 550, speed: 40, burrow: 30,
  abil: { str: 23, dex: 14, con: 22, int: 8, wis: 16, cha: 14 }, dr: ["cold", "force"], di: ["poison"], ci: ["poisoned", "frightened"], senses: { blindsight: 60, truesight: 30 },
  bio: P("The largest scorpion in the halls, fused with the void that leaks from the Savant's sanctum. A cracked crystal grows from her back; it pulses when the Void Shard is near.") + P("<em>BTLT Monster Design: Power Level 12, Durability 10, Epic Boss. Fights with two Void-Touched Scorpions.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Matriarch never rolls initiative. On initiative count 10 she rolls for recharges, then moves up to her Speed and takes one action: her standard attack or one of her charged actions."),
    feat("Epic Boss Resistance", "If the Matriarch fails a saving throw, she can choose to succeed instead. She has Advantage on saving throws against effects that would remove her from the fight."),
    feat("Response", "After each player character's turn, the Matriarch takes one Response (one only, not one per enemy). Each Response other than Movement also deals 6 damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Matriarch moves up to half her Speed or burrows up to half her burrow Speed.", "special"),
    feat("Disposition: Tyrant", "The Matriarch attacks whoever carries the Void Shard, then whoever last damaged one of her Void-Touched Scorpions."),
    feat("Bound to the Shard", "While a creature within 60 feet carries the Void Shard, the Matriarch has Advantage on attack rolls against that creature, and that creature has Disadvantage on saving throws against her charged actions."),
    attack("Sting", "<em>Melee Attack Roll:</em> +11, reach 15 ft. <em>Hit:</em> 11 (1d10 + 6) Piercing damage plus 3 (1d6) Force damage.", { hit: 11, dice: "1d10", bonus: 6, dtype: "piercing", reach: 15 }),
    save("Void Rend (Recharge 5–6)", "The Matriarch tears open a 20-foot-radius Sphere of void centered on a point within 60 feet. Each creature in it makes a DC 19 Constitution saving throw. <em>Failure:</em> 22 (4d10) Force damage, and the target has the Restrained condition until the end of its next turn as the void drags at it. <em>Success:</em> Half damage only.", { ability: "con", dc: 19, dice: "4d10", dtype: "force", rech: 5, tmpl: { type: "sphere", size: "20", units: "ft" } }),
    save("Starless Dark (Recharge 6)", "Black void pours from the crystal on her back. Each enemy within 30 feet makes a DC 19 Wisdom saving throw. <em>Failure:</em> 22 (5d8) Cold damage, and the target has the Blinded condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "wis", dc: 19, dice: "5d8", dtype: "cold", rech: 6 }),
    save("Response: Tail Lash", "The Matriarch lashes one creature within 15 feet. It makes a DC 19 Dexterity saving throw. <em>Failure:</em> 6 (1d12) Piercing damage, and the target has the Prone condition.", { ability: "dex", dc: 19, dice: "1d12", dtype: "piercing", onSave: "none", activation: "special" }),
    save("Response: Rift Pull", "One creature the Matriarch can see within 60 feet makes a DC 19 Strength saving throw. <em>Failure:</em> 6 (1d12) Force damage, and the target is pulled up to 20 feet toward her.", { ability: "str", dc: 19, dice: "1d12", dtype: "force", onSave: "none", activation: "special" }),
    feat("Response: Void Step", "The Matriarch teleports up to 30 feet to an unoccupied space she can see. One creature within 5 feet of her new space takes 6 (1d12) Force damage.", "special")
  ] }));
const made = [];
for (const data of M) {
  const old = game.actors.find(a => a.getFlag(MOD, "slug") === data.flags[MOD].slug);
  if (old) await old.delete();
  const a = await Actor.create(data);
  made.push(`${a.name}: HP ${a.system.attributes.hp.max} (${a.system.attributes.hp.formula}) AC ${a.system.attributes.ac.value} items ${a.items.size}`);
}
made;
