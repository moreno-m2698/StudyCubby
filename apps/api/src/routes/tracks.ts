import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../app.ts';
import { getVisibleTrackAudioOr404, getVisibleTrackOr404, listTracks } from '../services/tracks.ts';
import { idParams, idSchema, scopeSchema } from './params.ts';
import { sendMedia } from './sendMedia.ts';

const listQuery = z.object({ albumId: idSchema.optional(), scope: scopeSchema });

export function tracksRouter({ prisma, storage }: AppDeps): Router {
  const r = Router();

  r.get('/tracks', async (req, res) => {
    const q = listQuery.parse(req.query);
    res.json({ items: await listTracks(prisma, req.user, { scope: q.scope, albumId: q.albumId }) });
  });

  r.get('/tracks/:id', async (req, res) => {
    const { id } = idParams.parse(req.params);
    res.json(await getVisibleTrackOr404(prisma, req.user, id));
  });

  r.get('/tracks/:id/audio', async (req, res) => {
    const { id } = idParams.parse(req.params);
    const { audio, ownerRole } = await getVisibleTrackAudioOr404(prisma, req.user, id);
    await sendMedia(res, storage, audio, ownerRole);
  });

  return r;
}
