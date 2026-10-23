// Monster variety pass (2026-10-23): gives every regular monster in 5LEI to 5LEI-5 its own combat role and
// signature mechanic, and de-duplicates the bosses' charged actions and Responses.
// Run in the Foundry console as GM (cfg.only = ["5LEI-3"] limits it to some dungeons; cfg.dry = true reports only):
//   const run = new (Object.getPrototypeOf(async function(){}).constructor)("cfg", await (await fetch('/modules/faight-beyond-the-last-torch/dev/dungeon/remake_monsters.js?'+Date.now())).text());
//   await run({});
// Changes ONLY the listed actors' items (and a few traits, senses and speeds noted below). Actor IDs, HP, AC, art,
// tokens and journals stay. Numbers are each monster's existing hit bonus, standard damage and save DC.
// Bosses: only the named items are replaced or removed; the rest of the boss stays as built.
const MOD = cfg.mod || "faight-beyond-the-last-torch";
const rid = () => foundry.utils.randomID();
const P = t => `<p>${t}</p>`;
const act = type => ({ type, value: 1 });
const uses = r => r ? { max: "1", spent: 0, recovery: [{ period: "recharge", formula: String(r) }] } : {};
const cons = r => r ? { targets: [{ type: "itemUses", target: "", value: "1" }], scaling: { allowed: false } } : undefined;
const desc = (name, text) => ({ value: P(`<strong><em>${name}.</em></strong> ${text}`) });
function feat(name, text, activation = "") {
  const it = { name, type: "feat", system: { description: desc(name, text), type: { value: "monster" } } };
  if (activation) { const id = rid(); it.system.activities = { [id]: { _id: id, type: "utility", activation: act(activation), name: "" } }; }
  return it;
}
// extra: [[number, faces, type], ...] added to the hit's damage (e.g. a bite's added cold damage)
function attack(name, text, { hit, dice, bonus = "", dtype, range = "melee", reach = 5, rng = null, rech = null, activation = "action", wtype = "natural", extra = [] }) {
  const id = rid(); const [n, d] = dice.split("d").map(Number);
  return { name, type: "weapon", system: {
    description: desc(name, text), type: { value: wtype }, equipped: true, proficient: 1,
    range: range === "melee" ? { reach, units: "ft" } : { value: rng[0], long: rng[1], units: "ft" },
    damage: { base: { number: n, denomination: d, bonus: String(bonus), types: [dtype] } }, uses: uses(rech),
    activities: { [id]: { _id: id, type: "attack", activation: act(activation),
      attack: { flat: true, bonus: String(hit), type: { value: range === "melee" ? "melee" : "ranged", classification: "weapon" } },
      damage: { includeBase: true, parts: extra.map(([a, b, t]) => ({ number: a, denomination: b, bonus: "", types: [t] })) }, consumption: cons(rech) } } } };
}
function save(name, text, { ability, dc, dice, bonus = "", dtype, onSave = "half", rech = null, activation = "action", tmpl = null }) {
  const id = rid();
  const parts = dice ? [{ number: Number(dice.split("d")[0]), denomination: Number(dice.split("d")[1]), bonus: String(bonus), types: [dtype] }] : [];
  const a = { _id: id, type: "save", activation: act(activation), save: { ability: [ability], dc: { calculation: "", formula: String(dc) } }, damage: { onSave, parts }, consumption: cons(rech) };
  if (tmpl) a.target = { template: tmpl, affects: { type: "creature" } };
  return { name, type: "feat", system: { description: desc(name, text), type: { value: "monster" }, uses: uses(rech), activities: { [id]: a } } };
}
const MA = n => feat("Multiattack", n);
const SWARM = feat("Swarm", "The swarm can occupy another creature's space and vice versa, and it can move through any opening large enough for a Tiny creature. It can't regain Hit Points or gain Temporary Hit Points.");

// ---------------------------------------------------------------- regular monsters (all items replaced)
const R = {
"5LEI": {
  "rime-spider": { items: [
    feat("Disposition: Ambusher", "The spider waits motionless on the ceiling, drops onto the last creature in line, then climbs back out of reach."),
    feat("Spider Climb", "The spider can climb difficult surfaces, including along ceilings, without needing to make an ability check."),
    feat("Ceiling Lurker", "While the spider is on a ceiling and hasn't moved this turn, it has Advantage on Dexterity (Stealth) checks, and creatures below it don't notice it without a DC 15 Wisdom (Perception) check."),
    attack("Bite", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 8 (1d8 + 4) Piercing damage.", { hit: 5, dice: "1d8", bonus: 4, dtype: "piercing" }),
    attack("Drop Strike", "The spider drops from a ceiling onto a creature below it. Usable only while the spider is on a ceiling. <em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 8 (1d8 + 4) Piercing damage plus 9 (2d8) Cold damage, and the target has the Prone condition.", { hit: 5, dice: "1d8", bonus: 4, dtype: "piercing", extra: [[2, 8, "cold"]] }),
    feat("Climb Away", "<em>Bonus Action.</em> The spider climbs up to its Climb Speed toward a wall or ceiling without provoking Opportunity Attacks.", "bonus")
  ] },
  "rime-spider-swarm": { items: [
    SWARM,
    feat("Disposition: Tide", "The swarm spreads across the floor where the party stands and stays there, turning the room into frozen web."),
    feat("Frozen Web Floor", "The swarm's space and every space within 5 feet of it are Difficult Terrain. A creature that starts its turn in the swarm's space takes 4 (1d8) Cold damage."),
    feat("Split", "The first time the swarm is Bloodied, it splits into two swarms in adjacent spaces, each with half its remaining Hit Points."),
    attack("Bites", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 9 (2d8) Piercing damage, or 4 (1d8) Piercing damage if the swarm is Bloodied.", { hit: 5, dice: "2d8", dtype: "piercing" })
  ] },
  "rime-spider-hunter": { items: [
    feat("Disposition: Controller", "The hunter picks the strongest-looking creature, pulls it away from its friends, and wraps it up."),
    feat("Spider Climb", "The hunter can climb difficult surfaces, including along ceilings, without needing to make an ability check."),
    MA("The hunter makes two attacks, using Bite or Web Line in any combination."),
    attack("Bite", "<em>Melee Attack Roll:</em> +6, reach 5 ft. <em>Hit:</em> 9 (1d10 + 4) Piercing damage.", { hit: 6, dice: "1d10", bonus: 4, dtype: "piercing" }),
    attack("Web Line", "<em>Ranged Attack Roll:</em> +6, range 60 ft. <em>Hit:</em> 9 (1d10 + 4) Cold damage, and the target is pulled up to 20 feet straight toward the hunter and has the Grappled condition (escape DC 15).", { hit: 6, dice: "1d10", bonus: 4, dtype: "cold", range: "ranged", rng: [60, 60] }),
    save("Cocoon (Recharge 5–6)", "The hunter wraps one Grappled or Prone creature within 5 feet. The target makes a DC 15 Dexterity saving throw. <em>Failure:</em> 4 (1d8) Cold damage, and the target is sealed in a frozen cocoon: it has the Restrained condition until the cocoon is destroyed (AC 12, 20 HP, Vulnerability to Fire). <em>Success:</em> Half damage only.", { ability: "dex", dc: 15, dice: "1d8", dtype: "cold", rech: 5 })
  ] },
  "rime-brood-mother": { items: [
    feat("Disposition: Brood Keeper", "The brood mother stays at the center of her lair, fills it with hatchlings, and eats them to heal."),
    feat("Spider Climb", "The brood mother can climb difficult surfaces, including along ceilings, without needing to make an ability check."),
    MA("The brood mother makes two attacks: one Bite and one Crushing Leg."),
    attack("Bite", "<em>Melee Attack Roll:</em> +10, reach 10 ft. <em>Hit:</em> 10 (1d10 + 5) Piercing damage.", { hit: 10, dice: "1d10", bonus: 5, dtype: "piercing", reach: 10 }),
    attack("Crushing Leg", "<em>Melee Attack Roll:</em> +10, reach 15 ft. <em>Hit:</em> 10 (1d10 + 5) Bludgeoning damage.", { hit: 10, dice: "1d10", bonus: 5, dtype: "bludgeoning", reach: 15 }),
    feat("Hatch", "<em>Bonus Action.</em> 1d4 Rime Hatchlings crawl out of the egg sacs into unoccupied spaces within 15 feet of her. They act right after her on her initiative. <em>Rime Hatchling:</em> Tiny beast, AC 12, 1 HP, Speed 30 ft., Climb 30 ft.; Bite +5, reach 5 ft., 3 (1d4 + 1) Cold damage.", "bonus"),
    save("Feed (Recharge 5–6)", "The brood mother eats one Rime Hatchling within 10 feet of her and regains 25 Hit Points. Frost bursts from the hatchling: each other creature within 10 feet of it makes a DC 19 Constitution saving throw. <em>Failure:</em> 5 (1d10) Cold damage, and the target's Speed is halved until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "con", dc: 19, dice: "1d10", dtype: "cold", rech: 5 })
  ] }
},
"5LEI-2": {
  "dune-scorpion": { senses: { tremorsense: 60, darkvision: 60 }, items: [
    feat("Disposition: Ambusher", "The scorpion waits buried in the sand, bursts up under the nearest creature, and holds it until it stops moving."),
    feat("Sand Buried", "While burrowed in sand, the scorpion can't be seen by creatures without Tremorsense, and it knows where every creature touching the ground within 60 feet is."),
    attack("Sting", "<em>Melee Attack Roll:</em> +5, reach 10 ft. <em>Hit:</em> 8 (1d8 + 4) Piercing damage.", { hit: 5, dice: "1d8", bonus: 4, dtype: "piercing", reach: 10 }),
    attack("Erupt and Seize", "Usable only if the scorpion starts its turn burrowed. It moves up to its Burrow Speed, surfaces next to a creature and grabs it. <em>Melee Attack Roll:</em> +5 with Advantage, reach 5 ft. <em>Hit:</em> 8 (1d8 + 4) Bludgeoning damage, and the target has the Grappled condition (escape DC 14). While Grappled this way, the target has the Poisoned condition.", { hit: 5, dice: "1d8", bonus: 4, dtype: "bludgeoning" }),
    feat("Sink", "<em>Bonus Action.</em> If the scorpion isn't grappling a creature, it burrows into the sand and moves up to its Burrow Speed without provoking Opportunity Attacks.", "bonus")
  ] },
  "scorpion-swarm": { dr: [], items: [
    SWARM,
    feat("Disposition: Carpet", "The swarm pours over the ground where the most creatures stand and stays there."),
    feat("Many Bodies", "The swarm takes half damage from attacks and from spells that target only one creature, and double damage from effects that cover an area."),
    feat("Stinging Carpet (Aura 10 ft.)", "A creature that starts its turn within 10 feet of the swarm takes 4 (1d8) Poison damage."),
    attack("Stings", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 9 (2d8) Piercing damage, or 4 (1d8) Piercing damage if the swarm is Bloodied.", { hit: 5, dice: "2d8", dtype: "piercing" })
  ] },
  "ogre-brute": { items: [
    feat("Disposition: Thrower", "The brute grabs the smallest creature it can reach and throws it at the biggest."),
    feat("Reckless", "At the start of its turn, the brute can gain Advantage on its attack rolls this turn. If it does, attack rolls against it have Advantage until the start of its next turn."),
    attack("Club", "<em>Melee Attack Roll:</em> +6, reach 10 ft. <em>Hit:</em> 9 (1d8 + 5) Bludgeoning damage.", { hit: 6, dice: "1d8", bonus: 5, dtype: "bludgeoning", reach: 10, wtype: "simpleM" }),
    attack("Grab", "<em>Melee Attack Roll:</em> +6, reach 10 ft. <em>Hit:</em> 9 (1d8 + 5) Bludgeoning damage, and the target has the Grappled condition (escape DC 15) if it is Medium or smaller. The brute can hold one creature.", { hit: 6, dice: "1d8", bonus: 5, dtype: "bludgeoning", reach: 10 }),
    save("Throw", "The brute throws the creature it is grappling up to 30 feet. The thrown creature takes 9 (2d8) Bludgeoning damage and lands with the Prone condition. If it is thrown at another creature, that creature makes a DC 15 Dexterity saving throw. <em>Failure:</em> 9 (2d8) Bludgeoning damage and the Prone condition. <em>Success:</em> No damage.", { ability: "dex", dc: 15, dice: "2d8", dtype: "bludgeoning", onSave: "none" })
  ] },
  "ogre-bone-chief": { items: [
    feat("Disposition: Leader", "The chief stays behind his ogres, beats the war drum, and sends them at whoever hurts him."),
    MA("The chief makes two Maul attacks."),
    attack("Maul", "<em>Melee Attack Roll:</em> +10, reach 10 ft. <em>Hit:</em> 10 (1d10 + 5) Bludgeoning damage.", { hit: 10, dice: "1d10", bonus: 5, dtype: "bludgeoning", reach: 10, wtype: "martialM" }),
    save("War Drum (Recharge 5–6)", "The chief beats the bone drum. Each allied ogre within 60 feet can use its Reaction to move up to half its Speed and make one attack. Each enemy within 30 feet makes a DC 17 Wisdom saving throw. <em>Failure:</em> 5 (1d10) Psychic damage, and the target has the Frightened condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "wis", dc: 17, dice: "1d10", dtype: "psychic", rech: 5 }),
    feat("Bellow Orders", "<em>Bonus Action.</em> One allied ogre the chief can see within 60 feet moves up to half its Speed without provoking Opportunity Attacks.", "bonus"),
    feat("Not Me", "<em>Reaction.</em> When the chief is hit by an attack while an allied ogre is within 5 feet of him, he pulls that ogre into the way. The attack hits the ogre instead.", "reaction")
  ] },
  "void-touched-scorpion": { items: [
    feat("Disposition: Teleporter", "The scorpion blinks around the fight, stings whoever is healing others, and never stays where it was last seen."),
    MA("The scorpion makes two attacks: one Pincer and one Void Sting."),
    attack("Pincer", "<em>Melee Attack Roll:</em> +6, reach 5 ft. <em>Hit:</em> 10 (1d10 + 5) Bludgeoning damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "bludgeoning" }),
    attack("Void Sting", "<em>Melee Attack Roll:</em> +6, reach 10 ft. <em>Hit:</em> 10 (1d10 + 5) Force damage, and the target regains only half the Hit Points from any healing until the end of its next turn.", { hit: 6, dice: "1d10", bonus: 5, dtype: "force", reach: 10 }),
    feat("Blink", "<em>Bonus Action.</em> The scorpion teleports up to 30 feet to an unoccupied space it can see.", "bonus"),
    feat("Swap Places", "<em>Reaction.</em> When a creature the scorpion can see within 30 feet hits it with an attack, the scorpion and that creature trade places by teleporting.", "reaction")
  ] }
},
"5LEI-3": {
  "warren-swarm": { items: [
    SWARM,
    feat("Disposition: Disrupter", "The swarm pours under the feet of spellcasters and anyone holding a spell."),
    feat("Underfoot", "A creature in the swarm's space has Disadvantage on Constitution saving throws to maintain Concentration and can't take Reactions."),
    feat("Split", "The first time the swarm is Bloodied, it splits into two swarms in adjacent spaces, each with half its remaining Hit Points."),
    attack("Gnawing Bites", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 8 (2d6 + 1) Piercing damage, or 4 (1d6 + 1) Piercing damage if the swarm is Bloodied.", { hit: 5, dice: "2d6", bonus: 1, dtype: "piercing" })
  ] },
  "thunder-hare": { items: [
    feat("Disposition: Hit and Run", "The hare darts in, kicks someone across the room, and bounds away before anyone can answer."),
    MA("The hare makes two attacks: one Bite and one Kick."),
    attack("Bite", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 9 (1d10 + 4) Piercing damage.", { hit: 5, dice: "1d10", bonus: 4, dtype: "piercing" }),
    attack("Kick", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 9 (2d4 + 4) Bludgeoning damage, and the target is pushed up to 15 feet straight away from the hare.", { hit: 5, dice: "2d4", bonus: 4, dtype: "bludgeoning" }),
    feat("Bound", "<em>Bonus Action.</em> The hare leaps up to 40 feet without provoking Opportunity Attacks.", "bonus")
  ] },
  "stormguard-sentinel": { items: [
    feat("Disposition: Defender", "The sentinel stands beside its allies and takes the blows meant for them. It never leaves its post."),
    feat("Lightning Rod", "Any line or bolt of lightning (spell or ability) that passes within 30 feet of the sentinel is drawn to it instead and deals no damage to it. Its next Thunder Spear hit deals an extra 7 (2d6) Lightning damage."),
    MA("The sentinel makes two attacks, using Thunder Spear or Bolt Javelin in any combination."),
    attack("Thunder Spear", "<em>Melee Attack Roll:</em> +6, reach 10 ft. <em>Hit:</em> 9 (1d8 + 5) Piercing damage.", { hit: 6, dice: "1d8", bonus: 5, dtype: "piercing", reach: 10, wtype: "martialM" }),
    attack("Bolt Javelin", "<em>Ranged Attack Roll:</em> +6, range 60/120 ft. <em>Hit:</em> 9 (1d8 + 5) Lightning damage.", { hit: 6, dice: "1d8", bonus: 5, dtype: "lightning", range: "ranged", rng: [60, 120], wtype: "martialR" }),
    feat("Interpose", "<em>Reaction.</em> When a creature within 5 feet of the sentinel is targeted by an attack, the sentinel becomes the target instead.", "reaction")
  ] },
  "galvanic-jackalope": { items: [
    feat("Disposition: Artillery", "The jackalope stays at the far edge of the fight behind pillars and fires at whoever stands closest to their friends."),
    MA("The jackalope makes two attacks, using Antler Gore or Arc Bolt in any combination."),
    attack("Antler Gore", "<em>Melee Attack Roll:</em> +6, reach 5 ft. <em>Hit:</em> 10 (1d10 + 5) Piercing damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "piercing" }),
    attack("Arc Bolt", "<em>Ranged Attack Roll:</em> +6, range 120 ft. <em>Hit:</em> 10 (3d6) Lightning damage. Once per turn, the lightning then jumps to every other creature within 10 feet of the target, dealing 5 (1d10) Lightning damage to each.", { hit: 6, dice: "3d6", dtype: "lightning", range: "ranged", rng: [120, 120] }),
    feat("Bound Back", "<em>Bonus Action.</em> The jackalope moves up to 20 feet away from the nearest enemy without provoking Opportunity Attacks.", "bonus")
  ] }
},
"5LEI-4": {
  "moss-bear": { items: [
    feat("Disposition: Grappler", "The bear lies still in the moss until someone walks past, then hugs them and drags them off to the den."),
    feat("Moss Camouflage", "While motionless among plants, the bear can't be told apart from the moss without a DC 15 Wisdom (Perception) check, and it has Advantage on Dexterity (Stealth) checks."),
    attack("Claws", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 8 (1d8 + 4) Slashing damage.", { hit: 5, dice: "1d8", bonus: 4, dtype: "slashing" }),
    attack("Bear Hug", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 8 (1d8 + 4) Bludgeoning damage, and the target has the Grappled condition (escape DC 14). While Grappled this way, the target has the Restrained condition. The bear moves at full Speed while dragging the creature it holds.", { hit: 5, dice: "1d8", bonus: 4, dtype: "bludgeoning" })
  ] },
  "tomb-jelly": { items: [
    feat("Disposition: Engulfer", "The jelly lies flat until someone steps beside it, then flows over them and does not let go."),
    feat("Transparent", "Even when the jelly is in plain sight, a creature must succeed on a DC 15 Wisdom (Perception) check to notice it if the jelly hasn't moved or attacked."),
    feat("Corrosive Body", "A nonmagical weapon that hits the jelly takes a permanent −1 penalty to damage rolls. At −5 the weapon is destroyed."),
    feat("Split", "When the jelly takes Slashing or Lightning damage and has at least 10 Hit Points left, it splits into two jellies, each with half its Hit Points (rounded down)."),
    attack("Pseudopod", "<em>Melee Attack Roll:</em> +5, reach 10 ft. <em>Hit:</em> 9 (2d8) Acid damage.", { hit: 5, dice: "2d8", dtype: "acid", reach: 10 }),
    save("Engulf", "The jelly moves up to its Speed into one Large or smaller creature's space. The target makes a DC 14 Dexterity saving throw. <em>Failure:</em> The target is engulfed: it has the Restrained condition, can't breathe, and takes 9 (2d8) Acid damage at the start of each of its turns. It escapes with an action and a DC 14 Strength (Athletics) check. The jelly can hold one creature. <em>Success:</em> The target is pushed 5 feet out of the jelly's way.", { ability: "dex", dc: 14, dice: "2d8", dtype: "acid", onSave: "none" })
  ] },
  "sporemad-bear": { items: [
    feat("Disposition: Berserker", "The bear charges whatever moved last and fights harder the more it is hurt."),
    feat("Spore Rage", "While Bloodied, the bear makes one extra Maul attack when it uses Multiattack."),
    feat("Death Spores", "When the bear dies, it bursts. Each creature within 15 feet makes a DC 15 Constitution saving throw. <em>Failure:</em> 4 (1d8) Poison damage and the Poisoned condition for 1 minute (repeat the save at the end of each turn). <em>Success:</em> No effect."),
    MA("The bear makes two attacks: one Bite and one Maul."),
    attack("Bite", "<em>Melee Attack Roll:</em> +6, reach 5 ft. <em>Hit:</em> 9 (1d8 + 5) Piercing damage.", { hit: 6, dice: "1d8", bonus: 5, dtype: "piercing" }),
    attack("Maul", "<em>Melee Attack Roll:</em> +6, reach 5 ft. <em>Hit:</em> 9 (1d8 + 5) Slashing damage.", { hit: 6, dice: "1d8", bonus: 5, dtype: "slashing" })
  ] },
  "darkspear-warden": { items: [
    feat("Disposition: Phalanx", "The Wardens hold doorways shoulder to shoulder, pikes out. They never chase, and they never leave the mausoleum."),
    feat("Hold the Line", "When a creature the Warden can see enters a space within its 10-foot reach, that creature's Speed becomes 0 until the end of its turn."),
    feat("Undying Oath", "The first time the Warden drops to 0 Hit Points, it drops to 1 Hit Point instead, unless the damage was Radiant or came from the Darkspear."),
    MA("The Warden makes two attacks, using Darkspear Pike or Thrown Spear in any combination."),
    attack("Darkspear Pike", "<em>Melee Attack Roll:</em> +6, reach 10 ft. <em>Hit:</em> 10 (1d10 + 5) Piercing damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "piercing", reach: 10, wtype: "martialM" }),
    attack("Thrown Spear", "<em>Ranged Attack Roll:</em> +6, range 60/120 ft. <em>Hit:</em> 10 (1d10 + 5) Piercing damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "piercing", range: "ranged", rng: [60, 120], wtype: "martialR" }),
    feat("Set Against the Charge", "<em>Reaction.</em> When a creature moves into the Warden's reach, the Warden makes one Darkspear Pike attack against it.", "reaction")
  ] }
},
"5LEI-5": {
  "venom-grub": { items: [
    feat("Disposition: Leech", "The grub burrows under the nearest warm body, latches on, and feeds until it is pulled off."),
    attack("Bite", "<em>Melee Attack Roll:</em> +5, reach 5 ft (Advantage if the grub started its turn burrowed). <em>Hit:</em> 8 (1d8 + 4) Piercing damage, and the grub latches on: the target has the Grappled condition (escape DC 14, or another creature can pull the grub off as an action). While latched, the grub moves with the target, and the target takes 4 (1d8) Poison damage at the start of each of its turns.", { hit: 5, dice: "1d8", bonus: 4, dtype: "piercing" }),
    feat("Burrow Down", "<em>Bonus Action.</em> If the grub isn't latched onto a creature, it burrows into the mud and moves up to its Burrow Speed without provoking Opportunity Attacks.", "bonus")
  ] },
  "wormridden-corpse": { walk: 20, items: [
    feat("Disposition: Infector", "The corpse shuffles toward the nearest living creature, grabs it, and holds on while the venom works."),
    feat("Rot-Venom", "A creature hit by the corpse's Slam can't regain Hit Points until the end of its next turn."),
    feat("Burst of Grubs", "When the corpse dies, its body splits open. Each creature within 5 feet makes a DC 14 Dexterity saving throw. <em>Failure:</em> 4 (1d8) Poison damage and the Poisoned condition until the end of its next turn. <em>Success:</em> No effect."),
    MA("The corpse makes two Slam attacks."),
    attack("Slam", "<em>Melee Attack Roll:</em> +5, reach 5 ft. <em>Hit:</em> 9 (2d8) Bludgeoning damage, and the target has the Grappled condition (escape DC 14) if it is Medium or smaller and the corpse isn't already grappling a creature.", { hit: 5, dice: "2d8", dtype: "bludgeoning" })
  ] },
  "tempest-wraith": { items: [
    feat("Disposition: Controller", "The wraith stays in the air out of reach, blows the party apart, and strikes whoever is left alone."),
    feat("Incorporeal Movement", "The wraith can move through other creatures and objects as if they were Difficult Terrain. It takes 5 (1d10) Force damage if it ends its turn inside an object."),
    MA("The wraith makes two Lightning Lash attacks."),
    attack("Lightning Lash", "<em>Ranged Attack Roll:</em> +6, range 90 ft. <em>Hit:</em> 9 (2d8) Lightning damage.", { hit: 6, dice: "2d8", dtype: "lightning", range: "ranged", rng: [90, 90] }),
    save("Gale (Recharge 5–6)", "The wraith screams a gale in a 30-foot Cone. Each creature in it makes a DC 15 Strength saving throw. <em>Failure:</em> 4 (1d8) Bludgeoning damage, and the target is pushed 20 feet away and has the Prone condition. <em>Success:</em> Half damage only, and the target isn't pushed.", { ability: "str", dc: 15, dice: "1d8", dtype: "bludgeoning", rech: 5, tmpl: { type: "cone", size: "30", units: "ft" } }),
    feat("Drift Away", "<em>Bonus Action.</em> The wraith flies up to 20 feet without provoking Opportunity Attacks.", "bonus")
  ] },
  "drowned-knight": { items: [
    feat("Disposition: Duelist", "The knight picks one opponent, calls it out, and fights it alone until one of them falls."),
    feat("Oath of the Drowned", "<em>Bonus Action.</em> The knight marks one creature it can see within 30 feet. Until the knight marks another creature or dies, it has Advantage on attack rolls against the marked creature, and the marked creature has Disadvantage on attack rolls against anyone but the knight.", "bonus"),
    feat("Rise from the Water", "The first time the knight drops to 0 Hit Points while in water, it sinks and rises again at the start of its next turn with 50 Hit Points, unless the damage was Radiant."),
    MA("The knight makes two attacks, using Longsword or Heavy Crossbow in any combination."),
    attack("Longsword", "<em>Melee Attack Roll:</em> +6, reach 5 ft. <em>Hit:</em> 10 (1d10 + 5) Slashing damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "slashing", wtype: "martialM" }),
    attack("Heavy Crossbow", "<em>Ranged Attack Roll:</em> +6, range 100/400 ft. <em>Hit:</em> 10 (1d10 + 5) Piercing damage.", { hit: 6, dice: "1d10", bonus: 5, dtype: "piercing", range: "ranged", rng: [100, 400], wtype: "martialR" }),
    save("Drag Under (Recharge 5–6)", "The knight seizes one creature within 5 feet. The target makes a DC 17 Strength saving throw. <em>Failure:</em> 5 (1d10) Cold damage, and the target has the Grappled condition (escape DC 17). If either of them is in water, the knight pulls the target under: it can't breathe until it escapes. <em>Success:</em> Half damage only.", { ability: "str", dc: 17, dice: "1d10", dtype: "cold", rech: 5 })
  ] }
}};

// ---------------------------------------------------------------- bosses (named items replaced; null = removed)
const B = {
"5LEI-3": { "the-thunderbuck": {
  "Crown Storm (Recharge 5–6)": save("Chain of Thunder (Recharge 5–6)", "Lightning leaps from the crown to one creature within 60 feet, then jumps to up to two more creatures, each within 20 feet of the last one struck. Each target makes a DC 19 Dexterity saving throw. <em>Failure:</em> 22 (4d10) Lightning damage, and the target has the Blinded condition until the end of its next turn. <em>Success:</em> Half damage only.", { ability: "dex", dc: 19, dice: "4d10", dtype: "lightning", rech: 5 }),
  "Response: Kick": save("Response: Antler Toss", "The Thunderbuck hooks one creature within 10 feet on its antlers and flings it. The target makes a DC 19 Strength saving throw. <em>Failure:</em> 6 (1d12) Piercing damage, and the target is thrown up to 20 feet in a direction the Thunderbuck chooses.", { ability: "str", dc: 19, dice: "1d12", dtype: "piercing", onSave: "none", activation: "special" })
} },
"5LEI-4": { "the-elder-ursa": {
  "Earthshaking Roar (Recharge 5–6)": save("Mother's Roar (Recharge 5–6)", "The Elder Ursa roars in a 60-foot Cone. Each enemy in it makes a DC 19 Wisdom saving throw. <em>Failure:</em> 22 (4d10) Thunder damage, and the target has the Frightened condition until the end of its next turn. <em>Success:</em> Half damage only. Each allied bear that can hear her can then use its Reaction to move up to its Speed and make one attack.", { ability: "wis", dc: 19, dice: "4d10", dtype: "thunder", rech: 5, tmpl: { type: "cone", size: "60", units: "ft" } }),
  "Response: Swipe": feat("Response: Shield the Den", "The Elder Ursa moves up to 20 feet to an allied bear. Until the start of the next player character's turn, attacks against that bear target her instead, and the creature that last attacked the bear takes 6 (1d12) Slashing damage.", "special")
} },
"5LEI-5": { "the-corpse-worm": {
  "Response: Thrash": feat("Response: Burrow and Rise", "The Corpse Worm dives into the floor and bursts up anywhere within 30 feet. Each creature in or next to the space where it rises is shoved out of the way and takes 6 (1d12) Bludgeoning damage.", "special"),
  "Response: Venom Spit": feat("Response: Corpse Call", "One Wormridden Corpse within 60 feet moves up to its Speed and makes one Slam attack. If no corpse can act, one creature within 10 feet of the worm takes 6 (1d12) Necrotic damage instead.", "special")
} }
};

// ---------------------------------------------------------------- apply
const exists = async p => p && (await fetch("/" + p, { method: "HEAD" })).ok;
const ICON = [[/Swarm|Bites/, "icons/creatures/invertebrates/wasp-swarm-attack.webp"], [/Disposition/, "icons/skills/targeting/crosshair-ringed-gray.webp"],
  [/Multiattack/, "icons/skills/targeting/target-strike-triple-blue.webp"], [/Bite|Sting|Gore/, "icons/creatures/abilities/fangs-teeth-bite.webp"],
  [/Claw|Hug|Maul|Slam|Grab|Seize|Kick|Leg|Pseudopod/, "icons/skills/melee/unarmed-punch-fist.webp"], [/Lightning|Bolt|Thunder|Arc|Chain|Gale|Rod/, "icons/magic/lightning/bolt-strike-blue.webp"],
  [/Web|Cocoon/, "icons/magic/control/orb-web-hold.webp"], [/Spear|Pike|Javelin|Longsword|Club|Crossbow/, "icons/weapons/polearms/spear-flared-steel.webp"],
  [/Blink|Swap|Bound|Climb|Sink|Burrow|Drift|Rise|Away/, "icons/magic/movement/trail-streak-impact-blue.webp"], [/Response/, "icons/magic/control/energy-stream-link-white.webp"]];
const FALL = "icons/svg/paw.svg";
const iconCache = {};
async function icon(name) { for (const [re, p] of ICON) if (re.test(name)) { if (!(p in iconCache)) iconCache[p] = await exists(p); if (iconCache[p]) return p; } return FALL; }
const only = cfg.only ? new Set(cfg.only) : null;
const out = [];
const find = (code, slug) => game.actors.find(a => a.getFlag(MOD, "adventure") === code && a.getFlag(MOD, "slug") === slug);
for (const [code, mons] of Object.entries(R)) {
  if (only && !only.has(code)) continue;
  for (const [slug, def] of Object.entries(mons)) {
    const a = find(code, slug); if (!a) { out.push(`MISSING ${code} ${slug}`); continue; }
    for (const it of def.items) it.img = await icon(it.name);
    if (cfg.dry) { out.push(`${code} ${a.name}: would replace ${a.items.size} items with ${def.items.length}`); continue; }
    await a.deleteEmbeddedDocuments("Item", a.items.map(i => i.id));
    await a.createEmbeddedDocuments("Item", def.items);
    const upd = {};
    if (def.senses) for (const [k, v] of Object.entries(def.senses)) upd[`system.attributes.senses.${k}`] = v;
    if (def.dr) upd["system.traits.dr.value"] = def.dr;
    if (def.walk) upd["system.attributes.movement.walk"] = def.walk;
    if (Object.keys(upd).length) await a.update(upd);
    out.push(`${code} ${a.name}: ${a.items.size} items`);
  }
}
for (const [code, mons] of Object.entries(B)) {
  if (only && !only.has(code)) continue;
  for (const [slug, swaps] of Object.entries(mons)) {
    const a = find(code, slug); if (!a) { out.push(`MISSING ${code} ${slug}`); continue; }
    const missing = Object.keys(swaps).filter(n => !a.items.getName(n));
    if (missing.length) { out.push(`${code} ${a.name}: not found ${missing.join(", ")} (skipped)`); continue; }
    if (cfg.dry) { out.push(`${code} ${a.name}: would replace ${Object.keys(swaps).join(", ")}`); continue; }
    const news = [];
    for (const [old, it] of Object.entries(swaps)) { await a.items.getName(old).delete(); if (it) { it.img = await icon(it.name); news.push(it); } }
    if (news.length) await a.createEmbeddedDocuments("Item", news);
    out.push(`${code} ${a.name}: replaced ${Object.keys(swaps).length}`);
  }
}
return out.join("\n");
