import React, { useState } from 'react'
import axios from 'axios'

const albumEndpoint = process.env.ALBUM_ENDPOINT;


function AlbumMaker() {

    const [imageFile, setImageFile] = useState<File|null>(null)
    const [title, setTitle] = useState<string>('')
    const [artist, setArtist] = useState<string>('')

    const handleUpload = async (event: any) => {
        event.preventDefault();
        if (!imageFile) return    
          const formData = new FormData();
          formData.append('cover', imageFile)
          formData.append('title', title)
          formData.append('artist', artist)

          const url = `${albumEndpoint}/upload`
          
          try {
          const result = await axios.post(url, formData)
          console.log(result);
          } catch (error) {
          console.error(error);}
          
    
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
            <input type='text' placeholder='Title' onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}/>
            <input type='text' placeholder='Artist' onChange={(event: React.ChangeEvent<HTMLInputElement>) => setArtist(event.target.value)}/>
            <input type='submit' />
        </form>
    </>
  )
}

export default AlbumMaker;