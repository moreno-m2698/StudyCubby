import type { Prisma, PrismaClient } from '../generated/prisma/client.ts';
import { HttpError } from '../errors.ts';
import type { AuthUser } from '../types/express.d.ts';
import { toTrackDto, trackInclude, type TrackDto } from './dto.ts';
import { albumScopeWhere, albumVisibleTo, type Scope } from './visibility.ts';

export async function listTracks(
  prisma: PrismaClient,
  viewer: AuthUser | null,
  opts: { scope: Scope; albumId?: number | undefined },
): Promise<TrackDto[]> {
  const album: Prisma.AlbumWhereInput = {
    AND: [albumScopeWhere(viewer, opts.scope), opts.albumId != null ? { id: opts.albumId } : {}],
  };
  const rows = await prisma.track.findMany({
    where: { album },
    include: trackInclude,
    orderBy: [{ album: { createdAt: 'desc' } }, { albumId: 'desc' }, { trackNumber: 'asc' }],
  });
  return rows.map(toTrackDto);
}

export async function getVisibleTrackOr404(prisma: PrismaClient, viewer: AuthUser | null, id: number): Promise<TrackDto> {
  const track = await prisma.track.findFirst({
    where: { id, album: albumVisibleTo(viewer) },
    include: trackInclude,
  });
  if (!track) throw HttpError.notFound('Track not found');
  return toTrackDto(track);
}

/** Visible track with its audio MediaFile and its album owner's role, for streaming. */
export async function getVisibleTrackAudioOr404(prisma: PrismaClient, viewer: AuthUser | null, id: number) {
  const track = await prisma.track.findFirst({
    where: { id, album: albumVisibleTo(viewer) },
    include: { audio: true, album: { select: { owner: { select: { role: true } } } } },
  });
  if (!track) throw HttpError.notFound('Track not found');
  return { audio: track.audio, ownerRole: track.album.owner.role };
}
