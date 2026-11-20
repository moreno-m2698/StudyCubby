import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileTypeFromFile } from 'file-type';
import { parseFile } from 'music-metadata';
import type { MediaFile, MediaKind, PrismaClient } from '../generated/prisma/client.ts';
import { HttpError } from '../errors.ts';
import type { StorageDriver } from '../storage/StorageDriver.ts';

/** Upload size limits, also used by the multer config in routes. */
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface IngestDeps {
  prisma: PrismaClient;
  storage: StorageDriver;
}

export interface IngestInput {
  /** Path to a local file (a multer temp file, or a seed fixture). Not modified or deleted. */
  filePath: string;
  /** What the caller expects the file to be; a mismatch is a 415. */
  kind: MediaKind;
}

export interface SniffedMedia {
  /** Normalized, browser-friendly MIME type. */
  mimeType: string;
  /** Extension (no dot) used in the storage key. */
  ext: string;
}

/** Maps file-type's detected mime to the normalized stored mime + extension, per kind. */
const ALLOWED: Record<MediaKind, Record<string, SniffedMedia>> = {
  AUDIO: {
    'audio/mpeg': { mimeType: 'audio/mpeg', ext: 'mp3' },
    'audio/wav': { mimeType: 'audio/wav', ext: 'wav' },
    'audio/vnd.wave': { mimeType: 'audio/wav', ext: 'wav' },
    'audio/x-wav': { mimeType: 'audio/wav', ext: 'wav' },
    'audio/wave': { mimeType: 'audio/wav', ext: 'wav' },
    'audio/flac': { mimeType: 'audio/flac', ext: 'flac' },
    'audio/x-flac': { mimeType: 'audio/flac', ext: 'flac' },
    'audio/mp4': { mimeType: 'audio/mp4', ext: 'm4a' },
    'audio/x-m4a': { mimeType: 'audio/mp4', ext: 'm4a' },
    'audio/m4a': { mimeType: 'audio/mp4', ext: 'm4a' },
    'audio/ogg': { mimeType: 'audio/ogg', ext: 'ogg' },
    'application/ogg': { mimeType: 'audio/ogg', ext: 'ogg' },
    'audio/opus': { mimeType: 'audio/ogg', ext: 'ogg' },
  },
  IMAGE: {
    'image/png': { mimeType: 'image/png', ext: 'png' },
    'image/jpeg': { mimeType: 'image/jpeg', ext: 'jpg' },
    'image/webp': { mimeType: 'image/webp', ext: 'webp' },
  },
};

/**
 * Detect the real type of a file from its bytes and check it against the allowlist for `kind`.
 * Throws HttpError 415 when undetectable or disallowed.
 */
export async function sniffMedia(filePath: string, kind: MediaKind): Promise<SniffedMedia> {
  const detected = await fileTypeFromFile(filePath);
  const label = kind === 'AUDIO' ? 'audio (mp3, wav, flac, m4a, ogg)' : 'image (png, jpeg, webp)';
  if (!detected) {
    throw HttpError.unsupportedType(`Could not determine the file type; expected ${label}`);
  }
  const match = ALLOWED[kind][detected.mime];
  if (!match) {
    throw HttpError.unsupportedType(`Unsupported file type ${detected.mime}; expected ${label}`);
  }
  return match;
}

/** Stream-hash a file with sha256 (hex). */
export function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(filePath)
      .on('error', reject)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')));
  });
}

/** Audio duration in whole milliseconds, or null if it cannot be determined. Never throws. */
export async function readDurationMs(filePath: string): Promise<number | null> {
  try {
    const meta = await parseFile(filePath, { duration: true });
    const seconds = meta.format.duration;
    return typeof seconds === 'number' && Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
  } catch {
    return null;
  }
}

/**
 * Store a media file and return its MediaFile row. Shared by upload routes and the seed.
 *
 * 1. Stream-hash the file (sha256).
 * 2. Sniff the real type from the bytes (file-type); reject anything outside the allowlist for
 *    `kind` with HttpError.unsupportedType (415). Never trust the client-supplied mimetype.
 *    Audio: mpeg, wav, flac, mp4/m4a, ogg. Images: png, jpeg, webp.
 * 3. For AUDIO, read the duration with music-metadata (durationMs, null if unknown).
 * 4. storage.put(`audio/<sha256>.<ext>` | `images/<sha256>.<ext>`, filePath).
 * 5. Upsert MediaFile by sha256 (identical bytes => same row; tolerate a concurrent-insert race).
 */
export async function ingestMedia({ prisma, storage }: IngestDeps, { filePath, kind }: IngestInput): Promise<MediaFile> {
  const { size } = await stat(filePath);
  const max = kind === 'AUDIO' ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
  if (size > max) {
    throw HttpError.tooLarge(`File is ${size} bytes; the limit for ${kind.toLowerCase()} is ${max} bytes`);
  }

  const { mimeType, ext } = await sniffMedia(filePath, kind);
  const sha256 = await sha256File(filePath);
  const durationMs = kind === 'AUDIO' ? await readDurationMs(filePath) : null;
  const storageKey = `${kind === 'AUDIO' ? 'audio' : 'images'}/${sha256}.${ext}`;

  await storage.put(storageKey, filePath);

  const data = { kind, sha256, storageKey, mimeType, sizeBytes: size, durationMs };
  try {
    return await prisma.mediaFile.upsert({ where: { sha256 }, create: data, update: {} });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      const existing = await prisma.mediaFile.findUnique({ where: { sha256 } });
      if (existing) return existing;
    }
    throw err;
  }
}
