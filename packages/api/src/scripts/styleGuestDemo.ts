import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { MAX_PHOTO_PIXELS, renderHalftone } from '@invite/shared';
import { GUEST_PHOTO_STYLE } from '../domain/guestPhotoStyle.js';

const demoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../guest/public/demo');

for (const number of [1, 2, 3, 4]) {
  const source = path.join(demoDir, `${number}.jpg`);
  const { data, info } = await sharp(source, { limitInputPixels: MAX_PHOTO_PIXELS })
    .rotate().toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = renderHalftone(data, info.width, info.height, GUEST_PHOTO_STYLE);
  await fs.writeFile(path.join(demoDir, `${number}-halftone.png`),
    await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer());
}
