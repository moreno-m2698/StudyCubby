import { useState } from "react";
import AlbumMaker from "../../components/UploadPageComponents/AlbumMaker";
import SingleMaker from "../../components/UploadPageComponents/SingleMaker";
import Tracks from "../../components/UploadPageComponents/Tracks";

function Upload() {

  const [selectedRadioButton, setSelectedRadioButton] = useState('Album')
  const isRadioSelected = (value: string): boolean => selectedRadioButton === value;

  const handleRadioClick = (event: React.ChangeEvent<HTMLInputElement>): void => setSelectedRadioButton(event.currentTarget.value);

  return (
   <div className='upload'>
    <h2 className='upload__label'>Upload Page</h2>
    <div className="upload__radio">
      <input type="radio" id='Album' name="upload-selector" value="Album" checked={isRadioSelected('Album')} onChange={handleRadioClick} />
      <label htmlFor="Album">Make an album</label><br></br>
      <input type="radio" name="upload-selector" value="Single" checked={isRadioSelected('Single')} onChange={handleRadioClick} />
      <label htmlFor="Single">Make a single</label><br></br>
      <input type="radio" name="upload-selector" value="Tracks" checked={isRadioSelected('Tracks')} onChange={handleRadioClick} />
      <label htmlFor="Tracks">Add tracks to album/single</label><br></br>
    </div>
    {isRadioSelected('Album') ? 
      <AlbumMaker/>
    : (isRadioSelected('Single') ? 
      <SingleMaker />
    : <Tracks/> ) }
  </div>
  );
};

export default Upload;