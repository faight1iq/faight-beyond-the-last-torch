/**
 * Beyond the Last Torch — landing page party cards.
 *
 * A scene flagged as the landing page carries its card layout in
 * flags["faight-beyond-the-last-torch"].landing:
 *   { slots: [{ x, y, w, h }], border: "<path to card border image>" }
 *
 * Each card is three layers:
 *   1. the card panel — an ordinary tile below tokens (scene data)
 *   2. the player token — seated at the top of the card, full card width
 *   3. the card border and the card text — drawn above tokens by this script
 *
 * Seating (resizing and placing the token) is done by the active GM only, so
 * clients don't race. The border and text are drawn locally on every client
 * from the seated token's actor, so they need no document updates and update
 * as soon as the character sheet changes.
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

async function seat(tokenDoc, changes = {}) {
  const scene = tokenDoc.parent;
  const landing = landingOf(scene);
  if (!landing) return;

  // During a move the document can still report the old position; prefer the incoming change.
  const x = changes.x ?? tokenDoc.x;
  const y = changes.y ?? tokenDoc.y;
  const w = changes.width ?? tokenDoc.width;
  const h = changes.height ?? tokenDoc.height;
  const grid = scene.grid.size;
  const index = slotAt(landing, x + (w * grid) / 2, y + (h * grid) / 2);
  const previous = slotOf(tokenDoc);

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
  await tokenDoc.update(
    { width: units, height: units, x: s.x, y: s.y, [`flags.${MODULE_ID}.slot`]: index },
    { [MODULE_ID]: { seating: true }, animate: false }
  );
}

/* -------------------------------------------- */
/*  Card border and text (every client)         */
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

  const border = landing.border ? await foundry.canvas.loadTexture(landing.border) : null;
  if (!layer) return; // redrawn while the texture loaded

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

    if (border) {
      const b = new PIXI.Sprite(border);
      b.width = s.w;
      b.height = s.h;
      card.addChild(b);
    }
  });
}

const redraw = foundry.utils.debounce(() => drawCards(), 50);

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

Hooks.on("canvasReady", () => redraw());
Hooks.on("canvasTearDown", () => {
  layer?.destroy({ children: true });
  layer = null;
});

Hooks.on("createToken", (tokenDoc) => {
  if (isActiveGM()) seat(tokenDoc);
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
