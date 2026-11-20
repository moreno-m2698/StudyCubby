import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, TEST_ALBUM, TEST_SINGLE, type TestContext } from '../helpers/app.ts';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => {
  await ctx.close();
});

describe('empty profile', () => {
  beforeAll(async () => {
    await ctx.seed('empty');
  });

  it('lists nothing', async () => {
    expect((await ctx.request.get('/albums').expect(200)).body).toEqual({ items: [] });
    expect((await ctx.request.get('/tracks').expect(200)).body).toEqual({ items: [] });
  });

  it('serves /health', async () => {
    expect((await ctx.request.get('/health').expect(200)).body).toEqual({ ok: true });
  });

  it('GET /me is null when anonymous and admin with X-Dev-User', async () => {
    expect((await ctx.request.get('/me').expect(200)).body).toEqual({ user: null });
    const res = await ctx.as('admin').get('/me').expect(200);
    expect(res.body.user).toMatchObject({ username: 'admin', role: 'ADMIN' });
  });
});

describe('full profile, anonymous', () => {
  beforeAll(async () => {
    await ctx.seed('full');
  });

  it('lists catalog albums and singles, newest first', async () => {
    const res = await ctx.request.get('/albums').expect(200);
    const items = res.body.items as Array<Record<string, unknown>>;
    expect(items.map((a) => a['title'])).toEqual([TEST_SINGLE.title, TEST_ALBUM.title]);
    for (const a of items) {
      expect(a).toMatchObject({ isCatalog: true, isMine: false });
    }
    const dates = items.map((a) => Date.parse(a['createdAt'] as string));
    expect(dates[0]!).toBeGreaterThanOrEqual(dates[1]!);
    expect(items[1]).toMatchObject({ trackCount: 3, type: 'ALBUM' });
    expect(items[1]!['coverUrl']).toMatch(/^\/albums\/\d+\/cover/);
    expect(items[0]!['coverUrl']).toBeNull();
  });

  it('type=SINGLE filters', async () => {
    const res = await ctx.request.get('/albums?type=SINGLE').expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ title: TEST_SINGLE.title, type: 'SINGLE' });
    expect((await ctx.request.get('/albums?type=EP').expect(200)).body.items).toEqual([]);
  });

  it('GET /albums/:id returns tracks ordered with durations', async () => {
    const list = await ctx.request.get('/albums?type=ALBUM').expect(200);
    const id = list.body.items[0].id;
    const res = await ctx.request.get(`/albums/${id}`).expect(200);
    expect(res.body.tracks.map((t: { trackNumber: number }) => t.trackNumber)).toEqual([1, 2, 3]);
    expect(res.body.tracks.map((t: { title: string }) => t.title)).toEqual(TEST_ALBUM.trackTitles);
    for (const t of res.body.tracks) {
      expect(typeof t.durationMs).toBe('number');
      expect(t.durationMs).toBeGreaterThan(900);
      expect(t.audioUrl).toBe(`/tracks/${t.id}/audio`);
      expect(t.albumId).toBe(id);
    }
  });

  it('GET /tracks lists every track once', async () => {
    const res = await ctx.request.get('/tracks').expect(200);
    const items = res.body.items as Array<{ id: number; albumTitle: string }>;
    expect(items).toHaveLength(4);
    expect(new Set(items.map((t) => t.id)).size).toBe(4);
    expect(items[0]!.albumTitle).toBe(TEST_SINGLE.title);
  });

  it('GET /tracks/:id works', async () => {
    const list = await ctx.request.get('/tracks').expect(200);
    const t = list.body.items[0];
    expect((await ctx.request.get(`/tracks/${t.id}`).expect(200)).body.id).toBe(t.id);
  });

  it('validates scope', async () => {
    await ctx.request.get('/albums?scope=mine').expect(401);
    await ctx.request.get('/tracks?scope=mine').expect(401);
    const cat = await ctx.request.get('/albums?scope=catalog').expect(200);
    expect(cat.body.items).toHaveLength(2);
    await ctx.request.get('/albums?scope=bogus').expect(400);
    await ctx.request.get('/albums?type=NOPE').expect(400);
  });
});
