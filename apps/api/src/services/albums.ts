import type { AlbumType, MediaFile, Prisma, PrismaClient } from '../generated/prisma/client.ts';
import { HttpError } from '../errors.ts';
import type { AuthUser } from '../types/express.d.ts';
import {
  albumSummaryInclude,
  toAlbumSummary,
  toTrackDto,
  trackInclude,
  type AlbumDetail,
  type AlbumForSummary,
  type AlbumSummary,
  type TrackDto,
} from './dto.ts';
import { albumScopeWhere, albumVisibleTo, type Scope } from './visibility.ts';

export interface NewTrack {
  title: string;
  audio: MediaFile;
}

export async function listAlbums(
  prisma: PrismaClient,
  viewer: AuthUser | null,
  opts: { scope: Scope; type?: AlbumType | undefined },
): Promise<AlbumSummary[]> {
  const where: Prisma.AlbumWhereInput = {
    AND: [albumScopeWhere(viewer, opts.scope), opts.type ? { type: opts.type } : {}],
  };
  const rows = await prisma.album.findMany({
    where,
    include: albumSummaryInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  return rows.map((a) => toAlbumSummary(a, viewer));
}

/** The album if the viewer may see it, else 404 (never 403 for invisible albums). */
export async function getVisibleAlbumOr404(
  prisma: PrismaClient,
  viewer: AuthUser | null,
  id: number,
): Promise<AlbumForSummary> {
  const album = await prisma.album.findFirst({
    where: { AND: [{ id }, albumVisibleTo(viewer)] },
    include: albumSummaryInclude,
  });
  if (!album) throw HttpError.notFound('Album not found');
  return album;
}

/** Visible album plus its cover MediaFile, for streaming. */
export async function getVisibleAlbumWithCoverOr404(prisma: PrismaClient, viewer: AuthUser | null, id: number) {
  const album = await prisma.album.findFirst({
    where: { AND: [{ id }, albumVisibleTo(viewer)] },
    include: { ...albumSummaryInclude, cover: true },
  });
  if (!album) throw HttpError.notFound('Album not found');
  return album;
}

/** Visible but not owned -> 403; not visible -> 404. */
export async function getOwnedAlbumOr404(prisma: PrismaClient, user: AuthUser, id: number): Promise<AlbumForSummary> {
  const album = await getVisibleAlbumOr404(prisma, user, id);
  if (album.owner.id !== user.id) throw HttpError.forbidden('You do not own this album');
  return album;
}

export async function getAlbumDetail(prisma: PrismaClient, viewer: AuthUser | null, id: number): Promise<AlbumDetail> {
  const album = await prisma.album.findFirst({
    where: { AND: [{ id }, albumVisibleTo(viewer)] },
    include: { ...albumSummaryInclude, tracks: { include: trackInclude, orderBy: { trackNumber: 'asc' } } },
  });
  if (!album) throw HttpError.notFound('Album not found');
  return { ...toAlbumSummary(album, viewer), tracks: album.tracks.map(toTrackDto) };
}

export async function createAlbum(
  prisma: PrismaClient,
  user: AuthUser,
  input: { title: string; artist: string; type: AlbumType; cover: MediaFile | null; tracks: NewTrack[] },
): Promise<AlbumDetail> {
  if (input.type === 'SINGLE' && input.tracks.length !== 1) {
    throw HttpError.badRequest('A SINGLE must have exactly one track');
  }
  const id = await prisma.$transaction(async (tx) => {
    const album = await tx.album.create({
      data: {
        title: input.title,
        artist: input.artist,
        type: input.type,
        ownerId: user.id,
        coverId: input.cover?.id ?? null,
        tracks: {
          create: input.tracks.map((t, i) => ({
            title: t.title,
            artist: input.artist,
            trackNumber: i + 1,
            audioId: t.audio.id,
            durationMs: t.audio.durationMs,
          })),
        },
      },
      select: { id: true },
    });
    return album.id;
  });
  return getAlbumDetail(prisma, user, id);
}

/** Append tracks after the current last track. Ownership and the SINGLE rule are re-checked in the transaction. */
export async function appendTracks(
  prisma: PrismaClient,
  user: AuthUser,
  albumId: number,
  tracks: NewTrack[],
): Promise<TrackDto[]> {
  const ids = await prisma.$transaction(async (tx) => {
    const album = await tx.album.findFirst({
      where: { AND: [{ id: albumId }, albumVisibleTo(user)] },
      select: { id: true, ownerId: true, type: true, artist: true },
    });
    if (!album) throw HttpError.notFound('Album not found');
    if (album.ownerId !== user.id) throw HttpError.forbidden('You do not own this album');
    if (album.type === 'SINGLE') throw HttpError.badRequest('Cannot add tracks to a SINGLE');

    const max = await tx.track.aggregate({ where: { albumId }, _max: { trackNumber: true } });
    let n = max._max.trackNumber ?? 0;
    const created: number[] = [];
    for (const t of tracks) {
      const row = await tx.track.create({
        data: {
          title: t.title,
          artist: album.artist,
          trackNumber: ++n,
          albumId,
          audioId: t.audio.id,
          durationMs: t.audio.durationMs,
        },
        select: { id: true },
      });
      created.push(row.id);
    }
    return created;
  });
  const rows = await prisma.track.findMany({
    where: { id: { in: ids } },
    include: trackInclude,
    orderBy: { trackNumber: 'asc' },
  });
  return rows.map(toTrackDto);
}

export async function setCover(
  prisma: PrismaClient,
  user: AuthUser,
  albumId: number,
  cover: MediaFile,
): Promise<AlbumSummary> {
  await getOwnedAlbumOr404(prisma, user, albumId);
  const album = await prisma.album.update({
    where: { id: albumId },
    data: { coverId: cover.id },
    include: albumSummaryInclude,
  });
  return toAlbumSummary(album, user);
}
