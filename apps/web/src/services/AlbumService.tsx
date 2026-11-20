import { Album } from "../types";
import { api, mediaUrl, AlbumSummaryDto, TrackDto } from "./api";
import { toTrack } from "./TrackService";

export function getAlbumImage(albumId: number): Promise<string> {
    return Promise.resolve(mediaUrl(`/albums/${albumId}/cover`));
}

export async function getAlbumTracks(albumId: number, trackImage: string) {
    try {
        const response = await api.get<{ items: TrackDto[] }>("/tracks", { params: { albumId } });
        return response.data.items.map((dto) => toTrack(dto, trackImage));
    } catch (error) {
        console.error(`There was an error accessing the album - ${albumId} tracks`, error);
        throw (error);
    }
}

// Sidebar "Albums": full-length albums and EPs. Singles are listed with the tracks.
export async function getAlbums(): Promise<Album[]> {
    try {
        const response = await api.get<{ items: AlbumSummaryDto[] }>("/albums");
        return response.data.items
            .filter((a) => a.type !== "SINGLE")
            .map((a) => ({
                id: a.id,
                title: a.title,
                artist: a.artist,
                image: a.coverUrl ? mediaUrl(a.coverUrl) : undefined,
                queueId: `a${a.id}`,
                tracks: [],
            }));
    } catch (error) {
        console.log(error);
        throw (error);
    }
}
