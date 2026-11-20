import { useState } from 'react';
import { api } from '../../services/api';

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
          const formData = new FormData();
          formData.append('type', 'SINGLE')
          formData.append('title', title)
          formData.append('artist', artist)
          formData.append('titles', title)
          formData.append('tracks', trackFile)
          formData.append('cover', imageFile)

          try {
          const result = await api.post('/albums', formData);
          console.log(result);
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