import { Track } from "../types";
import { api, mediaUrl, TrackDto } from "./api";

interface getTracksResponse {
    isEmpty: boolean
    tracks: Track[]
}

export function toTrack(dto: TrackDto, imageOverride?: string): Track {
    return {
        id: dto.id,
        title: dto.title,
        artist: dto.artist,
        albumId: dto.albumId,
        index: dto.trackNumber - 1,
        image: imageOverride ?? (dto.coverUrl ? mediaUrl(dto.coverUrl) : undefined),
        audio: mediaUrl(dto.audioUrl),
    };
}

// Audio is streamed directly by the <audio> element; no blob download needed.
export function getTrackAudio(trackID: number): Promise<string> {
    return Promise.resolve(mediaUrl(`/tracks/${trackID}/audio`));
}

// All visible tracks, singles included (the API returns them in one list).
export async function getTracks() {
    try {
        const response = await api.get<{ items: TrackDto[] }>("/tracks");
        const tracks = response.data.items.map((dto) => toTrack(dto));
        const result: getTracksResponse = {
            isEmpty: tracks.length === 0,
            tracks,
        };
        return result;
    } catch (error) {
        console.log("There was an error accessing tracks", error);
    }
}
