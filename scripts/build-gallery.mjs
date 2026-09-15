#!/usr/bin/env node
// Собирает assets/js/photos.js из содержимого папки photos/.
// Запуск: node scripts/build-gallery.mjs

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const photosDir = path.join(root, "photos");
const outFile = path.join(root, "assets", "js", "photos.js");
const thumbsDirName = "thumbs";

const EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

// Подписи (необязательно): photos/captions.json вида { "01.jpg": "Ялта, август" }
async function loadCaptions() {
  const file = path.join(photosDir, "captions.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    console.warn("captions.json не разобрался, подписи пропускаю:", err.message);
    return {};
  }
}

async function walk(dir, base = "") {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === thumbsDirName || entry.name.startsWith(".") || entry.name === "__MACOSX") continue;
      found.push(...(await walk(path.join(dir, entry.name), rel)));
    } else if (EXT.has(path.extname(entry.name).toLowerCase()) && !entry.name.startsWith(".")) {
      found.push(rel);
    }
  }
  return found;
}

const collator = new Intl.Collator("ru", { numeric: true, sensitivity: "base" });

const captions = await loadCaptions();
const files = (await walk(photosDir)).sort(collator.compare);

const photos = await Promise.all(files.map(async (rel) => {
  const item = { src: `photos/${rel}` };

  const thumb = path.join(photosDir, thumbsDirName, rel);
  if (existsSync(thumb)) item.thumb = `photos/${thumbsDirName}/${rel}`;

  const caption = captions[rel] ?? captions[path.basename(rel)];
  if (caption) item.caption = caption;

  try {
    item.bytes = (await stat(path.join(photosDir, rel))).size;
  } catch { /* размер не критичен */ }

  return item;
}));

const body = photos
  .map((p) => "  " + JSON.stringify({ src: p.src, ...(p.thumb && { thumb: p.thumb }), ...(p.caption && { caption: p.caption }) }))
  .join(",\n");

const out = `// Этот файл генерируется автоматически: node scripts/build-gallery.mjs
// Руками не правь — перезапишется при сборке.
window.PHOTOS = [
${body}
];
`;

await writeFile(outFile, photos.length ? out : `// Этот файл генерируется автоматически: node scripts/build-gallery.mjs
// Руками не правь — перезапишется при сборке.
window.PHOTOS = [];
`);

const mb = photos.reduce((sum, p) => sum + (p.bytes || 0), 0) / 1048576;
console.log(`Фотографий: ${photos.length}${photos.length ? ` (${mb.toFixed(1)} МБ)` : ""} → assets/js/photos.js`);
