/**
 * Beyond the Last Torch — Flee control (GM only).
 *
 * Each dungeon room has one hidden tile just outside its walls, visible only to the GM:
 *   flags[MODULE_ID] = { role: "flee", room: <room number>, code: "G3", name: "Gatehouse", rect: [x, y, w, h] (px) }
 * Its Monk's Active Tiles click trigger runs: game.modules.get(MODULE_ID).api.fleeRoom(tile)
 *
 * Every living trash creature in that room (actor flag trash: true: servants, legionnaires, guard units; tokens
 * flagged with the room number, not at 0 HP, not marked dead) runs to the room's nearest doorway and leaves the map.
 * The GM gets a whispered chat line with who fled, as Doom for the table.
 */

const MODULE_ID = "faight-beyond-the-last-torch";

function doorsOf(scene, rect) {
  const [x, y, w, h] = rect, pad = 80;
  const near = (px, py) => px >= x - pad && px <= x + w + pad && py >= y - pad && py <= y + h + pad;
  return scene.walls.filter((wl) => wl.door > 0).map((wl) => {
    const [ax, ay, bx, by] = wl.c;
    return { x: (ax + bx) / 2, y: (ay + by) / 2 };
  }).filter((p) => near(p.x, p.y));
}

const alive = (t) => {
  const hp = t.actor?.system?.attributes?.hp?.value;
  return !(hp !== undefined && hp <= 0) && !t.actor?.statuses?.has("dead") && !t.hidden;
};

async function fleeRoom(control) {
  if (!game.user.isGM) return;
  const doc = control?.document ?? control;
  const scene = doc.parent, f = doc.flags?.[MODULE_ID] ?? {};
  const [x, y, w, h] = f.rect ?? [];
  const inRoom = (t) => t.getFlag(MODULE_ID, "room") === f.room
    || (t.x + t.width * scene.grid.size / 2 > x && t.x < x + w && t.y + t.height * scene.grid.size / 2 > y && t.y < y + h);
  const runners = scene.tokens.filter((t) => t.actor?.getFlag(MODULE_ID, "trash") && inRoom(t) && alive(t));
  if (!runners.length) return ui.notifications.info(`${f.code ?? ""} ${f.name ?? ""}: no living trash left to run.`);

  let exits = doorsOf(scene, f.rect);
  if (!exits.length) exits = [{ x: x + w / 2, y }, { x: x + w / 2, y: y + h }, { x, y: y + h / 2 }, { x: x + w, y: y + h / 2 }];
  const g = scene.grid.size;
  await scene.updateEmbeddedDocuments("Token", runners.map((t) => {
    const cx = t.x + (t.width * g) / 2, cy = t.y + (t.height * g) / 2;
    const e = exits.reduce((a, b) => (Math.hypot(b.x - cx, b.y - cy) < Math.hypot(a.x - cx, a.y - cy) ? b : a));
    return { _id: t.id, x: e.x - (t.width * g) / 2, y: e.y - (t.height * g) / 2 };
  }), { animation: { duration: 900 } });
  await new Promise((r) => setTimeout(r, 1100));
  await scene.deleteEmbeddedDocuments("Token", runners.map((t) => t.id).filter((id) => scene.tokens.has(id)));

  const counts = {};
  for (const t of runners) counts[t.name] = (counts[t.name] ?? 0) + 1;
  const list = Object.entries(counts).map(([n, c]) => `${c} ${foundry.utils.escapeHTML(n)}${c > 1 ? "s" : ""}`).join(", ");
  await ChatMessage.create({
    content: `<p><strong>${foundry.utils.escapeHTML(`${f.code ?? ""} ${f.name ?? ""}`.trim())}</strong>: ${list} fled. <strong>Doom +${runners.length}</strong></p>`,
    whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
    speaker: { alias: "Flee" },
  });
}

Hooks.once("init", () => {
  const mod = game.modules.get(MODULE_ID);
  mod.api = Object.assign(mod.api ?? {}, { fleeRoom });
});
