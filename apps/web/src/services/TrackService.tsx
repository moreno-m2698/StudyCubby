import axios from "axios";
import { Track } from "../types";
import { getAlbumImage } from "./AlbumService";
import { getSingle } from "./SingleService";

interface getTracksResponse {
    isEmpty: boolean
    tracks: Track[]
}
  
const trackEndpoint = process.env.VITE_TRACK_ENDPOINT;

export async function getTrackAudio(trackID: number) {
    try {
        const audioResponse = await axios.get(`${trackEndpoint}/play/${trackID}`, { responseType: "blob" });
        let audioBlob = new Blob([audioResponse.data], { type: "audio/mpeg" });
        const audioURL = URL.createObjectURL(audioBlob);
        return audioURL;
    } catch (error) {
        console.log(`There was an error grabbing the art for this track: ${trackID}`, error);
    }
};

export async function getTracks() {
    try {
      if (trackEndpoint !== undefined) {
        const trackResponse = await axios.get(trackEndpoint)
        for (let i=0; i < trackResponse.data.length; i++) {
  
            const track = trackResponse.data[i];
            track.image = await getAlbumImage(track.albumId);
            track.audio = await getTrackAudio(track.id);
        }
        const singleResponse = await getSingle();
        const all_tracks = [...trackResponse.data, ...singleResponse]
        const result: getTracksResponse = {
          isEmpty: (all_tracks.length === 0),
          tracks: all_tracks
        }
        return result;
      }
    } catch (error) {
      console.log("There was an error accessing tracks", error); 
    }
  }
