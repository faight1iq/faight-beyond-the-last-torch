// Builds the 5LGX-1 The Puppeteer's Playhouse monsters (run in the Foundry console as GM).
// Numbers come from BTLT Monster Design rows 54-59 (HP, AC, hit, standard damage, alpha damage), with role-based
// Hit Pct / Dmg Pct dials. Each creature has its own role and mechanic.
const MOD = "faight-beyond-the-last-torch", CODE = "5LGX-1", NAME = "5LGX-1: The Puppeteer's Playhouse";
const ART = `modules/${MOD}/assets/tokens/the-puppeteers-playhouse`;
let folder = game.folders.find(f => f.type === "Actor" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Actor" });
const T = "icons/skills/targeting/crosshair-arrowhead-blue.webp";
const STR = "icons/magic/control/energy-stream-link-spiral-blue.webp", WEB = "icons/creatures/webs/web-spider-casting-caught-purple.webp";
const ICONS = {
  "Init 10 (Epic Boss)": "icons/svg/clockwork.svg",
  "Epic Boss Resistance": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "Response": "icons/magic/control/energy-stream-link-white.webp",
  "Response: Movement": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Disposition: Swarm": T, "Disposition: Skirmisher": T, "Disposition: Ambusher": T, "Disposition: Controller": T, "Disposition: Commander": T, "Disposition: Tyrant": T,
  "Underfoot": "icons/creatures/invertebrates/wasp-swarm-attack.webp", "Swarm": "icons/creatures/invertebrates/wasp-swarm-attack.webp",
  "Gnawing Teeth": "icons/creatures/abilities/fangs-teeth-bite.webp", "Swarm the Face": "icons/creatures/invertebrates/wasp-swarm-attack.webp",
  "Winding Down": "icons/svg/clockwork.svg",
  "On Strings": STR, "Cut the Strings": STR, "Blade Hands": "icons/skills/melee/strike-slashes-red.webp",
  "Pirouette": "icons/skills/melee/strike-sword-slashing-red.webp", "Strung Leap": "icons/creatures/mammals/deer-movement-leap-green.webp",
  "Yanked Aside": "icons/magic/defensive/illusion-evasion-echo-purple.webp",
  "Only When Unseen": "icons/magic/defensive/armor-stone-skin.webp", "Porcelain Grasp": "icons/magic/death/hand-withered-gray.webp",
  "Doll's Embrace": "icons/magic/death/hand-withered-gray.webp", "Shatter": "icons/magic/water/projectiles-ice-explosion.webp",
  "A Soul Inside": "icons/magic/control/hypnosis-mesmerism-swirl.webp",
  "Wants an Audience": "icons/magic/control/hypnosis-mesmerism-swirl.webp", "Clacking Jaw": "icons/creatures/abilities/fangs-teeth-bite.webp",
  "Thrown Voice": "icons/magic/control/hypnosis-mesmerism-swirl.webp", "Words in Your Mouth": "icons/magic/control/fear-fright-shadow-monster-purple.webp",
  "It Was Him!": "icons/magic/defensive/illusion-evasion-echo-purple.webp", "Quill's Voice": "icons/magic/control/hypnosis-mesmerism-swirl.webp",
  "Encore": "icons/skills/social/intimidation-impressing.webp", "Prima's Partner": STR, "Grand Jeté": "icons/creatures/mammals/deer-movement-leap-green.webp",
  "Response: Curtain Call": "icons/skills/melee/strike-slashes-red.webp",
  "Spinner Above": "icons/creatures/webs/web-spider-moving-blue.webp", "Strings to the Rail": STR,
  "Needle Leg": "icons/creatures/invertebrates/spider-mandibles-brown.webp", "Make a Puppet": "icons/magic/control/hypnosis-mesmerism-swirl.webp",
  "Drop the Curtain": "icons/magic/control/encase-creature-spider-hold.webp", "Response: Jerk the Strings": WEB,
  "Response: Spun Silk": "icons/magic/control/orb-web-hold.webp"
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
// ---- Tinwhisker Swarm (swarm; PL 8, Dur 3, Hit 60, Dmg 15): HP 107, AC 15, hit +11, std 12, alpha 24 ----
M.push(npc({ name: "Tinwhisker Swarm", slug: "tinwhisker-swarm", size: "med", type: "construct", cr: 8, ac: 15, hp: 107, speed: 30, climb: 30,
  abil: { str: 6, dex: 18, con: 12, int: 2, wis: 10, cha: 3 }, dr: ["bludgeoning", "piercing", "slashing"], di: ["poison", "psychic"], dv: ["lightning"],
  ci: ["charmed", "frightened", "grappled", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned"], senses: { darkvision: 60 },
  bio: P("Hundreds of brass clockwork mice that Ambrose Quill made for a matinee, still wound up and gnawing through the seat cushions. They pour over anything warm that moves.") + P("<em>BTLT Monster Design row 54: Power Level 8, Durability 3, Hit Pct 60, Dmg Pct 15. Role: swarm.</em>"),
  items: [
    feat("Disposition: Swarm", "The mice flow toward the nearest creature that is standing and climb it. They ignore anyone already lying down."),
    feat("Swarm", "The swarm can occupy another creature's space and vice versa, and it can move through any opening large enough for a Tiny creature. It can't regain Hit Points or gain Temporary Hit Points."),
    feat("Underfoot", "The swarm's space is Difficult Terrain. A creature that starts its turn in the swarm's space makes a DC 14 Dexterity saving throw or has the Prone condition."),
    feat("Winding Down", "While the swarm is Bloodied, its Gnawing Teeth deal half damage."),
    attack("Gnawing Teeth", "<em>Melee Attack Roll:</em> +11, reach 0 ft (a creature in the swarm's space). <em>Hit:</em> 12 (2d6 + 5) Piercing damage, or 6 (1d6 + 3) Piercing damage if the swarm is Bloodied.", { hit: 11, dice: "2d6", bonus: 5, dtype: "piercing", reach: 0 }),
    attack("Swarm the Face (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 0 ft (a creature in the swarm's space). <em>Hit:</em> 24 (4d6 + 10) Piercing damage, and the target has the Blinded condition until the end of its next turn as mice cover its face.", { hit: 11, dice: "4d6", bonus: 10, dtype: "piercing", reach: 0, rech: 5 })
  ] }));
// ---- Marionette Dancer (skirmisher; PL 9, Dur 4.5, Hit 55, Dmg 30): HP 180, AC 18, hit +10, std 25, alpha 50 ----
M.push(npc({ name: "Marionette Dancer", slug: "marionette-dancer", size: "med", type: "construct", cr: 9, ac: 18, hp: 180, speed: 40,
  abil: { str: 14, dex: 20, con: 14, int: 6, wis: 12, cha: 14 }, di: ["poison"], dv: ["fire"], ci: ["exhaustion", "poisoned"], senses: { darkvision: 60 },
  bio: P("A life-size wooden marionette with a painted smile and blades for hands, hung from glittering soul-threads that rise into the dark ceiling. It dances because the thread pulls it.") + P("<em>BTLT Monster Design row 55: Power Level 9, Durability 4.5, Hit Pct 55, Dmg Pct 30. Role: skirmisher.</em>"),
  items: [
    feat("Disposition: Skirmisher", "The dancer cuts and leaps away, always to the creature that is furthest from its allies."),
    feat("On Strings", "The dancer hangs from threads to the ceiling. It ignores Difficult Terrain and can't be knocked Prone. Where there is no ceiling above it, it has the Incapacitated condition."),
    feat("Cut the Strings", "A creature can attack the dancer's strings (AC 15). A hit that deals 10 or more Slashing damage cuts them: the dancer has the Incapacitated condition until the end of its next turn, when new threads catch it."),
    attack("Blade Hands", "<em>Melee Attack Roll:</em> +10, reach 5 ft. <em>Hit:</em> 25 (2d12 + 12) Slashing damage.", { hit: 10, dice: "2d12", bonus: 12, dtype: "slashing" }),
    attack("Pirouette (Recharge 5–6)", "The dancer moves up to 20 feet without provoking Opportunity Attacks and makes one attack. <em>Melee Attack Roll:</em> +10, reach 5 ft. <em>Hit:</em> 50 (6d12 + 11) Slashing damage, and the target has the Bleeding effect: it can't regain Hit Points until the end of its next turn.", { hit: 10, dice: "6d12", bonus: 11, dtype: "slashing", rech: 5 }),
    feat("Strung Leap", "The strings yank the dancer up to 30 feet in any direction (including up to the ceiling) without provoking Opportunity Attacks.", "bonus"),
    feat("Yanked Aside", "When a creature the dancer can see hits it with a melee attack, the strings pull the dancer 10 feet away from the attacker, and the attack deals half damage.", "reaction")
  ] }));
// ---- Porcelain Doll (ambusher; PL 10, Dur 4, Hit 55, Dmg 30): HP 180, AC 18, hit +11, std 27, alpha 54 ----
M.push(npc({ name: "Porcelain Doll", slug: "porcelain-doll", size: "med", type: "construct", cr: 10, ac: 18, hp: 180, speed: 40,
  abil: { str: 18, dex: 16, con: 16, int: 8, wis: 14, cha: 12 }, dr: ["piercing", "slashing"], di: ["poison", "psychic"], dv: ["bludgeoning"], ci: ["charmed", "exhaustion", "frightened", "poisoned"], senses: { darkvision: 120 },
  bio: P("A life-size porcelain doll in a faded lace dress, with a stolen soul strung inside it. It moves only when no one is looking, and it is always a little closer than it was.") + P("<em>BTLT Monster Design row 56: Power Level 10, Durability 4, Hit Pct 55, Dmg Pct 30. Role: ambusher.</em>"),
  items: [
    feat("Disposition: Ambusher", "The doll waits until eyes leave it, then closes on the creature that looked away and takes hold of it."),
    feat("Only When Unseen", "While any enemy can see the doll, its Speed is 0 and it can't take actions other than Porcelain Grasp against a creature already within 5 feet. While no enemy can see it (darkness, behind a creature, out of sight), its Speed is 40 feet and it has Advantage on attack rolls."),
    feat("A Soul Inside", "Each doll holds the soul of someone who vanished in the playhouse. A creature that speaks the soul's own name to the doll (learned from the playbills, the scarf, or the doll's clothes) makes it go still and harmless for 1 minute."),
    feat("Shatter", "When the doll drops to 0 Hit Points, it bursts into shards. Each creature within 10 feet makes a DC 15 Dexterity saving throw, taking 13 (2d6 + 6) Piercing damage on a failure."),
    attack("Porcelain Grasp", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 27 (2d12 + 14) Bludgeoning damage.", { hit: 11, dice: "2d12", bonus: 14, dtype: "bludgeoning" }),
    attack("Doll's Embrace (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 54 (6d12 + 15) Cold damage, and the target has the Grappled condition (escape DC 15). While Grappled, the target has Disadvantage on Wisdom saving throws. The doll can recharge this only on a turn it started unseen.", { hit: 11, dice: "6d12", bonus: 15, dtype: "cold", rech: 5 })
  ] }));
// ---- Ventriloquist's Dummy (controller; PL 11, Dur 6, Hit 45, Dmg 20): HP 300, AC 20, hit +9, std 20, alpha 40 ----
M.push(npc({ name: "Ventriloquist's Dummy", slug: "ventriloquists-dummy", size: "sm", type: "construct", cr: 11, ac: 20, hp: 300, speed: 30,
  abil: { str: 12, dex: 16, con: 14, int: 14, wis: 14, cha: 20 }, di: ["poison"], dv: ["fire"], ci: ["charmed", "exhaustion", "poisoned"], senses: { darkvision: 60 }, langs: "Common, and any voice it has heard",
  skills: { prf: { value: 2 }, dec: { value: 2 } },
  bio: P("A grinning wooden dummy in a red waistcoat. It speaks in the voice of its dead master, Ambrose Quill, and in the voices of anyone it has heard. It wants an audience more than anything.") + P("<em>BTLT Monster Design row 57: Power Level 11, Durability 6, Hit Pct 45, Dmg Pct 20. Role: controller.</em>"),
  items: [
    feat("Disposition: Controller", "The dummy keeps out of reach, calls enemies into bad places with stolen voices and turns their attacks on each other."),
    feat("Wants an Audience", "A creature that applauds or performs for the dummy (an action and a DC 17 Charisma (Performance) check) makes it stop attacking that creature until it is attacked. If every enemy in the room is its audience, it stops fighting and talks."),
    feat("Quill's Voice", "When the dummy is Bloodied, it speaks only in Ambrose Quill's own frightened voice and begs to be put down. It has Disadvantage on attack rolls."),
    attack("Clacking Jaw", "<em>Melee Attack Roll:</em> +9, reach 5 ft. <em>Hit:</em> 20 (3d8 + 7) Piercing damage.", { hit: 9, dice: "3d8", bonus: 7, dtype: "piercing" }),
    save("Thrown Voice", "The dummy throws a voice the target trusts to a point within 60 feet. One creature that can hear it makes a DC 17 Wisdom saving throw. <em>Failure:</em> 20 (3d8 + 7) Psychic damage, and the target uses its Reaction to move up to its Speed toward that point by the safest route.", { ability: "wis", dc: 17, dice: "3d8", bonus: 7, dtype: "psychic", onSave: "none" }),
    save("Words in Your Mouth (Recharge 5–6)", "One creature within 60 feet makes a DC 17 Charisma saving throw. <em>Failure:</em> 40 (5d12 + 8) Psychic damage, and until the end of its next turn the target speaks only the dummy's words: it can't cast spells with a Verbal component. <em>Success:</em> Half damage only.", { ability: "cha", dc: 17, dice: "5d12", bonus: 8, dtype: "psychic", rech: 5 }),
    feat("It Was Him!", "When a creature the dummy can see targets it with an attack, the dummy shouts in a friend's voice and the attack is redirected to another creature of the dummy's choice within 5 feet of the dummy (the attacker rolls against the new target). Once per round.", "reaction")
  ] }));
// ---- The Prima Marionette (commander, Epic; PL 11, Dur 9, Hit 55, Dmg 25): HP 450, AC 20, hit +11, std 25, alpha 50 ----
M.push(npc({ name: "The Prima Marionette", slug: "the-prima-marionette", size: "med", type: "construct", cr: 11, ac: 20, hp: 450, speed: 40,
  abil: { str: 16, dex: 22, con: 16, int: 12, wis: 14, cha: 20 }, di: ["poison"], dv: ["fire"], ci: ["charmed", "exhaustion", "frightened", "poisoned"], senses: { darkvision: 60 }, langs: "Common",
  skills: { prf: { value: 2 }, acr: { value: 2 } },
  bio: P("Mistress Tangle's favourite: a tall ballerina marionette in a torn white tutu with a porcelain face, her strings glowing with soul-thread. She keeps Lord Edric Ashgrove bound in the workshop as her dance partner.") + P("<em>BTLT Monster Design row 58: Power Level 11, Durability 9, Hit Pct 55, Dmg Pct 25, Epic Boss commander. Commands two Marionette Dancers.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Prima never rolls initiative. On initiative count 10 she rolls for recharges, then moves up to her Speed and takes one action."),
    feat("Epic Boss Resistance", "If the Prima fails a saving throw, she can choose to succeed instead. She has Advantage on saving throws against effects that would remove her from the fight."),
    feat("Response", "After each player character's turn, the Prima takes one Response (one only, not one per enemy). Each Response other than Movement deals 12 (1d12 + 6) damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Prima moves up to half her Speed without provoking Opportunity Attacks.", "special"),
    feat("Disposition: Commander", "The Prima stays near her partner, sends the dancers at whoever threatens him, and respects anyone who dances better than she does."),
    feat("On Strings", "The Prima hangs from threads to the ceiling. She ignores Difficult Terrain and can't be knocked Prone. Cutting her strings (AC 15, a hit of 10 or more Slashing damage) makes her lose her next Response."),
    feat("Prima's Partner", "While Lord Ashgrove is bound to his chair within 30 feet of her, the Prima has Advantage on Dexterity saving throws. A creature that out-dances her (a contest of Charisma (Performance) or Dexterity (Acrobatics) against her +11, as an action) can ask her for anything but her partner; she answers."),
    attack("Blade Hands", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 25 (2d12 + 12) Slashing damage.", { hit: 11, dice: "2d12", bonus: 12, dtype: "slashing" }),
    attack("Pirouette (Recharge 5–6)", "The Prima moves up to 20 feet without provoking Opportunity Attacks and makes one attack. <em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 50 (6d12 + 11) Slashing damage, and the target can't regain Hit Points until the end of its next turn.", { hit: 11, dice: "6d12", bonus: 11, dtype: "slashing", rech: 5 }),
    feat("Encore (Recharge 5–6)", "Each Marionette Dancer of her group moves up to its Speed and makes one Blade Hands attack, using none of its own actions.", "action", 5),
    save("Response: Curtain Call", "One creature within 5 feet of the Prima makes a DC 17 Dexterity saving throw. <em>Failure:</em> 12 (1d12 + 6) Slashing damage, and the Prima swaps places with it.", { ability: "dex", dc: 17, dice: "1d12", bonus: 6, dtype: "slashing", onSave: "none", activation: "special" })
  ] }));
// ---- Mistress Tangle (Epic Boss; PL 12, Dur 10, Hit 60, Dmg 35): HP 550, AC 20, hit +13, std 37, alpha 74 ----
M.push(npc({ name: "Mistress Tangle", slug: "mistress-tangle", size: "huge", type: "fey", cr: 12, ac: 20, hp: 550, speed: 40, climb: 40,
  abil: { str: 22, dex: 18, con: 20, int: 18, wis: 16, cha: 22 }, dr: ["psychic"], di: ["poison"], ci: ["charmed", "frightened", "poisoned", "restrained"], senses: { darkvision: 120, tremorsense: 60 }, langs: "Common, Sylvan",
  bio: P("The Spinner Above: a giant spider-like fey with a cracked white porcelain mask for a face and many jointed wooden legs. She spins soul-thread from the people who came to the playhouse and strings it into puppets. Her strings are tied off on the pin rail of the fly loft.") + P("<em>BTLT Monster Design row 59: Power Level 12, Durability 10, Hit Pct 60, Dmg Pct 35, Epic Boss. Fights with two Marionette Dancers.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "Mistress Tangle never rolls initiative. On initiative count 10 she rolls for recharges, then moves up to her Speed and takes one action: her standard attack or one of her charged actions."),
    feat("Epic Boss Resistance", "While at least one rope on the pin rail stands, if Mistress Tangle fails a saving throw, she can choose to succeed instead. She has Advantage on saving throws against effects that would remove her from the fight."),
    feat("Response", "After each player character's turn, Mistress Tangle takes one Response (one only, not one per enemy). Each Response other than Movement deals 18 (2d8 + 9) damage, half a standard hit, to its target."),
    feat("Response: Movement", "Mistress Tangle moves up to half her Speed, across the ceiling if she likes.", "special"),
    feat("Disposition: Tyrant", "Tangle stays on the ceiling above the pin rail, makes puppets of the strongest, and goes for anyone who touches her ropes."),
    feat("Spinner Above", "Tangle can climb on ceilings upside down without an ability check. While she is on the ceiling, creatures more than 10 feet below her have Disadvantage on melee attacks against her unless they have reach."),
    feat("Strings to the Rail", "Her strings are tied off to four ropes on the pin rail along the west wall. Each rope has AC 15 and 25 Hit Points (immune to Poison and Psychic damage); or a creature within 5 feet can take an action to untie one (DC 16 Strength (Athletics) or Dexterity (Sleight of Hand)). Each of the first two ropes cut makes one Marionette Dancer in the room have the Incapacitated condition until the end of its next turn. When the fourth rope is cut, Tangle loses her Epic Boss Resistance, falls from the ceiling, takes 22 (4d10) Bludgeoning damage and has the Prone condition."),
    attack("Needle Leg", "<em>Melee Attack Roll:</em> +13, reach 15 ft. <em>Hit:</em> 37 (4d12 + 11) Piercing damage.", { hit: 13, dice: "4d12", bonus: 11, dtype: "piercing", reach: 15 }),
    save("Make a Puppet (Recharge 5–6)", "Tangle drops a thread onto one creature within 60 feet. It makes a DC 19 Wisdom saving throw. <em>Failure:</em> 74 (8d12 + 22) Psychic damage, and on its next turn Tangle controls it: it moves where she chooses and makes one weapon attack or casts one cantrip against a target she chooses. Taking damage from an ally does not end this. <em>Success:</em> Half damage only.", { ability: "wis", dc: 19, dice: "8d12", bonus: 22, dtype: "psychic", rech: 5 }),
    save("Drop the Curtain (Recharge 6)", "A curtain of silk falls in a 20-foot cube within 60 feet. Each creature in it makes a DC 19 Dexterity saving throw. <em>Failure:</em> 74 (8d12 + 22) Bludgeoning damage and the Restrained condition (escape DC 19, or 20 Slashing or Fire damage to the silk). <em>Success:</em> Half damage only.", { ability: "dex", dc: 19, dice: "8d12", bonus: 22, dtype: "bludgeoning", rech: 6, tmpl: { type: "cube", size: "20", units: "ft" } }),
    save("Response: Jerk the Strings", "One creature within 60 feet makes a DC 19 Strength saving throw. <em>Failure:</em> 18 (2d8 + 9) Bludgeoning damage, and the target is pulled up to 20 feet toward Tangle.", { ability: "str", dc: 19, dice: "2d8", bonus: 9, dtype: "bludgeoning", onSave: "none", activation: "special" }),
    save("Response: Spun Silk", "One creature within 30 feet that is touching a pin rail rope makes a DC 19 Dexterity saving throw. <em>Failure:</em> 18 (2d8 + 9) Poison damage, and its Speed is 0 until the end of its next turn.", { ability: "dex", dc: 19, dice: "2d8", bonus: 9, dtype: "poison", onSave: "none", activation: "special" })
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
