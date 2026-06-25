import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const SRC = 'public/logo.png';

const variants = [
  { size: 16, out: 'public/favicon-16x16.png' },
  { size: 32, out: 'public/favicon-32x32.png' },
  { size: 180, out: 'public/apple-touch-icon.png' },
  { size: 192, out: 'public/android-chrome-192x192.png' },
  { size: 512, out: 'public/android-chrome-512x512.png' },
];

for (const { size, out } of variants) {
  await sharp(SRC).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(out);
  console.log(`✓ ${out} (${size}x${size})`);
}

const ico = await pngToIco(['public/favicon-16x16.png', 'public/favicon-32x32.png']);
await writeFile('public/favicon.ico', ico);
console.log('✓ public/favicon.ico (16+32)');
