import fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from '../helpers/app.ts';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => {
  await ctx.close();
});

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(p)));
    else out.push(p);
  }
  return out;
}

async function counts() {
  return {
    users: await ctx.prisma.user.count(),
    albums: await ctx.prisma.album.count(),
    tracks: await ctx.prisma.track.count(),
    media: await ctx.prisma.mediaFile.count(),
    files: (await listFiles(ctx.storage.rootDir)).length,
  };
}

describe('seeding', () => {
  it('full is idempotent', async () => {
    await ctx.seed('full');
    const first = await counts();
    await ctx.seed('full');
    expect(await counts()).toEqual(first);
    // 2 albums, 4 tracks; the single reuses a WAV => 3 audio + 1 image
    expect(first).toEqual({ users: 1, albums: 2, tracks: 4, media: 4, files: 4 });
  });

  it('empty after full leaves only admin and empties storage', async () => {
    await ctx.seed('full');
    await ctx.seed('empty');
    expect(await counts()).toEqual({ users: 1, albums: 0, tracks: 0, media: 0, files: 0 });
    expect(await ctx.prisma.user.findFirstOrThrow()).toMatchObject({ username: 'admin', role: 'ADMIN' });
  });
});
