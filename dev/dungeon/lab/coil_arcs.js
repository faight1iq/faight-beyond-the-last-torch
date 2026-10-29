// 5LET-1 room 12: the coil's lightning arcs as an environmental hazard, plus a GM switch outside the room.
// Run in the Foundry console as GM with the script runner (cfg unused). Re-running replaces both tiles.
//   Hazard tile (hidden, flags.<mod>.role = "hazard-arcs"): Monk's Active Tiles, triggers enter + turn start,
//     covering the arcs plus 10 feet. A creature that enters or starts its turn there: the Bride regains 20 HP;
//     any other creature not immune to lightning makes a DC 19 Constitution save (Monk's TokenBar):
//     18 (2d8 + 9) lightning damage on a failure, half on a success.
//   Switch tile (hidden, GM click, flags.<mod>.role = "hazard-switch") outside the east wall: toggles the hazard,
//     the lightning video tile (role "fx-lightning") and the room 12 light. Use it when the coil is wrecked.
const MOD = "faight-beyond-the-last-torch", CODE = "5LET-1";
const scene = game.scenes.find(s => s.getFlag(MOD, "adventure") === CODE && s.getFlag(MOD, "role") === "dungeon-scene");
const rid = () => foundry.utils.randomID();
const old = scene.tiles.filter(t => ["hazard-arcs", "hazard-switch"].includes(t.getFlag(MOD, "role")));
if (old.length) await scene.deleteEmbeddedDocuments("Tile", old.map(t => t.id));
const cur = { id: "previous", name: "Current Tokens" };
const sort = `const MOD="${MOD}"; const tokens = arguments[0].tokens ?? []; const out=[];
for (const t of tokens) { const d = t.document ?? t; const a = d.actor; if (!a) continue;
  if (a.getFlag(MOD,"slug")==="the-bride") { const hp=a.system.attributes.hp; const v=Math.min(hp.max, hp.value+20);
    await a.update({"system.attributes.hp.value": v});
    ChatMessage.create({ speaker: ChatMessage.getSpeaker({ token: d }), content: "<p><strong>Coil Arcs.</strong> Lightning pours into the Bride: she regains 20 Hit Points.</p>" }); continue; }
  if ((a.system.traits?.di?.value ?? []).has?.("lightning") || [...(a.system.traits?.di?.value ?? [])].includes("lightning")) continue;
  out.push(d); }
return { tokens: out, continue: out.length > 0 };`;
const actions = [
  { id: rid(), action: "runcode", data: { code: sort } },
  { id: rid(), action: "monks-tokenbar.requestroll", data: { entity: cur, request: "save:con", dc: "19", flavor: "Coil Arcs: lightning leaps from the coils to anyone within 10 feet.", rollmode: "roll", silent: true, fastforward: false, usetokens: "all", continue: "always" } },
  { id: rid(), action: "monks-tokenbar.filterrequest", data: { failed: "fail", passed: "pass", resume: "" } },
  { id: rid(), action: "anchor", data: { tag: "fail", stop: true } },
  { id: rid(), action: "hurtheal", data: { entity: cur, value: "-[[2d8+9]]", chatMessage: true, rollmode: "roll", showdice: true } },
  { id: rid(), action: "anchor", data: { tag: "pass", stop: true } },
  { id: rid(), action: "hurtheal", data: { entity: cur, value: "-[[floor((2d8+9)/2)]]", chatMessage: true, rollmode: "roll", showdice: true } }
];
const toggle = `const MOD="${MOD}"; const sc=tile.parent;
const hz=sc.tiles.find(t=>t.getFlag(MOD,"role")==="hazard-arcs"), fx=sc.tiles.find(t=>t.getFlag(MOD,"role")==="fx-lightning");
const on=!hz.getFlag("monks-active-tiles","active");
await hz.update({"flags.monks-active-tiles.active": on});
if (fx) await fx.update({ hidden: !on });
const lt=sc.lights.find(l=>l.getFlag(MOD,"room")===12); if (lt) await lt.update({ hidden: !on });
await tile.update({ "texture.tint": on ? "#7fdfff" : "#555555", "flags.${MOD}.on": on });
ChatMessage.create({ whisper: ChatMessage.getWhisperRecipients("GM"), content: "<p><strong>Tower coil " + (on ? "ON" : "OFF") + ".</strong> " + (on ? "The arcs crackle again." : "The arcs die and the room goes dark.") + "</p>" });`;
await scene.createEmbeddedDocuments("Tile", [
  { texture: { src: `modules/${MOD}/assets/tiles/trap-red.webp`, tint: "#7fdfff" }, alpha: 0.5, hidden: true, x: 690, y: 294, width: 580, height: 716, sort: 5,
    flags: { [MOD]: { role: "hazard-arcs", room: 12 }, "monks-active-tiles": { active: true, trigger: ["enter", "turn"], restriction: "all", controlled: "all", pertoken: true, minrequired: 0, chance: 100, actions, name: "Coil Arcs" } } },
  { texture: { src: "icons/svg/lightning.svg", tint: "#7fdfff" }, alpha: 1, hidden: true, x: 1540, y: 560, width: 112, height: 112, sort: 20,
    flags: { [MOD]: { role: "hazard-switch", room: 12, on: true }, "monks-active-tiles": { active: true, trigger: ["click"], restriction: "gm", controlled: "all", pertoken: false, minrequired: 0, chance: 100, name: "Tower Coil On/Off",
      actions: [{ id: rid(), action: "runcode", data: { code: toggle } }] } } }
]);
const hz = scene.tiles.find(t => t.getFlag(MOD, "role") === "hazard-arcs"), sw = scene.tiles.find(t => t.getFlag(MOD, "role") === "hazard-switch");
`hazard ${hz.id}, switch ${sw.id}`;
