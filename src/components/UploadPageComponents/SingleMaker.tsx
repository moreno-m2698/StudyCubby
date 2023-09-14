import { useState } from 'react';
import axios from 'axios';

const singleEndpoint = process.env.SINGLE_ENDPOINT;

function SingleMaker() {

    const [imageFile, setImageFile] = useState<File|null>(null);
    const [trackFile, setTrackFile] = useState<File|null>(null);
    const [title, setTitle] = useState<string>('');
    const [artist, setArtist] = useState<string>('');

    const handleUpload = async (event: any) => {
        event.preventDefault();
        if (!imageFile || !trackFile) return    
          const imageFormData = new FormData();
          const audioFormData = new FormData();

          audioFormData.append('title', title)
          audioFormData.append('artist', artist)
          audioFormData.append('track', trackFile)
          

          imageFormData.append('cover', imageFile)

          const audioUrl = `${singleEndpoint}/upload/track`
          const imageUrl = `${singleEndpoint}/upload/image`
          
      
          try {
          const audioResult: any = await axios.post(audioUrl, audioFormData);
          imageFormData.append('id',audioResult.data.id)
          const imageResult: any = await axios.patch(imageUrl, imageFormData);
          console.log("audio", audioResult);
          console.log("image", imageResult);
          } catch (error) {

            console.log("Something went wrong", error )

          };

        }
    

    const coverFileInputChange = async (event:any) => {
      const file = event.target.files[0]
      setImageFile(file);
    }
    const trackFileInputChange = async (event:any) => {
        const file = event.target.files[0]
        setTrackFile(file);
    }



  return (
    <>
        <h3 className='upload__mode'>
          Single Upload
        </h3>
        <form encType='multipart/form-data' onSubmit={handleUpload}>
            <label htmlFor="cover-file">Cover Upload</label>
            <input type='file' id='cover-file' accept='image/*' name='cover' onChange={(event: any) => coverFileInputChange(event)}/>
            <br/>
            <label htmlFor="track-file">Track Upload</label>
            <input type='file' id='track-file' accept='audio/*' name='track' onChange={(event: any) => trackFileInputChange(event)}/>
            <br/>
            <input type='text' placeholder='Title' onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}/>
            <input type='text' placeholder='Artist' onChange={(event: React.ChangeEvent<HTMLInputElement>) => setArtist(event.target.value)}/>
            <input type='submit' />
        </form>
    </>
  )
}

export default SingleMaker