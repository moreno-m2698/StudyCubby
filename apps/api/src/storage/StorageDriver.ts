/**
 * Where media bytes live. The database only stores the key (see MediaFile.storageKey).
 * Keys are POSIX-style relative paths such as `audio/<sha256>.mp3` or `images/<sha256>.png`.
 * Local disk is the only driver today; an S3 driver can implement the same interface later.
 */
export interface StorageDriver {
  /**
   * Copy the local file at `srcPath` into storage under `key`.
   * Idempotent: if `key` already exists the call is a no-op (keys are content-addressed).
   * Must not delete or move `srcPath`; the caller owns temp-file cleanup.
   */
  put(key: string, srcPath: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /**
   * Absolute filesystem path for `key`, used with `res.sendFile` (which handles Range/ETag).
   * Returns null for drivers that are not backed by the local filesystem.
   * Must reject keys that would escape the storage root (e.g. containing `..`).
   */
  localPath(key: string): string | null;
  /** Delete one object. No-op if it does not exist. */
  delete(key: string): Promise<void>;
  /** Delete every object. Only used by seeding and tests. */
  clear(): Promise<void>;
}
