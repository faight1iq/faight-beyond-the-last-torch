// 5LH3-1 music: builds the adventure playlist and adds its tracks to the Credits journal (world copy and the
// module's journals pack copy). Run as GM in the Foundry console. Re-running replaces both.
// All tracks: Pixabay, Pixabay Content License, none flagged Content ID; converted from 256 kbps MP3 to Ogg Opus 64 kbps.
const MOD = "faight-beyond-the-last-torch", CODE = "5LH3-1", PL = "5LH3-1: The Ironmark Stockade";
const DIR = `modules/${MOD}/assets/sounds/music/the-ironmark-stockade`;
const T = [
  // [file, title, artist, artist page, track page, length, use, AI-generated per Pixabay]
  ["hunters-of-darkness", "Hunters of Darkness – Epic and Mystical Fantasy Music", "JuliusH", "juliush-3921568", "mystery-hunters-of-darkness-epic-and-mystical-fantasy-music-247179", "2:29", "Approach and exploration", false],
  ["cinematic-dark-fantasy", "Cinematic Dark Fantasy", "Luis_Humanoide", "luis_humanoide-12661853", "orchestral-cinematic-dark-fantasy-491537", "1:15", "Exploration (basement)", false],
  ["war-chant", "Vikings Chanting with Percussion", "fidelfortune", "fidelfortune-40635205", "adventure-vikings-chanting-with-percussion-283779", "0:59", "The legion's war chant; alarm raised", false],
  ["war-front", "War Front", "Andorios", "andorios-45594315", "adventure-war-front-325158", "1:14", "Combat", false],
  ["battle-fire", "Battle Fire", "Iz2525", "iz2525-56092076", "orchestral-battle-fire-576031", "1:20", "Combat", false],
  ["battle-march", "Battle March – Epic Drums and Brass", "kaazoom", "kaazoom-448850", "epic-classical-battle-march-epic-drums-and-brass-16069", "2:39", "Combat", false],
  ["lava-goblin", "Lava Goblin", "DMassaIII", "dmassaiii-42247146", "metal-lava-goblin-542117", "3:54", "Combat (miniboss rooms)", true],
  ["the-barbarian", "The Barbarian", "SoundtrackLegends", "soundtracklegends-52494015", "epic-classical-the-barbarian-445957", "3:25", "Combat (miniboss rooms)", true],
  ["ultimate-boss-battle", "Ultimate Boss Battle", "drmseq", "drmseq-38682070", "ambient-ultimate-boss-battle-629975", "3:31", "Boss: Gharrek the Unbowed (throne room)", false],
  ["epic-battle-song", "Epic Battle Song", "Rolandomat", "rolandomat-41052947", "main-title-epic-battle-song-182915", "2:44", "Victory: the prisoners walk free", false],
];

// ---------- playlist ----------
for (const p of game.playlists.filter(p => p.getFlag(MOD, "adventure") === CODE)) await p.delete();
const ref = game.playlists.find(p => p.getFlag(MOD, "role") === "combat")?.sounds.contents[0];
const folder = game.folders.find(f => f.type === "Playlist" && f.name === PL) ?? await Folder.create({ name: PL, type: "Playlist" });
const pl = await Playlist.create({ name: PL, folder: folder.id, mode: CONST.PLAYLIST_MODES.SEQUENTIAL, fade: 1500, channel: "music",
  description: "Approach and exploration, the alarm, combat, minibosses, Gharrek, and the walk out. Click a track to play it.",
  flags: { [MOD]: { adventure: CODE, role: "adventure-music" } } });
await pl.createEmbeddedDocuments("PlaylistSound", T.map(([f, title], i) => ({ name: title, path: `${DIR}/${f}.ogg`, repeat: true, volume: ref?.volume ?? 0.5, fade: 1000, sort: i * 100000 })));

// ---------- credits ----------
const row = ([f, title, artist, user, page, len, use, ai]) => `<tr><td>${PL}</td><td><strong>${title}</strong><br /><a href="https://pixabay.com/music/${page}/">Pixabay page</a></td>`
  + `<td><a href="https://pixabay.com/users/${user}/">${artist}</a></td><td><a href="https://pixabay.com/service/license-summary/">Pixabay Content License</a></td>`
  + `<td>${len}</td><td><code>the-ironmark-stockade/${f}.ogg</code></td><td>${use}. ${ai ? "Pixabay lists this track as AI-generated. " : ""}Converted from the original 256 kbps MP3 to Ogg Opus (64 kbps).</td></tr>`;
const patch = (html) => {
  const d = new DOMParser().parseFromString(html, "text/html"), tb = d.querySelector("tbody");
  for (const tr of [...tb.querySelectorAll("tr")]) if (tr.cells[0]?.textContent.trim() === PL) tr.remove();
  tb.insertAdjacentHTML("beforeend", T.map(row).join(""));
  return d.body.innerHTML;
};
const out = {};
const wj = game.journal.find(j => j.name === "Beyond the Last Torch — Credits");
if (wj) { const pg = wj.pages.find(p => p.name === "Music"); await pg.update({ "text.content": patch(pg.text.content) }); out.world = pg.text.content.match(/<tr>/g).length; }
const pack = game.packs.get(`${MOD}.journals`); const e = (await pack.getIndex()).find(i => i.name === "Beyond the Last Torch — Credits");
if (e) { const locked = pack.locked; if (locked) await pack.configure({ locked: false });
  const pj = await pack.getDocument(e._id); const pg = pj.pages.find(p => p.name === "Music"); await pg.update({ "text.content": patch(pg.text.content) });
  out.pack = pg.text.content.match(/<tr>/g).length; if (locked) await pack.configure({ locked: true }); }
return { playlist: pl.id, sounds: pl.sounds.size, ...out };
