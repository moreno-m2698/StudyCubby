import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { AppDeps } from '../app.ts';
import { requireUser } from '../auth/devAuth.ts';
import { HttpError } from '../errors.ts';
import type { MediaFile } from '../generated/prisma/client.ts';
import { ingestMedia, MAX_AUDIO_BYTES, MAX_IMAGE_BYTES } from '../media/ingest.ts';
import {
  appendTracks,
  createAlbum,
  getAlbumDetail,
  getOwnedAlbumOr404,
  getVisibleAlbumWithCoverOr404,
  listAlbums,
  setCover,
  type NewTrack,
} from '../services/albums.ts';
import { idParams, scopeSchema } from './params.ts';
import { sendMedia } from './sendMedia.ts';

const albumType = z.enum(['ALBUM', 'SINGLE', 'EP']);
const listQuery = z.object({ scope: scopeSchema, type: albumType.optional() });
const createBody = z.object({
  title: z.string().trim().min(1, 'required').max(300),
  artist: z.string().trim().min(1, 'required').max(300),
  type: albumType.default('ALBUM'),
});

type UploadedFiles = Record<string, Express.Multer.File[]>;

function filesOf(req: Request): UploadedFiles {
  return (req.files ?? {}) as UploadedFiles;
}

/** `titles` arrives as a string (one value) or string[] (repeated field). */
function normalizeTitles(body: Record<string, unknown> | undefined): string[] {
  const raw = body?.['titles'] ?? body?.['titles[]'];
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((t) => (typeof t === 'string' ? t.trim() : ''));
}

function fallbackTitle(originalName: string): string {
  const base = path.basename(originalName);
  const ext = path.extname(base);
  return (ext ? base.slice(0, -ext.length) : base) || 'Untitled';
}

async function removeTempFiles(req: Request): Promise<void> {
  const all = Object.values(filesOf(req)).flat();
  await Promise.all(all.map((f) => fs.rm(f.path, { force: true }).catch(() => {})));
}

export function albumsRouter({ prisma, storage }: AppDeps): Router {
  const r = Router();

  const tmpDir = path.join(os.tmpdir(), 'studycubby-uploads');
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        fs.mkdir(tmpDir, { recursive: true }).then(
          () => cb(null, tmpDir),
          (e) => cb(e as Error, tmpDir),
        );
      },
    }),
    limits: { fileSize: MAX_AUDIO_BYTES },
  }).fields([
    { name: 'cover', maxCount: 1 },
    { name: 'tracks', maxCount: 100 },
  ]);

  /** Runs multer; temp files are removed once the response finishes, on success and on every error path. */
  const parseUpload = (req: Request, res: Response, next: NextFunction) => {
    res.once('close', () => void removeTempFiles(req));
    upload(req, res, next);
  };

  async function ingestCover(req: Request): Promise<MediaFile | null> {
    const file = filesOf(req)['cover']?.[0];
    if (!file) return null;
    if (file.size > MAX_IMAGE_BYTES) throw HttpError.tooLarge('Cover image exceeds 10 MB');
    return ingestMedia({ prisma, storage }, { filePath: file.path, kind: 'IMAGE' });
  }

  async function ingestTracks(req: Request): Promise<NewTrack[]> {
    const files = filesOf(req)['tracks'] ?? [];
    const titles = normalizeTitles(req.body as Record<string, unknown> | undefined);
    const out: NewTrack[] = [];
    for (const [i, f] of files.entries()) {
      const audio = await ingestMedia({ prisma, storage }, { filePath: f.path, kind: 'AUDIO' });
      out.push({ title: titles[i] || fallbackTitle(f.originalname), audio });
    }
    return out;
  }

  r.get('/albums', async (req, res) => {
    const q = listQuery.parse(req.query);
    res.json({ items: await listAlbums(prisma, req.user, { scope: q.scope, type: q.type }) });
  });

  r.get('/albums/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    res.json(await getAlbumDetail(prisma, req.user, id));
  });

  r.get('/albums/:id/cover', async (req, res) => {
    const { id } = idParams.parse(req.params);
    const album = await getVisibleAlbumWithCoverOr404(prisma, req.user, id);
    if (!album.cover) throw HttpError.notFound('Album has no cover');
    await sendMedia(res, storage, album.cover, album.owner.role);
  });

  r.post(
    '/albums',
    (req, _res, next) => {
      requireUser(req);
      next();
    },
    parseUpload,
    async (req, res) => {
      const user = requireUser(req);
      const body = createBody.parse(req.body ?? {});
      const nTracks = filesOf(req)['tracks']?.length ?? 0;
      if (body.type === 'SINGLE' && nTracks !== 1) throw HttpError.badRequest('A SINGLE must have exactly one track');
      // Media is ingested outside any DB transaction; rows are created in one transaction afterwards.
      const cover = await ingestCover(req);
      const tracks = await ingestTracks(req);
      res.status(201).json(await createAlbum(prisma, user, { ...body, cover, tracks }));
    },
  );

  r.post(
    '/albums/:id/tracks',
    async (req, _res, next) => {
      const user = requireUser(req);
      const { id } = idParams.parse(req.params);
      const album = await getOwnedAlbumOr404(prisma, user, id);
      if (album.type === 'SINGLE') throw HttpError.badRequest('Cannot add tracks to a SINGLE');
      next();
    },
    parseUpload,
    async (req, res) => {
      const user = requireUser(req);
      const { id } = idParams.parse(req.params);
      if (!filesOf(req)['tracks']?.length) throw HttpError.badRequest('At least one track file is required');
      const tracks = await ingestTracks(req);
      res.status(201).json({ items: await appendTracks(prisma, user, id, tracks) });
    },
  );

  r.put(
    '/albums/:id/cover',
    async (req, _res, next) => {
      const user = requireUser(req);
      const { id } = idParams.parse(req.params);
      await getOwnedAlbumOr404(prisma, user, id);
      next();
    },
    parseUpload,
    async (req, res) => {
      const user = requireUser(req);
      const { id } = idParams.parse(req.params);
      const cover = await ingestCover(req);
      if (!cover) throw HttpError.badRequest('cover file is required');
      res.json(await setCover(prisma, user, id, cover));
    },
  );

  return r;
}
