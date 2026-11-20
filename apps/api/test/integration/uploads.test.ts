import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from '../helpers/app.ts';
import { writePng, writeTextFile, writeWav } from '../helpers/fixtures.ts';

let ctx: TestContext;
let dir: string;
let png: string;
let wav1: string;
let wav2: string;
let wav3: string;

beforeAll(async () => {
  ctx = await createTestContext();
  dir = path.join(ctx.mediaDir, 'uploads');
  png = await writePng(path.join(dir, 'cover.png'), { rgb: [5, 50, 150] });
  wav1 = await writeWav(path.join(dir, 'first-song.wav'), { frequency: 301 });
  wav2 = await writeWav(path.join(dir, 'second-song.wav'), { frequency: 402 });
  wav3 = await writeWav(path.join(dir, 'third-song.wav'), { frequency: 503 });
});
beforeEach(async () => {
  await ctx.seed('empty');
});
afterAll(async () => {
  await ctx.close();
});

const admin = () => ctx.as('admin');

describe('uploads', () => {
  it('rejects anonymous POST /albums with 401', async () => {
    const res = await ctx.request.post('/albums').field('title', 'x').field('artist', 'y').attach('tracks', wav1);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('admin creates an ALBUM with cover and tracks', async () => {
    const res = await admin()
      .post('/albums')
      .field('title', 'New Album')
      .field('artist', 'Someone')
      .field('titles', 'Custom One')
      .attach('cover', png)
      .attach('tracks', wav1)
      .attach('tracks', wav2)
      .expect(201);
    expect(res.body).toMatchObject({ title: 'New Album', artist: 'Someone', type: 'ALBUM', isCatalog: true, isMine: true });
    expect(res.body.coverUrl).toMatch(/^\/albums\/\d+\/cover/);
    expect(res.body.tracks.map((t: { trackNumber: number }) => t.trackNumber)).toEqual([1, 2]);
    // titles[1] missing => file name without extension
    expect(res.body.tracks.map((t: { title: string }) => t.title)).toEqual(['Custom One', 'second-song']);
    expect(res.body.tracks[0].artist).toBe('Someone');

    const media = await ctx.prisma.mediaFile.findMany();
    expect(media).toHaveLength(3);
    for (const m of media) expect(await ctx.storage.exists(m.storageKey)).toBe(true);
    // anonymous can see catalog upload
    await ctx.request.get(`/albums/${res.body.id}`).expect(200);
  });

  it('accepts repeated titles fields', async () => {
    const res = await admin()
      .post('/albums')
      .field('title', 'T')
      .field('artist', 'A')
      .field('titles', 'One')
      .field('titles', 'Two')
      .attach('tracks', wav1)
      .attach('tracks', wav2)
      .expect(201);
    expect(res.body.tracks.map((t: { title: string }) => t.title)).toEqual(['One', 'Two']);
  });

  it('creates a SINGLE with exactly one track', async () => {
    const res = await admin()
      .post('/albums')
      .field('title', 'S')
      .field('artist', 'A')
      .field('type', 'SINGLE')
      .attach('tracks', wav1)
      .expect(201);
    expect(res.body).toMatchObject({ type: 'SINGLE', trackCount: 1 });
  });

  it('rejects a SINGLE with two tracks and appending to a SINGLE', async () => {
    await admin()
      .post('/albums')
      .field('title', 'S')
      .field('artist', 'A')
      .field('type', 'SINGLE')
      .attach('tracks', wav1)
      .attach('tracks', wav2)
      .expect(400);
    await admin().post('/albums').field('title', 'S0').field('artist', 'A').field('type', 'SINGLE').expect(400);
    expect(await ctx.prisma.album.count()).toBe(0);

    const single = await admin()
      .post('/albums')
      .field('title', 'S')
      .field('artist', 'A')
      .field('type', 'SINGLE')
      .attach('tracks', wav1)
      .expect(201);
    const res = await admin().post(`/albums/${single.body.id}/tracks`).attach('tracks', wav2).expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('appending tracks continues numbering', async () => {
    const album = await admin()
      .post('/albums')
      .field('title', 'A')
      .field('artist', 'B')
      .attach('tracks', wav1)
      .attach('tracks', wav2)
      .expect(201);
    const res = await admin()
      .post(`/albums/${album.body.id}/tracks`)
      .field('titles', 'Third')
      .attach('tracks', wav3)
      .expect(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ trackNumber: 3, title: 'Third' });
    const detail = await ctx.request.get(`/albums/${album.body.id}`).expect(200);
    expect(detail.body.tracks.map((t: { trackNumber: number }) => t.trackNumber)).toEqual([1, 2, 3]);
    await admin().post(`/albums/${album.body.id}/tracks`).expect(400);
  });

  it('PUT cover replaces the cover', async () => {
    const album = await admin().post('/albums').field('title', 'A').field('artist', 'B').attach('tracks', wav1).expect(201);
    expect(album.body.coverUrl).toBeNull();
    const res = await admin().put(`/albums/${album.body.id}/cover`).attach('cover', png).expect(200);
    expect(res.body.coverUrl).toMatch(/^\/albums\/\d+\/cover/);
    await ctx.request.get(`/albums/${album.body.id}/cover`).expect(200);
    await admin().put(`/albums/${album.body.id}/cover`).expect(400);
  });

  it('rejects wrong file types with 415', async () => {
    const txt = await writeTextFile(path.join(dir, 'notes.txt'));
    const bad1 = await admin().post('/albums').field('title', 'A').field('artist', 'B').attach('tracks', txt);
    expect(bad1.status).toBe(415);
    expect(bad1.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    // a WAV used as a cover
    await admin().post('/albums').field('title', 'A').field('artist', 'B').attach('cover', wav1).expect(415);
    // a PNG used as a track
    await admin().post('/albums').field('title', 'A').field('artist', 'B').attach('tracks', png).expect(415);
    expect(await ctx.prisma.album.count()).toBe(0);
  });

  it('rejects a missing title with 400', async () => {
    const res = await admin().post('/albums').field('artist', 'B').attach('tracks', wav1).expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    await admin().post('/albums').field('title', 'A').attach('tracks', wav1).expect(400);
  });

  it('reuses one MediaFile row for identical bytes', async () => {
    const copy = path.join(dir, 'copy-of-first.wav');
    await fs.copyFile(wav1, copy);
    await admin().post('/albums').field('title', 'A').field('artist', 'B').attach('tracks', wav1).expect(201);
    await admin().post('/albums').field('title', 'C').field('artist', 'D').attach('tracks', copy).expect(201);
    expect(await ctx.prisma.mediaFile.count()).toBe(1);
    expect(await ctx.prisma.track.count()).toBe(2);
  });

  it('leaves no multer temp files behind', async () => {
    const tmp = path.join(os.tmpdir(), 'studycubby-uploads');
    const before = new Set(await fs.readdir(tmp).catch(() => [] as string[]));
    await admin().post('/albums').field('title', 'A').field('artist', 'B').attach('tracks', wav1).attach('cover', png).expect(201);
    await admin().post('/albums').field('title', 'A').field('artist', 'B').attach('tracks', wav2).attach('cover', wav1).expect(415);
    await admin().post('/albums').field('artist', 'B').attach('tracks', wav3).expect(400);

    const leftovers = async () => (await fs.readdir(tmp).catch(() => [] as string[])).filter((f) => !before.has(f));
    for (let i = 0; i < 40 && (await leftovers()).length > 0; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(await leftovers()).toEqual([]);
  });
});
