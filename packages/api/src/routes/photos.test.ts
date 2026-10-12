import { afterEach, beforeEach, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { DEFAULT_HALFTONE } from '@invite/shared';
import { authHeader, makeTestContext, seedPlaces, type TestContext } from '../test/helpers.js';
import { createEnvelope } from '../domain/envelopes.js';
import { upsertUser } from '../domain/users.js';

let ctx: TestContext;
beforeEach(async () => { ctx = await makeTestContext(); });
afterEach(async () => { await ctx.close(); });

async function upload(background = '#b88776') {
  const png = await sharp({ create: { width: 121, height: 83, channels: 3, background } }).png().toBuffer();
  const response = await ctx.app.inject({ method: 'POST', url: '/api/photos', headers: { ...authHeader(), 'content-type': 'image/png' }, payload: png });
  expect(response.statusCode).toBe(201);
  return response.json().source_url as string;
}

it('requires authentication and persists separate defaults for each host', async () => {
  expect((await ctx.app.inject('/api/photo-style')).statusCode).toBe(401);
  const settings = { ...DEFAULT_HALFTONE, cellSize: 10, rasterStyle: 'scatter' };
  const saved = await ctx.app.inject({ method: 'PUT', url: '/api/photo-style', headers: authHeader(), payload: settings });
  expect(saved.statusCode).toBe(200);
  expect((await ctx.app.inject({ url: '/api/photo-style', headers: authHeader() })).json()).toEqual(settings);
  expect((await ctx.app.inject({ url: '/api/photo-style', headers: authHeader(43) })).json()).toEqual(DEFAULT_HALFTONE);
  expect((await ctx.app.inject({ method: 'PUT', url: '/api/photo-style', headers: authHeader(), payload: { cellSize: 0 } })).statusCode).toBe(400);
});

it('uploads, processes at original size, serves PNG and saves it to a place', async () => {
  const source = await upload();
  const [id] = seedPlaces(ctx.db, 42, 1, { photos: [] });
  const rendered = await ctx.app.inject({ method: 'POST', url: '/api/photos/render', headers: authHeader(), payload: { photo_url: source, settings: DEFAULT_HALFTONE } });
  expect(rendered.statusCode).toBe(200);
  const url = rendered.json().photo_url;
  const image = await ctx.app.inject(url);
  expect(image.headers['content-type']).toContain('image/png');
  const meta = await sharp(image.rawPayload).metadata();
  expect([meta.width, meta.height]).toEqual([121, 83]);
  const updated = await ctx.app.inject({ method: 'PATCH', url: `/api/places/${id}`, headers: authHeader(), payload: { photos: [url] } });
  expect(updated.statusCode).toBe(200);
  expect(updated.json().photo_url).toBe(`https://invite.test${url}`);
  const original = await ctx.app.inject({ url: `/api/photos/source?photo_url=${encodeURIComponent(updated.json().photo_url)}`, headers: authHeader() });
  expect(original.json()).toEqual({ source_url: source, settings: DEFAULT_HALFTONE });
});

it('serves unfiltered originals to guests, including previously processed frames', async () => {
  const source = await upload();
  const secondSource = await upload('#333333');
  const grey = await ctx.app.inject({ method: 'POST', url: '/api/photos/render', headers: authHeader(), payload: { photo_url: secondSource, settings: DEFAULT_HALFTONE } });
  const ids = seedPlaces(ctx.db, 42, 3, { photos: [source, grey.json().photo_url] });
  const style = { ...DEFAULT_HALFTONE, cellSize: 9 };
  await ctx.app.inject({ method: 'PUT', url: '/api/photo-style', headers: authHeader(), payload: style });
  const envelope = await ctx.app.inject({ method: 'POST', url: '/api/envelopes', headers: authHeader(), payload: { place_ids: ids, host_note: null } });
  expect(envelope.statusCode).toBe(201);
  const hostView = await ctx.app.inject({ url: '/api/envelopes', headers: authHeader() });
  const hostUrl = hostView.json().envelopes[0].places[0].photo_url;
  const hostSource = await ctx.app.inject({ url: `/api/photos/source?photo_url=${encodeURIComponent(hostUrl)}`, headers: authHeader() });
  expect(hostSource.json().settings).toEqual(style);
  // A saved frame can outlive its style metadata; the guest still gets its original.
  fs.unlinkSync(path.join(ctx.mediaDir, `${path.basename(grey.json().photo_url)}.json`));
  const invite = await ctx.app.inject(`/api/invite/${envelope.json().token}`);
  const guestPlaces = invite.json().places;
  expect(guestPlaces).toHaveLength(3);
  expect(guestPlaces.every((place: { photos: string[]; photo_url: string }) => place.photos.length === 2 && place.photo_url === place.photos[0])).toBe(true);
  const url = guestPlaces[0].photo_url;
  expect(guestPlaces[0].photos).toEqual([
    `https://invite.test${source}`,
    `https://invite.test${secondSource}`,
  ]);
  expect(guestPlaces[0]).not.toHaveProperty('original_photos');
  const png = await ctx.app.inject(new URL(url).pathname);
  const sample = await sharp(png.rawPayload).raw().toBuffer({ resolveWithObject: true });
  expect([sample.info.width, sample.info.height]).toEqual([121, 83]);
  expect([...sample.data.slice(0, 3)]).toEqual([184, 135, 118]);
  // Editing the library later must not restyle an invitation that is already sent.
  const changed = await ctx.app.inject({ method: 'POST', url: '/api/photos/render', headers: authHeader(), payload: { photo_url: source, settings: { ...style, cellSize: 20 } } });
  await ctx.app.inject({ method: 'PATCH', url: `/api/places/${ids[0]}`, headers: authHeader(), payload: { photos: [changed.json().photo_url] } });
  const unchanged = await ctx.app.inject(`/api/invite/${envelope.json().token}`);
  expect(unchanged.json().places[0].photo_url).toBe(url);
});

it('keeps original photos in invitations created before the filter existed', async () => {
  const source = await upload();
  const ids = seedPlaces(ctx.db, 42, 3, { photos: [source] });
  const user = upsertUser(ctx.db, { id: 42, first_name: 'Хост' });
  const envelope = createEnvelope(ctx.db, { ownerId: user.id, placeIds: ids, hostNote: null, ttlDays: 14 });
  const response = await ctx.app.inject(`/api/invite/${envelope.token}`);
  expect(response.statusCode).toBe(200);
  expect(response.json().places.every((place: { photo_url: string }) => place.photo_url === `https://invite.test${source}`)).toBe(true);
});

it('rejects invalid uploads and arbitrary source paths', async () => {
  expect((await ctx.app.inject({ method: 'POST', url: '/api/photos', headers: { ...authHeader(), 'content-type': 'image/png' }, payload: Buffer.from('broken') })).statusCode).toBe(400);
  expect((await ctx.app.inject({ method: 'POST', url: '/api/photos/render', headers: authHeader(), payload: { photo_url: '/media/../../.env', settings: DEFAULT_HALFTONE } })).statusCode).toBe(400);
});
