import axios from "axios";
import { Track } from "../types";
import { getAlbumImage } from "./AlbumAPICalls";

  const singleEndpoint = process.env.SINGLE_ENDPOINT;
  const trackEndpoint = process.env.TRACK_ENDPOINT;

  export const getTrackAudio = async (trackID: number) => {
    try {
      const audioResponse = await axios.get(`${trackEndpoint}/play/${trackID}`, { responseType: "blob" });
      let audioBlob = new Blob([audioResponse.data], { type: "audio/mpeg" });
      const audioURL = URL.createObjectURL(audioBlob);
      return audioURL;
    } catch (error) {
      console.log(error);
      return null;
    }
  };


  const getSingleImage = async (singleID: number) => {
    try {
      const imageResponse = await axios.get(`${singleEndpoint}/image/${singleID}`, { responseType: "blob" });
      let imageBlob = new Blob([imageResponse.data], { type: "image/png" });
      const imageURL = URL.createObjectURL(imageBlob);
      return imageURL;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  const getSingleAudio = async (singleId: number) => {
    try {
      const audioResponse = await axios.get(`${singleEndpoint}/play/${singleId}`, { responseType: "blob" });
      let audioBlob = new Blob([audioResponse.data], { type: "audio/mpeg" });
      const audioURL = URL.createObjectURL(audioBlob);
      return audioURL;
    } catch (error) {
      console.log(error);
      return null;
    }
    
  }

const getSingle = async () => {
  try {
    const singleResponse = await axios.get(singleEndpoint);
    
    for (let i = 0; i < singleResponse.data.length; i++) {
      const single = singleResponse.data[i]

      single.image = await getSingleImage(single.id)
      single.audio = await getSingleAudio(single.id)

    }

    return singleResponse.data

  } catch (error) {
    console.error("There was an issue access singles", error);
    return []
  }
}
  interface getTracksResponse {
    errorState: boolean
    tracks: Track[]
    }



export const getTracks = async () => {
    try {
        const trackResponse = await axios.get(trackEndpoint)

        for (let i=0; i < trackResponse.data.length; i++) {

            const track = trackResponse.data[i];
            track.image = await getAlbumImage(track.albumId);
            track.audio = await getTrackAudio(track.id);
        }

        const singleResponse = await getSingle();

        
        const result: getTracksResponse = {
            errorState: false,
            tracks: [...trackResponse.data, ...singleResponse]
        }
        return result;
    } catch (error) {
        console.log(error); 
        const result: getTracksResponse = {
            errorState: true,
            tracks: []
        }
      return result;
    }
}

