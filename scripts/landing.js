/**
 * Beyond the Last Torch — landing page party slots.
 *
 * A scene flagged as the landing page carries a list of player slots in
 * flags["faight-beyond-the-last-torch"].landing.slots. When a token is dropped
 * (or moved) so that its centre falls inside a slot, the token is resized and
 * centred to fill the slot, and the slot's info drawing is rewritten with the
 * character's name, species, and class & level. Removing the token, or moving
 * it out of the slot, resets the info drawing.
 *
 * Only the active GM performs updates, so connected clients don't race.
 */

const MODULE_ID = "faight-beyond-the-last-torch";
const PLACEHOLDER = "Awaiting adventurer";
const FILL = 0.92; // fraction of the slot the token occupies

const landingOf = (scene) => scene?.getFlag(MODULE_ID, "landing") ?? null;
const isActiveGM = () => game.users.activeGM?.isSelf ?? game.user.isGM;

function slotAt(landing, x, y) {
  return landing.slots.findIndex(
    (s) => x >= s.x && x < s.x + s.size && y >= s.y && y < s.y + s.size
  );
}

function describe(actor) {
  if (!actor) return PLACEHOLDER;
  const species =
    actor.items.find((i) => i.type === "race")?.name ??
    actor.system?.details?.race?.name ??
    (typeof actor.system?.details?.race === "string" ? actor.system.details.race : "") ??
    "";
  let classLine = Object.values(actor.classes ?? {})
    .map((c) => `${c.name} ${c.system?.levels ?? ""}`.trim())
    .join(" / ");
  if (!classLine && actor.type === "npc") {
    const cr = actor.system?.details?.cr;
    classLine = cr !== undefined && cr !== null ? `CR ${cr}` : "";
  }
  return [actor.name, species, classLine].filter(Boolean).join("\n");
}

async function setInfo(scene, landing, index, text) {
  const id = landing.slots[index]?.infoId;
  const drawing = id ? scene.drawings.get(id) : null;
  if (drawing && drawing.text !== text) await drawing.update({ text });
}

async function seat(tokenDoc, changes = {}) {
  const scene = tokenDoc.parent;
  const landing = landingOf(scene);
  if (!landing) return;

  // During a move, the document can still report the old position; prefer the incoming change.
  const x = changes.x ?? tokenDoc.x;
  const y = changes.y ?? tokenDoc.y;
  const w = changes.width ?? tokenDoc.width;
  const h = changes.height ?? tokenDoc.height;
  const grid = scene.grid.size;
  const cx = x + (w * grid) / 2;
  const cy = y + (h * grid) / 2;
  const index = slotAt(landing, cx, cy);
  const previous = tokenDoc.getFlag(MODULE_ID, "slot");

  // Left a slot: clear it.
  if (previous !== undefined && previous !== null && previous !== index) {
    await setInfo(scene, landing, previous, PLACEHOLDER);
  }

  if (index < 0) {
    if (previous !== undefined && previous !== null) {
      // Back to the character's normal token size, and forget the slot.
      const proto = tokenDoc.actor?.prototypeToken;
      await tokenDoc.update(
        {
          width: proto?.width ?? 1,
          height: proto?.height ?? 1,
          [`flags.${MODULE_ID}.-=slot`]: null,
        },
        { [MODULE_ID]: { seating: true }, animate: false }
      );
    }
    return;
  }

  const s = landing.slots[index];
  const units = (s.size * FILL) / grid;
  const px = units * grid;
  await tokenDoc.update(
    {
      width: units,
      height: units,
      x: Math.round(s.x + (s.size - px) / 2),
      y: Math.round(s.y + (s.size - px) / 2),
      [`flags.${MODULE_ID}.slot`]: index,
    },
    { [MODULE_ID]: { seating: true }, animate: false }
  );
  await setInfo(scene, landing, index, describe(tokenDoc.actor));
}

Hooks.on("createToken", (tokenDoc) => {
  if (isActiveGM()) seat(tokenDoc);
});

Hooks.on("updateToken", (tokenDoc, changes, options) => {
  if (!isActiveGM() || options?.[MODULE_ID]?.seating) return;
  if ("x" in changes || "y" in changes) seat(tokenDoc, changes);
});

Hooks.on("deleteToken", (tokenDoc) => {
  if (!isActiveGM()) return;
  const landing = landingOf(tokenDoc.parent);
  const slot = tokenDoc.getFlag(MODULE_ID, "slot");
  if (landing && slot !== undefined && slot !== null) setInfo(tokenDoc.parent, landing, slot, PLACEHOLDER);
});

// Keep the info panels current when a seated character changes (level up, rename, species).
async function refreshActor(actor) {
  if (!isActiveGM()) return;
  for (const scene of game.scenes) {
    const landing = landingOf(scene);
    if (!landing) continue;
    for (const t of scene.tokens) {
      const slot = t.getFlag(MODULE_ID, "slot");
      if (slot === undefined || slot === null || t.actor?.id !== actor.id) continue;
      await setInfo(scene, landing, slot, describe(t.actor));
    }
  }
}
Hooks.on("updateActor", (actor) => refreshActor(actor));
for (const hook of ["createItem", "updateItem", "deleteItem"]) {
  Hooks.on(hook, (item) => {
    if (item.parent instanceof Actor && ["class", "race"].includes(item.type)) refreshActor(item.parent);
  });
}
