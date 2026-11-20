import { existsSync, readdirSync } from 'node:fs';
import { readdir, rm, truncate } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../src/generated/prisma/client.ts';
import { MAX_IMAGE_BYTES, ingestMedia, readDurationMs, sniffMedia } from '../../src/media/ingest.ts';
import { LocalDiskStorage } from '../../src/storage/LocalDiskStorage.ts';
import { makeTempDir, writePng, writeTextFile, writeWav } from '../helpers/fixtures.ts';

let tmp: string;
beforeEach(async () => {
  tmp = await makeTempDir('sc-ingest-');
});
afterEach(() => rm(tmp, { recursive: true, force: true }));

describe('sniffMedia', () => {
  it('detects WAV as audio', async () => {
    const f = await writeWav(path.join(tmp, 'a.wav'));
    expect(await sniffMedia(f, 'AUDIO')).toEqual({ mimeType: 'audio/wav', ext: 'wav' });
  });
  it('detects PNG as image', async () => {
    const f = await writePng(path.join(tmp, 'a.png'));
    expect(await sniffMedia(f, 'IMAGE')).toEqual({ mimeType: 'image/png', ext: 'png' });
  });
  it('rejects text as audio and image with 415', async () => {
    const f = await writeTextFile(path.join(tmp, 'a.txt'));
    await expect(sniffMedia(f, 'AUDIO')).rejects.toMatchObject({ status: 415 });
    await expect(sniffMedia(f, 'IMAGE')).rejects.toMatchObject({ status: 415 });
  });
  it('rejects a PNG as audio and a WAV as image with 415', async () => {
    const png = await writePng(path.join(tmp, 'a.png'));
    const wav = await writeWav(path.join(tmp, 'a.wav'));
    await expect(sniffMedia(png, 'AUDIO')).rejects.toMatchObject({ status: 415 });
    await expect(sniffMedia(wav, 'IMAGE')).rejects.toMatchObject({ status: 415 });
  });
});

describe('ingestMedia (fake prisma)', () => {
  function setup() {
    const upsert = vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({
      id: 1,
      createdAt: new Date(),
      ...create,
    }));
    const findUnique = vi.fn();
    const prisma = { mediaFile: { upsert, findUnique } } as unknown as PrismaClient;
    const storage = new LocalDiskStorage(path.join(tmp, 'store'));
    const put = vi.spyOn(storage, 'put');
    return { prisma, storage, upsert, findUnique, put };
  }

  it('ingests a WAV with duration, key, and stored bytes', async () => {
    const { prisma, storage, upsert, put } = setup();
    const f = await writeWav(path.join(tmp, 'a.wav'), { seconds: 1 });
    const row = await ingestMedia({ prisma, storage }, { filePath: f, kind: 'AUDIO' });
    expect(row.storageKey).toMatch(/^audio\/[0-9a-f]{64}\.wav$/);
    expect(row.storageKey).toBe(`audio/${row.sha256}.wav`);
    expect(row.mimeType).toBe('audio/wav');
    expect(row.kind).toBe('AUDIO');
    expect(row.durationMs).toBe(1000);
    expect(put).toHaveBeenCalledWith(row.storageKey, f);
    expect(await storage.exists(row.storageKey)).toBe(true);
    expect(existsSync(f)).toBe(true);
    expect(upsert).toHaveBeenCalledOnce();
  });

  it('same bytes give same sha256 and key; different bytes differ', async () => {
    const { prisma, storage } = setup();
    const a = await writeWav(path.join(tmp, 'a.wav'), { frequency: 440 });
    const b = await writeWav(path.join(tmp, 'b.wav'), { frequency: 440 });
    const c = await writeWav(path.join(tmp, 'c.wav'), { frequency: 880 });
    const ra = await ingestMedia({ prisma, storage }, { filePath: a, kind: 'AUDIO' });
    const rb = await ingestMedia({ prisma, storage }, { filePath: b, kind: 'AUDIO' });
    const rc = await ingestMedia({ prisma, storage }, { filePath: c, kind: 'AUDIO' });
    expect(rb.sha256).toBe(ra.sha256);
    expect(rb.storageKey).toBe(ra.storageKey);
    expect(rc.sha256).not.toBe(ra.sha256);
    expect(await readdir(path.join(storage.rootDir, 'audio'))).toHaveLength(2);
  });

  it('ingests a PNG with null duration', async () => {
    const { prisma, storage } = setup();
    const f = await writePng(path.join(tmp, 'a.png'));
    const row = await ingestMedia({ prisma, storage }, { filePath: f, kind: 'IMAGE' });
    expect(row.storageKey).toMatch(/^images\/[0-9a-f]{64}\.png$/);
    expect(row.mimeType).toBe('image/png');
    expect(row.durationMs).toBeNull();
  });

  it('rejects wrong kind without touching storage or db', async () => {
    const { prisma, storage, upsert, put } = setup();
    const f = await writePng(path.join(tmp, 'a.png'));
    await expect(ingestMedia({ prisma, storage }, { filePath: f, kind: 'AUDIO' })).rejects.toMatchObject({ status: 415 });
    expect(put).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects oversize files with 413', async () => {
    const { prisma, storage } = setup();
    const f = await writePng(path.join(tmp, 'big.png'));
    await truncate(f, MAX_IMAGE_BYTES + 1);
    await expect(ingestMedia({ prisma, storage }, { filePath: f, kind: 'IMAGE' })).rejects.toMatchObject({ status: 413 });
  });

  it('recovers from a P2002 race by re-reading', async () => {
    const { prisma, storage, upsert, findUnique } = setup();
    const existing = { id: 7, sha256: 'x' };
    upsert.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    findUnique.mockResolvedValueOnce(existing);
    const f = await writePng(path.join(tmp, 'a.png'));
    expect(await ingestMedia({ prisma, storage }, { filePath: f, kind: 'IMAGE' })).toBe(existing);
  });

  it('rethrows other database errors', async () => {
    const { prisma, storage, upsert } = setup();
    upsert.mockRejectedValueOnce(new Error('boom'));
    const f = await writePng(path.join(tmp, 'a.png'));
    await expect(ingestMedia({ prisma, storage }, { filePath: f, kind: 'IMAGE' })).rejects.toThrow('boom');
  });
});

describe('readDurationMs', () => {
  it('returns null for unparseable files', async () => {
    expect(await readDurationMs(await writeTextFile(path.join(tmp, 'a.txt')))).toBeNull();
  });
});

/** First .mp3 inside any album folder of the (gitignored) seed media, if the developer has added some. */
function findSeedMp3(): string | null {
  const mediaDir = path.resolve(import.meta.dirname, '../../fixtures/media');
  if (!existsSync(mediaDir)) return null;
  for (const entry of readdirSync(mediaDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const mp3 = readdirSync(path.join(mediaDir, entry.name)).find((n) => n.toLowerCase().endsWith('.mp3'));
    if (mp3) return path.join(mediaDir, entry.name, mp3);
  }
  return null;
}

const seedMp3 = findSeedMp3();
describe.skipIf(!seedMp3)('real MP3 from seed media', () => {
  it('sniffs as audio/mpeg and has a plausible duration', async () => {
    const f = seedMp3!;
    expect(await sniffMedia(f, 'AUDIO')).toEqual({ mimeType: 'audio/mpeg', ext: 'mp3' });
    const ms = await readDurationMs(f);
    expect(ms).toBeGreaterThan(10_000);
  });
});
