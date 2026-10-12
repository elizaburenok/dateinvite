import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { DEFAULT_HALFTONE, renderHalftone } from '@invite/shared';
import { PhotoStore } from './photos.js';

const settings = { ...DEFAULT_HALFTONE, brightness: 0, contrast: 0, paperGrain: false, paperColor: '#ffffff', dotColor: '#444444' };
function solid(value: number, alpha = 255) {
  return new Uint8ClampedArray(Array.from({ length: 96 * 72 }, () => [value, value, value, alpha]).flat());
}
function mean(data: Uint8ClampedArray) {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += data[i]!;
  return sum / (data.length / 4);
}

describe('paper halftone rendering', () => {
  it.each(['grid', 'scatter'] as const)('%s preserves tonal order and makes white paper empty', (rasterStyle) => {
    const means = [0, 64, 128, 192, 255].map((v) => mean(renderHalftone(solid(v), 96, 72, { ...settings, rasterStyle })));
    expect(means).toEqual([...means].sort((a, b) => a - b));
    expect(new Set(means).size).toBe(5);
    expect(means[4]).toBe(255);
  });
  it('composites transparent pixels onto paper, without black artifacts', () => {
    expect(renderHalftone(solid(0, 0), 96, 72, settings)).toEqual(renderHalftone(solid(255), 96, 72, settings));
  });
  it('keeps noise deterministic and makes the two modes different', () => {
    const s = { ...settings, paperGrain: true, rasterStyle: 'scatter' as const };
    const a = renderHalftone(solid(128), 96, 72, s);
    expect(a).toEqual(renderHalftone(solid(128), 96, 72, s));
    expect(a).not.toEqual(renderHalftone(solid(128), 96, 72, { ...s, rasterStyle: 'grid' }));
    expect(a).not.toEqual(renderHalftone(solid(128), 96, 72, { ...s, paperGrain: false }));
  });
  it('brightness and dot size change coverage in the expected direction', () => {
    const normal = mean(renderHalftone(solid(128), 96, 72, settings));
    expect(mean(renderHalftone(solid(128), 96, 72, { ...settings, brightness: 20 }))).toBeGreaterThan(normal);
    expect(mean(renderHalftone(solid(128), 96, 72, { ...settings, dotScale: 1.3 }))).toBeLessThan(normal);
  });
  it('rejects invalid dimensions and unsafe settings', () => {
    expect(() => renderHalftone(solid(0), 0, 72, settings)).toThrow();
    expect(() => renderHalftone(solid(0), 96, 72, { ...settings, cellSize: 0 })).toThrow();
    expect(() => renderHalftone(solid(0), 96, 72, settings, NaN)).toThrow();
  });
});

describe('PhotoStore', () => {
  let dir: string;
  let png: Buffer;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'halftone-'));
    png = await sharp({ create: { width: 97, height: 73, channels: 4, background: '#867342' } }).png().toBuffer();
  });
  afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });
  it('automatically processes incoming photos, retains the original, caches and never rasterizes dots twice', async () => {
    const store = new PhotoStore({ mediaDir: dir, fetchImpl: async () => new Response(new Uint8Array(png)) });
    const result = (await store.saveFromUrl('https://example.test/photo', 'photo.jpg'))!;
    expect(result).toMatch(/\.halftone-.*\.png$/);
    const saved = await store.source(result);
    expect(await fs.readFile(path.join(dir, path.basename(saved.source_url)))).toEqual(png);
    const meta = await sharp(path.join(dir, path.basename(result))).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([97, 73, 'png']);
    const second = await store.render(result, { ...settings, cellSize: 9 });
    expect(await store.render(second, DEFAULT_HALFTONE)).toBe(result);
    expect(await store.saveFromUrl('https://example.test/photo', 'different.webp')).toBe(result);
  });
  it('respects EXIF orientation without downscaling', async () => {
    const oriented = await sharp(png).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const store = new PhotoStore({ mediaDir: dir });
    const url = await store.render(await store.saveOriginal(oriented), settings);
    const meta = await sharp(path.join(dir, path.basename(url))).metadata();
    expect([meta.width, meta.height]).toEqual([73, 97]);
  });
  it('rejects corrupt data and traversal without reading arbitrary files', async () => {
    const store = new PhotoStore({ mediaDir: dir });
    await expect(store.saveOriginal(Buffer.from('not an image'))).rejects.toThrow();
    await expect(store.source('/media/../../.env')).rejects.toThrow();
    await expect(store.source('https://example.test/photo.jpg')).rejects.toThrow();
  });
});
