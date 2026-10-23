/**
 * Remove Old BTLT Imports
 *
 * Deletes world documents left over from earlier versions of this module's Adventures, keeping
 * every document whose ID matches the Adventures in the installed compendium. Old folders are
 * removed once they are empty. The GM reviews the full list before anything is deleted.
 *
 * Run it from the "Remove Old BTLT Imports" macro (created in the Macros directory for the GM),
 * or from the console: game.modules.get("faight-beyond-the-last-torch").api.removeOldImports()
 *
 * It refuses to run on a local server (localhost): the local build world holds the dungeon source
 * documents in the same folders under different IDs. Pass { force: true } to override.
 */

const MODULE_ID = "faight-beyond-the-last-torch";
const MACRO_ROLE = "remove-old-imports";

const FIELDS = { // Adventure field -> world document type
  scenes: "Scene", actors: "Actor", items: "Item", journal: "JournalEntry",
  tables: "RollTable", macros: "Macro", playlists: "Playlist", cards: "Cards",
};

const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const chain = (f) => (f ? [f, ...(f.ancestors ?? [])] : []);

async function removeOldImports({ force = false } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Only a GM can remove old imports.");
  // The local build world keeps the dungeon source documents under the same folder names with
  // different IDs, so this would delete them. Refuse on a local server unless forced.
  if (!force && ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) {
    return ui.notifications.error("Remove Old BTLT Imports is turned off on a local Foundry server, where it would delete the dungeon build sources. Run it in Sqyre.", { permanent: true });
  }
  const packs = game.packs.filter((p) => p.metadata.packageName === MODULE_ID && p.documentName === "Adventure");
  if (!packs.length) return ui.notifications.error("No Beyond the Last Torch Adventure compendium found.");

  // 1. Current IDs, names, and folder names from every Adventure in the module.
  const keepIds = {}, names = {};
  for (const t of Object.values(FIELDS)) { keepIds[t] = new Set(); names[t] = new Set(); }
  const keepFolderIds = new Set(), folderNames = new Set(), advNames = [];
  for (const pack of packs) {
    for (const adv of await pack.getDocuments()) {
      advNames.push(adv.name);
      for (const [field, type] of Object.entries(FIELDS)) {
        for (const d of adv[field] ?? []) { keepIds[type].add(d._id); if (d.name) names[type].add(d.name); }
      }
      for (const f of adv.folders ?? []) {
        keepFolderIds.add(f._id);
        folderNames.add(f.name);
        folderNames.add(f.name.replace(/^[^:]+:\s*/, "")); // older imports used the name without the code
      }
    }
  }

  // 2. Stale world documents: BTLT imports whose ID is not in a current Adventure.
  //    Documents this module creates itself (the Enter Dungeon and cleanup macros) are never touched.
  const isBtlt = (d) => chain(d.folder).some((f) => folderNames.has(f.name))
    || !!d.getFlag?.(MODULE_ID, "adventure") || names[d.documentName]?.has(d.name);
  const stale = {};
  for (const type of Object.values(FIELDS)) {
    const coll = game.collections.get(type);
    if (!coll) continue;
    stale[type] = coll.filter((d) => !keepIds[type].has(d.id) && !d.getFlag?.(MODULE_ID, "role") && isBtlt(d));
  }

  // 3. Old folders that will be empty afterwards: BTLT-named folders, plus any folder that held a
  //    stale document. Deepest first, so a parent is checked after its subfolders.
  const goneDocs = new Set(Object.values(stale).flat().map((d) => d.uuid));
  const candidates = new Map();
  for (const f of game.folders) if (chain(f).some((x) => folderNames.has(x.name))) candidates.set(f.id, f);
  for (const d of Object.values(stale).flat()) for (const f of chain(d.folder)) candidates.set(f.id, f);
  const ordered = [...candidates.values()]
    .filter((f) => !keepFolderIds.has(f.id))
    .sort((a, b) => (b.ancestors?.length ?? 0) - (a.ancestors?.length ?? 0));
  const goneFolders = new Set();
  for (const f of ordered) {
    const coll = game.collections.get(f.type);
    const docsLeft = coll ? coll.filter((d) => d.folder?.id === f.id && !goneDocs.has(d.uuid)).length : 0;
    const subsLeft = game.folders.filter((x) => x.folder?.id === f.id && !goneFolders.has(x.id)).length;
    if (!docsLeft && !subsLeft) goneFolders.add(f.id);
  }
  const staleFolders = ordered.filter((f) => goneFolders.has(f.id));

  // 4. Review.
  const total = Object.values(stale).reduce((n, a) => n + a.length, 0) + staleFolders.length;
  if (!total) return ui.notifications.info("No old Beyond the Last Torch imports found.");
  const where = (d) => (d.folder ? ` <span style="opacity:.6">(${esc(d.folder.name)})</span>` : "");
  let html = `<p>Keeping everything from the current Adventures: ${advNames.map(esc).join(", ")}.</p><p>These will be deleted:</p>`;
  for (const [type, docs] of Object.entries(stale)) {
    if (docs.length) html += `<h4>${type} (${docs.length})</h4><ul>${docs.map((d) => `<li>${esc(d.name)}${where(d)}</li>`).join("")}</ul>`;
  }
  if (staleFolders.length) {
    html += `<h4>Folders (${staleFolders.length})</h4><ul>${staleFolders.map((f) => `<li>${esc(f.type)}: ${esc(f.name)}</li>`).join("")}</ul>`;
  }
  console.log(`${MODULE_ID} | old imports to delete:`, stale, staleFolders);
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: `Remove ${total} old Beyond the Last Torch documents?` },
    position: { width: 520 },
    content: `<div style="max-height:480px;overflow-y:auto">${html}</div>`,
    yes: { label: "Delete" }, no: { label: "Cancel", default: true },
    rejectClose: false, modal: true,
  });
  if (!ok) return ui.notifications.info("Cancelled. Nothing was deleted.");

  // 5. Delete documents, then folders.
  for (const [type, docs] of Object.entries(stale)) {
    if (docs.length) await getDocumentClass(type).deleteDocuments(docs.map((d) => d.id));
  }
  for (const f of staleFolders) if (game.folders.get(f.id)) await f.delete();
  ui.notifications.info(`Removed ${total} old Beyond the Last Torch documents and folders.`);
}

// Create the macro once, for the first GM to log in. It lives in the Macros directory, not the hotbar.
Hooks.once("ready", async () => {
  if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
  if (game.macros.some((m) => m.getFlag(MODULE_ID, "role") === MACRO_ROLE)) return;
  await Macro.create({
    name: "Remove Old BTLT Imports",
    type: "script",
    img: "icons/svg/trash.svg",
    command: `game.modules.get("${MODULE_ID}").api.removeOldImports();`,
    flags: { [MODULE_ID]: { role: MACRO_ROLE } },
  });
});

Hooks.once("init", () => {
  const mod = game.modules.get(MODULE_ID);
  mod.api = Object.assign(mod.api ?? {}, { removeOldImports });
});
