import axios from "axios";
import { Track } from "../types";
import { getAlbumImage } from "./AlbumAPICalls";

interface getTracksResponse {
  errorState: boolean
  isEmpty: boolean
  tracks: Track[]
}

const singleEndpoint = process.env.VITE_SINGLE_ENDPOINT;
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

async function getSingleImage(singleID:number) {
  try {
    const imageResponse = await axios.get(`${singleEndpoint}/image/${singleID}`, { responseType: "blob" });
    let imageBlob = new Blob([imageResponse.data], { type: "image/png" });
    const imageURL = URL.createObjectURL(imageBlob);
    return imageURL;
  } catch (error) {
    console.log(`There was an error grabbing the art for this single: ${singleID}`, error);
  }
};

async function getSingleAudio(singleId: number) {
  try {
    const audioResponse = await axios.get(`${singleEndpoint}/play/${singleId}`, { responseType: "blob" });
    let audioBlob = new Blob([audioResponse.data], { type: "audio/mpeg" });
    const audioURL = URL.createObjectURL(audioBlob);
    return audioURL;
  } catch (error) {
    console.log(`There was an error grabbing the audio for this single: ${singleId}`, error);
  }
};

async function getSingle() {
  try {
    if (singleEndpoint !== undefined) {
    const singleResponse = await axios.get(singleEndpoint);
    
    for (let i = 0; i < singleResponse.data.length; i++) {

      const single = singleResponse.data[i]
      single.image = await getSingleImage(single.id)
      single.audio = await getSingleAudio(single.id)

    }

    return singleResponse.data}
    } catch (error) {
      console.error("There was an issue accessing singles", error);
  }
}

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

