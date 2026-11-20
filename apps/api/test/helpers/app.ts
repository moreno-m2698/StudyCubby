import fs from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../../src/app.ts';
import { loadConfig, type Config } from '../../src/config.ts';
import { createPrismaClient, type PrismaClient } from '../../src/db.ts';
import { seedDatabase, type SeedProfile, type SeedResult } from '../../src/seed/seedDatabase.ts';
import { LocalDiskStorage } from '../../src/storage/LocalDiskStorage.ts';
import { makeTempDir, writePng, writeWav } from './fixtures.ts';

export interface UserAgent {
  get(url: string): request.Test;
  post(url: string): request.Test;
  put(url: string): request.Test;
}

export interface TestContext {
  config: Config;
  prisma: PrismaClient;
  storage: LocalDiskStorage;
  /** Supertest agent (anonymous unless a header is added). */
  request: UserAgent;
  /** Directory holding the generated seed media and manifest. */
  mediaDir: string;
  manifestPath: string;
  /** Agent that sends `X-Dev-User: <username>`. */
  as(username: string): UserAgent;
  seed(profile: SeedProfile): Promise<SeedResult>;
  close(): Promise<void>;
}

/** Generated seed layout: an ALBUM (3 tracks + cover) and a SINGLE reusing track one's bytes. */
export const TEST_ALBUM = { title: 'Test Album', artist: 'Test Artist', trackTitles: ['Alpha', 'Bravo', 'Charlie'] };
export const TEST_SINGLE = { title: 'Test Single', artist: 'Solo Artist', trackTitle: 'Alpha Single' };
export const WAV_FREQUENCIES = [220, 330, 440];

async function writeTestMedia(mediaDir: string): Promise<string> {
  const albumDir = path.join(mediaDir, 'album');
  const singleDir = path.join(mediaDir, 'single');
  await writePng(path.join(albumDir, 'cover.png'), { rgb: [10, 120, 200] });
  for (const [i, frequency] of WAV_FREQUENCIES.entries()) {
    await writeWav(path.join(albumDir, `track${i + 1}.wav`), { frequency });
  }
  // Same parameters as album track 1 => identical bytes => one shared MediaFile.
  await writeWav(path.join(singleDir, 'single.wav'), { frequency: WAV_FREQUENCIES[0]! });
  const manifest = {
    albums: [
      {
        title: TEST_ALBUM.title,
        artist: TEST_ALBUM.artist,
        type: 'ALBUM',
        dir: 'album',
        cover: 'cover.png',
        tracks: TEST_ALBUM.trackTitles.map((title, i) => ({ file: `track${i + 1}.wav`, title })),
      },
      {
        title: TEST_SINGLE.title,
        artist: TEST_SINGLE.artist,
        type: 'SINGLE',
        dir: 'single',
        tracks: [{ file: 'single.wav', title: TEST_SINGLE.trackTitle }],
      },
    ],
  };
  const manifestPath = path.join(mediaDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

export async function createTestContext(): Promise<TestContext> {
  const root = await makeTempDir('studycubby-ctx-');
  const storageDir = path.join(root, 'storage');
  const mediaDir = path.join(root, 'media');
  const manifestPath = await writeTestMedia(mediaDir);

  const config = loadConfig({ ...process.env, STORAGE_DIR: storageDir, DEV_DEFAULT_USER: '' });
  if (!/\/studycubby_test(\?|$)/.test(config.databaseUrl)) {
    throw new Error('Test context refuses to run against a database other than studycubby_test');
  }
  const prisma = createPrismaClient(config.databaseUrl);
  const storage = new LocalDiskStorage(config.storageDir);
  const agent = request(createApp({ config, prisma, storage }));

  const plain: UserAgent = {
    get: (u) => agent.get(u),
    post: (u) => agent.post(u),
    put: (u) => agent.put(u),
  };

  return {
    config,
    prisma,
    storage,
    request: plain,
    mediaDir,
    manifestPath,
    as: (username) => ({
      get: (u) => agent.get(u).set('X-Dev-User', username),
      post: (u) => agent.post(u).set('X-Dev-User', username),
      put: (u) => agent.put(u).set('X-Dev-User', username),
    }),
    seed: (profile) =>
      seedDatabase({
        prisma,
        storage,
        profile,
        ...(profile === 'full' ? { manifestPath, mediaDir } : {}),
      }),
    async close() {
      await prisma.$disconnect();
      await fs.rm(root, { recursive: true, force: true });
    },
  };
}

/** Create a user directly through prisma. */
export function createUser(prisma: PrismaClient, username: string, role: 'USER' | 'ADMIN' = 'USER') {
  return prisma.user.create({ data: { username, role } });
}

/** Supertest body parser that collects the raw bytes. */
export const binary = (res: request.Response, cb: (err: Error | null, body: any) => void): void => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};
