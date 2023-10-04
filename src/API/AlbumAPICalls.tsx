import axios from "axios";
import { Album } from "../types";
import { getTrackAudio } from "./ApiCalls";

const backendEndpoint = process.env.VITE_ALBUM_ENDPOINT;

export async function getAlbumImage(albumId: number) {
    try {
      const imageResponse = await axios.get(`${backendEndpoint}/image/${albumId}`, { responseType: "blob" });
      let imageBlob = new Blob([imageResponse.data], { type: "image/png" });
      const imageURL = URL.createObjectURL(imageBlob);
      return imageURL;
    } catch (error) {
      console.log(error);
    }
  };
  
export async function getAlbumTracks(albumId: number, trackImage: string) {
    try {
        const tracksResponse = await axios.get(`${backendEndpoint}/tracks/${albumId}`);
        for (let i=0; i < tracksResponse.data.length; i++) {
            let track = tracksResponse.data[i];
            track.audio = await getTrackAudio(track.id);
            track.image = trackImage
        }
        
        const result = tracksResponse.data;
        return result


    } catch (error) {
        console.error(`There was an error accessing the album - ${albumId} tracks`, error)
    }
}

export async function getAlbums() {
    try {
        if (backendEndpoint !== undefined){
        const albumResponse = await axios.get(backendEndpoint);

        for (let j=0; j < albumResponse.data.length; j++) {

            const album: Album = albumResponse.data[j];
            
            album.image = await getAlbumImage(album.id);
            album.queueId = 'a'+`${album.id}`

        }
    

        
        return albumResponse.data;
        }
    } catch (error) {

        console.log(error);
        return [];
    }
}
