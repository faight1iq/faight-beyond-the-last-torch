"""5LH3-1 The Ironmark Stockade: plan-<floor>.json and encounters-<floor>.json for the three floors."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
CODE, NAME, SLUG = "5LH3-1", "The Ironmark Stockade", "the-ironmark-stockade"
STYLE = ("Objects are modeled 3D assets from a modern dark-fantasy video game (Unreal Engine 5), seen from directly above, each casting a soft dark contact shadow onto the floor. "
         "A hobgoblin war fortress on the night the war ended, still fully manned: iron-banded crates, weapon racks, spears, round shields, red-and-black war banners, braziers, "
         "barrels, sacks, straw, chains, rough timber furniture, maps and ledgers, bones. Use many small objects (a dozen or more) rather than a few large ones; nothing larger than the sizes given. "
         "Furniture stands against the walls; the middle of the room stays mostly open.")
WALLS = ("The grey stone bands around the floor are the tops of thick castle walls and the dark area is solid ground outside the building: keep them exactly as they are; "
         "do not move, redraw or extend any wall. ")
WALLS_UP = ("The grey stone bands around the floor are the tops of thick castle walls and parapets; the dim area beyond them is the courtyard far below: keep all of it exactly as it is; "
            "do not move, redraw or extend any wall. ")

ROOMS = {
 "ground": {
  "1": ("G1", "Moat Bank", None),
  "2": ("G2", "The Moat", None),
  "3": ("G3", "Gatehouse", "a fortress gatehouse passage: the drawbridge winch chains running up through the ceiling along the east and west walls, a guard's stool and brazier, spear racks, a rack of crossbows, sandbags and a barrel of pitch against the walls, murder holes in the ceiling shown as small dark square grates in the floor's middle strip"),
  "4": ("G4", "Outer Courtyard", "a corner of a fortress courtyard at dusk: a tall wooden gallows with a single noose stands against the west side, a cart of firewood, stacked crates and barrels, a water trough, scattered straw and a few spears leaning on the walls"),
  "5": ("G5", "Barracks", "a soldiers' barracks: rows of narrow cots with grey blankets against the long walls, footlockers at their ends, a weapon rack, a table with dice and tin cups, boots and kit bags, an iron pay chest in the north-west corner"),
  "6": ("G6", "Kennels", "war-dog kennels: wooden pens with iron gates along the east wall, straw bedding, gnawed bones, water troughs, chains and spiked collars hanging on pegs, a handler's stool and whip, meat buckets"),
  "7": ("G7", "Smithy", "a fortress smithy: a glowing stone forge with bellows against the east wall, an anvil on a stump, quench barrel, racks of half-finished spearheads and helmets, tongs and hammers on a bench, coal heap, a grindstone"),
  "8": ("G8", "NW Tower", "the ground floor of a round-cornered stone tower: a spiral stair in the north-west corner (already drawn), arrow bundles, a crate of javelins, a cot, a lantern on a barrel"),
  "9": ("G9", "NE Tower", "the ground floor of a stone tower: a spiral stair in the north-east corner (already drawn), stacked arrow bundles, sacks, a water barrel, a small table with a candle"),
  "10": ("G10", "SW Tower", "the ground floor of a stone tower: a spiral stair in the south-west corner (already drawn), a crate of crossbow bolts, a cot, kit bags, a lantern"),
  "11": ("G11", "SE Tower", "the ground floor of a stone tower: a spiral stair in the south-east corner (already drawn), barrels, a rack of spears, a stool, a lantern"),
  "12": ("G12", "Entry Hall", "the entry hall of a fortress keep: war banners on the walls, two suits of hobgoblin armor on stands, a long bench, a brazier in each corner, a red runner carpet from the south doors north"),
  "13": ("G13", "Mess Hall", "a soldiers' mess hall: two long trestle tables with benches running north-south, tin plates and mugs, a soup cauldron on a hearth against the west wall, barrels of ale"),
  "14": ("G14", "Kitchen", "a fortress kitchen: a hearth with a spit against the west wall, a chopping table, hanging pots, sacks of grain, a meat rack, buckets, a stair down to the cellar in the north-west corner (already drawn)"),
  "15": ("G15", "Armory", "a fortress armory: weapon racks of spears, halberds and swords along every wall, shield stacks, armor stands, a whetstone bench, crates of arrows, a heavy iron-bound locker"),
  "16": ("G16", "Grand Stair", "a broad stone stair hall: a wide staircase going up along the north wall (already drawn), torches in sconces, two war banners, a guard's bench at the foot of the stair"),
 },
 "basement": {
  "1": ("B1", "Moat Culvert", None),
  "2": ("B2", "Sluice Room", "a dank sluice chamber: a stone water channel along the west wall, a large iron gate wheel, a rusted sluice gate, heavy chains bolted to the floor, gnawed bones and a feeding trough"),
  "3": ("B8", "Cellar Stores", "a fortress cellar: wine and ale barrels in racks, sacks of grain and flour, hanging hams, crates of turnips, a stair up to the kitchen in the north-west corner (already drawn)"),
  "4": ("B3", "Guard Room", "a dungeon guard room: a table with a lantern, dice and a ring of keys, a weapon rack, a brazier, stools, a hook board for manacles, a bucket"),
  "5": ("B4", "North Cell Block", "a dungeon cell block: a row of small barred cells along the north wall with straw, buckets and chained prisoners' cots, an aisle down the south side, a turnkey's stool"),
  "6": ("B5", "South Cell Block", "a dungeon cell block: a row of small barred cells along the south wall with straw, buckets and chained prisoners' cots, an aisle down the north side, a turnkey's stool"),
  "7": ("B6", "Interrogation", "an interrogation chamber: a heavy chair with straps, a brazier with branding irons, chains hanging from the ceiling, a table of iron tools, a rack against the east wall, a bucket of water"),
  "8": ("B7", "Warden's Office", "a jailer's office: a heavy desk with ledgers and an inkwell against the east wall, a key board on the wall, a cot, a locked iron strongbox standing in the north-west corner, a lantern"),
 },
 "upper": {
  "1": ("W6", "NW Tower Top", "the open top of a castle tower behind crenellated parapets: a loaded ballista facing outward, a brazier, a crate of bolts, a signal horn on a post, a spiral stair hatch (already drawn)"),
  "2": ("W7", "NE Tower Top", "the open top of a castle tower behind parapets: a stone-thrower (small mangonel), a pile of rocks, a brazier, a spiral stair hatch (already drawn)"),
  "3": ("W8", "SW Tower Top", "the open top of a castle tower behind parapets: a ballista, bolt crates, a war banner on a pole, a spiral stair hatch (already drawn)"),
  "4": ("W9", "SE Tower Top", "the open top of a castle tower behind parapets: a cauldron of pitch over a brazier, buckets, a crate of javelins, a spiral stair hatch (already drawn)"),
  "5": ("W1", "Winch Room", "a gatehouse winch room: a big wooden windlass with iron chains running down through slots in the floor to the drawbridge, a portcullis wheel, coils of rope, a guard's stool, oil buckets"),
  "6": ("U5", "Throne Room", "a hobgoblin warlord's throne hall: a black iron throne on a low dais in the middle of the north wall, four tall red-and-black war standards around the room, braziers, trophies of captured enemy shields and banners on the walls, a long red carpet from the south doors"),
  "7": ("U1", "Upper Gallery", "an upper gallery hall: weapon racks and war trophies on the walls, a long bench, banners, the head of a wide stone stair coming up in the south (already drawn), a brazier"),
  "8": ("U2", "War Room", "a war room: a large map table covered in campaign maps and carved army markers in the middle, chairs, scroll racks along the walls, a lectern with an open ledger, candles"),
  "9": ("U3", "Gharrek's Quarters", "a hobgoblin warlord's bedchamber: a heavy bed with furs against the east wall, an armor stand, a weapon rack, a war chest, a washstand, a desk with letters, crossbow slits in the north wall"),
  "10": ("U4", "Treasury", "a fortress treasury: iron-bound chests and coffers against the walls, a small heavy strongbox on a stone plinth against the north wall, sacks of coin, captured silver plate"),
 },
}

E = {
 "ground": {"rooms": {"3": [["ironmark-servant", 4], ["ironmark-legionnaire", 1]],
                      "4": [["ironmark-servant", 3], ["ironmark-legionnaire", 2]],
                      "5": [["ironmark-servant", 1], ["legion-squad", 1], ["ironmark-legionnaire", 1]],
                      "6": [["ironmark-servant", 1], ["kennelmaster-vosk", 1], ["war-hound-pack", 1]],
                      "7": [["forgemaster-ulgra", 1], ["ironmark-servant", 2]],
                      "8": [["ironmark-servant", 1], ["ironmark-legionnaire", 1]], "9": [["ironmark-servant", 1], ["ironmark-legionnaire", 1]],
                      "10": [["ironmark-servant", 1], ["ironmark-legionnaire", 1]], "11": [["ironmark-servant", 1], ["ironmark-legionnaire", 1]],
                      "12": [["ironmark-servant", 1], ["ironmark-legionnaire", 2]],
                      "13": [["ironmark-servant", 2], ["legion-platoon", 1]],
                      "14": [["ironmark-servant", 2], ["ironmark-legionnaire", 1]],
                      "15": [["ironmark-servant", 1], ["sergeant-drekk", 1], ["ironmark-legionnaire", 1]],
                      "16": [["ironmark-servant", 1], ["ironmark-legionnaire", 1]]},
            # the leech swarm waits under the drawbridge (squares, absolute)
            "place": [["leech-swarm", 16.4, 29.4, 2], ["moat-eel", 2.4, 13.6, 2], ["moat-eel", 2.4, 17.6, 2]],
            "traps": {"3": {"name": "Murder Holes", "kind": "section", "save": "dex", "dc": 15, "dice": "10d10", "type": "fire", "effect": "",
                            "flavor": "Murder Holes: the grates overhead open and boiling pitch pours down on you.", "spot": [1, 1, 2, 2]}},
            "lights": [[7, "#ff9a4a", 25, 10], [14, "#ffb070", 20, 5], [13, "#ffb070", 20, 5], [12, "#ffcf8a", 20, 5], [4, "#ffcf8a", 20, 5]],
            "entrance": [18, 32.5]},
 "basement": {"rooms": {"2": [["old-gutter", 1], ["ironmark-servant", 1]], "3": [["ironmark-servant", 1]],
                        "4": [["ironmark-servant", 1], ["legion-platoon", 1]],
                        "5": [["ironmark-servant", 1], ["ironmark-legionnaire", 1]], "6": [["ironmark-servant", 1], ["ironmark-legionnaire", 1]],
                        "7": [["warden-skarn", 1], ["ironmark-legionnaire", 1], ["ironmark-servant", 1]],
                        "8": [["ironmark-servant", 1]]},
               "traps": {"1": {"name": "Culvert Grate", "kind": "hall", "save": "dex", "dc": 15, "dice": "10d10", "type": "piercing", "effect": "restrained",
                               "flavor": "Culvert Grate: a spiked iron grate drops from the ceiling of the culvert and pins you to the mud.", "spot": [3, 0, 1, 2]},
                         "8": {"name": "Warden's Strongbox", "kind": "container", "object": "the locked iron strongbox under the key board", "save": "con", "dc": 16, "dice": "10d10", "type": "poison", "effect": "poisoned",
                               "flavor": "Warden's Strongbox: a needle springs from the lock and a cloud of yellow gas bursts from the box.", "spot": [0, 0, 1, 1]}},
               "lights": [[7, "#ff8a4a", 20, 5], [4, "#ffcf8a", 15, 5]],
               "entrance": [4, 14.5]},
 "upper": {"rooms": {"1": [["ironmark-servant", 1], ["ironmark-legionnaire", 1]], "2": [["ironmark-servant", 1], ["ironmark-legionnaire", 1]],
                     "3": [["ironmark-servant", 1], ["ironmark-legionnaire", 1]], "4": [["ironmark-servant", 1], ["ironmark-legionnaire", 1]],
                     "5": [["ironmark-servant", 1], ["ironmark-legionnaire", 2]],
                     "6": [["gharrek-the-unbowed", 1], ["the-iron-captain", 1], ["ironmark-servant", 1]],
                     "7": [["ironmark-servant", 1], ["legion-company", 1]],
                     "8": [["ironmark-servant", 1], ["iron-guard", 2]],
                     "9": [["ironmark-servant", 1]], "10": [["ironmark-servant", 1]]},
          "traps": {"9": {"name": "Crossbow Slits", "kind": "wall", "save": "dex", "dc": 16, "dice": "10d10", "type": "piercing", "effect": "prone",
                          "flavor": "Crossbow Slits: hidden crossbows in the north wall fire a volley along the room.", "spot": [0, 0, 3, 0.5]},
                    "10": {"name": "Treasury Strongbox", "kind": "container", "object": "the small strongbox on the stone plinth against the north wall", "save": "dex", "dc": 16, "dice": "10d10", "type": "fire", "effect": "",
                           "flavor": "Treasury Strongbox: a fire glyph on the lid flares as you reach for it.", "spot": [1, 0, 1, 1]}},
          "lights": [[6, "#ff9a4a", 30, 10], [7, "#ffcf8a", 20, 5], [8, "#ffd9a0", 15, 5], [1, "#ffb070", 15, 5], [2, "#ffb070", 15, 5], [3, "#ffb070", 15, 5], [4, "#ff9a4a", 15, 5]],
          "entrance": [18, 16]},
}
SIZES = {"ironmark-servant": 1, "ironmark-legionnaire": 1, "moat-eel": 2, "leech-swarm": 1, "legion-squad": 1, "war-hound-pack": 2,
         "legion-platoon": 2, "legion-company": 3, "iron-guard": 1, "kennelmaster-vosk": 1, "forgemaster-ulgra": 2, "sergeant-drekk": 1,
         "warden-skarn": 2, "old-gutter": 2, "the-iron-captain": 1, "gharrek-the-unbowed": 2}
for fl in ("ground", "basement", "upper"):
    plan = dict(code=CODE, name=NAME, slug=SLUG, floor=fl, theme="keep",
                override="John, 2026-11-11: hand-drawn castle layout (no Watabou); Veterans Day story: the war has just ended, warlord Gharrek refuses the peace and holds Crown prisoners.",
                wall_text=WALLS_UP if fl == "upper" else WALLS, prompt_style=STYLE,
                rooms={n: dict(code=c, name=nm, art=art or "", furnish=art is not None) for n, (c, nm, art) in ROOMS[fl].items()})
    json.dump(plan, open(os.path.join(HERE, f"plan-{fl}.json"), "w"), indent=1)
    e = dict(wall_offset=35, sizes=SIZES, **E[fl])
    e.setdefault("place", [])
    json.dump(e, open(os.path.join(HERE, f"encounters-{fl}.json"), "w"), indent=1)
print("ok")
