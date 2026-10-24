/**
 * Beyond the Last Torch — trap spotting with Passive Perception.
 *
 * Trap tiles are the hidden Monk's Active Tiles tiles flagged
 * flags["faight-beyond-the-last-torch"].role === "trap". Each one has a warning zone one grid
 * square wide around it. When a player character's move would carry it into that zone, the best
 * Passive Perception among the party tokens near the zone is compared with the trap's spot DC:
 *
 *   - noticed:     the move stops just short of the zone, the trap tile is revealed to everyone,
 *                  the game pauses, and chat says who spotted it (the GM also gets the numbers).
 *                  The trap stays armed; the zone does not fire again for that trap.
 *   - not noticed: nothing happens here. Stepping on the trap runs its saving throw as before.
 *
 * Spot DC: flags[...].spotDC on the tile, otherwise the DC of the trap's saving throw.
 * The check runs on the client that moves the token; the reveal, pause and chat run on the
 * active GM's client (players cannot pause or change tiles), reached through the module socket.
 */

const MODULE_ID = "faight-beyond-the-last-torch";
const SOCKET = `module.${MODULE_ID}`;
const NEARBY_FT = 15; // party members this close to the warning zone can also spot the trap

const isActiveGM = () => game.users.activeGM?.isSelf ?? game.user.isGM;
const isPlayerCharacter = (tokenDoc) => tokenDoc.actor?.type === "character" || !!tokenDoc.actor?.hasPlayerOwner;
// Trap name: flags.<mod>.trap (newer builds) or flags.<mod>.name (Icefall Pyramid).
const trapName = (t) => t.getFlag(MODULE_ID, "trap") ?? t.getFlag(MODULE_ID, "name") ?? t.flags?.["monks-active-tiles"]?.name ?? "";
const passive = (tokenDoc) => Number(tokenDoc.actor?.system?.skills?.prc?.passive) || 0;

function spotDC(tile) {
  const own = Number(tile.getFlag(MODULE_ID, "spotDC"));
  if (own) return own;
  const roll = tile.flags?.["monks-active-tiles"]?.actions?.find((a) => a.action === "monks-tokenbar.requestroll");
  return Number(roll?.data?.dc) || 15;
}

// Traps that can still be spotted: armed, not yet noticed.
function liveTraps(scene) {
  return scene.tiles.filter((t) => t.getFlag(MODULE_ID, "role") === "trap"
    && !t.getFlag(MODULE_ID, "noticed")
    && t.flags?.["monks-active-tiles"]?.active !== false);
}

const rectOf = (x, y, tokenDoc, g) => ({ x, y, w: tokenDoc.width * g, h: tokenDoc.height * g });
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const gap = (a, b) => Math.hypot(
  Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w)),
  Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h)));

/**
 * Walk the planned path in small steps. Returns the first warning zone the token enters, the index
 * of the waypoint segment it happens on, and the last grid-aligned position before the zone.
 */
function firstEntry(tokenDoc, origin, waypoints, traps) {
  const scene = tokenDoc.parent, g = scene.grid.size;
  const zones = traps.map((tile) => ({ tile, r: { x: tile.x - g, y: tile.y - g, w: tile.width + 2 * g, h: tile.height + 2 * g } }));
  // A zone the token already stands in was passed before this feature existed (or by teleport): skip it.
  const start = rectOf(origin.x, origin.y, tokenDoc, g);
  const watch = zones.filter((z) => !overlaps(start, z.r));
  if (!watch.length) return null;
  let prev = { x: origin.x, y: origin.y };
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const dx = wp.x - prev.x, dy = wp.y - prev.y;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (g / 4)));
    let last = { x: prev.x, y: prev.y };
    for (let s = 1; s <= n; s++) {
      const p = { x: prev.x + (dx * s) / n, y: prev.y + (dy * s) / n };
      const hit = watch.find((z) => overlaps(rectOf(p.x, p.y, tokenDoc, g), z.r));
      if (hit) return { zone: hit, segment: i, stop: snapOutside(last, hit.r, tokenDoc, g, origin) };
      last = p;
    }
    prev = { x: wp.x, y: wp.y };
  }
  return null;
}

// The nearest grid square to `p` whose token rectangle stays outside the zone.
function snapOutside(p, zone, tokenDoc, g, origin) {
  const fx = Math.floor(p.x / g) * g, fy = Math.floor(p.y / g) * g;
  const options = [];
  for (const x of [fx, fx + g, fx - g]) for (const y of [fy, fy + g, fy - g]) {
    if (!overlaps(rectOf(x, y, tokenDoc, g), zone)) options.push({ x, y, d: Math.hypot(x - p.x, y - p.y) });
  }
  options.sort((a, b) => a.d - b.d);
  return options[0] ? { x: options[0].x, y: options[0].y } : { x: origin.x, y: origin.y };
}

// Foundry 13 hands the hook a read-only movement, so a noticed trap cancels the move (return false)
// and the token is sent again on a shorter path that ends just outside the warning zone.
Hooks.on("preMoveToken", (tokenDoc, movement, options) => {
  if (options?.[MODULE_ID]?.trapChecked) return;
  if (!isPlayerCharacter(tokenDoc)) return;
  const scene = tokenDoc.parent;
  if (!scene) return;
  const traps = liveTraps(scene);
  if (!traps.length) return;
  // The whole planned path: the waypoints this update passes through, then any still pending.
  const waypoints = [...(movement.passed?.waypoints ?? []), ...(movement.pending?.waypoints ?? [])];
  if (!waypoints.length) return;
  if (waypoints.every((w) => w.action === "displace")) return; // teleports and GM repositioning don't walk past anything
  const origin = movement.origin ?? tokenDoc;
  const entry = firstEntry(tokenDoc, origin, waypoints, traps);
  if (!entry) return;

  // Who could spot it: the mover and party members near the zone.
  const g = scene.grid.size, ftPerPx = scene.grid.distance / g;
  const party = scene.tokens.filter((t) => t.id !== tokenDoc.id && isPlayerCharacter(t)
    && gap(rectOf(t.x, t.y, t, g), entry.zone.r) * ftPerPx <= NEARBY_FT);
  const watchers = [{ doc: tokenDoc, pp: passive(tokenDoc) }, ...party.map((t) => ({ doc: t, pp: passive(t) }))];
  const best = watchers.sort((a, b) => b.pp - a.pp)[0];
  const dc = spotDC(entry.zone.tile);
  if (best.pp < dc) return; // not noticed: the move goes ahead, and the trap fires if they step on it

  const report = { sceneId: scene.id, tileId: entry.zone.tile.id, spotter: best.doc.name, pp: best.pp, dc, mover: tokenDoc.name };
  if (isActiveGM()) onNoticed(report); else game.socket.emit(SOCKET, { type: "trapNoticed", ...report });

  const strip = (w) => ({ x: w.x, y: w.y, elevation: w.elevation, action: w.action, snapped: w.snapped, explicit: w.explicit });
  const kept = [...waypoints.slice(0, entry.segment).map(strip), { ...strip(waypoints[entry.segment]), x: entry.stop.x, y: entry.stop.y }];
  const atEdge = entry.segment === 0 && entry.stop.x === origin.x && entry.stop.y === origin.y;
  if (!atEdge) setTimeout(() => tokenDoc.move(kept, { method: movement.method, [MODULE_ID]: { trapChecked: true } }), 0);
  return false;
});

async function onNoticed({ sceneId, tileId, spotter, pp, dc, mover }) {
  const tile = game.scenes.get(sceneId)?.tiles.get(tileId);
  if (!tile || tile.getFlag(MODULE_ID, "noticed")) return;
  await tile.update({ hidden: false, [`flags.${MODULE_ID}.noticed`]: true });
  if (!game.paused) game.togglePause(true, { broadcast: true });
  const name = trapName(tile) || "a trap";
  const esc = foundry.utils.escapeHTML;
  await ChatMessage.create({ content: `<p><strong>${esc(spotter)}</strong> spots a hidden trap ahead and calls a halt.</p>` });
  await ChatMessage.create({
    content: `<p>Trap spotted: <strong>${esc(name)}</strong>. ${esc(spotter)}'s Passive Perception ${pp} vs spot DC ${dc}`
      + `${spotter === mover ? "" : ` (${esc(mover)} was walking into it)`}. The trap is still armed.</p>`,
    whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
  });
}

Hooks.once("ready", () => {
  game.socket.on(SOCKET, (msg) => {
    if (msg?.type === "trapNoticed" && isActiveGM()) onNoticed(msg);
  });
});

/* -------------------------------------------- */
/*  Arm / Disarm controls (GM only)             */
/* -------------------------------------------- */

/*
 * Each trap has two hidden tiles just outside its room, visible only to the GM:
 *   flags[MODULE_ID] = { role: "trap-arm" | "trap-disarm", trap: <trap name>, room: <room number> }
 * Their Monk's Active Tiles click trigger runs: game.modules.get(MODULE_ID).api.trapControl(tile)
 *   Arm:    hide the trap tile again, clear "noticed", turn the trap trigger back on.
 *   Disarm: turn the trap trigger off (the spotting zone goes with it). Visibility is unchanged.
 * The control for the trap's current state is drawn bright; the other is dimmed.
 */
const CONTROL_ROLES = ["trap-arm", "trap-disarm"];

function trapFor(control) {
  const f = control.flags?.[MODULE_ID] ?? {};
  return control.parent?.tiles.find((t) => t.getFlag(MODULE_ID, "role") === "trap"
    && trapName(t) === f.trap && t.getFlag(MODULE_ID, "room") === f.room) ?? null;
}

const ARMED_COLOR = "#5fd35f", DISARMED_COLOR = "#ff6b6b";
const labelText = (name, armed) => `${name}\n${armed ? "ARMED" : "DISARMED"}`;

// Brighten the control for the current state, dim the other, and write the state on the label.
async function showState(trap) {
  const armed = trap.flags?.["monks-active-tiles"]?.active !== false;
  const name = trapName(trap), room = trap.getFlag(MODULE_ID, "room");
  const mine = (d) => d.getFlag(MODULE_ID, "trap") === name && d.getFlag(MODULE_ID, "room") === room;
  const controls = trap.parent.tiles.filter((t) => CONTROL_ROLES.includes(t.getFlag(MODULE_ID, "role")) && mine(t));
  await trap.parent.updateEmbeddedDocuments("Tile", controls.map((c) => {
    const lit = (c.getFlag(MODULE_ID, "role") === "trap-arm") === armed;
    return { _id: c.id, alpha: lit ? 1 : 0.35 };
  }));
  const labels = trap.parent.drawings.filter((d) => d.getFlag(MODULE_ID, "role") === "trap-label" && mine(d));
  await trap.parent.updateEmbeddedDocuments("Drawing", labels.map((d) => ({
    _id: d.id, text: labelText(name, armed), textColor: armed ? ARMED_COLOR : DISARMED_COLOR,
  })));
}

// A chat line only the GMs see.
async function tellGM(trap, armed, detail) {
  const esc = foundry.utils.escapeHTML;
  const color = armed ? ARMED_COLOR : DISARMED_COLOR;
  await ChatMessage.create({
    content: `<p><strong>${esc(trapName(trap))}</strong>: <strong style="color:${color}">${armed ? "ARMED" : "DISARMED"}</strong>. ${detail}</p>`,
    whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
    speaker: { alias: "Trap control" },
  });
}

async function armTrap(trap) {
  await trap.update({
    hidden: true,
    [`flags.${MODULE_ID}.-=noticed`]: null,
    "flags.monks-active-tiles.active": true,
    "flags.monks-active-tiles.-=history": null,
  });
  await showState(trap);
  ui.notifications.info(`${trapName(trap)}: ARMED`);
  await tellGM(trap, true, "Hidden again; it can be spotted and will go off if stepped on.");
}

async function disarmTrap(trap) {
  await trap.update({ "flags.monks-active-tiles.active": false });
  await showState(trap);
  ui.notifications.info(`${trapName(trap)}: DISARMED`);
  await tellGM(trap, false, "Stepping on it does nothing and it can't be spotted.");
}

async function trapControl(control) {
  if (!game.user.isGM) return;
  const doc = control?.document ?? control;
  const trap = trapFor(doc);
  if (!trap) return ui.notifications.warn("No trap found for this control.");
  return doc.getFlag(MODULE_ID, "role") === "trap-arm" ? armTrap(trap) : disarmTrap(trap);
}

// Keep the controls' brightness in step when a trap fires (its own actions switch it off).
Hooks.on("updateTile", (tile, changes) => {
  if (!isActiveGM() || tile.getFlag(MODULE_ID, "role") !== "trap") return;
  if (foundry.utils.hasProperty(changes, "flags.monks-active-tiles.active")) showState(tile);
});

Hooks.once("init", () => {
  const mod = game.modules.get(MODULE_ID);
  mod.api = Object.assign(mod.api ?? {}, { trapControl, armTrap, disarmTrap });
});
