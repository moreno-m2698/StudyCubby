import { useState } from 'react';
import axios from 'axios';

const singleEndpoint = process.env.VITE_SINGLE_ENDPOINT;

function SingleMaker() {

    const [imageFile, setImageFile] = useState<File|null>(null);
    const [trackFile, setTrackFile] = useState<File|null>(null);
    const [title, setTitle] = useState<string>('');
    const [artist, setArtist] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleUpload = async (event: any) => {
        event.preventDefault();
        setIsLoading(true)
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
          console.log(audioResult.data.id)
          imageFormData.append('id',audioResult.data.id)
          const imageResult: any = await axios.patch(imageUrl, imageFormData);
          console.log("audio", audioResult);
          console.log("image", imageResult);
          setIsLoading(false)
          } catch (error) {

            console.log("Something went wrong", error )
            setIsLoading(false)

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
            <input disabled= {isLoading} type='file' id='cover-file' accept='image/*' name='cover' onChange={(event: any) => coverFileInputChange(event)}/>
            <br/>
            <label htmlFor="track-file">Track Upload</label>
            <input type='file' disabled= {isLoading} id='track-file' accept='audio/*' name='track' onChange={(event: any) => trackFileInputChange(event)}/>
            <br/>
            <input type='text'disabled= {isLoading} placeholder='Title' onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}/>
            <input type='text'disabled= {isLoading} placeholder='Artist' onChange={(event: React.ChangeEvent<HTMLInputElement>) => setArtist(event.target.value)}/>
            <input type='submit'  />
        </form>
    </>
  )
}

export default SingleMaker