// Damage-dial rebuild (2026-10-25). Applies the BTLT Monster Design sheet's role-based Hit Pct / Dmg Pct numbers to
// every monster in 5LEI to 5LEI-5, gives each creature one Alpha attack (2 x Std Dmg, Recharge 5-6), sets Responses
// to half a standard hit, converts the Rime Brood Mother and Ogre Bone-Chief to Epic Boss commanders, and creates
// three new commanders (Darkspear Warden-Captain, Stormguard Marshal, Drowned Knight-Commander) in their rooms.
// Run in the Foundry console as GM, one dungeon per call (page scripts time out after 45 s):
//   const run = new (Object.getPrototypeOf(async function(){}).constructor)("cfg", await (await fetch('/modules/faight-beyond-the-last-torch/dev/dungeon/rebuild_dials.js?'+Date.now())).text());
//   await run({ code: "5LEI-4" });           // cfg.dry = true reports without changing anything
// Actors are edited in place (IDs kept, so placed tokens stay linked). Numbers come from SHEET below (sheet rows 11-41).
const MOD = cfg.mod || "faight-beyond-the-last-torch";
const rid = () => foundry.utils.randomID();
const DRY = !!cfg.dry, CODE = cfg.code;
const log = [];

// name: [hp, ac, hit, std, alpha]  (BTLT Monster Design U, V, W, X, Y)
const SHEET = {
  "Rime Spider": [107, 15, 10, 23, 46], "Rime Spider Swarm": [160, 17, 11, 13, 26], "Rime Spider Hunter": [192, 19, 9, 18, 36],
  "Rime Brood Mother": [500, 20, 11, 25, 50], "Sister of Rime": [220, 18, 13, 31, 62], "Sister of Mirrors": [220, 18, 13, 31, 62],
  "Sister of Hollows": [220, 18, 13, 31, 62], "Dune Scorpion": [107, 15, 10, 23, 46], "Scorpion Swarm": [160, 17, 11, 13, 26],
  "Ogre Brute": [180, 18, 8, 30, 60], "Ogre Bone-Chief": [400, 20, 11, 25, 50], "Void-Touched Scorpion": [213, 19, 11, 29, 58],
  "The Void Matriarch": [550, 20, 13, 37, 74], "Warren Swarm": [107, 15, 11, 12, 24], "Thunder Hare": [160, 17, 10, 25, 50],
  "Stormguard Sentinel": [180, 18, 9, 18, 36], "Galvanic Jackalope": [213, 19, 11, 25, 50], "The Thunderbuck": [550, 20, 12, 37, 74],
  "Moss Bear": [107, 15, 7, 23, 46], "Tomb Jelly": [160, 17, 8, 17, 34], "Spore-Mad Bear": [180, 18, 8, 30, 60],
  "Darkspear Warden": [213, 19, 9, 20, 40], "The Elder Ursa": [550, 20, 12, 37, 74], "Venom Grub": [107, 15, 11, 12, 24],
  "Wormridden Corpse": [160, 17, 8, 17, 34], "Tempest Wraith": [180, 18, 9, 18, 36], "Drowned Knight": [213, 19, 12, 29, 58],
  "The Corpse Worm": [550, 20, 12, 37, 74], "Darkspear Warden-Captain": [425, 20, 11, 25, 50],
  "Stormguard Marshal": [360, 20, 11, 23, 46], "Drowned Knight-Commander": [425, 20, 11, 25, 50]
};

// ---------------------------------------------------------------- dice and text helpers
const avgOf = (n, d, b) => Math.floor(n * (d + 1) / 2 + b);
function fit(target, d) {             // dice of size d (plus a flat bonus) averaging `target`
  target = Math.max(1, Math.round(target));
  let n = Math.max(1, Math.round(target * 0.55 / ((d + 1) / 2)));
  let b = Math.round(target - n * (d + 1) / 2);
  while (b < 0 && n > 1) { n--; b = Math.round(target - n * (d + 1) / 2); }
  if (b < 0) b = 0;
  return { n, d, b, avg: avgOf(n, d, b), txt: `${avgOf(n, d, b)} (${n}d${d}${b ? ` + ${b}` : ""})` };
}
const DICE_RE = /\d+ \(\d+d\d+(?:\s*[+−-]\s*\d+)?\)/g;
function replaceNth(html, k, s) { let i = -1; return html.replace(DICE_RE, m => (++i === k ? s : m)); }
const fixHit = (html, hit) => html.replace(/(Attack Roll:(?:<\/em>)?\s*)\+\d+/g, `$1+${hit}`);
const P = t => `<p>${t}</p>`;
const head = (name, text) => P(`<strong><em>${name}.</em></strong> ${text}`);
const act = type => ({ type, value: 1 });
const USES = r => ({ max: "1", spent: 0, recovery: [{ period: "recharge", formula: String(r), type: "recoverAll" }] });
const CONS = { targets: [{ type: "itemUses", target: "", value: "1" }], scaling: { allowed: false } };
function feat(name, text, activation = "") {
  const it = { name, type: "feat", img: "icons/svg/aura.svg", system: { description: { value: head(name, text) }, type: { value: "monster" } } };
  if (activation) { const id = rid(); it.system.activities = { [id]: { _id: id, type: "utility", activation: act(activation), name: "" } }; }
  return it;
}
function attack(name, text, { img, hit, dice, dtype, reach = 5, rng = null, rech = 5, activation = "action" }) {
  const id = rid();
  return { name, type: "weapon", img, system: {
    description: { value: head(name, text) }, type: { value: "natural" }, equipped: true, proficient: 1,
    range: rng ? { value: rng[0], long: rng[1], units: "ft" } : { reach, units: "ft" },
    damage: { base: { number: dice.n, denomination: dice.d, bonus: String(dice.b), types: [dtype] } }, uses: rech ? USES(rech) : {},
    activities: { [id]: { _id: id, type: "attack", activation: act(activation),
      attack: { flat: true, bonus: String(hit), type: { value: rng ? "ranged" : "melee", classification: "weapon" } },
      damage: { includeBase: true, parts: [] }, consumption: rech ? CONS : undefined } } } };
}
function save(name, text, { img, ability, dc, dice, dtype, onSave = "half", rech = 5, activation = "action" }) {
  const id = rid();
  const parts = dice ? [{ number: dice.n, denomination: dice.d, bonus: String(dice.b), types: [dtype] }] : [];
  return { name, type: "feat", img, system: { description: { value: head(name, text) }, type: { value: "monster" }, uses: rech ? USES(rech) : {},
    activities: { [id]: { _id: id, type: "save", activation: act(activation), save: { ability: [ability], dc: { calculation: "", formula: String(dc) } },
      damage: { onSave, parts }, consumption: rech ? CONS : undefined } } } };
}

// ---------------------------------------------------------------- per-creature spec
// Item kinds: std (standard hit), alpha (2 x std; gets Recharge 5-6 unless it already has a recharge),
// resp (half a standard hit), text: [[k, "std"|"half"|"alpha"], ...] (replace the k-th "AVG (dice)" in the text only).
// rider: average of extra damage dice the attack keeps (e.g. "+ 3 (1d6) Force"), subtracted from the main hit.
// add: (n) => [new items]; remove: [item names]; respTrait: the boss "Response" trait text gets the half value.
const IMG = { claw: "icons/creatures/claws/claw-hooked-curved.webp", strike: "icons/skills/melee/strike-sword-slashing-red.webp",
  ice: "icons/magic/water/projectiles-ice-explosion.webp", poison: "icons/magic/acid/projectile-faceted-glob.webp",
  thunder: "icons/magic/lightning/bolt-strike-blue.webp", spear: "icons/weapons/polearms/spear-flared-worn-grey.webp",
  charge: "icons/environment/people/charge.webp", link: "icons/magic/control/energy-stream-link-white.webp",
  force: "icons/magic/movement/portal-vortex-orange.webp", web: "icons/magic/control/encase-creature-spider-hold.webp",
  bite: "icons/creatures/abilities/fangs-teeth-bite.webp", earth: "icons/magic/earth/barrier-stone-explosion-debris.webp" };

const SPEC = {
  // ---- 5LEI Icefall Pyramid
  "Rime Spider": { items: { "Bite": "std", "Drop Strike": { kind: "alpha", rider: 9 } } },
  "Rime Spider Swarm": { items: { "Bites": { kind: "std", text: [[1, "half"]] }, "Frozen Web Floor": { text: [[0, "half"]] } },
    add: n => [save("Freezing Tide (Recharge 5–6)", `The swarm surges over every creature in its space. Each makes a DC 14 Dexterity saving throw. <em>Failure:</em> ${fit(n.alpha, 8).txt} Cold damage, and the target has the Restrained condition until the end of its next turn. <em>Success:</em> Half damage only.`, { img: IMG.ice, ability: "dex", dc: 14, dice: fit(n.alpha, 8), dtype: "cold" })] },
  "Rime Spider Hunter": { items: { "Bite": "std", "Web Line": "std", "Cocoon (Recharge 5–6)": "alpha" } },
  "Sister of Rime": { items: { "Rime Touch": "std", "Frozen Coffin (Recharge 5–6)": "alpha", "Response: Rime Lance (Recharge 4–6)": "resp" } },
  "Sister of Mirrors": { items: { "Mirror Shard": "std", "Pull of the Spring (Recharge 5–6)": "alpha", "Mirror Step (Recharge 4–6)": "resp" } },
  "Sister of Hollows": { items: { "Hollow Touch": "std", "Steal Warmth (Recharge 5–6)": "alpha", "Response: Feed (Recharge 5–6)": "resp" } },
  // ---- 5LEI-2 Halls of the Void Savant
  "Dune Scorpion": { items: { "Sting": "std", "Erupt and Seize": "alpha" } },
  "Scorpion Swarm": { items: { "Stings": { kind: "std", text: [[1, "half"]] }, "Stinging Carpet (Aura 10 ft.)": { text: [[0, "half"]] } },
    add: n => [save("Smothering Stings (Recharge 5–6)", `The swarm boils up over one creature in its space. The target makes a DC 14 Constitution saving throw. <em>Failure:</em> ${fit(n.alpha, 8).txt} Poison damage, and the target has the Poisoned condition until the end of its next turn. <em>Success:</em> Half damage only.`, { img: IMG.poison, ability: "con", dc: 14, dice: fit(n.alpha, 8), dtype: "poison" })] },
  "Ogre Brute": { items: { "Club": "std", "Grab": "std", "Throw": { kind: "alpha", text: [[0, "alpha"], [1, "alpha"]] } } },
  "Void-Touched Scorpion": { items: { "Pincer": "std", "Void Sting": "std" },
    add: n => [attack("Void Ambush (Recharge 5–6)", `The scorpion teleports up to 30 feet to an unoccupied space it can see, then stings. <em>Melee Attack Roll:</em> +${n.hit}, reach 10 ft. <em>Hit:</em> ${fit(n.alpha, 10).txt} Force damage, and the target regains only half the Hit Points from any healing until the end of its next turn.`, { img: IMG.force, hit: n.hit, dice: fit(n.alpha, 10), dtype: "force", reach: 10 })] },
  "The Void Matriarch": { respTrait: true, items: { "Sting": { kind: "std", rider: 3 }, "Void Rend (Recharge 5–6)": "alpha", "Starless Dark (Recharge 6)": "alpha",
    "Response: Tail Lash": "resp", "Response: Rift Pull": "resp", "Response: Void Step": { text: [[0, "half"]] } } },
  // ---- 5LEI-3 Basilica of the Thunder Crown
  "Warren Swarm": { items: { "Gnawing Bites": { kind: "std", text: [[1, "half"]] } },
    add: n => [save("Undermine (Recharge 5–6)", `The swarm tunnels under the floor where it stands and the stones give way. Each creature in its space makes a DC 14 Dexterity saving throw. <em>Failure:</em> ${fit(n.alpha, 6).txt} Bludgeoning damage, and the target has the Prone condition. <em>Success:</em> Half damage only.`, { img: IMG.earth, ability: "dex", dc: 14, dice: fit(n.alpha, 6), dtype: "bludgeoning" })] },
  "Thunder Hare": { items: { "Bite": "std", "Kick": "std" },
    add: n => [attack("Thunder Kick (Recharge 5–6)", `<em>Melee Attack Roll:</em> +${n.hit}, reach 5 ft. <em>Hit:</em> ${fit(n.alpha, 8).txt} Thunder damage, and the target is pushed up to 30 feet straight away from the hare and has the Prone condition.`, { img: IMG.thunder, hit: n.hit, dice: fit(n.alpha, 8), dtype: "thunder" })] },
  "Stormguard Sentinel": { items: { "Thunder Spear": "std", "Bolt Javelin": "std", "Lightning Rod": { text: [[0, "half"]] } },
    add: n => [attack("Stormstrike (Recharge 5–6)", `<em>Melee Attack Roll:</em> +${n.hit}, reach 10 ft. <em>Hit:</em> ${fit(n.alpha, 8).txt} Lightning damage, and the target's Speed is 0 until the end of its next turn.`, { img: IMG.thunder, hit: n.hit, dice: fit(n.alpha, 8), dtype: "lightning", reach: 10 })] },
  "Galvanic Jackalope": { items: { "Antler Gore": "std", "Arc Bolt": { kind: "std", text: [[1, "half"]] } },
    add: n => [save("Overcharge (Recharge 5–6)", `The jackalope discharges a bolt in a 60-foot Line that is 5 feet wide. Each creature in the Line makes a DC 17 Dexterity saving throw. <em>Failure:</em> ${fit(n.alpha, 6).txt} Lightning damage. <em>Success:</em> Half damage.`, { img: IMG.thunder, ability: "dex", dc: 17, dice: fit(n.alpha, 6), dtype: "lightning" })] },
  "The Thunderbuck": { respTrait: true, items: { "Antler Gore": { kind: "std", rider: 3 }, "Earthshaker Stomp (Recharge 6)": "alpha", "Chain of Thunder (Recharge 5–6)": "alpha",
    "Response: Arc Lash": "resp", "Response: Antler Toss": "resp", "Response: Bounding Leap": { text: [[0, "half"]] } } },
  // ---- 5LEI-4 Darkspear Mausoleum
  "Moss Bear": { items: { "Claws": "std", "Bear Hug": "alpha" } },
  "Tomb Jelly": { items: { "Pseudopod": "std", "Engulf": { kind: "alpha", text: [[0, "alpha"]], html: n => `The jelly moves up to its Speed into one Large or smaller creature's space. The target makes a DC 14 Dexterity saving throw. <em>Failure:</em> The target takes ${fit(n.alpha, 8).txt} Acid damage and is engulfed: it has the Restrained condition, can't breathe, and takes ${fit(n.std, 8).txt} Acid damage at the start of each of its turns. It escapes with an action and a DC 14 Strength (Athletics) check. The jelly can hold one creature. <em>Success:</em> The target is pushed 5 feet out of the jelly's way.` } } },
  "Spore-Mad Bear": { items: { "Bite": "std", "Maul": "std", "Death Spores": { text: [[0, "half"]] } },
    add: n => [attack("Frenzied Maul (Recharge 5–6)", `<em>Melee Attack Roll:</em> +${n.hit}, reach 5 ft. <em>Hit:</em> ${fit(n.alpha, 12).txt} Slashing damage, and the target has the Prone condition if it is Large or smaller.`, { img: IMG.claw, hit: n.hit, dice: fit(n.alpha, 12), dtype: "slashing" })] },
  "Darkspear Warden": { items: { "Darkspear Pike": "std", "Thrown Spear": "std" },
    add: n => [attack("Darkspear Thrust (Recharge 5–6)", `<em>Melee Attack Roll:</em> +${n.hit}, reach 10 ft. <em>Hit:</em> ${fit(n.alpha, 10).txt} Piercing damage, and the target's Speed is 0 until the end of its next turn.`, { img: IMG.spear, hit: n.hit, dice: fit(n.alpha, 10), dtype: "piercing", reach: 10 })] },
  "The Elder Ursa": { respTrait: true, items: { "Claws": { kind: "std", rider: 3 }, "Rampage (Recharge 6)": "alpha", "Mother's Roar (Recharge 5–6)": "alpha",
    "Response: Crushing Hug": "resp", "Response: Root Snare": "resp", "Response: Shield the Den": { text: [[0, "half"]] } } },
  // ---- 5LEI-5 Tomb of the Storm Witch
  "Venom Grub": { items: { "Bite": { kind: "std", text: [[0, "std"], [1, "half"]] } },
    add: n => [save("Gorge (Recharge 5–6)", `A latched grub feeds hard. The creature it is latched onto makes a DC 14 Constitution saving throw. <em>Failure:</em> ${fit(n.alpha, 8).txt} Poison damage, and the grub regains Hit Points equal to half the damage. <em>Success:</em> Half damage only.`, { img: IMG.bite, ability: "con", dc: 14, dice: fit(n.alpha, 8), dtype: "poison" })] },
  "Wormridden Corpse": { items: { "Slam": "std", "Burst of Grubs": { text: [[0, "half"]] } },
    add: n => [save("Venom Embrace (Recharge 5–6)", `The corpse crushes the creature it is grappling against its rotting chest. The target makes a DC 14 Constitution saving throw. <em>Failure:</em> ${fit(n.alpha, 8).txt} Poison damage, and the target has the Poisoned condition for 1 minute (it repeats the save at the end of each of its turns). <em>Success:</em> Half damage only.`, { img: IMG.poison, ability: "con", dc: 14, dice: fit(n.alpha, 8), dtype: "poison" })] },
  "Tempest Wraith": { items: { "Lightning Lash": "std", "Gale (Recharge 5–6)": "alpha" } },
  "Drowned Knight": { items: { "Longsword": "std", "Heavy Crossbow": "std", "Drag Under (Recharge 5–6)": "alpha" } },
  "The Corpse Worm": { respTrait: true, items: { "Bite": { kind: "std", rider: 3 }, "Venom Spray (Recharge 5–6)": "alpha", "Swallow (Recharge 6)": { kind: "alpha", text: [[0, "alpha"], [1, "half"]] },
    "Response: Tail Stinger": "resp", "Response: Burrow and Rise": { text: [[0, "half"]] }, "Response: Corpse Call": { text: [[0, "half"]] } } }
};

// ---------------------------------------------------------------- commanders
// base: the creature a new commander is copied from; room: its room number; cmd: its command action;
// resp: its damaging Response; remove: base items it drops; disp: its Disposition.
const CMD = {
  "Rime Brood Mother": { code: "5LEI", room: 12, existing: true, n: "the Brood Mother", pron: ["she", "her"], obj: "her",
    initExtra: " She can also use Hatch as a Bonus Action on that turn.",
    cmd: n => feat("Command the Brood (Recharge 5–6)", `The Brood Mother shrieks. Each Rime Spider Hunter within 60 feet that can hear her chooses one: it moves up to its Speed and makes one Bite attack, or it makes one Web Line attack. This uses none of the Hunters' own actions or reactions.`, "action"),
    resp: n => save("Response: Web Lash", `The Brood Mother lashes frozen web at one creature she can see within 30 feet. The target makes a DC 19 Dexterity saving throw. <em>Failure:</em> ${fit(n.half, 6).txt} Cold damage, and the target's Speed is 0 until the end of its next turn.`, { img: IMG.web, ability: "dex", dc: 19, dice: fit(n.half, 6), dtype: "cold", rech: null, activation: "special" }),
    items: { "Bite": "std", "Crushing Leg": "std", "Feed (Recharge 5–6)": "alpha" }, remove: [] },
  "Ogre Bone-Chief": { code: "5LEI-2", room: 18, existing: true, n: "the Bone-Chief", pron: ["he", "his"], obj: "him",
    cmd: null,   // War Drum is its command action (rewritten below)
    resp: n => feat("Response: Bellow Orders", `One allied ogre the Bone-Chief can see within 60 feet moves up to half its Speed without provoking Opportunity Attacks and makes one Club attack.`, "special"),
    items: { "Maul": "std", "War Drum (Recharge 5–6)": { kind: "resp" } }, remove: ["Bellow Orders", "Not Me"],
    add: n => [attack("Skull-Splitter (Recharge 5–6)", `<em>Melee Attack Roll:</em> +${n.hit}, reach 10 ft. <em>Hit:</em> ${fit(n.alpha, 10).txt} Bludgeoning damage, and the target has the Prone condition.`, { img: IMG.strike, hit: n.hit, dice: fit(n.alpha, 10), dtype: "bludgeoning", reach: 10 })],
    rewrite: { "War Drum (Recharge 5–6)": n => `The Bone-Chief beats the bone drum. Each allied ogre within 60 feet chooses one: it moves up to its Speed and makes one Club or Grab attack, or it uses Throw. This uses none of the ogres' own actions or reactions. Each enemy within 30 feet makes a DC 17 Wisdom saving throw. <em>Failure:</em> ${fit(n.half, 10).txt} Psychic damage, and the target has the Frightened condition until the end of its next turn. <em>Success:</em> Half damage only.` } },
  "Darkspear Warden-Captain": { code: "5LEI-4", room: 12, base: "Darkspear Warden", n: "the Warden-Captain", pron: ["it", "its"], obj: "it",
    disp: "The Warden-Captain holds the center of the treasury beside the Thane's statue and sends its Wardens at whoever comes nearest the stone chests. It never leaves the treasury.",
    cmd: n => feat("Command the Phalanx (Recharge 5–6)", `The Warden-Captain strikes its spear on the floor and calls an order. Each other Darkspear Warden within 60 feet that can hear it chooses one: it moves up to its Speed and makes one Darkspear Pike attack, or it makes one Thrown Spear attack. This uses none of the Wardens' own actions or reactions.`, "action"),
    resp: n => save("Response: Pike Thrust", `One creature within 10 feet of the Warden-Captain makes a DC 17 Dexterity saving throw. <em>Failure:</em> ${fit(n.half, 6).txt} Piercing damage, and the target is pushed 10 feet away from the Warden-Captain.`, { img: IMG.spear, ability: "dex", dc: 17, dice: fit(n.half, 6), dtype: "piercing", rech: null, activation: "special" }),
    remove: ["Set Against the Charge", "Disposition: Phalanx"] },
  "Stormguard Marshal": { code: "5LEI-3", room: 14, base: "Stormguard Sentinel", n: "the Marshal", pron: ["it", "its"], obj: "it",
    disp: "The Marshal stands among the saints' relics and directs the sentinels against whoever is not a priest of Vauroth. It never leaves the reliquary.",
    cmd: n => feat("Command the Guard (Recharge 5–6)", `The Marshal raises its spear and thunder rolls through the reliquary. Each other Stormguard Sentinel within 60 feet chooses one: it moves up to its Speed and makes one Thunder Spear attack, or it makes one Bolt Javelin attack. This uses none of the Sentinels' own actions or reactions.`, "action"),
    resp: n => save("Response: Arc Rebuke", `One creature the Marshal can see within 60 feet makes a DC 17 Dexterity saving throw. <em>Failure:</em> ${fit(n.half, 6).txt} Lightning damage, and the target's Speed is halved until the end of its next turn.`, { img: IMG.thunder, ability: "dex", dc: 17, dice: fit(n.half, 6), dtype: "lightning", rech: null, activation: "special" }),
    remove: ["Interpose", "Disposition: Defender"] },
  "Drowned Knight-Commander": { code: "5LEI-5", room: 11, base: "Drowned Knight", n: "the Knight-Commander", pron: ["it", "its"], obj: "it",
    disp: "The Knight-Commander rises from the far bier beside the war chest and sends its knights at whoever reaches for it. It never leaves the Knights' Rest.",
    cmd: n => feat("Command the Company (Recharge 5–6)", `The Knight-Commander raises its sword. Each other Drowned Knight within 60 feet that can see it chooses one: it moves up to its Speed and makes one Longsword attack, or it makes one Heavy Crossbow attack. This uses none of the knights' own actions or reactions.`, "action"),
    resp: n => save("Response: Shield Bash", `One creature within 5 feet of the Knight-Commander makes a DC 17 Strength saving throw. <em>Failure:</em> ${fit(n.half, 6).txt} Bludgeoning damage, and the target has the Prone condition.`, { img: IMG.strike, ability: "str", dc: 17, dice: fit(n.half, 6), dtype: "bludgeoning", rech: null, activation: "special" }),
    remove: ["Disposition: Duelist"] }
};

// ---------------------------------------------------------------- apply
const boss = game.actors.find(a => a.name === "The Elder Ursa" && a.getFlag(MOD, "role") === "monster");
const tpl = n => boss.items.find(i => i.name === n)?.toObject();
const inScope = a => a.getFlag(MOD, "role") === "monster" && a.getFlag(MOD, "adventure") === CODE;
function nums(name) { const [hp, ac, hit, std, alpha] = SHEET[name]; return { hp, ac, hit, std, alpha, half: Math.ceil(std / 2) }; }

function itemUpdate(it, spec, n) {
  const s = typeof spec === "string" ? { kind: spec } : spec;
  const o = it.toObject(); const up = { _id: it.id }; let html = o.system.description?.value ?? "";
  const target = s.kind === "std" ? n.std : s.kind === "alpha" ? n.alpha : s.kind === "resp" ? n.half : null;
  const what = [];
  // attack bonus
  for (const [aid, a] of Object.entries(o.system.activities ?? {})) if (a.type === "attack") { up[`system.activities.${aid}.attack.bonus`] = String(n.hit); up[`system.activities.${aid}.attack.flat`] = true; }
  html = fixHit(html, n.hit);
  // main damage
  if (target != null) {
    const main = Math.max(1, target - (s.rider || 0));
    const base = o.system.damage?.base;
    if (base?.number) { const f = fit(main, base.denomination); up["system.damage.base.number"] = f.n; up["system.damage.base.bonus"] = String(f.b); what.push(`${s.kind} ${f.txt}`); if (!(s.text ?? []).some(([k]) => k === 0)) html = replaceNth(html, 0, f.txt); }
    else for (const [aid, a] of Object.entries(o.system.activities ?? {})) {
      const parts = a.damage?.parts; if (!parts?.length) continue;
      const f = fit(main, parts[0].denomination || 8);
      up[`system.activities.${aid}.damage.parts`] = parts.map((p, i) => i ? p : { ...p, number: f.n, denomination: f.d, bonus: String(f.b), custom: { enabled: false } });
      what.push(`${s.kind} ${f.txt}`); if (!(s.text ?? []).some(([k]) => k === 0)) html = replaceNth(html, 0, f.txt);
    }
  }
  for (const [k, w] of s.text ?? []) { const v = w === "std" ? n.std : w === "alpha" ? n.alpha : n.half; const m = [...html.matchAll(DICE_RE)][k]; if (!m) continue;
    const d = Number(m[0].match(/d(\d+)/)[1]); const f = fit(v, d); html = replaceNth(html, k, f.txt); what.push(`text${k} ${f.txt}`); }
  // Alpha gets Recharge 5-6 unless it already recharges
  if (s.kind === "alpha" && !(o.system.uses?.recovery ?? []).some(r => r.period === "recharge")) {
    const nm = `${o.name} (Recharge 5–6)`; up.name = nm; html = html.replace(`${o.name}.`, `${nm}.`);
    up["system.uses"] = USES(5);
    for (const [aid, a] of Object.entries(o.system.activities ?? {})) up[`system.activities.${aid}.consumption`] = CONS;
    what.push("+recharge");
  }
  if (s.html) { html = head(up.name ?? o.name, s.html(n)); what.push("text rewritten"); }
  up["system.description.value"] = html;
  return { up, what };
}

async function rebuild(actor, spec, n, extra = []) {
  const updates = [], creates = [], deletes = [], rep = [];
  const names = actor.items.map(i => i.name);
  for (const [nm, sp] of Object.entries(spec.items ?? {})) {
    const it = actor.items.find(i => i.name === nm || i.name === `${nm} (Recharge 5–6)`); if (!it) { rep.push(`MISSING ${nm}`); continue; }
    const { up, what } = itemUpdate(it, sp, n); updates.push(up); rep.push(`${nm}: ${what.join(", ")}`);
  }
  // any attack not named still gets the hit bonus
  const named = new Set(Object.keys(spec.items ?? {}).flatMap(k => [k, `${k} (Recharge 5–6)`]));
  for (const it of actor.items) if (!named.has(it.name)) for (const a of it.system.activities?.contents ?? [])
    if (a.type === "attack") updates.push({ _id: it.id, [`system.activities.${a.id}.attack.bonus`]: String(n.hit), "system.description.value": fixHit(it.system.description.value, n.hit) });
  if (spec.respTrait) { const r = actor.items.find(i => i.name === "Response"); if (r) updates.push({ _id: r.id, "system.description.value": r.system.description.value.replace(/deals \d+ damage, half a standard hit/, `deals ${n.half} damage, half a standard hit`) }); }
  for (const nm of spec.remove ?? []) { const it = actor.items.find(i => i.name === nm); if (it) deletes.push(it.id); }
  for (const it of [...(spec.add ? spec.add(n) : []), ...extra]) { if (names.includes(it.name)) { rep.push(`exists ${it.name}`); continue; } creates.push(it); rep.push(`+ ${it.name}`); }
  if (!DRY) {
    await actor.update({ "system.attributes.hp.value": n.hp, "system.attributes.hp.max": n.hp, "system.attributes.hp.formula": "", "system.attributes.ac.calc": "flat", "system.attributes.ac.flat": n.ac });
    if (deletes.length) await actor.deleteEmbeddedDocuments("Item", deletes);
    if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
    if (creates.length) await actor.createEmbeddedDocuments("Item", creates);
  }
  log.push(`${actor.name}: HP ${n.hp} AC ${n.ac} hit +${n.hit} std ${n.std} alpha ${n.alpha} | ${rep.join("; ")}`);
}

function epicKit(name, c, n) {
  const N = c.n, Cap = N[0].toUpperCase() + N.slice(1), [sj, ps] = c.pron;   // subject, possessive
  const Sj = sj[0].toUpperCase() + sj.slice(1);
  const init = tpl("Init 10 (Epic Boss)"), ebr = tpl("Epic Boss Resistance"), resp = tpl("Response"), mov = tpl("Response: Movement");
  for (const x of [init, ebr, resp, mov]) { delete x._id; delete x._stats; }
  init.system.description.value = head("Init 10 (Epic Boss)", `${Cap} never rolls initiative. On initiative count 10 ${sj} rolls for recharges, then moves up to ${ps} Speed and takes one action: Multiattack or one of ${ps} charged actions.${c.initExtra ?? ""}`);
  ebr.system.description.value = head("Epic Boss Resistance", `If ${N} fails a saving throw, ${sj} can choose to succeed instead. ${Sj} has Advantage on saving throws against effects that would remove ${c.obj} from the fight.`);
  resp.system.description.value = head("Response", `After each player character's turn, ${N} takes one Response (one only, not one per enemy). Each Response other than Movement deals about ${n.half} damage, half a standard hit.`);
  mov.system.description.value = head("Response: Movement", `${Cap} moves up to half ${ps} Speed.`);
  const out = [init, ebr, resp, mov];
  if (c.cmd) out.push(c.cmd(n)); out.push(c.resp(n)); if (c.disp) out.push(feat("Disposition: Commander", c.disp));
  return out;
}

async function commanders() {
  for (const [name, c] of Object.entries(CMD)) {
    if (c.code !== CODE) continue;
    const n = nums(name);
    let actor = game.actors.find(a => a.name === name && a.getFlag(MOD, "role") === "monster");
    if (!actor && c.base) {
      const base = game.actors.find(a => a.name === c.base && a.getFlag(MOD, "role") === "monster");
      const data = base.toObject(); delete data._id; data.name = name; data.prototypeToken.name = name;
      const addedNames = (SPEC[c.base].add ? SPEC[c.base].add(nums(c.base)) : []).map(i => i.name);
      data.items = data.items.filter(i => !addedNames.includes(i.name));
      data.flags[MOD].slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (!DRY) actor = await Actor.create(data); log.push(`created ${name} from ${c.base}`);
      if (DRY) { log.push(`(dry) would create ${name}`); continue; }
    }
    // base creature's spec first (std / alpha / its own Alpha attack), then the commander kit
    const baseSpec = c.base ? SPEC[c.base] : null;
    const spec = { items: { ...(baseSpec?.items ?? {}), ...(c.items ?? {}) }, remove: c.remove, add: nn => [...(baseSpec?.add ? baseSpec.add(nn) : []), ...(c.add ? c.add(nn) : [])] };
    await rebuild(actor, spec, n, epicKit(name, c, n));
    if (c.rewrite && !DRY) for (const [nm, fn] of Object.entries(c.rewrite)) { const it = actor.items.find(i => i.name === nm); if (it) await it.update({ "system.description.value": head(nm, fn(n)) }); }
    if (!DRY && !actor.getFlag(MOD, "epic")) await actor.setFlag(MOD, "epic", true);
    // new commanders take the place of one base-creature token in their room: the one nearest the room's centre
    if (c.base && !DRY) {
      const scene = game.scenes.find(s => s.getFlag(MOD, "adventure") === CODE && s.getFlag(MOD, "role") === "dungeon-scene");
      const already = scene.tokens.find(t => t.actorId === actor.id);
      if (!already) {
        const base = game.actors.find(a => a.name === c.base && a.getFlag(MOD, "role") === "monster");
        const toks = scene.tokens.filter(t => t.actorId === base.id && String(t.getFlag(MOD, "room")) === String(c.room));
        if (!toks.length) log.push(`NO ${c.base} token flagged room ${c.room}`);
        else {
          const cx = toks.reduce((s, t) => s + t.x, 0) / toks.length, cy = toks.reduce((s, t) => s + t.y, 0) / toks.length;
          const t = toks.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
          const pt = actor.prototypeToken.toObject();
          await scene.deleteEmbeddedDocuments("Token", [t.id]);
          await scene.createEmbeddedDocuments("Token", [{ ...pt, x: t.x, y: t.y, elevation: t.elevation, hidden: t.hidden, actorId: actor.id, actorLink: false, flags: t.toObject().flags }]);
          log.push(`token: one ${c.base} in room ${c.room} replaced by ${name}`);
        }
      }
    }
  }
}

for (const actor of game.actors.filter(inScope)) {
  if (CMD[actor.name]) continue;                       // commanders handled below
  const spec = SPEC[actor.name]; if (!spec) { log.push(`NO SPEC ${actor.name}`); continue; }
  await rebuild(actor, spec, nums(actor.name));
}
await commanders();
return log.join("\n");
