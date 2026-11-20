import { readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalDiskStorage } from '../../src/storage/LocalDiskStorage.ts';
import { makeTempDir, writeTextFile } from '../helpers/fixtures.ts';

describe('LocalDiskStorage', () => {
  let tmp: string;
  let storage: LocalDiskStorage;
  let src: string;

  beforeEach(async () => {
    tmp = await makeTempDir('sc-storage-');
    storage = new LocalDiskStorage(path.join(tmp, 'root'));
    src = await writeTextFile(path.join(tmp, 'src.txt'), 'hello');
  });
  afterEach(() => rm(tmp, { recursive: true, force: true }));

  it('puts a copy, keeping the source', async () => {
    expect(await storage.exists('audio/a.mp3')).toBe(false);
    await storage.put('audio/a.mp3', src);
    expect(await storage.exists('audio/a.mp3')).toBe(true);
    expect(await readFile(storage.localPath('audio/a.mp3')!, 'utf8')).toBe('hello');
    expect((await stat(src)).isFile()).toBe(true);
  });

  it('is idempotent and leaves no temp files', async () => {
    await storage.put('audio/a.mp3', src);
    const other = await writeTextFile(path.join(tmp, 'other.txt'), 'different');
    await storage.put('audio/a.mp3', other);
    expect(await readFile(storage.localPath('audio/a.mp3')!, 'utf8')).toBe('hello');
    expect(await readdir(path.join(storage.rootDir, 'audio'))).toEqual(['a.mp3']);
  });

  it('localPath is absolute and inside the root', () => {
    const p = storage.localPath('images/x.png')!;
    expect(path.isAbsolute(p)).toBe(true);
    expect(p.startsWith(storage.rootDir)).toBe(true);
  });

  it.each(['../evil', 'a/../../evil', '/etc/passwd', 'a\\b', 'C:\\x', 'C:/x', '', 'a//b', './a'])(
    'rejects bad key %j',
    async (key) => {
      expect(() => storage.localPath(key)).toThrow();
      await expect(storage.put(key, src)).rejects.toThrow();
      await expect(storage.exists(key)).rejects.toThrow();
    },
  );

  it('delete removes and is a no-op when missing', async () => {
    await storage.put('audio/a.mp3', src);
    await storage.delete('audio/a.mp3');
    expect(await storage.exists('audio/a.mp3')).toBe(false);
    await expect(storage.delete('audio/a.mp3')).resolves.toBeUndefined();
  });

  it('clear empties the root but keeps it, creating it if missing', async () => {
    await storage.clear();
    expect((await stat(storage.rootDir)).isDirectory()).toBe(true);
    await storage.put('audio/a.mp3', src);
    await storage.put('images/b.png', src);
    await storage.clear();
    expect(await readdir(storage.rootDir)).toEqual([]);
  });
});
