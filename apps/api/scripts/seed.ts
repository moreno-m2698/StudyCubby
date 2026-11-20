import path from 'node:path';
import { parseArgs } from 'node:util';
import { API_ROOT, loadConfig } from '../src/config.ts';
import { createPrismaClient } from '../src/db.ts';
import { loadDotenv } from '../src/env.ts';
import { loadManifest } from '../src/seed/manifest.ts';
import { SEED_PROFILES, seedDatabase, type SeedProfile } from '../src/seed/seedDatabase.ts';
import { LocalDiskStorage } from '../src/storage/LocalDiskStorage.ts';

const USAGE = 'Usage: tsx scripts/seed.ts --profile full|empty [--dry-run]';

async function main(): Promise<void> {
  loadDotenv();
  const config = loadConfig();

  const { values } = parseArgs({
    options: {
      profile: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  const profile = values.profile as SeedProfile | undefined;
  if (!profile || !(SEED_PROFILES as readonly string[]).includes(profile)) {
    throw new Error(`--profile must be one of: ${SEED_PROFILES.join(', ')}\n${USAGE}`);
  }
  const dryRun = values['dry-run'] === true;

  if (config.nodeEnv === 'production') throw new Error('Refusing to seed: NODE_ENV=production');
  const rel = path.relative(API_ROOT, config.storageDir);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(
      `Refusing to seed: STORAGE_DIR (${config.storageDir}) must be a subfolder of ${API_ROOT}, because it gets wiped`,
    );
  }

  const manifestPath = path.join(API_ROOT, 'fixtures', 'manifest.json');
  const mediaDir = config.seedMediaDir;
  const db = new URL(config.databaseUrl);
  const target = `${db.hostname}:${db.port || '5432'}${db.pathname}`;

  if (dryRun) {
    console.log(`[dry-run] profile=${profile} database=${target} storage=${config.storageDir}`);
    console.log('[dry-run] user admin (ADMIN)');
    if (profile === 'full') {
      const m = await loadManifest(manifestPath, mediaDir);
      for (const u of m.users) console.log(`[dry-run] user ${u.username} (${u.role})`);
      for (const a of m.albums) {
        console.log(
          `[dry-run] ${a.type} "${a.title}" by ${a.artist}, owner=${a.owner}, cover=${a.cover ?? '-'}, ${a.tracks.length} track(s)`,
        );
        a.tracks.forEach((t, i) => console.log(`[dry-run]     ${String(i + 1).padStart(2)}. ${t.title}`));
      }
      console.log(`[dry-run] manifest OK: ${m.albums.length} albums, all files present. Nothing was changed.`);
    } else {
      console.log('[dry-run] Nothing was changed.');
    }
    return;
  }

  // Check the manifest and media before announcing (or doing) any wipe.
  if (profile === 'full') await loadManifest(manifestPath, mediaDir);

  console.log(`Seeding profile "${profile}": WIPING database ${target} and storage ${config.storageDir}`);
  const prisma = createPrismaClient(config.databaseUrl);
  try {
    const result = await seedDatabase({
      prisma,
      storage: new LocalDiskStorage(config.storageDir),
      profile,
      manifestPath,
      mediaDir,
      log: (m) => console.log(m),
    });
    console.log(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(`Seed failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
