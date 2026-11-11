/**
 * Beyond the Last Torch — Flee control (GM only).
 *
 * Each dungeon room has one hidden tile just outside its walls, visible only to the GM:
 *   flags[MODULE_ID] = { role: "flee", room: <room number>, code: "G3", name: "Gatehouse", rect: [x, y, w, h] (px) }
 * Its Monk's Active Tiles click trigger runs: game.modules.get(MODULE_ID).api.fleeRoom(tile)
 *
 * Every living trash creature in that room (actor flag trash: true; token flagged with the room number or standing
 * in it; not at 0 HP, not dead) runs for the nearest doorway (John, 2026-11-11):
 *   - servants (actor slug ironmark-servant) leave the map;
 *   - legionnaires and legion units fall back through that door into the room beyond (or the yard / corridor
 *     beyond when no room is there) and stand near the door.
 * Then, in every room that troops fell back into: when it holds 4 or more living legionnaires, each 4 of them
 * become one fresh Legion Squad (actor slug legion-squad of the same adventure) where they stood.
 * The GM gets a whispered chat line: who vanished, who fell back where, which squads formed, and Doom +N
 * (one per creature that ran).
 */

const MODULE_ID = "faight-beyond-the-last-torch";
const SERVANT = "ironmark-servant", LEGIONNAIRE = "ironmark-legionnaire", SQUAD = "legion-squad";
const slugOf = (t) => t.actor?.getFlag(MODULE_ID, "slug");
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const alive = (t) => {
  const hp = t.actor?.system?.attributes?.hp?.value;
  return !(hp !== undefined && hp <= 0) && !t.actor?.statuses?.has("dead") && !t.hidden;
};

// Ways out of a room: every stretch of its edge not closed by a plain wall (doors, archways, open sides), with the
// direction it opens to. The walls stand a little outside the painted floor, so each side is tested 35 px out.
function doorsOf(scene, rect) {
  const [x, y, w, h] = rect, step = 35, off = 35;
  const solid = scene.walls.filter((wl) => !(wl.door > 0)).map((wl) => wl.c);
  const near = (px, py) => solid.some(([ax, ay, bx, by]) => {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
    return Math.hypot(ax + t * dx - px, ay + t * dy - py) < 30;
  });
  const sides = [
    { n: Math.floor(w / step), at: (i) => ({ x: x + i * step, y: y - off }), out: { x: 0, y: -1 } },
    { n: Math.floor(w / step), at: (i) => ({ x: x + i * step, y: y + h + off }), out: { x: 0, y: 1 } },
    { n: Math.floor(h / step), at: (i) => ({ x: x - off, y: y + i * step }), out: { x: -1, y: 0 } },
    { n: Math.floor(h / step), at: (i) => ({ x: x + w + off, y: y + i * step }), out: { x: 1, y: 0 } },
  ];
  const exits = [];
  for (const sd of sides) {
    let run = [];
    const flush = () => { if (run.length >= 3) { const m = run[Math.floor(run.length / 2)]; exits.push({ x: m.x - sd.out.x * off, y: m.y - sd.out.y * off, out: sd.out }); } run = []; };
    for (let i = 2; i <= sd.n - 2; i++) { const p = sd.at(i); if (near(p.x, p.y)) flush(); else run.push(p); }
    flush();
  }
  return exits;
}

const rooms = (scene) => scene.tiles.filter((t) => t.getFlag(MODULE_ID, "role") === "flee")
  .map((t) => ({ room: t.getFlag(MODULE_ID, "room"), code: t.getFlag(MODULE_ID, "code"), name: t.getFlag(MODULE_ID, "name"), rect: t.getFlag(MODULE_ID, "rect") }));
const inRect = (p, r, m = 0) => r && p.x >= r[0] + m && p.x <= r[0] + r[2] - m && p.y >= r[1] + m && p.y <= r[1] + r[3] - m;

// Free grid spots for a token of `size` px near `from`, nearest first, inside `rect` when given, clear of `taken` boxes.
function freeSpots(scene, from, rect, size, taken, n) {
  const g = scene.grid.size, out = [];
  const hit = (a) => taken.some((b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
  const cand = [];
  for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) {
    const x = Math.round((from.x - size / 2) / g) * g + dx * g, y = Math.round((from.y - size / 2) / g) * g + dy * g;
    cand.push({ x, y, d: Math.hypot(x + size / 2 - from.x, y + size / 2 - from.y) });
  }
  cand.sort((a, b) => a.d - b.d);
  for (const c of cand) {
    const box = { x: c.x, y: c.y, w: size, h: size };
    if (rect && !(inRect({ x: c.x, y: c.y }, rect, 20) && inRect({ x: c.x + size, y: c.y + size }, rect, 20))) continue;
    if (c.x < 0 || c.y < 0 || c.x + size > scene.dimensions.width || c.y + size > scene.dimensions.height) continue;
    if (hit(box)) continue;
    out.push(box); taken.push(box);
    if (out.length >= n) break;
  }
  return out;
}

async function fleeRoom(control) {
  if (!game.user.isGM) return;
  const doc = control?.document ?? control;
  const scene = doc.parent, f = doc.flags?.[MODULE_ID] ?? {}, g = scene.grid.size;
  const [x, y, w, h] = f.rect ?? [];
  const inThisRoom = (t) => t.getFlag(MODULE_ID, "room") === f.room
    || (t.x + (t.width * g) / 2 > x && t.x < x + w && t.y + (t.height * g) / 2 > y && t.y < y + h);
  const runners = scene.tokens.filter((t) => t.actor?.getFlag(MODULE_ID, "trash") && inThisRoom(t) && alive(t));
  if (!runners.length) return ui.notifications.info(`${f.code ?? ""} ${f.name ?? ""}: no living trash left to run.`);

  const RM = rooms(scene);
  let exits = doorsOf(scene, f.rect);
  if (!exits.length) exits = [{ x: x + w / 2, y, out: { x: 0, y: -1 } }, { x: x + w / 2, y: y + h, out: { x: 0, y: 1 } },
    { x, y: y + h / 2, out: { x: -1, y: 0 } }, { x: x + w, y: y + h / 2, out: { x: 1, y: 0 } }];
  const centre = (t) => ({ x: t.x + (t.width * g) / 2, y: t.y + (t.height * g) / 2 });
  const nearest = (t) => { const c = centre(t); return exits.reduce((a, b) => (Math.hypot(b.x - c.x, b.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? b : a)); };

  game.modules.get(MODULE_ID).api?.sfx?.("war-horn", { volume: 0.8 });   // the alarm goes up (scripts/sfx.js)
  // 1. everyone runs to their doorway
  await scene.updateEmbeddedDocuments("Token", runners.map((t) => { const e = nearest(t);
    return { _id: t.id, x: e.x - (t.width * g) / 2, y: e.y - (t.height * g) / 2 }; }), { animation: { duration: 900 } });
  await wait(1000);

  // 2. servants leave the map; troops step through into the room (or open ground) beyond
  const servants = runners.filter((t) => slugOf(t) === SERVANT), troops = runners.filter((t) => slugOf(t) !== SERVANT);
  const taken = scene.tokens.filter((t) => !runners.includes(t)).map((t) => ({ x: t.x, y: t.y, w: t.width * g, h: t.height * g }));
  const moves = [], arrivals = new Map();   // destination key -> {room, list}
  for (const t of troops) {
    // walk out through the doorway (and the passage behind it, up to 4 squares) until a room begins
    const e = nearest(t); let dest = null, from = { x: e.x + e.out.x * 140, y: e.y + e.out.y * 140 };
    for (let d = 70; d <= 1120 && !dest; d += 35) {
      const p = { x: e.x + e.out.x * d, y: e.y + e.out.y * d };
      dest = RM.find((r) => r.room !== f.room && inRect(p, r.rect)) ?? null;
      if (dest) from = { x: p.x + e.out.x * 140, y: p.y + e.out.y * 140 };
    }
    const [spot] = freeSpots(scene, from, dest?.rect, t.width * g, taken, 1);
    if (!spot) continue;
    moves.push({ _id: t.id, x: spot.x, y: spot.y, [`flags.${MODULE_ID}.room`]: dest?.room ?? null });
    const k = dest ? `r${dest.room}` : "open";
    if (!arrivals.has(k)) arrivals.set(k, { dest, list: [] });
    arrivals.get(k).list.push(t);
  }
  if (moves.length) await scene.updateEmbeddedDocuments("Token", moves, { animation: { duration: 900 } });
  if (servants.length) await scene.deleteEmbeddedDocuments("Token", servants.map((t) => t.id).filter((id) => scene.tokens.has(id)));
  await wait(1000);

  // 3. four or more legionnaires in a room they fell back into: every 4 become one Legion Squad
  const formed = [];
  const squadActor = (adv) => game.actors.find((a) => a.getFlag(MODULE_ID, "slug") === SQUAD && a.getFlag(MODULE_ID, "adventure") === adv);
  for (const { dest } of arrivals.values()) {
    if (!dest) continue;
    const here = scene.tokens.filter((t) => slugOf(t) === LEGIONNAIRE && alive(t) && (t.getFlag(MODULE_ID, "room") === dest.room || inRect(centre(t), dest.rect)));
    const groups = Math.floor(here.length / 4);
    const actor = groups && squadActor(here[0].actor.getFlag(MODULE_ID, "adventure"));
    if (!actor) continue;
    for (let i = 0; i < groups; i++) {
      const four = here.slice(i * 4, i * 4 + 4);
      const cx = four.reduce((s, t) => s + centre(t).x, 0) / 4, cy = four.reduce((s, t) => s + centre(t).y, 0) / 4;
      await scene.deleteEmbeddedDocuments("Token", four.map((t) => t.id));
      const size = (actor.prototypeToken.width ?? 1) * g;
      const keep = scene.tokens.map((t) => ({ x: t.x, y: t.y, w: t.width * g, h: t.height * g }));
      const [spot] = freeSpots(scene, { x: cx, y: cy }, dest.rect, size, keep, 1);
      const td = await actor.getTokenDocument({ x: spot?.x ?? cx - size / 2, y: spot?.y ?? cy - size / 2, hidden: false, flags: { [MODULE_ID]: { room: dest.room } } });
      await scene.createEmbeddedDocuments("Token", [td.toObject()]);
      formed.push(`${dest.code ?? dest.room} ${dest.name ?? ""}`.trim());
    }
  }

  // 4. tell the GM
  const count = (list) => { const c = {}; for (const t of list) c[t.name] = (c[t.name] ?? 0) + 1;
    return Object.entries(c).map(([n, k]) => `${k} ${esc(n)}${k > 1 ? "s" : ""}`).join(", "); };
  const lines = [];
  if (servants.length) lines.push(`${count(servants)} fled the map.`);
  for (const { dest, list } of arrivals.values())
    lines.push(`${count(list)} fell back to ${dest ? `<strong>${esc(`${dest.code ?? ""} ${dest.name ?? ""}`.trim())}</strong>` : "the open ground beyond the door"}.`);
  for (const r of formed) lines.push(`4 Ironmark Legionnaires formed a <strong>Legion Squad</strong> in ${esc(r)}.`);
  await ChatMessage.create({
    content: `<p><strong>${esc(`${f.code ?? ""} ${f.name ?? ""}`.trim())}</strong>: ${lines.join(" ")} <strong>Doom +${runners.length}</strong></p>`,
    whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
    speaker: { alias: "Flee" },
  });
}

Hooks.once("init", () => {
  const mod = game.modules.get(MODULE_ID);
  mod.api = Object.assign(mod.api ?? {}, { fleeRoom });
});
