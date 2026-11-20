import path from 'node:path';
import type { MediaFile, PrismaClient } from '../generated/prisma/client.ts';
import { ingestMedia } from '../media/ingest.ts';
import type { StorageDriver } from '../storage/StorageDriver.ts';
import { loadManifest, type Manifest } from './manifest.ts';

export const SEED_PROFILES = ['full', 'empty'] as const;
export type SeedProfile = (typeof SEED_PROFILES)[number];

export interface SeedOptions {
  prisma: PrismaClient;
  storage: StorageDriver;
  profile: SeedProfile;
  /** Path to a manifest JSON (see fixtures/manifest.json). Required for `full`. */
  manifestPath?: string;
  /** Directory the manifest's `dir` entries are relative to. Required for `full`. */
  mediaDir?: string;
  log?: (message: string) => void;
}

export interface SeedResult {
  users: number;
  albums: number;
  tracks: number;
  mediaFiles: number;
}

/**
 * Reset the database and storage, then load a profile:
 * - `empty`: just the `admin` user (role ADMIN). Represents "nothing uploaded yet".
 * - `full`: admin + every album in the manifest, ingested via ingestMedia().
 * Used by scripts/seed.ts (dev) and by the test suite.
 */
export async function seedDatabase(opts: SeedOptions): Promise<SeedResult> {
  const { prisma, storage, profile } = opts;
  const log = opts.log ?? (() => {});

  // Validate the manifest before wiping anything.
  let manifest: Manifest | undefined;
  if (profile === 'full') {
    if (!opts.manifestPath || !opts.mediaDir) {
      throw new Error('seedDatabase: profile "full" requires manifestPath and mediaDir');
    }
    manifest = await loadManifest(opts.manifestPath, opts.mediaDir);
  }

  log('Resetting database and storage');
  await prisma.$executeRawUnsafe('TRUNCATE "Track", "Album", "MediaFile", "User" RESTART IDENTITY CASCADE');
  await storage.clear();

  const userIds = new Map<string, number>();
  const admin = await prisma.user.create({ data: { username: 'admin', role: 'ADMIN' } });
  userIds.set('admin', admin.id);
  for (const u of manifest?.users ?? []) {
    const created = await prisma.user.create({ data: { username: u.username, role: u.role } });
    userIds.set(u.username, created.id);
  }
  log(`Created ${userIds.size} user(s)`);

  let albums = 0;
  let tracks = 0;
  if (manifest && opts.mediaDir) {
    const deps = { prisma, storage };
    for (const album of manifest.albums) {
      const dir = path.join(opts.mediaDir, album.dir);
      log(`Album "${album.title}" (${album.tracks.length} track(s))`);
      const cover = album.cover
        ? await ingestMedia(deps, { filePath: path.join(dir, album.cover), kind: 'IMAGE' })
        : null;
      const audio: MediaFile[] = [];
      for (const t of album.tracks) {
        audio.push(await ingestMedia(deps, { filePath: path.join(dir, t.file), kind: 'AUDIO' }));
      }
      const ownerId = userIds.get(album.owner);
      if (ownerId === undefined) throw new Error(`Unknown owner "${album.owner}"`);
      await prisma.$transaction(async (tx) => {
        await tx.album.create({
          data: {
            title: album.title,
            artist: album.artist,
            type: album.type,
            ownerId,
            coverId: cover?.id ?? null,
            tracks: {
              create: album.tracks.map((t, i) => ({
                title: t.title,
                artist: t.artist ?? album.artist,
                trackNumber: i + 1,
                audioId: audio[i]!.id,
                durationMs: audio[i]!.durationMs,
              })),
            },
          },
        });
      });
      albums += 1;
      tracks += album.tracks.length;
    }
  }

  const mediaFiles = await prisma.mediaFile.count();
  const result = { users: userIds.size, albums, tracks, mediaFiles };
  log(`Done: ${result.users} users, ${albums} albums, ${tracks} tracks, ${mediaFiles} media files`);
  return result;
}
