import { readdir, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import sharp from 'sharp';

const ROOT = 'public/character-assets-local';
const QUALITY = 85;

async function* walkPng(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkPng(full);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      yield full;
    }
  }
}

let totalIn = 0;
let totalOut = 0;
let count = 0;

for await (const png of walkPng(ROOT)) {
  const webp = png.replace(/\.png$/i, '.webp');
  await mkdir(dirname(webp), { recursive: true });
  await sharp(png).webp({ quality: QUALITY }).toFile(webp);
  const [inStat, outStat] = await Promise.all([stat(png), stat(webp)]);
  totalIn += inStat.size;
  totalOut += outStat.size;
  count++;
  console.log(`${png}  ${(inStat.size / 1024 / 1024).toFixed(2)}MB -> ${(outStat.size / 1024 / 1024).toFixed(2)}MB`);
}

console.log(`\nConverted ${count} files`);
console.log(`Total: ${(totalIn / 1024 / 1024).toFixed(2)}MB -> ${(totalOut / 1024 / 1024).toFixed(2)}MB`);
