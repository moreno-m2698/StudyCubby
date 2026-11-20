import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ManifestSchema, loadManifest } from '../../src/seed/manifest.ts';
import { SeedMediaError, requiredFolders } from '../../src/seed/mediaCheck.ts';

let tmp: string;
let mediaDir: string;
let manifestPath: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'manifest-test-'));
  mediaDir = path.join(tmp, 'media');
  manifestPath = path.join(tmp, 'manifest.json');
  await fs.mkdir(path.join(mediaDir, 'Album One'), { recursive: true });
  for (const f of ['cover.png', 'a.mp3', 'b.mp3']) {
    await fs.writeFile(path.join(mediaDir, 'Album One', f), 'x');
  }
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

const album = (over: Record<string, unknown> = {}) => ({
  title: 'Album One',
  artist: 'Someone',
  type: 'ALBUM',
  dir: 'Album One',
  cover: 'cover.png',
  tracks: [
    { file: 'a.mp3', title: 'A' },
    { file: 'b.mp3', title: 'B', artist: 'Guest' },
  ],
  ...over,
});

async function write(manifest: unknown) {
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
}

describe('loadManifest', () => {
  it('accepts a valid manifest and applies defaults', async () => {
    await write({ users: [{ username: 'alice', role: 'USER' }], albums: [album(), album({ owner: 'alice', title: 'Two' })] });
    const m = await loadManifest(manifestPath, mediaDir);
    expect(m.albums).toHaveLength(2);
    expect(m.albums[0]!.owner).toBe('admin');
    expect(m.albums[1]!.owner).toBe('alice');
  });

  it('rejects a SINGLE with two tracks', async () => {
    await write({ albums: [album({ type: 'SINGLE' })] });
    await expect(loadManifest(manifestPath, mediaDir)).rejects.toThrow(/exactly 1 track/);
  });

  it('rejects an unknown owner', async () => {
    await write({ albums: [album({ owner: 'nobody' })] });
    await expect(loadManifest(manifestPath, mediaDir)).rejects.toThrow(/unknown owner "nobody"/);
  });

  it('rejects paths containing ..', async () => {
    await write({ albums: [album({ dir: '../outside' })] });
    await expect(loadManifest(manifestPath, mediaDir)).rejects.toThrow(/\.\./);
  });

  it('rejects absolute paths', () => {
    const r = ManifestSchema.safeParse({ albums: [album({ cover: '/etc/passwd' })] });
    expect(r.success).toBe(false);
  });

  it('rejects duplicate usernames and a listed admin', () => {
    expect(ManifestSchema.safeParse({ users: [{ username: 'a' }, { username: 'a' }] }).success).toBe(false);
    expect(ManifestSchema.safeParse({ users: [{ username: 'admin', role: 'ADMIN' }] }).success).toBe(false);
  });

});

describe('missing seed media', () => {
  const failure = async () => {
    const err = await loadManifest(manifestPath, mediaDir).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SeedMediaError);
    return (err as SeedMediaError).message;
  };

  it('explains a missing media folder with the expected layout (tracks AND cover)', async () => {
    await write({ albums: [album()] });
    await fs.rm(mediaDir, { recursive: true });
    const msg = await failure();
    expect(msg).toMatch(/^no seed media found\./);
    expect(msg).toContain('Album One/');
    expect(msg).toContain('cover.png');
    expect(msg).toContain('2 tracks (.mp3)');
    expect(msg).toContain('needs its tracks AND its cover image');
    expect(msg).toContain('npm run db:seed:empty');
    expect(msg).toContain('SEED_MEDIA_DIR is set to'); // temp dir differs from the default
  });

  it('treats a folder holding only dotfiles as empty', async () => {
    await write({ albums: [album()] });
    await fs.rm(path.join(mediaDir, 'Album One'), { recursive: true });
    await fs.writeFile(path.join(mediaDir, '.gitkeep'), '');
    expect(await failure()).toMatch(/^no seed media found\./);
  });

  it('names a missing album folder and lists what is there instead', async () => {
    await write({ albums: [album()] });
    await fs.rename(path.join(mediaDir, 'Album One'), path.join(mediaDir, 'Album 1'));
    await fs.writeFile(path.join(mediaDir, 'notes.txt'), '');
    const msg = await failure();
    expect(msg).toContain('album folder "Album One" not found');
    expect(msg).toContain('Found in');
    expect(msg).toContain('Album 1/, notes.txt');
    expect(msg).toContain('must match "dir"');
  });

  it('separates a missing cover from missing tracks and only lists what is missing', async () => {
    await write({
      albums: [album({ cover: 'nope.png', tracks: [{ file: 'a.mp3', title: 'A' }, { file: 'gone.mp3', title: 'G' }] })],
    });
    const msg = await failure();
    expect(msg).toContain('"Album One" is missing 2 file(s)');
    expect(msg).toMatch(/Cover image:\n\s+- nope\.png/);
    expect(msg).toMatch(/Tracks:\n\s+- gone\.mp3/);
    expect(msg).not.toContain('a.mp3');
    expect(msg).toContain('needs its tracks AND its cover image');
  });

  it('reports a file shared by several albums (singles reusing album files) only once', async () => {
    await write({
      albums: [
        album({ tracks: [{ file: 'a.mp3', title: 'A' }, { file: 'gone.mp3', title: 'G' }] }),
        album({ title: 'Single', type: 'SINGLE', tracks: [{ file: 'gone.mp3', title: 'G' }] }),
      ],
    });
    const msg = await failure();
    expect(msg.match(/gone\.mp3/g)).toHaveLength(1);
    expect(msg).toContain('is missing 1 file(s)');
  });
});

describe('manifest file', () => {
  it('explains how to create a missing manifest from the template', async () => {
    const err = await loadManifest(path.join(tmp, 'manifest.json'), mediaDir).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SeedMediaError);
    const msg = (err as Error).message;
    expect(msg).toMatch(/^no seed manifest at /);
    expect(msg).toContain('manifest.example.json');
    expect(msg).toContain('cp ');
    expect(msg).toContain('npm run db:seed:empty');
  });

  it('the committed template is a valid manifest with placeholders only', async () => {
    const example = path.resolve(import.meta.dirname, '../../fixtures/manifest.example.json');
    const parsed = ManifestSchema.safeParse(JSON.parse(await fs.readFile(example, 'utf8')));
    expect(parsed.success).toBe(true);
    for (const a of parsed.data!.albums) {
      expect(a.dir).toMatch(/^<.+>$/);
      for (const t of a.tracks) expect(t.file).toMatch(/^<.+>\.\w+$/);
    }
  });
});

describe('requiredFolders', () => {
  it('merges albums that share a folder, de-duplicating files', () => {
    const folders = requiredFolders({
      albums: [
        { dir: 'X', cover: 'c.png', tracks: [{ file: '1.mp3' }, { file: '2.mp3' }] },
        { dir: 'X', cover: 'c.png', tracks: [{ file: '2.mp3' }] },
      ],
    });
    expect(folders).toEqual([{ dir: 'X', covers: ['c.png'], tracks: ['1.mp3', '2.mp3'] }]);
  });
});
