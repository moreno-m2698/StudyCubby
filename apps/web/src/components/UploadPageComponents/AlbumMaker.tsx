import React, { useState } from 'react'
import axios from 'axios'

const albumEndpoint = process.env.VITE_ALBUM_ENDPOINT;


function AlbumMaker() {

    const [imageFile, setImageFile] = useState<File|null>(null)
    const [title, setTitle] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [artist, setArtist] = useState<string>('')

    const handleUpload = async (event: any) => {
        event.preventDefault();
        setIsLoading(true)
        if (!imageFile) return    
          const formData = new FormData();
          formData.append('cover', imageFile)
          formData.append('title', title)
          formData.append('artist', artist)

          const url = `${albumEndpoint}/upload`
          
          try {
          const result = await axios.post(url, formData)
          console.log(result);
          setIsLoading(false)
          } catch (error) {
            setIsLoading(false)
            console.error(error);
          }
          
    
      };
    

    const fileInputChange = async (event:any) => {
      const file = event.target.files[0]
      setImageFile(file);
    }

    

  return (
    <>
        <h3 className='upload__header'>
          Album Upload
        </h3>
        <form encType='multipart/form-data' onSubmit={handleUpload}>
            <input type='file' accept='image/*' name='cover' onChange={(event: any) => fileInputChange(event)}/>
            <input type='text' placeholder='Title' disabled = {isLoading} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}/>
            <input type='text' placeholder='Artist' disabled = {isLoading} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setArtist(event.target.value)}/>
            <input type='submit' disabled = {isLoading} />
        </form>
    </>
  )
}

export default AlbumMaker;