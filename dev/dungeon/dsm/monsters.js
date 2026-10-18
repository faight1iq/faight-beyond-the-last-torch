// Builds the 5LEI-4 Darkspear Mausoleum monsters (paste into the Foundry console as GM).
// Numbers come from BTLT Monster Design rows 29-33 (HP, AC, hit, standard damage, alpha damage).
const MOD = "faight-beyond-the-last-torch", CODE = "5LEI-4", NAME = "5LEI-4: Darkspear Mausoleum";
const ART = `modules/${MOD}/assets/tokens/darkspear-mausoleum`;
let folder = game.folders.find(f => f.type === "Actor" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Actor" });
const ICONS = {
  "Init 10 (Epic Boss)": "icons/svg/clockwork.svg",
  "Epic Boss Resistance": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "Response": "icons/magic/control/energy-stream-link-white.webp",
  "Response: Movement": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Multiattack": "icons/skills/targeting/target-strike-triple-blue.webp",
  "Bite": "icons/creatures/abilities/fangs-teeth-bite.webp",
  "Claws": "icons/creatures/claws/claw-bear-paw-swipe-brown.webp",
  "Maul": "icons/creatures/claws/claw-bear-paw-swipe-brown.webp",
  "Pseudopod": "icons/skills/melee/unarmed-punch-fist.webp",
  "Darkspear Pike": "icons/weapons/polearms/spear-flared-steel.webp",
  "Thrown Spear": "icons/weapons/thrown/javelin-steel.webp",
  "Response: Swipe": "icons/creatures/claws/claw-bear-paw-swipe-brown.webp",
  "Response: Crushing Hug": "icons/magic/control/debuff-chains-ropes-blue.webp",
  "Response: Root Snare": "icons/magic/control/debuff-energy-snare-blue.webp",
  "Disposition: Brute": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Ambusher": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Guardian": "icons/skills/targeting/crosshair-ringed-gray.webp",
  "Disposition: Tyrant": "icons/skills/targeting/crosshair-ringed-gray.webp"
};
// Actions not listed above get this icon (checked to exist before use).
const STORM = ["icons/magic/nature/root-vine-entangle-foot-green.webp", "icons/creatures/mammals/bear-ear-scratch-brown.webp", "icons/svg/paw.svg", "icons/svg/acid.svg"];
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
// ---- Moss Bear (PL 8, Durability 3): HP 107, AC 15, hit +5, standard 8, alpha 16 ----
M.push(npc({ name: "Moss Bear", slug: "moss-bear", size: "lg", type: "beast", cr: 8, ac: 15, hp: 107, speed: 40, climb: 30,
  abil: { str: 20, dex: 10, con: 16, int: 2, wis: 13, cha: 6 }, senses: { darkvision: 60 }, skills: { prc: { value: 1 } },
  bio: P("A huge jungle bear with moss and small ferns growing in its shaggy fur. Moss Bears den in the outer halls of the Darkspear Mausoleum.") + P("<em>BTLT Monster Design: Power Level 8, Durability 3.</em>"),
  items: [
    feat("Disposition: Brute", "The bear charges the nearest creature, stays on it until it drops, and flees when Bloodied unless its den is threatened."),
    attack("Claws", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 8 (1d8 + 4) Slashing damage.", { hit: 5, dice: "1d8", bonus: 4, dtype: "slashing" }),
    save("Mauling Charge (Recharge 5–6)", "The bear moves up to its Speed in a straight line and slams into one creature. The target makes a DC 14 Strength saving throw. <em>Failure:</em> 16 (3d8 + 2) Bludgeoning damage, and the target has the Prone condition. <em>Success:</em> Half damage only.", { ability: "str", dc: 14, dice: "3d8", bonus: 2, dtype: "bludgeoning", rech: 5 }),
    save("Swat", "<em>Reaction.</em> When a creature within 5 feet hits the bear, the bear swats it. The creature makes a DC 14 Strength saving throw. <em>Failure:</em> 4 (1d8) Bludgeoning damage, and the creature is pushed 5 feet away.", { ability: "str", dc: 14, dice: "1d8", dtype: "bludgeoning", onSave: "none", activation: "reaction" })
  ] }));
// ---- Tomb Jelly (PL 9, Durability 4): HP 160, AC 17, hit +5, standard 9, alpha 18 ----
M.push(npc({ name: "Tomb Jelly", slug: "tomb-jelly", size: "lg", type: "ooze", cr: 9, ac: 17, hp: 160, speed: 20, climb: 20,
  abil: { str: 16, dex: 6, con: 20, int: 1, wis: 6, cha: 1 }, di: ["acid"], ci: ["blinded", "charmed", "deafened", "exhaustion", "frightened", "prone"], senses: { blindsight: 60 },
  bio: P("A translucent green ooze grown from the tomb's old embalming vats. It dissolves anything left lying, and one has half digested a dwarf adventurer.") + P("<em>BTLT Monster Design: Power Level 9, Durability 4.</em>"),
  items: [
    feat("Disposition: Ambusher", "The jelly waits flat and still on the floor or ceiling until a creature steps beside it, then engulfs the nearest target and does not let go."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    feat("Transparent", "Even when the jelly is in plain sight, a creature must succeed on a DC 15 Wisdom (Perception) check to notice it if the jelly hasn't moved or attacked."),
    attack("Pseudopod", "<em>Melee Attack Roll:</em> +5, reach 10 ft. <em>Hit:</em> 9 (2d8) Acid damage.", { hit: 5, dice: "2d8", dtype: "acid", reach: 10 }),
    save("Engulf (Recharge 5–6)", "The jelly moves up to its Speed into one creature's space. The target makes a DC 14 Dexterity saving throw. <em>Failure:</em> 18 (4d8) Acid damage, and the target has the Restrained condition until it escapes (DC 14) or the jelly moves. <em>Success:</em> Half damage only, and the target is pushed 5 feet away.", { ability: "dex", dc: 14, dice: "4d8", dtype: "acid", rech: 5 }),
    feat("Ooze Along", "<em>Bonus Action.</em> The jelly moves up to 10 feet, even through a space as narrow as 1 inch, without provoking Opportunity Attacks.", "bonus"),
    save("Acid Splash", "<em>Reaction.</em> When a creature within 5 feet hits the jelly with a melee attack, that creature makes a DC 14 Dexterity saving throw. <em>Failure:</em> 4 (1d8) Acid damage.", { ability: "dex", dc: 14, dice: "1d8", dtype: "acid", onSave: "none", activation: "reaction" })
  ] }));
// ---- Spore-Mad Bear (PL 10, Durability 4): HP 180, AC 18, hit +6, standard 9, alpha 18 ----
M.push(npc({ name: "Spore-Mad Bear", slug: "sporemad-bear", size: "lg", type: "monstrosity", cr: 10, ac: 18, hp: 180, speed: 40,
  abil: { str: 21, dex: 10, con: 18, int: 2, wis: 8, cha: 4 }, di: ["poison"], ci: ["poisoned", "frightened"], senses: { darkvision: 60 },
  bio: P("A bear infected by the tomb's pale fungus. Mushrooms sprout from its back and shoulders, and the spores drive it to endless rage.") + P("<em>BTLT Monster Design: Power Level 10, Durability 4.</em>"),
  items: [
    feat("Disposition: Brute", "The bear attacks whatever moved last, never retreats, and keeps attacking a creature that is down."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    attack("Bite", "<em>Melee Attack Roll:</em> +6, reach 5 ft. <em>Hit:</em> 9 (1d8 + 5) Piercing damage.", { hit: 6, dice: "1d8", bonus: 5, dtype: "piercing" }),
    attack("Maul", "<em>Melee Attack Roll:</em> +6, reach 5 ft. <em>Hit:</em> 9 (1d8 + 5) Slashing damage.", { hit: 6, dice: "1d8", bonus: 5, dtype: "slashing" }),
    save("Spore Burst (Recharge 5–6)", "The bear roars and shakes a cloud of spores from its back. Each creature within 15 feet makes a DC 15 Constitution saving throw. <em>Failure:</em> 18 (4d8) Poison damage, and the target has the Poisoned condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "con", dc: 15, dice: "4d8", dtype: "poison", rech: 5 }),
    feat("Rage", "<em>Bonus Action.</em> The bear moves up to 15 feet toward the nearest enemy without provoking Opportunity Attacks.", "bonus"),
    save("Spore Puff", "<em>Reaction.</em> When a creature within 5 feet hits the bear with a melee attack, spores puff from the wound. The creature makes a DC 15 Constitution saving throw. <em>Failure:</em> 4 (1d8) Poison damage.", { ability: "con", dc: 15, dice: "1d8", dtype: "poison", onSave: "none", activation: "reaction" })
  ] }));
// ---- Darkspear Warden (PL 11, Durability 4.25): HP 213, AC 19, hit +6, standard 10, alpha 20 ----
M.push(npc({ name: "Darkspear Warden", slug: "darkspear-warden", size: "med", type: "undead", cr: 11, ac: 19, hp: 213, speed: 25,
  abil: { str: 20, dex: 10, con: 18, int: 10, wis: 14, cha: 12 }, dr: ["necrotic"], di: ["poison"], ci: ["exhaustion", "frightened", "poisoned"], senses: { darkvision: 120 }, langs: "Dwarvish",
  bio: P("One of Thane Brokk Darkspear's honor guard, risen in rusted plate with a black iron pike. The Wardens defend the treasury and the tomb, and they hate the bears.") + P("<em>BTLT Monster Design: Power Level 11, Durability 4.25.</em>"),
  items: [
    feat("Disposition: Guardian", "The Warden holds its door or post, attacks anyone carrying the Thane's treasure, and never leaves the mausoleum. It stands down if the Darkspear is returned to the Thane's sarcophagus."),
    feat("Multiattack", "This creature makes 2 attack actions per turn from among the below attacks."),
    attack("Darkspear Pike", "<em>Melee Attack Roll:</em> +6, reach 10 ft. <em>Hit:</em> 10 (1d10 + 5) Piercing damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "piercing", reach: 10, wtype: "martialM" }),
    attack("Thrown Spear", "<em>Ranged Attack Roll:</em> +6, range 60/120 ft. <em>Hit:</em> 10 (1d10 + 5) Piercing damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "piercing", range: "ranged", rng: [60, 120], wtype: "martialR" }),
    save("Grave Oath (Recharge 5–6)", "The Warden slams its pike down and speaks the Thane's oath. Each enemy within 15 feet makes a DC 17 Wisdom saving throw. <em>Failure:</em> 20 (4d8 + 2) Necrotic damage, and the target has the Frightened condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "wis", dc: 17, dice: "4d8", bonus: 2, dtype: "necrotic", rech: 5 }),
    feat("Shield Wall", "<em>Bonus Action.</em> One other Darkspear Warden within 5 feet has Half Cover until the start of this Warden's next turn.", "bonus"),
    save("Riposte", "<em>Reaction.</em> When a creature within 10 feet misses the Warden with a melee attack, that creature makes a DC 17 Dexterity saving throw. <em>Failure:</em> 5 (1d10) Piercing damage.", { ability: "dex", dc: 17, dice: "1d10", dtype: "piercing", onSave: "none", activation: "reaction" })
  ] }));
// ---- The Elder Ursa (PL 12, Durability 10, Epic Boss): HP 550, AC 20, hit +11, standard 11, alpha 22 ----
M.push(npc({ name: "The Elder Ursa", slug: "the-elder-ursa", size: "huge", type: "monstrosity", cr: 12, ac: 20, hp: 550, speed: 50, climb: 30,
  abil: { str: 26, dex: 12, con: 24, int: 5, wis: 16, cha: 12 }, di: ["poison"], ci: ["frightened", "poisoned"], senses: { darkvision: 120 },
  bio: P("The ancient matriarch of the mausoleum's bears: a colossal bear grown over with roots, moss and fungus, with the Thane's black iron spear, the Darkspear, still lodged in her shoulder.") + P("<em>BTLT Monster Design: Power Level 12, Durability 10, Epic Boss. Fights with two Spore-Mad Bears.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Elder Ursa never rolls initiative. On initiative count 10 she rolls for recharges, then moves up to her Speed and takes one action: her standard attack or one of her charged actions."),
    feat("Epic Boss Resistance", "If the Elder Ursa fails a saving throw, she can choose to succeed instead. She has Advantage on saving throws against effects that would remove her from the fight."),
    feat("Response", "After each player character's turn, the Elder Ursa takes one Response (one only, not one per enemy). Each Response other than Movement also deals 6 damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Elder Ursa moves up to half her Speed.", "special"),
    feat("Disposition: Tyrant", "The Elder Ursa attacks whoever last hurt one of her bears, then whoever stands nearest the Thane's sarcophagus. She does not leave the tomb."),
    feat("The Darkspear", "A creature within 5 feet of the Elder Ursa can use an action to try to pull the Darkspear from her shoulder (DC 20 Strength (Athletics)). On a success the creature holds the spear, and the Elder Ursa takes 22 (4d10) Piercing damage and loses her Epic Boss Resistance."),
    attack("Claws", "<em>Melee Attack Roll:</em> +11, reach 10 ft. <em>Hit:</em> 11 (1d10 + 6) Slashing damage plus 3 (1d6) Bludgeoning damage.", { hit: 11, dice: "1d10", bonus: 6, dtype: "slashing", reach: 10 }),
    save("Earthshaking Roar (Recharge 5–6)", "The Elder Ursa roars and roots burst from the floor in a 20-foot-radius Sphere centered on a point within 60 feet. Each creature in it makes a DC 19 Strength saving throw. <em>Failure:</em> 22 (4d10) Bludgeoning damage, and the target has the Restrained condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "str", dc: 19, dice: "4d10", dtype: "bludgeoning", rech: 5, tmpl: { type: "sphere", size: "20", units: "ft" } }),
    save("Rampage (Recharge 6)", "The Elder Ursa charges up to her Speed. Each creature in her path makes a DC 19 Dexterity saving throw. <em>Failure:</em> 22 (5d8) Bludgeoning damage, and the target is pushed 15 feet away and has the Prone condition. <em>Success:</em> Half damage only.", { ability: "dex", dc: 19, dice: "5d8", dtype: "bludgeoning", rech: 6 }),
    save("Response: Swipe", "The Elder Ursa swipes one creature within 10 feet. It makes a DC 19 Dexterity saving throw. <em>Failure:</em> 6 (1d12) Slashing damage, and the target has the Prone condition.", { ability: "dex", dc: 19, dice: "1d12", dtype: "slashing", onSave: "none", activation: "special" }),
    save("Response: Crushing Hug", "One creature within 5 feet makes a DC 19 Strength saving throw. <em>Failure:</em> 6 (1d12) Bludgeoning damage, and the target has the Grappled condition (escape DC 19).", { ability: "str", dc: 19, dice: "1d12", dtype: "bludgeoning", onSave: "none", activation: "special" }),
    save("Response: Root Snare", "One creature the Elder Ursa can see within 60 feet makes a DC 19 Strength saving throw. <em>Failure:</em> 6 (1d12) Bludgeoning damage, and the target's Speed is 0 until the end of its next turn.", { ability: "str", dc: 19, dice: "1d12", dtype: "bludgeoning", onSave: "none", activation: "special" })
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
