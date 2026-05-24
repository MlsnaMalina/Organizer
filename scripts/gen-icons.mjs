import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';

const out = join(process.cwd(), 'public');
mkdirSync(out, { recursive: true });

const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#7A1840"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Syne, system-ui, -apple-system, sans-serif"
        font-weight="800" font-size="320" fill="#FFFFFF" letter-spacing="-8">O</text>
</svg>`;

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(Buffer.from(svg(size)))
    .resize(size, size)
    .png()
    .toFile(join(out, `icon-${size}.png`));
  console.log(`wrote icon-${size}.png`);
}

await sharp(Buffer.from(svg(512)))
  .resize(180, 180)
  .png()
  .toFile(join(out, 'apple-touch-icon.png'));
console.log('wrote apple-touch-icon.png');
