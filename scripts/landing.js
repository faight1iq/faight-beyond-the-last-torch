/**
 * Beyond the Last Torch — landing page party cards.
 *
 * A scene flagged as the landing page carries its card layout in
 * flags["faight-beyond-the-last-torch"].landing:
 *   { slots: [{ x, y, w, h }] }
 *
 * Each card is three layers, all scene data except the text:
 *   1. the card panel — a tile below tokens
 *   2. the player token — seated at the top of the card, full card width
 *   3. the card border — a roof tile above tokens (occlusion off, and
 *      flagged so Better Roofs and Levels leave it alone)
 * The card text is drawn by this script above everything.
 *
 * Seating (resizing and placing the token) is done by the active GM only, so
 * clients don't race. The text is drawn locally on every client from the
 * seated token's actor, so it needs no document updates and updates as soon
 * as the character sheet changes.
 */

const MODULE_ID = "faight-beyond-the-last-torch";
const PLACEHOLDER = "Awaiting adventurer";

const landingOf = (scene) => scene?.getFlag(MODULE_ID, "landing") ?? null;
const isActiveGM = () => game.users.activeGM?.isSelf ?? game.user.isGM;
const slotOf = (tokenDoc) => tokenDoc.getFlag(MODULE_ID, "slot");
const hasSlot = (v) => v !== undefined && v !== null;

/* -------------------------------------------- */
/*  Character details                           */
/* -------------------------------------------- */

function describe(actor) {
  const species =
    actor.items.find((i) => i.type === "race")?.name ??
    actor.system?.details?.race?.name ??
    (typeof actor.system?.details?.race === "string" ? actor.system.details.race : "");
  let classLine = Object.values(actor.classes ?? {})
    .map((c) => `${c.name} ${c.system?.levels ?? ""}`.trim())
    .join(" / ");
  if (!classLine && actor.type === "npc") {
    const cr = actor.system?.details?.cr;
    classLine = hasSlot(cr) ? `CR ${cr}` : "";
  }
  return { name: actor.name, species: species ?? "", classLine };
}

/* -------------------------------------------- */
/*  Seating (active GM only)                    */
/* -------------------------------------------- */

function slotAt(landing, x, y) {
  return landing.slots.findIndex((s) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h);
}

// Slots handed out but not yet written to a token, so two players arriving together get different cards.
const reserved = new Set();

const isPlayerCharacter = (tokenDoc) => !!tokenDoc.actor?.hasPlayerOwner;

function firstFreeSlot(scene, landing, except) {
  const taken = new Set();
  for (const t of scene.tokens) {
    if (t === except) continue;
    const s = slotOf(t);
    if (hasSlot(s)) taken.add(s);
  }
  return landing.slots.findIndex((_, i) => !taken.has(i) && !reserved.has(`${scene.id}.${i}`));
}

/* -------------------------------------------- */
/*  Overflow: all cards full                    */
/* -------------------------------------------- */

// The stairs (or any exit) on the landing page: a tile flagged role "stairs", a Monk's Active Tiles
// tile with a teleport action, a region with a Teleport Token behavior, or a tile whose image is
// named "stair…". Returns their bounding rectangles.
function stairsBounds(scene) {
  const rects = [];
  for (const t of scene.tiles) {
    const src = t.texture?.src ?? "";
    const actions = t.flags?.["monks-active-tiles"]?.actions ?? [];
    if (
      t.getFlag(MODULE_ID, "role") === "stairs" ||
      actions.some((a) => a.action === "teleport") ||
      /stair/i.test(src.split("/").pop())
    ) rects.push(new PIXI.Rectangle(t.x, t.y, t.width, t.height));
  }
  for (const r of scene.regions ?? []) {
    if (!r.behaviors.some((b) => b.type === "teleportToken")) continue;
    const b = r.object?.bounds ?? r.bounds;
    if (b) rects.push(new PIXI.Rectangle(b.x, b.y, b.width, b.height));
    else for (const s of r.shapes) {
      if (s.type === "rectangle") rects.push(new PIXI.Rectangle(s.x, s.y, s.width, s.height));
      else if (s.points?.length) {
        const xs = s.points.filter((_, i) => i % 2 === 0), ys = s.points.filter((_, i) => i % 2 === 1);
        rects.push(new PIXI.Rectangle(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
      } else if (s.type === "ellipse" || s.type === "circle") {
        const rx = s.radiusX ?? s.radius, ry = s.radiusY ?? s.radius;
        rects.push(new PIXI.Rectangle(s.x - rx, s.y - ry, rx * 2, ry * 2));
      }
    }
  }
  return rects;
}

// Every card is taken and the token came up the stairs: move it just to the right of the stairs so
// the stairs art doesn't hide it. Later arrivals line up to the right, wrapping to a new row.
async function stepOffStairs(tokenDoc, x, y, w, h) {
  const scene = tokenDoc.parent;
  const grid = scene.grid.size;
  const size = w * grid;
  const cx = x + size / 2, cy = y + (h * grid) / 2;
  const stairs = stairsBounds(scene);
  const on = stairs.find((r) => new PIXI.Rectangle(r.x - grid / 2, r.y - grid / 2, r.width + grid, r.height + grid).contains(cx, cy));
  if (!on) return; // dropped somewhere else on purpose; leave it

  const gap = Math.round(grid * 0.25);
  const others = scene.tokens
    .filter((t) => t !== tokenDoc)
    .map((t) => new PIXI.Rectangle(t.x, t.y, t.width * grid, t.height * grid));
  const blocked = (r) => others.some((o) => o.intersects(r)) || stairs.some((s) => s.intersects(r));
  const startX = on.right + gap;
  let px = startX;
  let py = Math.round(on.y + on.height / 2 - size / 2);
  for (let i = 0; i < 40; i++) {
    const r = new PIXI.Rectangle(px, py, size, size);
    if (r.right > scene.dimensions.sceneRect.right) { px = startX; py += size + gap; continue; }
    if (!blocked(r)) break;
    px += size + gap;
  }
  await tokenDoc.update({ x: px, y: py }, { [MODULE_ID]: { seating: true }, animate: false });
}

async function seat(tokenDoc, changes = {}, { arriving = false } = {}) {
  const scene = tokenDoc.parent;
  const landing = landingOf(scene);
  if (!landing) return;

  // During a move the document can still report the old position; prefer the incoming change.
  const x = changes.x ?? tokenDoc.x;
  const y = changes.y ?? tokenDoc.y;
  const w = changes.width ?? tokenDoc.width;
  const h = changes.height ?? tokenDoc.height;
  const grid = scene.grid.size;
  let index = slotAt(landing, x + (w * grid) / 2, y + (h * grid) / 2);
  const previous = slotOf(tokenDoc);

  // A player character arriving on the landing page (stairs, teleport, or dropped off the cards)
  // takes the first empty card. If every card is full it stays where it landed.
  if (index < 0 && arriving && isPlayerCharacter(tokenDoc)) {
    index = firstFreeSlot(scene, landing, tokenDoc);
    if (index < 0) return stepOffStairs(tokenDoc, x, y, w, h);
  }

  if (index < 0) {
    if (hasSlot(previous)) {
      // Left its card: back to the character's normal token size.
      const proto = tokenDoc.actor?.prototypeToken;
      await tokenDoc.update(
        { width: proto?.width ?? 1, height: proto?.height ?? 1, [`flags.${MODULE_ID}.-=slot`]: null },
        { [MODULE_ID]: { seating: true }, animate: false }
      );
    }
    return;
  }

  // The token covers the top of the card, edge to edge.
  const s = landing.slots[index];
  const units = s.w / grid;
  const key = `${scene.id}.${index}`;
  reserved.add(key);
  try {
    await tokenDoc.update(
      { width: units, height: units, x: s.x, y: s.y, [`flags.${MODULE_ID}.slot`]: index },
      { [MODULE_ID]: { seating: true }, animate: false }
    );
  } finally {
    reserved.delete(key);
  }
}

/* -------------------------------------------- */
/*  Card text (every client)                    */
/* -------------------------------------------- */

let layer = null;

function textStyle(overrides) {
  const style = CONFIG.canvasTextStyle.clone();
  Object.assign(style, {
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 3,
    dropShadow: true,
    dropShadowColor: "#000000",
    dropShadowBlur: 4,
    dropShadowDistance: 1,
    align: "left",
    wordWrap: false,
    ...overrides,
  });
  return style;
}

function addText(container, text, style, x, y, maxWidth) {
  const t = new foundry.canvas.containers.PreciseText(text, style);
  t.position.set(x, y);
  if (t.width > maxWidth) t.scale.set(maxWidth / t.width); // long names shrink to fit
  container.addChild(t);
  return t;
}

async function drawCards() {
  layer?.destroy({ children: true });
  layer = null;

  const scene = canvas.scene;
  const landing = landingOf(scene);
  if (!landing || !canvas.ready) return;

  layer = new PIXI.Container();
  layer.eventMode = "none"; // never block clicks or token drops
  canvas.interface.addChild(layer);

  const seated = new Map();
  for (const t of scene.tokens) {
    const s = slotOf(t);
    if (hasSlot(s) && t.actor) seated.set(s, t.actor);
  }

  landing.slots.forEach((s, i) => {
    const card = new PIXI.Container();
    card.position.set(s.x, s.y);
    layer.addChild(card);

    const pad = Math.round(s.w * 0.07);
    const textTop = s.w + Math.round((s.h - s.w) * 0.08);
    const maxWidth = s.w - pad * 2;
    const actor = seated.get(i);

    if (actor) {
      const d = describe(actor);
      const nameSize = Math.round(s.w * 0.1);
      const lineSize = Math.round(s.w * 0.062);
      const block = new PIXI.Container();
      let y = 0;
      const line = (text, style) => {
        const t = addText(block, text, style, 0, y, maxWidth);
        y += t.height * 0.86; // tighten the padding PreciseText adds for stroke and shadow
      };
      line(d.name, textStyle({ fontFamily: "Signika", fontWeight: "600", fontSize: nameSize }));
      if (d.species) line(d.species, textStyle({ fontFamily: "Roboto Slab", fontWeight: "800", fontSize: lineSize }));
      if (d.classLine) line(d.classLine, textStyle({ fontFamily: "Roboto Slab", fontWeight: "800", fontSize: lineSize }));
      // Fit the block inside the panel, above the bottom frame.
      // Cards rise from the bottom edge of the scene, so only a small bottom margin is needed.
      const avail = s.h - s.w - Math.round((s.h - s.w) * 0.08) - Math.round(s.w * 0.04);
      if (block.height > avail) block.scale.set(avail / block.height);
      block.position.set(pad, textTop);
      card.addChild(block);
    } else {
      const label = addText(card, `Player ${i + 1}`, textStyle({ fontFamily: "Modesto Condensed", fontSize: Math.round(s.w * 0.14), fill: "#d9a55a", align: "center" }), 0, 0, maxWidth);
      label.position.set((s.w - label.width) / 2, (s.w - label.height) / 2);
      const wait = addText(card, PLACEHOLDER, textStyle({ fontFamily: "Signika", fontSize: Math.round(s.w * 0.07), fill: "#f0e2c0" }), 0, 0, maxWidth);
      wait.position.set((s.w - wait.width) / 2, s.w + (s.h - s.w - wait.height) / 2);
    }

  });
}

const redraw = foundry.utils.debounce(() => drawCards(), 50);

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

Hooks.on("canvasReady", () => {
  redraw();
  // The animated title flame is a muted looping video; make sure it is running on every client.
  if (!landingOf(canvas.scene)) return;
  for (const tile of canvas.tiles.placeables) {
    if (tile.document.getFlag(MODULE_ID, "role") !== "title-flame") continue;
    const video = tile.sourceElement ?? tile.mesh?.texture?.baseTexture?.resource?.source;
    if (video instanceof HTMLVideoElement && video.paused) {
      video.muted = true;
      video.play().catch(() => {}); // a browser that blocks it will start it on the first click
    }
  }
});
Hooks.on("canvasTearDown", () => {
  layer?.destroy({ children: true });
  layer = null;
});

// A seated token that is copied to another scene (stairs, teleport, Monk's Active Tiles, a region
// behavior, or a drag between scenes) arrives with the card size and seat flag. Anywhere that is not a
// landing page, it goes back to the character's normal token size. This runs on whichever client
// creates the token, before it is saved, so no second update is needed.
Hooks.on("preCreateToken", (tokenDoc) => {
  if (landingOf(tokenDoc.parent) || !hasSlot(slotOf(tokenDoc))) return;
  const proto = tokenDoc.actor?.prototypeToken;
  tokenDoc.updateSource({
    width: proto?.width ?? 1,
    height: proto?.height ?? 1,
    [`flags.${MODULE_ID}.-=slot`]: null,
  });
});

Hooks.on("createToken", (tokenDoc) => {
  if (isActiveGM()) seat(tokenDoc, {}, { arriving: true });
  if (tokenDoc.parent === canvas.scene) redraw();
});
Hooks.on("updateToken", (tokenDoc, changes, options) => {
  if (isActiveGM() && !options?.[MODULE_ID]?.seating && ("x" in changes || "y" in changes)) seat(tokenDoc, changes);
  if (tokenDoc.parent === canvas.scene) redraw();
});
Hooks.on("deleteToken", (tokenDoc) => {
  if (tokenDoc.parent === canvas.scene) redraw();
});
Hooks.on("updateScene", (scene) => {
  if (scene === canvas.scene) redraw();
});

// Level-ups, renames, and species changes update the card immediately.
Hooks.on("updateActor", () => redraw());
for (const hook of ["createItem", "updateItem", "deleteItem"]) {
  Hooks.on(hook, (item) => {
    if (item.parent instanceof Actor && ["class", "race"].includes(item.type)) redraw();
  });
}
