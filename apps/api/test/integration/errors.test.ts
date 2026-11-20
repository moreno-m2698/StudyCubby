import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from '../helpers/app.ts';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
  await ctx.seed('full');
});
afterAll(async () => {
  await ctx.close();
});

function expectErrorShape(body: unknown, code: string) {
  expect(body).toEqual({ error: { code, message: expect.any(String) } });
}

describe('errors', () => {
  it('malformed id is 400', async () => {
    expectErrorShape((await ctx.request.get('/albums/abc').expect(400)).body, 'BAD_REQUEST');
    expectErrorShape((await ctx.request.get('/tracks/abc').expect(400)).body, 'BAD_REQUEST');
  });

  it('missing resources are 404', async () => {
    expectErrorShape((await ctx.request.get('/albums/999999').expect(404)).body, 'NOT_FOUND');
    expectErrorShape((await ctx.request.get('/albums/999999/cover').expect(404)).body, 'NOT_FOUND');
    expectErrorShape((await ctx.request.get('/tracks/999999').expect(404)).body, 'NOT_FOUND');
    expectErrorShape((await ctx.request.get('/tracks/999999/audio').expect(404)).body, 'NOT_FOUND');
  });

  it('unknown X-Dev-User is 401', async () => {
    expectErrorShape((await ctx.as('nobody').get('/albums').expect(401)).body, 'UNAUTHORIZED');
  });

  it('X-Dev-User: anonymous is anonymous', async () => {
    expect((await ctx.as('anonymous').get('/me').expect(200)).body).toEqual({ user: null });
  });

  it('scope=mine anonymous is 401 with error shape', async () => {
    expectErrorShape((await ctx.request.get('/albums?scope=mine').expect(401)).body, 'UNAUTHORIZED');
  });

  it('unknown route is a JSON 404', async () => {
    const res = await ctx.request.get('/nope').expect(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expectErrorShape(res.body, 'NOT_FOUND');
  });
});
