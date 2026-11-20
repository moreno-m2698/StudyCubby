import fs from 'node:fs/promises';
import path from 'node:path';
import { API_ROOT } from '../config.ts';

/**
 * Checks that the seed media named in fixtures/manifest.json is on disk, and explains what to do
 * when it isn't. The media folder is gitignored, so after a fresh clone it is simply absent.
 */

export class SeedMediaError extends Error {
  override name = 'SeedMediaError';
}

/** What one album folder must contain. Several manifest albums can share a folder (singles reuse album files). */
export interface RequiredFolder {
  dir: string;
  covers: string[];
  tracks: string[];
}

interface ManifestLike {
  albums: { dir: string; cover?: string | undefined; tracks: { file: string }[] }[];
}

const REPO_ROOT = path.resolve(API_ROOT, '..', '..');
const DEFAULT_MEDIA_DIR = path.join(API_ROOT, 'fixtures', 'media');
const FOOTER_NEEDS_BOTH = 'Each album folder needs its tracks AND its cover image.';
const FOOTER_NAMES = 'File names must match fixtures/manifest.json exactly.';
const MAX_FOUND_ENTRIES = 10;

/** Group the manifest's files by album folder, de-duplicated, in manifest order. */
export function requiredFolders(manifest: ManifestLike): RequiredFolder[] {
  const byDir = new Map<string, RequiredFolder>();
  for (const album of manifest.albums) {
    let folder = byDir.get(album.dir);
    if (!folder) {
      folder = { dir: album.dir, covers: [], tracks: [] };
      byDir.set(album.dir, folder);
    }
    if (album.cover && !folder.covers.includes(album.cover)) folder.covers.push(album.cover);
    for (const t of album.tracks) if (!folder.tracks.includes(t.file)) folder.tracks.push(t.file);
  }
  return [...byDir.values()];
}

/** Throws a SeedMediaError describing exactly what is missing; resolves if everything is present. */
export async function checkSeedMedia(manifest: ManifestLike, mediaDir: string): Promise<void> {
  const folders = requiredFolders(manifest);
  if (folders.length === 0) return;

  const entries = await listVisibleEntries(mediaDir);
  if (entries === null || entries.length === 0) {
    throw new SeedMediaError(withOverrideNote(emptyMediaDirMessage(folders, mediaDir), mediaDir));
  }

  const missingFolders: RequiredFolder[] = [];
  const missingFiles: { folder: RequiredFolder; covers: string[]; tracks: string[] }[] = [];
  for (const folder of folders) {
    const folderPath = path.join(mediaDir, folder.dir);
    if (!(await isDirectory(folderPath))) {
      missingFolders.push(folder);
      continue;
    }
    const covers = await missing(folderPath, folder.covers);
    const tracks = await missing(folderPath, folder.tracks);
    if (covers.length + tracks.length > 0) missingFiles.push({ folder, covers, tracks });
  }
  if (missingFolders.length === 0 && missingFiles.length === 0) return;

  const blocks: string[] = [];
  const media = display(mediaDir);
  for (const folder of missingFolders) {
    blocks.push(
      [`album folder "${folder.dir}" not found in ${media}.`, '', '  Expected:', ...tree([folder], mediaDir, false, '    ')].join(
        '\n',
      ),
    );
  }
  if (missingFolders.length > 0) {
    blocks.push(
      [`  Found in ${media}: ${formatEntries(entries)}`, '  The folder name must match "dir" in fixtures/manifest.json exactly.'].join(
        '\n',
      ),
    );
  }
  for (const { folder, covers, tracks } of missingFiles) {
    const lines = [
      `"${folder.dir}" is missing ${covers.length + tracks.length} file(s) in ${display(path.join(mediaDir, folder.dir))}:`,
      '',
    ];
    if (covers.length) lines.push('  Cover image:', ...covers.map((c) => `    - ${c}`));
    if (tracks.length) lines.push('  Tracks:', ...tracks.map((t) => `    - ${t}`));
    lines.push('', `  ${FOOTER_NEEDS_BOTH}`, `  ${FOOTER_NAMES}`);
    blocks.push(lines.join('\n'));
  }
  throw new SeedMediaError(withOverrideNote(blocks.join('\n\n'), mediaDir));
}

function emptyMediaDirMessage(folders: RequiredFolder[], mediaDir: string): string {
  const isDefault = path.resolve(mediaDir) === path.resolve(DEFAULT_MEDIA_DIR);
  const intro = isDefault
    ? `  ${display(mediaDir)} is gitignored, so your music isn't in the repo.`
    : `  ${display(mediaDir)} is missing or empty.`;
  const copy = folders.length === 1 ? 'Copy your album folder back into it:' : 'Copy your album folders back into it:';
  return [
    'no seed media found.',
    '',
    intro,
    `  ${copy}`,
    '',
    ...tree(folders, mediaDir, true, '    '),
    '',
    `  ${FOOTER_NEEDS_BOTH}`,
    '  To seed without media, run: npm run db:seed:empty',
  ].join('\n');
}

/** An ASCII tree of the expected layout. `annotate` adds the "←" hints to the first folder. */
function tree(folders: RequiredFolder[], mediaDir: string, annotate: boolean, indent: string): string[] {
  const NOTE_COL = 42;
  const note = (text: string, hint: string | false) => (hint ? `${text.padEnd(NOTE_COL)}← ${hint}` : text);
  const lines = [`${indent}${display(mediaDir)}`];
  folders.forEach((folder, i) => {
    const lastFolder = i === folders.length - 1;
    const first = annotate && i === 0;
    lines.push(note(`${indent}${lastFolder ? '└──' : '├──'} ${folder.dir}/`, first && 'one folder per album'));
    const childIndent = `${indent}${lastFolder ? '    ' : '│   '}`;
    const children: [string, string | false][] = [
      ...folder.covers.map((c): [string, string | false] => [c, first && "the album's cover image"]),
      [`${trackSummary(folder.tracks)}${first ? ', named as listed in fixtures/manifest.json' : ''}`, false],
    ];
    children.forEach(([text, hint], j) => {
      const branch = j === children.length - 1 ? '└──' : '├──';
      lines.push(note(`${childIndent}${branch} ${text}`, hint));
    });
  });
  return lines;
}

function trackSummary(tracks: string[]): string {
  const exts = [...new Set(tracks.map((t) => path.extname(t).toLowerCase()).filter(Boolean))];
  const noun = tracks.length === 1 ? 'track' : 'tracks';
  return `${tracks.length} ${noun}${exts.length ? ` (${exts.join(', ')})` : ''}`;
}

function withOverrideNote(message: string, mediaDir: string): string {
  if (path.resolve(mediaDir) === path.resolve(DEFAULT_MEDIA_DIR)) return message;
  return `${message}\n\n  (SEED_MEDIA_DIR is set to ${display(mediaDir)})`;
}

/** Repo-relative with forward slashes and a trailing slash for paths inside the repo; absolute otherwise. */
export function displayPath(p: string): string {
  return display(p);
}

function display(p: string): string {
  const rel = path.relative(REPO_ROOT, p);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return `${rel.split(path.sep).join('/')}/`;
  return p;
}

/** Visible entries in a directory (dotfiles like .gitkeep/.DS_Store ignored), dirs suffixed with "/". null if it doesn't exist. */
async function listVisibleEntries(dir: string): Promise<string[] | null> {
  try {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    return dirents
      .filter((d) => !d.name.startsWith('.'))
      .map((d) => (d.isDirectory() ? `${d.name}/` : d.name))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return null;
  }
}

function formatEntries(entries: string[]): string {
  const shown = entries.slice(0, MAX_FOUND_ENTRIES).join(', ');
  const extra = entries.length - MAX_FOUND_ENTRIES;
  return extra > 0 ? `${shown}, … and ${extra} more` : shown;
}

async function isDirectory(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function missing(folderPath: string, files: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const f of files) {
    try {
      if (!(await fs.stat(path.join(folderPath, f))).isFile()) out.push(f);
    } catch {
      out.push(f);
    }
  }
  return out;
}
