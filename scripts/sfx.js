/**
 * Beyond the Last Torch — combat sound effects (John, 2026-11-11). Files: assets/sounds/sfx/*.ogg (Pixabay; see Credits).
 *
 *   Attacks (dnd5e.rollAttack, on the roller's client): a hit, a miss or a critical against the targeted token's AC,
 *     chosen by the weapon: blade (slashing / piercing), blunt (bludgeoning), bow or crossbow (ranged: release, then
 *     hit or miss), natural weapons (bite, claw, slam). No target: just the swing or the release.
 *   Spells and damaging effects (dnd5e.postUseActivity): a sound by damage type (fire, cold, lightning, thunder, acid,
 *     poison, necrotic, radiant, force, psychic) when a spell is cast or a save / damage ability is used.
 *   Death (updateActor, on the client that made the change): a creature dropping to 0 HP cries out by creature type
 *     (humanoid / giant, beast, anything else), then a body fall. Player characters only get the body fall.
 *   Traps (updateTile, active GM): a trap tile that goes off (its chain switches it off) plays its mechanism, then fire,
 *     poison or a bolt by its flavor. The Disarm control is excluded.
 *   Flee / alarm: scripts/flee.js calls api.sfx("war-horn").
 *
 * Every sound is played for everyone (AudioHelper broadcast) on the interface channel, so each player's interface
 * volume applies. World setting "Combat sound effects" turns it all off; client setting "Sound effects volume".
 */

const MODULE_ID = "faight-beyond-the-last-torch";
const DIR = `modules/${MODULE_ID}/assets/sounds/sfx`;
const BASE = 0.5;   // every effect at half its original level (John, 2026-11-12); the client setting scales on top
const isActiveGM = () => game.users.activeGM?.isSelf ?? game.user.isGM;
const pick = (...names) => names[Math.floor(Math.random() * names.length)];
const ELEMENTS = ["fire", "cold", "lightning", "thunder", "acid", "poison", "necrotic", "radiant", "force", "psychic"];

function sfx(name, { delay = 0, volume = 1 } = {}) {
  if (!game.settings.get(MODULE_ID, "sfxEnabled") || !name) return;
  const play = () => foundry.audio.AudioHelper.play({ src: `${DIR}/${name}.ogg`, volume: Math.min(1, BASE * volume * game.settings.get(MODULE_ID, "sfxVolume")), autoplay: true, loop: false, channel: "interface" }, true);
  delay ? setTimeout(play, delay) : play();
}

// The damage types an activity deals (first part first).
function damageTypes(activity) {
  const out = [];
  for (const p of activity?.damage?.parts ?? []) for (const t of p.types ?? []) out.push(t);
  if (!out.length) for (const t of activity?.item?.system?.damage?.base?.types ?? []) out.push(t);
  return out;
}

function weaponSounds(activity) {
  const item = activity?.item, wt = item?.system?.type?.value ?? "", name = `${item?.name ?? ""} ${activity?.name ?? ""}`.toLowerCase();
  const types = damageTypes(activity);
  const physical = types.filter((t) => ["slashing", "piercing", "bludgeoning"].includes(t));
  const element = types.find((t) => ELEMENTS.includes(t));
  // Monster attacks are built as "natural" weapons whatever they are (a halberd, a spear), so the name decides first.
  const ranged = activity?.attack?.type?.value === "ranged" || /R$/.test(wt) || /\b(bow|crossbow|arrow|bolt|sling|javelin|dart|thrown?)\b/.test(name);
  if (ranged) return { start: "bow-release", hit: element && !physical.length ? element : "arrow-hit", miss: "ranged-miss" };
  let hit;
  if (element && !physical.length) hit = element;
  else if (/\b(bites?|fangs?|jaws?|maws?|gnaw)\b/.test(name)) hit = "bite";
  else if (/\b(claw|claws|talon|talons|rake|rend)\b/.test(name)) hit = "claw";
  else if (/\b(slam|fist|punch|backhand|bash|stomp|tail|hammer|maul|club|mace|morningstar|cudgel|flail|gauntlet|headbutt|kick)\b/.test(name) || physical[0] === "bludgeoning") hit = pick("blunt-hit-1", "blunt-hit-2");
  else hit = pick("blade-hit-1", "blade-hit-2");
  return { start: null, hit, miss: pick("melee-miss-1", "melee-miss-2") };
}

Hooks.on("dnd5e.rollAttack", (rolls, data) => {
  const activity = data?.subject ?? data?.activity;
  if (!activity || activity.item?.type === "spell") return;   // spells: by damage type when cast
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return;
  const s = weaponSounds(activity);
  if (s.start) sfx(s.start);
  const d = s.start ? 350 : 0;
  const targets = [...game.user.targets].map((t) => t.actor).filter(Boolean);
  if (roll.isFumble) return sfx(s.miss, { delay: d });
  if (!targets.length) return roll.isCritical ? sfx("crit", { delay: d }) : (s.start ? null : sfx("melee-miss-1"));
  const hit = roll.isCritical || targets.some((a) => roll.total >= (a.system?.attributes?.ac?.value ?? 10));
  if (!hit) return sfx(s.miss, { delay: d });
  sfx(s.hit, { delay: d });
  if (roll.isCritical) sfx("crit", { delay: d + 120 });
});

Hooks.on("dnd5e.postUseActivity", (activity) => {
  const item = activity?.item; if (!item) return;
  if (activity.type === "attack" && item.type !== "spell") return;   // weapon attacks sound on the roll
  if (!["spell", "feat", "consumable"].includes(item.type)) return;
  const el = damageTypes(activity).find((t) => ELEMENTS.includes(t));
  if (el) sfx(el);
});

Hooks.on("preUpdateActor", (actor, changes, options) => {
  if (foundry.utils.hasProperty(changes, "system.attributes.hp.value")) options.btltHpBefore = actor.system?.attributes?.hp?.value;
});
Hooks.on("updateActor", (actor, changes, options, userId) => {
  if (userId !== game.user.id) return;
  const now = foundry.utils.getProperty(changes, "system.attributes.hp.value");
  if (now === undefined || now > 0 || !(options.btltHpBefore > 0)) return;
  if (actor.type === "character") return sfx("bodyfall");
  const type = actor.system?.details?.type?.value ?? "";
  sfx(["humanoid", "giant"].includes(type) ? pick("death-humanoid-1", "death-humanoid-2") : type === "beast" ? "death-beast" : "death-monster");
  sfx("bodyfall", { delay: 600 });
});

// Traps: a trap tile's own chain ends by switching the tile off; the GM's Disarm control also switches it off but
// passes { btltDisarm: true } (scripts/traps.js), so only a trap that went off plays.
Hooks.on("updateTile", (tile, changes, options) => {
  if (!isActiveGM() || tile.getFlag(MODULE_ID, "role") !== "trap" || options?.btltDisarm) return;
  if (foundry.utils.getProperty(changes, "flags.monks-active-tiles.active") !== false) return;
  const text = JSON.stringify(tile.flags["monks-active-tiles"]?.actions ?? []).toLowerCase() + " " + (tile.getFlag(MODULE_ID, "trap") ?? "").toLowerCase();
  sfx("trap-metal");
  const follow = /fire|pitch|flame|burn|oil/.test(text) ? "fire" : /poison|needle|venom|gas/.test(text) ? "poison"
    : /bolt|arrow|crossbow|dart|spike|slit/.test(text) ? "arrow-hit" : /acid/.test(text) ? "acid" : /lightning|shock/.test(text) ? "lightning" : null;
  if (follow) sfx(follow, { delay: 300 });
});

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "sfxEnabled", { name: "Combat sound effects", hint: "Attack, spell, death, trap and alarm sounds (Beyond the Last Torch).", scope: "world", config: true, type: Boolean, default: true });
  game.settings.register(MODULE_ID, "sfxVolume", { name: "Sound effects volume", hint: "Scales the combat sound effects (your interface volume also applies).", scope: "client", config: true, type: Number, range: { min: 0, max: 1, step: 0.05 }, default: 0.8 });
  const mod = game.modules.get(MODULE_ID);
  mod.api = Object.assign(mod.api ?? {}, { sfx });
});
