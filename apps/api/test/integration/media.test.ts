import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { binary, createTestContext, createUser, type TestContext } from '../helpers/app.ts';
import { writePng, writeWav } from '../helpers/fixtures.ts';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
  await ctx.seed('full');
});
afterAll(async () => {
  await ctx.close();
});

async function catalogAlbum() {
  const list = await ctx.request.get('/albums?type=ALBUM').expect(200);
  return (await ctx.request.get(`/albums/${list.body.items[0].id}`).expect(200)).body;
}

describe('media', () => {
  it('serves a byte range as 206', async () => {
    const track = (await catalogAlbum()).tracks[0];
    const full = await ctx.request.get(track.audioUrl).buffer(true).parse(binary).expect(200);
    const size = (full.body as Buffer).length;
    const res = await ctx.request.get(track.audioUrl).set('Range', 'bytes=0-99').buffer(true).parse(binary);
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 0-99/${size}`);
    expect(res.headers['content-length']).toBe('100');
    expect(res.headers['content-type']).toMatch(/^audio\/wav/);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect((res.body as Buffer).equals((full.body as Buffer).subarray(0, 100))).toBe(true);
  });

  it('serves the full file with 200 and the right length', async () => {
    const track = (await catalogAlbum()).tracks[1];
    const row = await ctx.prisma.track
      .findUniqueOrThrow({ where: { id: track.id }, include: { audio: true } })
      .then((t) => t.audio);
    const res = await ctx.request.get(track.audioUrl).buffer(true).parse(binary).expect(200);
    expect(res.headers['content-length']).toBe(String(row.sizeBytes));
    expect((res.body as Buffer).length).toBe(row.sizeBytes);
  });

  it('serves the cover as image/png', async () => {
    const album = await catalogAlbum();
    const res = await ctx.request.get(`/albums/${album.id}/cover`).expect(200);
    expect(res.headers['content-type']).toMatch(/^image\/png/);
    expect(res.headers['etag']).toBeTruthy();
  });

  it('uses public caching for catalog media', async () => {
    const album = await catalogAlbum();
    const cover = await ctx.request.get(`/albums/${album.id}/cover`).expect(200);
    expect(cover.headers['cache-control']).toMatch(/^public/);
    const audio = await ctx.request.get(album.tracks[0].audioUrl).expect(200);
    expect(audio.headers['cache-control']).toMatch(/^public/);
  });

  it('uses private caching for user media', async () => {
    await createUser(ctx.prisma, 'carol');
    const png = await writePng(path.join(ctx.mediaDir, 'u', 'c.png'), { rgb: [1, 2, 3] });
    const wav = await writeWav(path.join(ctx.mediaDir, 'u', 'c.wav'), { frequency: 555 });
    const created = await ctx
      .as('carol')
      .post('/albums')
      .field('title', 'Mine')
      .field('artist', 'Carol')
      .attach('cover', png)
      .attach('tracks', wav)
      .expect(201);
    const cover = await ctx.as('carol').get(`/albums/${created.body.id}/cover`).expect(200);
    expect(cover.headers['cache-control']).toMatch(/^private/);
    const audio = await ctx.as('carol').get(created.body.tracks[0].audioUrl).expect(200);
    expect(audio.headers['cache-control']).toMatch(/^private/);
  });

  it('404s the cover of an album without one', async () => {
    const single = (await ctx.request.get('/albums?type=SINGLE').expect(200)).body.items[0];
    expect(single.coverUrl).toBeNull();
    await ctx.request.get(`/albums/${single.id}/cover`).expect(404);
  });
});
