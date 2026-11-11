"""5LH3-1 rework: more trash mobs (a working fortress under siege). Rewrites encounters-<floor>.json rooms,
the encounter count line in rooms-<floor>.json notes, and the read-aloud lines that count creatures."""
import json, re
S, L, Q, P, C = "ironmark-servant", "ironmark-legionnaire", "legion-squad", "legion-platoon", "legion-company"
NEW = {
 "ground": {"3": [[S, 5], [L, 3]], "4": [[S, 6], [L, 4], [Q, 1]], "5": [[S, 3], [Q, 2], [L, 4]], "6": [[S, 3], ["kennelmaster-vosk", 1], ["war-hound-pack", 1], [L, 1]],
            "7": [["forgemaster-ulgra", 1], [S, 5], [L, 2]], "8": [[S, 2], [L, 2]], "9": [[S, 2], [L, 2]], "10": [[S, 2], [L, 2]], "11": [[S, 2], [L, 2]],
            "12": [[S, 3], [L, 4]], "13": [[S, 5], [P, 1], [L, 3]], "14": [[S, 6], [L, 1]], "15": [[S, 3], ["sergeant-drekk", 1], [L, 3]], "16": [[S, 2], [L, 3]]},
 "basement": {"2": [["old-gutter", 1], [S, 2]], "3": [[S, 4], [L, 1]], "4": [[S, 2], [P, 1], [L, 3]], "5": [[S, 2], [L, 3]], "6": [[S, 2], [L, 3]],
              "7": [["warden-skarn", 1], [L, 2], [S, 2]], "8": [[S, 2], [L, 1]]},
 "upper": {"1": [[S, 2], [L, 3]], "2": [[S, 2], [L, 3]], "3": [[S, 2], [L, 3]], "4": [[S, 2], [L, 3]], "5": [[S, 4], [L, 3]],
           "6": [["gharrek-the-unbowed", 1], ["the-iron-captain", 1], [S, 3]], "7": [[S, 3], [C, 1], [L, 2]], "8": [[S, 3], ["iron-guard", 2], [L, 2]],
           "9": [[S, 3], [L, 2]], "10": [[S, 2], [L, 2]]},
}
READ = {
 ("ground", 3): [("while a soldier in black iron armour shouts orders", "while three soldiers in black iron armour shout orders")],
 ("ground", 5): [("shields locked.", "shields locked, while more soldiers snatch up their swords and servants scramble for the door.")],
 ("ground", 7): [("Two servants work the bellows behind her.", "Servants work the bellows and haul coal behind her, and two soldiers wait by the grindstone for their blades.")],
 ("ground", 8): [("A hobgoblin soldier jumps up from the table, and a servant bolts for the stair.", "Two hobgoblin soldiers jump up from the table, and two servants bolt for the stair.")],
 ("ground", 9): [("A hobgoblin soldier turns from the brazier with a spear in hand while a servant scrambles for the stair.", "Two hobgoblin soldiers turn from the brazier with spears in hand while two servants scramble for the stair.")],
 ("ground", 10): [("A hobgoblin soldier looks up from the slits and reaches for her sword, and a servant runs for the stair.", "Two hobgoblin soldiers look up from the slits and reach for their swords, and two servants run for the stair.")],
 ("ground", 11): [("A hobgoblin soldier draws steel as you enter, and a servant lunges for the horn and the stair.", "Two hobgoblin soldiers draw steel as you enter, and two servants lunge for the horn and the stair.")],
 ("ground", 12): [("Two hobgoblin soldiers stand guard on either side of the inner door, and a servant with a tray of cups freezes in the middle of the floor.", "Four hobgoblin soldiers stand guard by the doors, and three servants with trays of cups freeze in the middle of the floor.")],
 ("ground", 14): [("and two cooks run.", "and the cooks run.")],
 ("ground", 15): [("beside another soldier.", "beside three more soldiers."), ("A servant polishing a breastplate drops it with a clang and runs.", "Servants polishing breastplates drop them with a clang and run.")],
 ("ground", 16): [("A hobgoblin soldier stands guard at the foot of the stair, and a servant halfway up turns and runs for the top.", "Three hobgoblin soldiers stand guard at the foot of the stair, and two servants halfway up turn and run for the top.")],
 ("basement", 3): [("A goblin servant drops an armful of turnips and runs.", "Goblin servants drop armfuls of turnips and run, and a hobgoblin soldier looks up from the tally board.")],
 ("basement", 4): [("A servant reaches for the gong hammer.", "Three more soldiers stand by the gong, and a servant reaches for the gong hammer.")],
 ("basement", 5): [("A hobgoblin guard paces the passage with a cudgel, and a servant carrying a water bucket runs for the door.", "Three hobgoblin guards pace the passage with cudgels, and servants carrying water buckets run for the door.")],
 ("basement", 6): [("A hobgoblin guard turns from the bars to face you, and a servant drops a basket of bread and runs.", "Three hobgoblin guards turn from the bars to face you, and servants drop baskets of bread and run.")],
 ("basement", 7): [("A hobgoblin soldier stands beside him, and a servant tending the brazier runs.", "Two hobgoblin soldiers stand beside him, and the servants tending the brazier run.")],
 ("upper", 1): [("A hobgoblin sentry turns from the crenellations with a crossbow, and a servant runs for the wall-walk.", "Three hobgoblin sentries turn from the crenellations with crossbows, and two servants run for the wall-walk.")],
 ("upper", 2): [("A hobgoblin sentry lowers a spyglass and draws steel, and a servant bolts along the wall-walk.", "A hobgoblin sentry lowers a spyglass and draws steel, two more beside him, and two servants bolt along the wall-walk.")],
 ("upper", 3): [("A hobgoblin sentry readies a crossbow, and a servant runs along the wall.", "Three hobgoblin sentries ready crossbows, and two servants run along the wall.")],
 ("upper", 4): [("A hobgoblin sentry draws her sword, and a servant runs for the brazier.", "Three hobgoblin sentries draw swords, and two servants run for the brazier.")],
 ("upper", 5): [("Two hobgoblin soldiers stand by the windlass, and a servant runs for the door.", "Three hobgoblin soldiers stand by the windlass, and servants run for the door.")],
 ("upper", 6): [("draws his blade.", "draws his blade. Servants scatter from the dais.")],
 ("upper", 8): [("and a servant at the table snatches up the parchment and runs.", "two soldiers stand at the map table, and servants snatch up the parchments and run.")],
 ("upper", 9): [("A servant polishing boots drops them and runs.", "Two hobgoblin soldiers lounging by the bed leap up, and servants polishing boots drop them and run.")],
 ("upper", 10): [("A goblin servant counting coins at a little table jumps up and runs.", "Two hobgoblin soldiers guard the chests, and goblin servants counting coins at a little table jump up and run.")],
}
names = {}
for f in ("ground", "basement", "upper"):
    e = json.load(open(f"encounters-{f}.json"))
    e["rooms"].update(NEW[f]); json.dump(e, open(f"encounters-{f}.json", "w"), indent=1)
src = open("monsters.js").read()
for slug, name in re.findall(r'name: "([^"]+)", slug: "([^"]+)"', src): names[name] = slug
nm = names   # slug -> name
for f in ("ground", "basement", "upper"):
    rooms = json.load(open(f"rooms-{f}.json"))
    for r in rooms:
        enc = NEW[f].get(str(r["n"]))
        if enc:
            line = ", ".join(f"{c} <strong>{nm[s]}</strong>{'s' if c > 1 else ''}" for s, c in enc) + "."
            r["notes"], k = re.subn(r"(<h3>Encounter</h3><p>)(?:\d+ <strong>[^<]+</strong>s?(?:, )?)+\.", lambda m: m.group(1) + line, r["notes"], count=1)
            if not k: print("no count line", f, r["n"])
        for old, new in READ.get((f, r["n"]), []):
            if old not in r["read"]: print("read miss", f, r["n"], old[:40])
            r["read"] = r["read"].replace(old, new)
    json.dump(rooms, open(f"rooms-{f}.json", "w"), indent=1, ensure_ascii=False)
print("ok")
