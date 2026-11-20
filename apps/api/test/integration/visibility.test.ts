import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, createUser, TEST_ALBUM, type TestContext } from '../helpers/app.ts';
import { writePng, writeWav } from '../helpers/fixtures.ts';

let ctx: TestContext;
let aliceAlbumId: number;
let aliceTrackIds: number[];
let catalogAlbumId: number;

beforeAll(async () => {
  ctx = await createTestContext();
  await ctx.seed('full');
  await createUser(ctx.prisma, 'alice', 'USER');
  await createUser(ctx.prisma, 'bob', 'USER');

  const cover = await writePng(path.join(ctx.mediaDir, 'alice', 'cover.png'), { rgb: [90, 90, 9] });
  const t1 = await writeWav(path.join(ctx.mediaDir, 'alice', 'one.wav'), { frequency: 660 });
  const t2 = await writeWav(path.join(ctx.mediaDir, 'alice', 'two.wav'), { frequency: 770 });
  const res = await ctx
    .as('alice')
    .post('/albums')
    .field('title', 'Alice Private')
    .field('artist', 'Alice')
    .attach('cover', cover)
    .attach('tracks', t1)
    .attach('tracks', t2)
    .expect(201);
  aliceAlbumId = res.body.id;
  aliceTrackIds = res.body.tracks.map((t: { id: number }) => t.id);

  const list = await ctx.request.get('/albums?type=ALBUM').expect(200);
  catalogAlbumId = list.body.items.find((a: { title: string }) => a.title === TEST_ALBUM.title).id;
});
afterAll(async () => {
  await ctx.close();
});

const ids = (body: { items: Array<{ id: number }> }) => body.items.map((i) => i.id);

describe('per-user isolation', () => {
  it('alice sees catalog plus her own album', async () => {
    const res = await ctx.as('alice').get('/albums').expect(200);
    expect(res.body.items).toHaveLength(3);
    const mine = res.body.items.find((a: { id: number }) => a.id === aliceAlbumId);
    expect(mine).toMatchObject({ isMine: true, isCatalog: false });
    for (const a of res.body.items.filter((a: { id: number }) => a.id !== aliceAlbumId)) {
      expect(a).toMatchObject({ isMine: false, isCatalog: true });
    }
    const tracks = await ctx.as('alice').get('/tracks').expect(200);
    expect(tracks.body.items).toHaveLength(6);
  });

  it('alice scope=mine returns only hers; scope=catalog excludes hers', async () => {
    const mine = await ctx.as('alice').get('/albums?scope=mine').expect(200);
    expect(ids(mine.body)).toEqual([aliceAlbumId]);
    const tracks = await ctx.as('alice').get('/tracks?scope=mine').expect(200);
    expect(ids(tracks.body).sort()).toEqual([...aliceTrackIds].sort());
    const cat = await ctx.as('alice').get('/albums?scope=catalog').expect(200);
    expect(ids(cat.body)).not.toContain(aliceAlbumId);
  });

  it('alice can read her own media', async () => {
    await ctx.as('alice').get(`/albums/${aliceAlbumId}`).expect(200);
    await ctx.as('alice').get(`/albums/${aliceAlbumId}/cover`).expect(200);
    await ctx.as('alice').get(`/tracks/${aliceTrackIds[0]}/audio`).expect(200);
  });

  for (const who of ['bob', 'admin', 'anonymous'] as const) {
    it(`${who} cannot see alice's album, cover or tracks`, async () => {
      const agent = who === 'anonymous' ? ctx.request : ctx.as(who);
      const albums = await agent.get('/albums').expect(200);
      expect(ids(albums.body)).not.toContain(aliceAlbumId);
      const tracks = await agent.get('/tracks').expect(200);
      expect(ids(tracks.body)).not.toEqual(expect.arrayContaining(aliceTrackIds));
      for (const t of aliceTrackIds) expect(ids(tracks.body)).not.toContain(t);
      await agent.get(`/albums/${aliceAlbumId}`).expect(404);
      await agent.get(`/albums/${aliceAlbumId}/cover`).expect(404);
      for (const t of aliceTrackIds) {
        await agent.get(`/tracks/${t}`).expect(404);
        await agent.get(`/tracks/${t}/audio`).expect(404);
      }
      await agent.get(`/tracks?albumId=${aliceAlbumId}`).expect(200).then((r) => expect(r.body.items).toEqual([]));
    });
  }

  it("bob's scope=mine is empty", async () => {
    expect((await ctx.as('bob').get('/albums?scope=mine').expect(200)).body.items).toEqual([]);
    expect((await ctx.as('bob').get('/tracks?scope=mine').expect(200)).body.items).toEqual([]);
  });

  it("admin's scope=mine returns only the catalog", async () => {
    const res = await ctx.as('admin').get('/albums?scope=mine').expect(200);
    expect(res.body.items).toHaveLength(2);
    for (const a of res.body.items) expect(a).toMatchObject({ isCatalog: true, isMine: true });
  });

  it('alice cannot change catalog cover (403)', async () => {
    const png = await writePng(path.join(ctx.mediaDir, 'alice', 'new.png'), { rgb: [1, 1, 1] });
    const res = await ctx.as('alice').put(`/albums/${catalogAlbumId}/cover`).attach('cover', png).expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it("bob cannot append to alice's album (404)", async () => {
    const wav = await writeWav(path.join(ctx.mediaDir, 'bob', 'x.wav'), { frequency: 880 });
    await ctx.as('bob').post(`/albums/${aliceAlbumId}/tracks`).attach('tracks', wav).expect(404);
  });

  it('alice cannot append to catalog album (403)', async () => {
    const wav = await writeWav(path.join(ctx.mediaDir, 'alice', 'y.wav'), { frequency: 990 });
    await ctx.as('alice').post(`/albums/${catalogAlbumId}/tracks`).attach('tracks', wav).expect(403);
  });
});
