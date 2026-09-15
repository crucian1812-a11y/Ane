#!/usr/bin/env node
// Собирает assets/js/photos.js из содержимого папки photos/.
// Работает в двух режимах:
//   1. есть photos/web — берёт подготовленные версии и превью из photos/thumbs
//   2. photos/web нет — просто перечисляет картинки, лежащие в photos/ (для локального просмотра)
// Запуск: node scripts/build-gallery.mjs

import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const photosDir = path.join(root, "photos");
const webDir = path.join(photosDir, "web");
const thumbsDir = path.join(photosDir, "thumbs");
const outFile = path.join(root, "assets", "js", "photos.js");

const EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const SKIP_DIRS = new Set(["web", "thumbs", "__MACOSX"]);
const collator = new Intl.Collator("ru", { numeric: true, sensitivity: "base" });

async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    console.warn(`${path.basename(file)} не разобрался, пропускаю:`, err.message);
    return fallback;
  }
}

// photos/index.tsv — «0001 <tab> исходный/путь.jpg», его пишет prepare-photos.sh
async function readIndex() {
  const file = path.join(photosDir, "index.tsv");
  if (!existsSync(file)) return {};
  const map = {};
  for (const line of (await readFile(file, "utf8")).split("\n")) {
    const [num, original] = line.split("\t");
    if (num && original) map[num.trim()] = original.trim();
  }
  return map;
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
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      found.push(...(await walk(path.join(dir, entry.name), rel)));
    } else if (EXT.has(path.extname(entry.name).toLowerCase()) && !entry.name.startsWith(".")) {
      found.push(rel);
    }
  }
  return found;
}

const captions = await readJson(path.join(photosDir, "captions.json"), {});
const index = await readIndex();

const prepared = existsSync(webDir);
const files = prepared
  ? (await readdir(webDir)).filter((f) => EXT.has(path.extname(f).toLowerCase())).sort(collator.compare)
  : (await walk(photosDir)).sort(collator.compare);

const photos = files.map((file) => {
  const item = prepared ? { src: `photos/web/${file}` } : { src: `photos/${file}` };

  if (prepared && existsSync(path.join(thumbsDir, file))) item.thumb = `photos/thumbs/${file}`;

  const original = prepared ? index[path.parse(file).name] : file;
  const caption = captions[file] ?? (original ? captions[original] ?? captions[path.basename(original)] : undefined);
  if (caption) item.caption = caption;

  return item;
});

const body = photos.map((p) => "  " + JSON.stringify(p)).join(",\n");

await writeFile(outFile, `// Этот файл генерируется автоматически: node scripts/build-gallery.mjs
// Руками не правь — перезапишется при сборке.
window.PHOTOS = [${photos.length ? "\n" + body + "\n" : ""}];
`);

console.log(`Фотографий: ${photos.length}${prepared ? " (подготовленные)" : " (как есть)"} → assets/js/photos.js`);
