import { z } from 'zod';

/** Controls match Paper Halftone Filter; neutral ink follows the monochrome brief. */
export const halftoneSettingsSchema = z.object({
  cellSize: z.number().int().min(3).max(24).default(6),
  dotScale: z.number().min(0.3).max(1.5).default(0.95),
  brightness: z.number().min(-50).max(50).default(5),
  contrast: z.number().min(-50).max(50).default(15),
  paperColor: z.string().regex(/^#[\da-f]{6}$/i).default('#e2e5e8'),
  dotColor: z.string().regex(/^#[\da-f]{6}$/i).default('#55585c'),
  rasterStyle: z.enum(['grid', 'scatter']).default('grid'),
  paperGrain: z.boolean().default(true),
  grainOpacity: z.number().min(0).max(40).default(12),
});

export type HalftoneSettings = z.infer<typeof halftoneSettingsSchema>;
export const DEFAULT_HALFTONE: Readonly<HalftoneSettings> = Object.freeze(halftoneSettingsSchema.parse({}));
export const MAX_PHOTO_PIXELS = 40_000_000;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

// Coordinate-based noise: rerendering, exporting and server processing never change the pattern.
function noise(x: number, y: number, seed: number): number {
  let n = Math.imul(x + seed, 374761393) ^ Math.imul(y + seed, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Pure RGBA renderer, shared by the browser worker and the server. No source colors survive. */
export function renderHalftone(
  source: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  settings: HalftoneSettings = DEFAULT_HALFTONE,
  scale = 1,
): Uint8ClampedArray {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
    width * height > MAX_PHOTO_PIXELS || source.length !== width * height * 4 ||
    !Number.isFinite(scale) || scale <= 0 || scale > 1) throw new Error('Некорректный размер изображения');
  const s = halftoneSettingsSchema.parse(settings);
  const paper = rgb(s.paperColor);
  const ink = rgb(s.dotColor);
  const output = new Uint8ClampedArray(source.length);
  for (let i = 0; i < output.length; i += 4) {
    output[i] = paper[0]!;
    output[i + 1] = paper[1]!;
    output[i + 2] = paper[2]!;
    output[i + 3] = 255;
  }
  const cell = Math.max(1, s.cellSize * scale);
  const contrast = (100 + s.contrast) / (100 - s.contrast);
  for (let row = 0; row < Math.ceil(height / cell); row++) {
    for (let col = 0; col < Math.ceil(width / cell); col++) {
      const x0 = Math.floor(col * cell), y0 = Math.floor(row * cell);
      const x1 = Math.min(width, Math.floor((col + 1) * cell));
      const y1 = Math.min(height, Math.floor((row + 1) * cell));
      let luminance = 0, count = 0;
      // Average the entire cell, avoiding aliasing on thin edges and busy architecture.
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * 4;
        const alpha = source[i + 3]! / 255;
        luminance += (0.2126 * source[i]! + 0.7152 * source[i + 1]! + 0.0722 * source[i + 2]!) / 255 * alpha + 1 - alpha;
        count++;
      }
      const tone = Math.max(0, Math.min(1, ((luminance / count) - 0.5) * contrast + 0.5 + s.brightness / 100));
      const darkness = 1 - tone;
      let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      let radius = cell * 0.5 * s.dotScale * Math.sqrt(darkness);
      if (s.rasterStyle === 'scatter') {
        // Density carries the light tones; size still carries detail in the shadows.
        if (noise(col, row, 11) > Math.sqrt(darkness)) continue;
        radius = cell * 0.5 * s.dotScale * Math.pow(darkness, 0.25);
        cx += (noise(col, row, 23) - 0.5) * cell * 0.7;
        cy += (noise(col, row, 37) - 0.5) * cell * 0.7;
      }
      if (radius < 0.05) continue;
      for (let y = Math.max(0, Math.floor(cy - radius - 0.5)); y < Math.min(height, Math.ceil(cy + radius + 0.5)); y++) {
        for (let x = Math.max(0, Math.floor(cx - radius - 0.5)); x < Math.min(width, Math.ceil(cx + radius + 0.5)); x++) {
          const coverage = Math.max(0, Math.min(1, radius + 0.5 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy)));
          const i = (y * width + x) * 4;
          for (let c = 0; c < 3; c++) output[i + c] = output[i + c]! * (1 - coverage) + ink[c]! * coverage;
        }
      }
    }
  }
  if (s.paperGrain) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const grain = (noise(Math.floor(x / scale), Math.floor(y / scale), 53) - 0.5) * s.grainOpacity;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) output[i + c] = output[i + c]! + grain;
    }
  }
  return output;
}
