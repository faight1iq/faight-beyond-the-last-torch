// Adds (or replaces) the "Sound Effects" page of the Credits journal, world and pack copies. Run as GM.
// Source list: the combat sound effects in assets/sounds/sfx (scripts/sfx.js), all from Pixabay under the Pixabay Content License.
const MOD = "faight-beyond-the-last-torch";
const T = [
[
"blade-hit-1",
"Sword Blade Slicing Flesh",
"Universfield",
"universfield-28281460",
"film-special-effects-sword-blade-slicing-flesh-352708",
"Blade hit"
],
[
"blade-hit-2",
"Sword Slash 01",
"u_xjrmmgxfru",
"u_xjrmmgxfru-47169417",
"film-special-effects-sword-slash-01-266296",
"Blade hit"
],
[
"blunt-hit-1",
"Hard Punch SFX",
"DRAGON-STUDIO",
"dragon-studio-38165424",
"film-special-effects-hard-punch-sfx-515251",
"Blunt hit; slam"
],
[
"blunt-hit-2",
"Armor Impact from Sword",
"DRAGON-STUDIO",
"dragon-studio-38165424",
"film-special-effects-armor-impact-from-sword-393843",
"Blunt hit"
],
[
"arrow-hit",
"A clean and precise game-style arrow impact (1)",
"Yodguard",
"yodguard-12455005",
"a-clean-and-precise-game-style-arrow-impact-1-450238",
"Arrow or bolt hit; bolt trap"
],
[
"melee-miss-1",
"Swing Whoosh 5",
"floraphonic",
"floraphonic-38928062",
"film-special-effects-swing-whoosh-5-198498",
"Melee miss (swing)"
],
[
"melee-miss-2",
"Sword Clash",
"u_fe12rqkbth",
"u_fe12rqkbth-46044709",
"film-special-effects-sword-clash-241729",
"Melee miss (parried)"
],
[
"ranged-miss",
"Arrow Swish_03",
"DJARTMUSIC",
"djartmusic-46653586",
"film-special-effects-arrow-swish-03-306040",
"Arrow or bolt miss"
],
[
"bow-release",
"Arrow Twang_01",
"DJARTMUSIC",
"djartmusic-46653586",
"film-special-effects-arrow-twang-01-306041",
"Bow or crossbow release"
],
[
"bite",
"monster bite",
"freesound_community",
"freesound_community-46691455",
"horror-monster-bite-44538",
"Bite"
],
[
"claw",
"Scorpion Claw Attack (4)",
"Yodguard",
"yodguard-12455005",
"film-special-effects-scorpion-claw-attack-4-482507",
"Claw"
],
[
"crit",
"Bone Crack 3",
"Universfield",
"universfield-28281460",
"film-special-effects-bone-crack-3-121580",
"Critical hit"
],
[
"death-humanoid-1",
"Male Death Scream",
"Universfield",
"universfield-28281460",
"people-male-death-scream-123078",
"Humanoid death"
],
[
"death-humanoid-2",
"Zombie Dying Sound",
"DRAGON-STUDIO",
"dragon-studio-38165424",
"horror-zombie-dying-sound-357974",
"Humanoid death"
],
[
"death-monster",
"Large Monster Roar",
"DavidDumaisAudio",
"daviddumaisaudio-41768500",
"film-special-effects-large-monster-roar-195717",
"Monster death"
],
[
"death-beast",
"DOG YELP",
"Stu9",
"stu9-50616646",
"nature-dog-yelp-352688",
"Beast death"
],
[
"bodyfall",
"Body Fall",
"Universfield",
"universfield-28281460",
"film-special-effects-body-fall-259680",
"Body fall at 0 HP"
],
[
"fire",
"Fireball Whoosh 1",
"floraphonic",
"floraphonic-38928062",
"film-special-effects-fireball-whoosh-1-179125",
"Fire damage; fire trap"
],
[
"cold",
"Iced magic (1)",
"Yodguard",
"yodguard-12455005",
"film-special-effects-iced-magic-1-378607",
"Cold damage"
],
[
"lightning",
"Lightning Spell",
"DRAGON-STUDIO",
"dragon-studio-38165424",
"film-special-effects-lightning-spell-386163",
"Lightning damage"
],
[
"thunder",
"Thunder clap",
"u_q2hb2391vb",
"u_q2hb2391vb-55487232",
"film-special-effects-thunder-clap-521194",
"Thunder damage"
],
[
"acid",
"Acid Bubbling",
"freesound_community",
"freesound_community-46691455",
"film-special-effects-acid-bubbling-105397",
"Acid damage"
],
[
"poison",
"short-gas-leak",
"freesound_community",
"freesound_community-46691455",
"film-special-effects-short-gas-leak-98286",
"Poison damage; poison trap"
],
[
"necrotic",
"Dark magic (1)",
"Yodguard",
"yodguard-12455005",
"film-special-effects-dark-magic-1-378650",
"Necrotic damage"
],
[
"radiant",
"Holy Magic short (3)",
"Yodguard",
"yodguard-12455005",
"film-special-effects-holy-magic-short-3-534666",
"Radiant damage"
],
[
"force",
"Magic Burst",
"humordome",
"humordome-44873699",
"magic-burst-452852",
"Force damage"
],
[
"psychic",
"Ghost Whisper",
"DRAGON-STUDIO",
"dragon-studio-38165424",
"horror-ghost-whisper-351569",
"Psychic damage"
],
[
"trap-metal",
"Metal Door Slam",
"SoundReality",
"soundreality-31074404",
"film-special-effects-metal-door-slam-172172",
"Trap mechanism"
],
[
"war-horn",
"War Horn sfx",
"Kave_msri",
"kave_msri-48093450",
"film-special-effects-war-horn-sfx-319881",
"Alarm when trash flee (Flee control)"
]
];
const rows = T.map(([f, title, by, user, page, use]) => `<tr><td>${use}</td><td><strong>${title}</strong><br /><a href="https://pixabay.com/sound-effects/${page}/">Pixabay page</a></td>`
  + `<td><a href="https://pixabay.com/users/${user}/">${by}</a></td><td><a href="https://pixabay.com/service/license-summary/">Pixabay Content License</a></td><td><code>sfx/${f}.ogg</code></td></tr>`).join("");
const html = `<p>Combat sound effects used in <em>Beyond the Last Torch</em> (played by <code>scripts/sfx.js</code>). Files live in <code>assets/sounds/sfx/</code>. All are from <a href="https://pixabay.com/sound-effects/">Pixabay</a> under the <a href="https://pixabay.com/service/license-summary/">Pixabay Content License</a>; each was trimmed to a few seconds, faded out, loudness-matched and converted to Ogg Opus (96 kbps).</p>`
  + `<table><thead><tr><th>Used for</th><th>Sound</th><th>Artist</th><th>License</th><th>File</th></tr></thead><tbody>${rows}</tbody></table>`;
const put = async (j) => { const pg = j.pages.find(p => p.name === "Sound Effects");
  if (pg) await pg.update({ "text.content": html }); else await j.createEmbeddedDocuments("JournalEntryPage", [{ name: "Sound Effects", type: "text", text: { content: html }, sort: 200000 }]); };
const out = {};
const wj = game.journal.find(j => j.name === "Beyond the Last Torch — Credits"); if (wj) { await put(wj); out.world = true; }
const pack = game.packs.get(`${MOD}.journals`); const e = (await pack.getIndex()).find(i => i.name === "Beyond the Last Torch — Credits");
if (e) { const locked = pack.locked; if (locked) await pack.configure({ locked: false }); await put(await pack.getDocument(e._id)); if (locked) await pack.configure({ locked: true }); out.pack = true; }
return { sounds: T.length, ...out };
