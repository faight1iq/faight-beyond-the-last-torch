// Builds the 5LEV-1 Archive of the Leper Oracle monsters (run in the Foundry console as GM).
// SOLO BUILD for one level 10 character (John, 2026-10-31). Rescaled 2026-11-02 to Power Level 10 (John) with the
// BTLT Monster Design formulas: HP = 45 x Durability, AC 18 (Epic Bosses 20), hit = Hit Pct / 5, Std Dmg = 90 x Dmg Pct,
// Alpha = 2 x Std, save DC 15. Solo Durability (John's after-action rule): regular creatures 1, bosses 3.
const MOD = "faight-beyond-the-last-torch", CODE = "5LEV-1", NAME = "5LEV-1: Archive of the Leper Oracle";
const ART = `modules/${MOD}/assets/tokens/archive-of-the-leper-oracle`;
let folder = game.folders.find(f => f.type === "Actor" && f.name === NAME);
if (!folder) folder = await Folder.create({ name: NAME, type: "Actor" });
const T = "icons/skills/targeting/crosshair-ringed-gray.webp";
const ICONS = {
  "Init 10 (Epic Boss)": "icons/svg/clockwork.svg",
  "Epic Boss Resistance": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
  "Response": "icons/magic/control/energy-stream-link-white.webp",
  "Response: Movement": "icons/magic/movement/trail-streak-impact-blue.webp",
  "Disposition: Skirmisher": T, "Disposition: Infector": T, "Disposition: Defender": T, "Disposition: Commander": T, "Disposition: Seer": T,
  "Jagged Axe": "icons/skills/melee/strike-slashes-red.webp", "Tusk Rush": "icons/environment/people/charge.webp",
  "Hit and Run": "icons/skills/movement/figure-running-gray.webp", "Blood Frenzy": "icons/skills/wounds/injury-triple-slash-bleed.webp",
  "Rotting Touch": "icons/magic/death/hand-withered-gray.webp", "Grey Rot": "icons/magic/death/hand-withered-gray.webp",
  "Spit Ink": "icons/magic/death/skull-energy-light-purple.webp", "Mindless Copying": "icons/magic/control/hypnosis-mesmerism-swirl.webp",
  "Rubble Body": "icons/magic/defensive/armor-stone-skin.webp", "Stone Fist": "icons/skills/melee/unarmed-punch-fist.webp",
  "Bury": "icons/magic/control/debuff-chains-ropes-blue.webp", "Brace": "icons/magic/defensive/armor-stone-skin.webp",
  "Guardian of the Key": "icons/magic/defensive/shield-barrier-glowing-blue.webp",
  "Cleaver": "icons/skills/melee/strike-sword-slashing-red.webp", "Skull-Splitter": "icons/skills/melee/strike-sword-slashing-red.webp",
  "Bloodtusk Command": "icons/environment/people/charge.webp", "Response: Shield Slam": "icons/skills/melee/unarmed-punch-fist.webp",
  "Stolen Flask": "icons/svg/invisible.svg",
  "Withering Grasp": "icons/magic/death/hand-withered-gray.webp", "Prophecy of Ruin": "icons/magic/control/fear-fright-shadow-monster-purple.webp",
  "Grey Bloom": "icons/magic/death/skull-energy-light-purple.webp", "Burn the Prophecies": "icons/magic/symbols/runes-star-pentagon-blue.webp",
  "Foretold": "icons/magic/defensive/illusion-evasion-echo-purple.webp", "Response: Whispered Doom": "icons/magic/control/fear-fright-shadow-monster-purple.webp",
  "Response: Rot Lash": "icons/magic/death/hand-withered-gray.webp"
};
const FALLBACK = ["icons/magic/death/hand-withered-gray.webp", "icons/svg/skull.svg"];
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
// ---- Orc Raider (skirmisher; PL 10, Dur 1, Hit 55, Dmg 20): HP 45, AC 18, hit +11, std 18, alpha 36 ----
M.push(npc({ name: "Orc Raider", slug: "orc-raider", size: "med", type: "humanoid", cr: 10, ac: 18, hp: 45, speed: 30,
  abil: { str: 18, dex: 14, con: 16, int: 8, wis: 11, cha: 10 }, senses: { darkvision: 60 }, skills: { itm: { value: 1 } }, langs: "Common, Orc",
  bio: P("A Bloodtusk raider in scavenged hide and iron, tusks capped with copper. The band came for the archive's treasure and found it already guarded.") + P("<em>Solo build: Power Level 10, Durability 1, Hit Pct 55, Dmg Pct 20. Role: skirmisher.</em>"),
  items: [
    feat("Disposition: Skirmisher", "The raider darts in, hits, and gets out of reach, trying to draw the hero away from cover and toward its friends."),
    attack("Jagged Axe", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 18 (4d6 + 4) Slashing damage.", { hit: 11, dice: "4d6", bonus: 4, dtype: "slashing", wtype: "martialM" }),
    attack("Tusk Rush (Recharge 5–6)", "The raider moves up to 20 feet in a straight line and makes this attack at the end. <em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 36 (8d6 + 8) Slashing damage, and the target has the Prone condition if it is Medium or smaller.", { hit: 11, dice: "8d6", bonus: 8, dtype: "slashing", rech: 5 }),
    feat("Hit and Run", "<em>Bonus Action.</em> The raider takes the Disengage action.", "bonus"),
    feat("Blood Frenzy", "While the raider is Bloodied, it has Advantage on attack rolls but attackers also have Advantage against it.")
  ] }));
// ---- Rot Scribe (infector; PL 10, Dur 1, Hit 45, Dmg 15): HP 45, AC 18, hit +9, std 14, alpha 28 ----
M.push(npc({ name: "Rot Scribe", slug: "rot-scribe", size: "med", type: "undead", cr: 10, ac: 18, hp: 45, speed: 25,
  abil: { str: 10, dex: 12, con: 14, int: 12, wis: 8, cha: 6 }, di: ["poison"], ci: ["exhaustion", "poisoned"], senses: { darkvision: 60 }, langs: "understands Common but cannot speak",
  bio: P("One of the Oracle's scribes, dead for centuries and held up by the grey rot that crawls under its skin. It still sits at its desk copying prophecies in ink that is half mould.") + P("<em>Solo build: Power Level 10, Durability 1 each (3 in the room), Hit Pct 45, Dmg Pct 15. Role: infector.</em>"),
  items: [
    feat("Disposition: Infector", "The scribes ignore the hero until disturbed; then all three shuffle toward the nearest living creature and try to touch it."),
    feat("Grey Rot", "A creature that takes Necrotic damage from a Rot Scribe has its Hit Point maximum reduced by the same amount. The reduction lasts until the creature finishes a Long Rest or is the target of <em>Lesser Restoration</em> or similar magic."),
    attack("Rotting Touch", "<em>Melee Attack Roll:</em> +9, reach 5 ft. <em>Hit:</em> 14 (2d8 + 5) Necrotic damage.", { hit: 9, dice: "2d8", bonus: 5, dtype: "necrotic" }),
    save("Spit Ink (Recharge 5–6)", "The scribe spits a stream of rotten ink at one creature within 30 feet, which makes a DC 15 Constitution saving throw. <em>Failure:</em> 28 (4d8 + 10) Necrotic damage, and the target has the Blinded condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "con", dc: 15, dice: "4d8", bonus: 10, dtype: "necrotic", rech: 5 }),
    feat("Mindless Copying", "If no living creature is within 30 feet at the start of its turn, the scribe sits down and goes back to copying.")
  ] }));
// ---- Rubble Warden (defender; PL 10, Dur 1, Hit 45, Dmg 25): HP 45, AC 18, hit +9, std 23, alpha 46 ----
M.push(npc({ name: "Rubble Warden", slug: "rubble-warden", size: "lg", type: "construct", cr: 10, ac: 18, hp: 45, speed: 20,
  abil: { str: 22, dex: 6, con: 20, int: 3, wis: 10, cha: 1 }, dr: ["piercing", "slashing"], di: ["poison", "psychic"], ci: ["charmed", "exhaustion", "frightened", "paralyzed", "petrified", "poisoned"], senses: { darkvision: 60 },
  bio: P("A guardian statue that fell when the rotunda's ceiling came down. When anyone digs into the rubble, the broken stone pulls itself together around the statue's torso and stands up to guard the key beneath it.") + P("<em>Solo build: Power Level 10, Durability 1, Hit Pct 45, Dmg Pct 25. Role: defender.</em>"),
  items: [
    feat("Disposition: Defender", "The Warden never leaves the rotunda and stays between the hero and the rubble pile where the key lies."),
    feat("Rubble Body", "The ground within 5 feet of the Warden is Difficult Terrain for other creatures."),
    feat("Guardian of the Key", "While the Warden stands on or next to the rubble pile, it has Advantage on saving throws."),
    attack("Stone Fist", "<em>Melee Attack Roll:</em> +9, reach 10 ft. <em>Hit:</em> 23 (4d8 + 5) Bludgeoning damage.", { hit: 9, dice: "4d8", bonus: 5, dtype: "bludgeoning", reach: 10 }),
    save("Bury (Recharge 5–6)", "The Warden brings down a heap of stone on one creature within 10 feet, which makes a DC 15 Strength saving throw. <em>Failure:</em> 46 (8d8 + 10) Bludgeoning damage, and the target has the Restrained condition under the stones (escape: an action and a DC 15 Strength (Athletics) check). <em>Success:</em> Half damage only.", { ability: "str", dc: 15, dice: "8d8", bonus: 10, dtype: "bludgeoning", rech: 5 }),
    feat("Brace", "<em>Reaction.</em> When the Warden is hit by an attack, it reduces the damage by 10.", "reaction")
  ] }));
// ---- Orc War-Chief (commander, Epic; PL 10, Dur 3, Hit 55, Dmg 20): HP 135, AC 20, hit +11, std 18, alpha 36 ----
M.push(npc({ name: "Orc War-Chief", slug: "orc-war-chief", size: "med", type: "humanoid", cr: 10, ac: 20, hp: 135, speed: 30,
  abil: { str: 20, dex: 12, con: 18, int: 10, wis: 12, cha: 16 }, ci: ["frightened"], senses: { darkvision: 60 }, skills: { itm: { value: 1 } }, langs: "Common, Orc",
  bio: P("Gruk Halfear, chief of the Bloodtusks, missing most of his left ear and none of his pride. He broke into the archive through the Steward's Room and has made the Pedestal Hall his camp.") + P("<em>Solo build: Power Level 10, Durability 3, Hit Pct 55, Dmg Pct 20, Epic Boss commander. Fights with one Orc Raider.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The War-Chief never rolls initiative. On initiative count 10 he rolls for recharges, then moves up to his Speed and takes one action."),
    feat("Epic Boss Resistance", "If the War-Chief fails a saving throw, he can choose to succeed instead. He has Advantage on saving throws against effects that would remove him from the fight."),
    feat("Response", "After the hero's turn, the War-Chief takes one Response. Each Response other than Movement deals 9 (2d4 + 4) damage, half a standard hit, to its target."),
    feat("Response: Movement", "The War-Chief moves up to half his Speed.", "special"),
    feat("Disposition: Commander", "Gruk sends his raider in first and fights from behind it. He bellows challenges and boasts about the treasure he will carry home."),
    feat("Stolen Flask", "The first time the War-Chief is Bloodied, if the Potion of Invisibility is still on its pedestal within 30 feet, he drinks it as a Bonus Action (moving to it first if he must), and has the Invisible condition until he attacks."),
    attack("Cleaver", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 18 (4d6 + 4) Slashing damage.", { hit: 11, dice: "4d6", bonus: 4, dtype: "slashing", wtype: "martialM" }),
    attack("Skull-Splitter (Recharge 5–6)", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 36 (8d6 + 8) Slashing damage, and the target can't take Reactions until the start of its next turn.", { hit: 11, dice: "8d6", bonus: 8, dtype: "slashing", rech: 5 }),
    feat("Bloodtusk Command (Recharge 5–6)", "Each Orc Raider of his band moves up to its Speed and makes one Jagged Axe attack, using none of its own actions.", "action", 5),
    attack("Response: Shield Slam", "<em>Melee Attack Roll:</em> +11, reach 5 ft. <em>Hit:</em> 9 (2d4 + 4) Bludgeoning damage, and the target is pushed 5 feet.", { hit: 11, dice: "2d4", bonus: 4, dtype: "bludgeoning", activation: "special" })
  ] }));
// ---- The Leper Oracle (Epic Boss; PL 10, Dur 3, Hit 55, Dmg 20): HP 135, AC 20, hit +11, std 18, alpha 36 ----
M.push(npc({ name: "The Leper Oracle", slug: "the-leper-oracle", size: "med", type: "undead", cr: 10, ac: 20, hp: 135, speed: 20, fly: 20,
  abil: { str: 10, dex: 12, con: 18, int: 16, wis: 22, cha: 18 }, dr: ["necrotic"], di: ["poison"], ci: ["charmed", "exhaustion", "frightened", "poisoned"], senses: { truesight: 60 }, langs: "Common, Elvish, Sylvan",
  bio: P("Mother Ysolde, the Leper Oracle. Every vision she ever had was paid for with her flesh to the grey rot. She died on her seat centuries ago, and the rot keeps her there, wrapped in grey rags, still whispering what is to come.") + P("<em>Solo build: Power Level 10, Durability 3, Hit Pct 55, Dmg Pct 20, Epic Boss. Fights alone.</em>"),
  items: [
    feat("Init 10 (Epic Boss)", "The Oracle never rolls initiative. On initiative count 10 she rolls for recharges, then moves up to her Speed and takes one action."),
    feat("Epic Boss Resistance", "If the Oracle fails a saving throw, she can choose to succeed instead. She has Advantage on saving throws against effects that would remove her from the fight. She loses this trait when two of the prophecy piles around her dais have burned."),
    feat("Response", "After the hero's turn, the Oracle takes one Response. Each Response other than Movement deals 9 (2d4 + 4) damage, half a standard hit, to its target."),
    feat("Response: Movement", "The Oracle drifts up to half her Speed.", "special"),
    feat("Disposition: Seer", "The Oracle has already seen this fight. She speaks the hero's next move aloud before it happens and stays near her dais and her prophecies."),
    feat("Burn the Prophecies", "Piles of prophecy scrolls ring the dais. A creature within 5 feet of a pile can set it alight with fire (an action) or tip it into a candle brazier (an action and a DC 15 Strength check). Each time a pile burns, the Oracle screams, takes 10 Psychic damage and loses her next Response. There are four piles. When two piles have burned, she loses Epic Boss Resistance."),
    feat("Foretold", "Attack rolls against the Oracle can't gain Advantage."),
    attack("Withering Grasp", "<em>Melee Attack Roll:</em> +11, reach 10 ft (grey rag tendrils). <em>Hit:</em> 18 (4d6 + 4) Necrotic damage.", { hit: 11, dice: "4d6", bonus: 4, dtype: "necrotic", reach: 10 }),
    save("Prophecy of Ruin (Recharge 5–6)", "The Oracle tells one creature she can see within 60 feet how it dies. It makes a DC 15 Wisdom saving throw. <em>Failure:</em> 36 (8d6 + 8) Psychic damage, and the target has Disadvantage on attack rolls until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "wis", dc: 15, dice: "8d6", bonus: 8, dtype: "psychic", rech: 5 }),
    save("Grey Bloom (Recharge 6)", "Grey rot bursts from the Oracle's rags. Each creature within 15 feet makes a DC 15 Constitution saving throw. <em>Failure:</em> 36 (8d6 + 8) Necrotic damage, and the target can't regain Hit Points until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "con", dc: 15, dice: "8d6", bonus: 8, dtype: "necrotic", rech: 6, tmpl: { type: "radius", size: "15", units: "ft" } }),
    save("Response: Whispered Doom", "One creature within 60 feet makes a DC 15 Wisdom saving throw. <em>Failure:</em> 9 (2d4 + 4) Psychic damage, and the target has the Frightened condition until the end of its next turn.", { ability: "wis", dc: 15, dice: "2d4", bonus: 4, dtype: "psychic", onSave: "none", activation: "special" }),
    attack("Response: Rot Lash", "<em>Melee Attack Roll:</em> +11, reach 10 ft. <em>Hit:</em> 9 (2d4 + 4) Necrotic damage.", { hit: 11, dice: "2d4", bonus: 4, dtype: "necrotic", activation: "special" })
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
