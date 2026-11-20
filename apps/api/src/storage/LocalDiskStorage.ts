import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import type { StorageDriver } from './StorageDriver.ts';

/** StorageDriver backed by a directory on local disk (config.storageDir). */
export class LocalDiskStorage implements StorageDriver {
  readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
  }

  async put(key: string, srcPath: string): Promise<void> {
    const dest = this.resolveKey(key);
    if (await this.exists(key)) return;
    await mkdir(path.dirname(dest), { recursive: true });
    // Copy to a temp name in the same directory, then rename, so a crash never leaves a partial object.
    const tmp = `${dest}.${randomUUID()}.tmp`;
    try {
      await copyFile(srcPath, tmp, constants.COPYFILE_EXCL);
      await rename(tmp, dest);
    } catch (err) {
      await rm(tmp, { force: true });
      throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await stat(this.resolveKey(key))).isFile();
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw err;
    }
  }

  localPath(key: string): string | null {
    return this.resolveKey(key);
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  async clear(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    for (const entry of await readdir(this.rootDir)) {
      await rm(path.join(this.rootDir, entry), { recursive: true, force: true });
    }
  }

  /** Validate a key and map it to an absolute path inside rootDir. Throws on unsafe keys. */
  private resolveKey(key: string): string {
    const bad =
      !key ||
      key.includes('\0') ||
      key.includes('\\') ||
      path.isAbsolute(key) ||
      /^[a-zA-Z]:/.test(key) ||
      key.split('/').some((seg) => seg === '..' || seg === '.' || seg === '');
    if (bad) throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
    const resolved = path.resolve(this.rootDir, key);
    const rel = path.relative(this.rootDir, resolved);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Storage key escapes root: ${JSON.stringify(key)}`);
    }
    return resolved;
  }
}
