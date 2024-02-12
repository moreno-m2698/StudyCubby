import axios from "axios";


const singleEndpoint = process.env.VITE_SINGLE_ENDPOINT;


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

export async function getSingle() {
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

