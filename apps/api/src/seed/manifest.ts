import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { checkSeedMedia, displayPath, SeedMediaError } from './mediaCheck.ts';

/** The real manifest is gitignored (it names the user's own music); a template sits next to it. */
function missingManifestMessage(manifestPath: string): string {
  const example = path.join(path.dirname(manifestPath), 'manifest.example.json');
  const real = displayPath(manifestPath).replace(/\/$/, '');
  const tmpl = displayPath(example).replace(/\/$/, '');
  return [
    `no seed manifest at ${real}.`,
    '',
    "  It's gitignored because it names your music. Create it from the template:",
    '',
    `    cp ${tmpl} ${real}`,
    '',
    '  Then replace the <placeholders> with your album folders, tracks, and cover images',
    '  (each album folder in apps/api/fixtures/media/ needs its tracks AND its cover image).',
    '  To seed without media, run: npm run db:seed:empty',
  ].join('\n');
}

/** A relative path that stays inside its base directory (no absolute paths, no `..`). */
const safeRelPath = z
  .string()
  .min(1)
  .refine((p) => !path.isAbsolute(p) && !/^[a-zA-Z]:/.test(p) && !p.startsWith('/') && !p.startsWith('\\'), {
    message: 'must be a relative path',
  })
  .refine((p) => !p.split(/[\\/]+/).includes('..'), { message: 'must not contain ".."' });

const TrackSchema = z.object({
  file: safeRelPath,
  title: z.string().min(1),
  artist: z.string().min(1).optional(),
});

const AlbumSchema = z
  .object({
    title: z.string().min(1),
    artist: z.string().min(1),
    type: z.enum(['ALBUM', 'SINGLE', 'EP']),
    owner: z.string().min(1).default('admin'),
    dir: safeRelPath,
    cover: safeRelPath.optional(),
    tracks: z.array(TrackSchema).min(1),
  })
  .superRefine((album, ctx) => {
    if (album.type === 'SINGLE' && album.tracks.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['tracks'],
        message: `SINGLE "${album.title}" must have exactly 1 track (has ${album.tracks.length})`,
      });
    }
  });

const UserSchema = z.object({
  username: z.string().min(1),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
});

export const ManifestSchema = z
  .object({
    users: z.array(UserSchema).default([]),
    albums: z.array(AlbumSchema).default([]),
  })
  .superRefine((m, ctx) => {
    const seen = new Set<string>();
    m.users.forEach((u, i) => {
      if (u.username === 'admin') {
        ctx.addIssue({
          code: 'custom',
          path: ['users', i, 'username'],
          message: '"admin" is always created by the seed and must not be listed',
        });
      }
      if (seen.has(u.username)) {
        ctx.addIssue({ code: 'custom', path: ['users', i, 'username'], message: `duplicate username "${u.username}"` });
      }
      seen.add(u.username);
    });
    const owners = new Set(['admin', ...m.users.map((u) => u.username)]);
    m.albums.forEach((a, i) => {
      if (!owners.has(a.owner)) {
        ctx.addIssue({
          code: 'custom',
          path: ['albums', i, 'owner'],
          message: `unknown owner "${a.owner}" (must be "admin" or a listed user)`,
        });
      }
    });
  });

export type Manifest = z.infer<typeof ManifestSchema>;
export type ManifestUser = Manifest['users'][number];
export type ManifestAlbum = Manifest['albums'][number];
export type ManifestTrack = ManifestAlbum['tracks'][number];

/** Read and validate a manifest, and check that every referenced media file exists under mediaDir. */
export async function loadManifest(manifestPath: string, mediaDir: string): Promise<Manifest> {
  let raw: string;
  try {
    raw = await fs.readFile(manifestPath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw new SeedMediaError(missingManifestMessage(manifestPath));
    throw new Error(`Cannot read seed manifest ${manifestPath}: ${(err as Error).message}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Seed manifest ${manifestPath} is not valid JSON: ${(err as Error).message}`);
  }
  const parsed = ManifestSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`Invalid seed manifest ${manifestPath}:\n${issues}`);
  }
  const manifest = parsed.data;
  await checkSeedMedia(manifest, mediaDir); // throws SeedMediaError explaining what's missing
  return manifest;
}
