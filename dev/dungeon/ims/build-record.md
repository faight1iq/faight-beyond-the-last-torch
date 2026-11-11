# 5LH3-1: The Ironmark Stockade — build record

First build of 2026-11-11 (Veterans Day). Dev key `ims` (`dev/dungeon/ims/`). Theme `keep` (new). Walls 35 px into the wall band. Grid 70 px = 2.5 ft.

## John's direction
- Veterans Day theme. The war has just ended; warlord Gharrek the Unbowed refuses the peace and holds about forty Crown soldiers in the Ironmark Stockade; the party assaults the fortress and breaks them out.
- **No Watabou.** John described the layout (modelled on the shape of EverQuest II's Crushbone Keep, not copied): a swimmable moat, high curtain walls with corner towers and crenellated wall-walks reached through the towers, an inner keep of two floors with a throne room, and a basement dungeon reached by a secret culvert from the moat. Claude drew a room list, node maps per floor and a 10-ft grid plan (`stockade_plan.py`); John approved it with the throne-balcony bridge and all 34 locations.
- **One scene per floor** (ground, basement, upper) so map quality stays at 280 px per 10 ft.
- **Fast old-school crawl:** kick the door, kill what is inside, one continuous fight. Trash rooms die in two character turns or less. Roster by John: Commoner (1 HP), Standard Guard Durability 0.5 / Dmg 12%, Small/Medium/Large Guard Units 1/2/4 (15/18/20%), named Epic minibosses 4 (25%), Elite Guard 2 (20%), Boss Lieutenant 3 (25%), Boss 6 (30%).
- **Every room has at least one Commoner** who runs to raise the alarm; every creature that flees adds Doom. Doom is run at the table; nothing is scripted. Future Doom ideas to keep in mind: random encounters, spawned traps.
- **Monster tokens are visible, not hidden** (a working fortress at war; walls and vision hide them until the door opens). No talk-through options in the journals.

## Result
- 3 scenes, each 10640 × 10080 in 4 tiles: Ground Floor (16 rooms incl. moat bank, moat and courtyard corner), Basement (8), Upper Floor (10 rooms plus the wall-walk ring and balcony bridge). 34 journal rooms + overview.
- Stairs and the secret culvert are Monk's Active Tiles teleports between scenes (`link_floors.js`, `links.json`): 7 links. The ground-floor culvert tile starts inactive; the GM activates it when the party finds the grate.

| Monster | Row | PL | Dur | Hit/Dmg % | HP | AC | Hit | Std | Alpha |
|---|---|---|---|---|---|---|---|---|---|
| Ironmark Servant (commoner) | — | — | — | — | 1 | 10 | — | — | — |
| Ironmark Legionnaire | 60 | 8 | 0.5 | 50/12 | 18 | 13 | +9 | 10 | 20 |
| Moat Eel | 61 | 8 | 0.5 | 55/12 | 18 | 13 | +10 | 10 | 20 |
| Leech Swarm | 62 | 8 | 1 | 60/15 | 36 | 13 | +11 | 12 | 24 |
| Legion Squad | 63 | 8 | 1 | 60/15 | 36 | 13 | +11 | 12 | 24 |
| War Hound Pack | 64 | 8 | 1 | 60/15 | 36 | 13 | +11 | 12 | 24 |
| Legion Platoon | 65 | 9 | 2 | 60/18 | 80 | 15 | +11 | 15 | 30 |
| Legion Company | 66 | 10 | 4 | 60/20 | 180 | 18 | +12 | 18 | 36 |
| Iron Guard | 67 | 11 | 2 | 60/20 | 100 | 15 | +12 | 20 | 40 |
| Kennelmaster Vosk (Epic) | 68 | 10 | 4 | 55/25 | 180 | 18 | +11 | 23 | 46 |
| Forgemaster Ulgra Coalhand (Epic) | 69 | 10 | 4 | 45/25 | 180 | 18 | +9 | 23 | 46 |
| Sergeant-at-Arms Drekk (Epic) | 70 | 11 | 4 | 55/25 | 200 | 18 | +11 | 25 | 50 |
| Warden Skarn (Epic) | 71 | 11 | 4 | 45/25 | 200 | 18 | +9 | 25 | 50 |
| Old Gutter (Epic, river troll) | 72 | 10 | 4 | 40/25 | 180 | 18 | +8 | 23 | 46 |
| The Iron Captain (Epic lieutenant) | 73 | 12 | 3 | 55/25 | 165 | 17 | +12 | 26 | 52 |
| Gharrek the Unbowed (Epic Boss) | 74 | 12 | 6 | 60/30 | 330 | 20 | +13 | 31 | 62 |

Encounters (character-turns of Durability, servants not counted):
- Ground: Moat 2 eels by the culvert + leech swarm under the drawbridge (1 each group); Gatehouse 4 servants + 1 guard (0.5); Courtyard corner 3 servants + 2 guards (1); towers 1 guard each (0.5); Barracks squad + guard (1.5); Kennels Vosk + hound pack (5); Smithy Ulgra + 2 servants (4); Entry Hall 2 guards (1); Mess Hall platoon + 2 servants (2); Kitchen guard + 2 servants (0.5); Armory Drekk + guard (4.5); Grand Stair guard (0.5).
- Basement: Sluice Old Gutter (4); Cellar servant; Guard Room platoon (2); each cell block guard (0.5); Interrogation Skarn + guard (4.5); Warden's Office servant.
- Upper: tower tops 1 guard each; Winch Room 2 guards (1); Gallery Legion Company (4); War Room 2 Iron Guards (4); Throne Room Gharrek + the Iron Captain (9); Quarters and Treasury servant only.
- Boss set piece: four Legion Standards in the Throne Room (tiles flagged `role: legion-standard`, 7.5 ft, red glow). AC 15, 25 HP, or an action and DC 16 Athletics; each deals 2d10 psychic to Gharrek; the fourth removes his Epic Boss Resistance.

Traps (all 10d10; four kinds):
| Trap | Kind | Room | Area | Save | Effect |
|---|---|---|---|---|---|
| Murder Holes | section | G3 Gatehouse | the middle 20 × 20 ft of the passage under the grates | Dex 15, fire | — |
| Culvert Grate | hall | B1 Moat Culvert | 10 ft of culvert halfway along, wall to wall | Dex 15, piercing | Restrained |
| Warden's Strongbox | container | B7 Warden's Office | the square in front of the strongbox in the north-west corner | Con 16, poison | Poisoned |
| Crossbow Slits | wall | U3 Gharrek's Quarters | the 5-ft strip along the north wall | Dex 16, piercing | Prone |
| Treasury Strongbox | container | U4 Treasury | the square in front of the strongbox on the plinth (north wall) | Dex 16, fire | — |

Treasure (level 10 economy): 1,400 gp (300 Barracks pay chest, 400 Warden's strongbox, 700 Treasury); commons 3 Potion of Healing (G5, B8, U1), Potion of Climbing (G8), Moon-Touched Sword (G15; made from the Longsword, not in this install), Crown Veteran's Medal (B4, custom); uncommons Gauntlets of Ogre Power (G7), Sentinel Shield (G15), Cloak of Protection (U3); rare Sword of Wounding (U5); story items Warden's Master Keys (B6) and The Forgotten Roll (U2).

IDs: world scenes Ground `v6hVR92q2J7xBNd4`, Basement `uMiYuoRkVI7Ecu7F`, Upper `ycXEO86nltHyVtTd`; overview journal `IfnMQpdUAMMN8HhY`. Adventure **`KcHG4AUXC1KkZ9Su`** (cover `assets/ui/5LH3-1-cover.webp`, plaque `assets/ui/5LH3-1-the-ironmark-stockade.webp`). 16 actors, 12 items, 35 journals (overview + 34 rooms), 145 links, 0 broken.

## Timing
| Time | Milestone |
|---|---|
| 08:33 | Build started (after the story, roster and floor plans were settled with John, 07:32–08:33) |
| 08:34–08:50 | Repo, folders, Foundry; plan converted to three layouts; layout/basemap/crops/scenedata patches; textures; story subagent; sheet rows 60–74 |
| 08:50–09:40 | 31 room returns + 3 rerolls/refills per floor, 16 portraits, standard, plaque, cover in 4 ChatGPT tabs; monsters and items built; journals, scenes, links, traps tested while art ran |
| 09:40–09:55 | Composites, tiles, set pieces, trap controls, checks, Enter Dungeon, ship |

About **80 minutes** of build time for three floors and 34 rooms.

## Checks
- Wall flood from each floor's entrance: Ground doors open 16/16 rooms (72% of the map, the moat and bank are open ground), doors shut 2/16 (bank and moat); Basement open 8/8, shut 1/8 (culvert); Upper open 10/10, shut 1/10 (gallery).
- Encounter paragraphs match the placed tokens in all 34 rooms (by script). Tokens are visible (not hidden) as John asked.
- Traps (Trap Test Dummy, forced fail): Murder Holes 57, Culvert Grate 52 + Restrained, Warden's Strongbox 61 + Poisoned, Crossbow Slits 48 + Prone, Treasury Strongbox 48. Each switched itself off; restored (DC 15/15/16/16/16, not fast-forwarded, history cleared), armed; dummy and 10 test messages deleted; labels reset to ARMED.
- Stair link: a token entering the Grand Stair tile arrived on the Upper Floor beside the gallery stair; the ground token was removed.
- Enter Dungeon: plaque at 999,550, one record each side named `btlt-5LH3-1`. The landing page now points at 5LH3-1.
- Shipped copy: 3 scenes at darkness 1, global light off, 78 visible monster tokens all linked, 34 notes linked, 14 stair teleports pointing at the shipped scenes, culvert tile shipped inactive, 5 armed hidden traps, 4 Legion Standards, no stairways, 0 ID clashes, packs relocked.

## Pipeline changes made in this build
- **Hand-authored layouts:** `ims/stockade_plan.py` (the plan John approved) → `ims/convert.py` → one Watabou-format JSON per floor. New layout keys read by `layout.py`: `bounds` (every floor shares one frame), `fixed_order` (rooms numbered in rect order), rect `code` (G3, B6, U5 …) and `noroom` (auxiliary yard/moat rects), `surfaces` (`yard`, `bridge`, `walk` textures in `basemap.py`; `YARD_TEX` env), `stairs` (drawn by `basemap.py`, kept out of the magenta by `crops.py`), `under` (`UNDER_IMG`: the upper floor shows the finished ground floor, darkened, beyond its walls), `secret`, `links`.
- `basemap.py` theme `keep`. `crops.py` skips rooms with `furnish: false` and tells ChatGPT the stairs are drawn. `scenedata.py`: `place` (hand-placed tokens, e.g. moat creatures that the water excludes from spot search), stair rects and links, note `code`.
- **Multi-floor scenes:** `build_scene.js` `cfg.floor`/`floorName`/`overview`/`visibleTokens` builds one floor at a time from `scene-<floor>.json` and `rooms-<floor>.json`, names journals by code ("G3 Gatehouse") and rebuilds the overview index for all floors; only the ground floor carries `role: dungeon-scene` (the others `dungeon-floor`), so Enter Dungeon lists one entry. New `link_floors.js` places Monk's Active Tiles teleports on every stair from `links.json`. `ship.js` repoints teleport scene IDs in the packs and the Adventure, reports every scene, and keeps tiles flagged `startInactive` off.
- **Fit picking (`FIT_PICK=1`):** ChatGPT usually keeps the framing but repaints the wall texture, so the wall fit fails and the magenta fallback picked large false rescales (0.63–0.89). Now every candidate (walls, magenta, identity, translation) within 5% of identity is scored by magenta overlap over the crop and the best is kept: 29 of 31 rooms landed on identity or a few-pixel shift.
- **`LANES_SKIP`:** a flat carpet running through a doorway joins the throne, braziers and trophies into one object, and `CLEAR_LANES` removed the whole north wall of the throne room. Skip lane clearing for rooms with rugs or carpets through a door, and for open-sided rooms (the courtyard corner).
- `ims/fill_solid.py`: paints the keep's solid masonry (dead space between rooms) as wall top instead of black.
- Refill used on six rooms (barracks, entry hall, stair hall, throne room, gallery, quarters).

## Issues found and fixed
- Rooms B2 (sluice) and B3 (guard room) came back with moved doorways and lost their furniture to lane clearing; rerolled with the STRICT line ("every wall and every doorway stays exactly where it is").
- Moon-Touched Sword is not in this install's compendiums; built from the Longsword with rarity common and the light property in the description.
- Journals named "Forgemaster Ulgra"; the actor is "Forgemaster Ulgra Coalhand"; journal text fixed so the link resolves.
- Moat eels were not placed (spot search skips water cells); placed by hand with `place`.
- Closing one Claude-in-Chrome tab dissolved the session's tab group and the Foundry tab dropped out of reach; a new tab was opened and joined as Claude again.

## Open questions for John
- ~~The cover's throne resembled HBO's Iron Throne~~: regenerated as a granite throne with a carved wolf head (no blades). The small throne in the U5 map art is still a spiked iron chair.
- The war standard art is a three-quarter view rather than straight top-down; it reads fine on the map.

## Details invented by the story subagent (review)
- G1/G2: the gatehouse is mid south wall; the culvert grate is below the waterline (find DC 15 Wisdom (Perception) by a swimmer).
- G3: the legionnaire fights to the death; Murder Holes find is Wisdom (Perception), disarm by walking the walls or jamming the grates from the Winch Room.
- G4: a fresh grave beside the gallows; cutting the rope or burning the gallows has no mechanical effect but is seen from every tower.
- G5: the squad and guard do not break. G6: Vosk carries a whip and keys; the hounds hunt escaped prisoners. G7: Ulgra fights with a forge hammer; the servants work the bellows. G8: the Potion of Climbing is on the weapon rack. G11: a horn on a peg. G12: captured Crown banners hang upside down. G13: the legion eats in shifts. G16: a servant who reaches the top of the stair warns the gallery.
- B1: ankle-deep culvert water; the grate pins its victim; thieves' tools option is a Dexterity check. B2: Old Gutter's chain reaches the whole room; he fights until destroyed. B8: the potion is in a crate of medical supplies. B4: the prisoner who hid the Crown Veteran's Medal gives it to the first character who opens his cell. B4/B5: cell doors DC 18 thieves' tools (Dexterity) or DC 20 Athletics. B6: Skarn has a morningstar and fights to the death; a live prisoner hangs in chains there. B7: broken keys on the wall; green stain around the strongbox keyhole; the trap is a poison needle in the keyhole.
- W6–W9: sentry details (a crossbow, a spyglass, a signal brazier in W9). W1: kettles of cold pitch beside the murder-hole grates.
- U5: Gharrek and the Captain fight to the death. U1: the Company does not break; a drum beats; the potion is on a body by the shield wall. U2: the map marks the Crown's border forts for attack; the servant tries to run off with the Forgotten Roll; the Iron Guards fight to the death. U3: the Cloak of Protection is on the armour stand; the slits are at chest height. U4: a goblin servant is counting coins.
- Rooms G1, G2 and B1 have no servant (outdoor spaces and the culvert).

## Still to do
- John closes Foundry; then stage the packs, validate a fresh copy, commit art, packs and dev files, push.
- Release and the Sqyre import test when John says.

## Rework, 2026-11-11 (John's playtest notes)
- **Lighter maps:** tiles exported at 0.7 (`split_scaled.py`, about 98 px per 5 ft, WebP q82) as `<slug>-<floor>-m{ix}{iy}.webp`; scene size, grid and tile sizes unchanged. 45 MB of map files became 14 MB; video memory per floor about halved.
- **Room dressing (`dress/dress.py`, specs `ims/dress-<floor>.json`):** John's GIMP method in code. `grabs` cut a group out along the gaps and outlines between items (seam cuts); `regroup` lifts a group and rescales it in place; `scale`/`pieces` set true size; `pack` fills the free stretches of each wall with copies of wall pieces turned to the wall; `lines` set rows (barrel racks, mess tables, armour stands); anything in a door lane or on a stair is dropped. Barracks scaled 0.65 and the cell block's loose furniture 0.65 to match the rest. Check sheets: `dress/piecesheet.py` (each cut on a plain ground) and `after-NN.jpg` (5-ft grid, door lanes red).
- **Stairs:** ChatGPT art (`dev/dungeon/art/stairs`: straight up/down, grand up/down, tower spiral) painted by `stairs_art.py`; black wedges at the rounded tower corners and the keep's dead space filled (`fix_wedges.py`, `ims/fill_dark.py`).
- **Stairways** links replace the Monk's Active Tiles teleports (`link_stairways.js`, 14 stairways, role `floor-link`); the culvert's ground end starts hidden. `ship.js` keeps floor-link stairways and relinks their scene ids.
- **More trash** (`ims/more_trash.py`): 182 tokens (was 78); encounter lines and read-alouds updated. Token spots avoid furniture (`scenedata.py` `OCC`).
- **Flee control** (`scripts/flee.js`, `flee_controls.js`): a hidden wing icon above each room's north-east corner. GM click: servants run out the nearest way out (door, archway or open side) and leave the map; legionnaires and legion units fall back through it into the next room (or the open ground beyond); in a room that then holds 4+ legionnaires, every 4 become one Legion Squad. Chat whispers who went where and Doom +N (everyone who ran). Actors flagged `trash`. Tested: G16 → G12 (7 legionnaires → 1 squad + 3), G3 → yard and G12.
- Rebuilt world scenes: Ground `6SDNpF2FgtEyOseJ`, Basement `j7h3ZYI1fBjHZpoD`, Upper `Q9OanTHgIGUjPF10`; overview `ceMzXTsxk1sw2PPk`; Enter Dungeon relinked. Re-shipped: Adventure `tCx9NogFH6mgUBIc`; 96/32/54 tokens linked, 0 ID clashes; trap tests 50/56/51/49/53.
- **Music:** playlist "5LH3-1: The Ironmark Stockade" (`ims/playlist.js`, sequential, 10 tracks from Pixabay, none flagged Content ID) in `assets/sounds/music/the-ironmark-stockade/` (Ogg Opus 64 kbps, 12 MB); rows added to the Credits journal (Music page, world and pack copies). `ship.js` now ships an adventure's flagged playlists (playlists pack + Adventure). Re-shipped: Adventure `RAWUzic9nFJQEE2Z`.
- **Playlist shuffles** (John): mode Shuffle, tracks do not repeat, so it runs the whole list in random order.
- **Combat sound effects** (module-wide, `scripts/sfx.js`, 29 Pixabay sounds in `assets/sounds/sfx/`, Ogg Opus 96 kbps, 716 KB): attack hit / miss / critical by weapon (blade, blunt, ranged, bite, claw; monster attacks are typed "natural", so the attack's name decides), spells and save abilities by damage type, death cries by creature type plus a body fall, traps (mechanism, then fire / poison / bolt) when a trap's chain switches it off (Disarm passes `btltDisarm` and stays silent), war horn on Flee. Broadcast to everyone on the interface channel; world setting "Combat sound effects", client setting "Sound effects volume". Credits: new "Sound Effects" page in the Credits journal (`dev/dungeon/sfx_credits.js`). Tested in Foundry: spear hit → blade hit; servant to 0 HP → death cry + body fall; hound → yelp; War Cry → psychic. Re-shipped: Adventure `5jKfZsduE8aLA4jZ`.
- **Second pass (John):** banners and pennants (red cloth, or named in a room's `upright` list) are never turned or flipped upside down, so free-standing racks with pennants all face one way (armory lines no longer mirrored); every stair gets a 10-ft landing lane in front of it that furniture must keep off; small warm lights on the Flee icons (`flee_controls.js`, role `flee-light`, walls on, no vision); dead-end alleys in the yard cluttered from the courtyard's grabs (`dress/alleys.py`: open ground 2+ squares off every door-to-door route); floor patina under the furniture (`patina/patina.py`: dust along walls and corners, blotchy discolouration, scuffs/spills/drag marks, straw where the room calls for it; decals cut from two ChatGPT sheets by `patina/decals.py`, bootprints left out; per-room `patina` in `dress-<floor>.json`). Map tiles renamed `-n{ix}{iy}` so browsers fetch the new art. Re-shipped: Adventure `uvnwgbT5lje5bQ6J`.
- **Three-quarter facing (John):** the art is drawn from one fixed three-quarter view, so copies are never turned. North-wall pieces are copied only to north walls and south only to south (mirrored left-right at most); an east-wall piece mirrored becomes a west-wall piece. The dead-end alley clutter and the room specs' explicit turns follow the same rule. Straw decals re-cut without the pale halo; courtyard straw halved. Tiles renamed `-p{ix}{iy}`. Re-shipped: Adventure `mntZjy7GgTRh23xX`.
- **Yard siege works (John):** the empty yard got ChatGPT furnishing through `dress/yard.py` (a crop of the finished map with the open ground painted magenta; the return is keyed and laid back inside that ground only, or taken as painted when ChatGPT fills the magenta with its own dirt). North strip along the curtain wall (rows 5–6, three 60-ft segments, the row by the keep left clear as the walkway): three catapults, stone piles, pitch, a timber rack, a workbench and a brazier (with a light), a supply cart, firewood. East pocket beside the gatehouse: a catapult, two hitching rails with a trough, hay, a saddle rack, pitch. A prompt naming a ballista and its bolts was refused by ChatGPT; reworded. Inputs and returns in `ims/yard/`. Ground tiles renamed `-q`. Re-shipped: Adventure `66VWw52YrvRtRNln`.
