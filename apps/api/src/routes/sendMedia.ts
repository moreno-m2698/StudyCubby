import type { Response } from 'express';
import type { MediaFile, Role } from '../generated/prisma/client.ts';
import { HttpError } from '../errors.ts';
import type { StorageDriver } from '../storage/StorageDriver.ts';
import { isCatalogRole } from '../services/visibility.ts';

/** Stream a stored media file with Range/ETag support (via res.sendFile). */
export function sendMedia(res: Response, storage: StorageDriver, media: MediaFile, ownerRole: Role): Promise<void> {
  const abs = storage.localPath(media.storageKey);
  if (abs == null) {
    return Promise.reject(new HttpError('INTERNAL', 'Storage driver cannot serve files locally'));
  }
  res.type(media.mimeType);
  res.setHeader(
    'Cache-Control',
    isCatalogRole(ownerRole) ? 'public, max-age=86400' : 'private, max-age=0, must-revalidate',
  );
  return new Promise((resolve, reject) => {
    res.sendFile(abs, { cacheControl: false, acceptRanges: true }, (err) => {
      if (!err) return resolve();
      const e = err as NodeJS.ErrnoException;
      if (res.headersSent) return resolve(); // client aborted mid-stream
      reject(e.code === 'ENOENT' ? HttpError.notFound('Media file missing') : e);
    });
  });
}
