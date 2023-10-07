import { useContext } from 'react'
import { Track } from '../../types'
import { AppContext } from '../AppContextComponent'
import { HiMiniSpeakerWave } from "react-icons/hi2"

interface AlbumTrackTileProps {
    track: Track
    selectedIndex: number|null
    albumIndex: number,
    queueId: string
    trackSelect: any
}

function AlbumTrackTile(props:AlbumTrackTileProps) {

    const {currentTrackIndex, setCurrentTrackIndex, playerTracks, setPlayerTracks} = useContext(AppContext);

  return (
    <li className='sidebar__item'>
            <button onClick={() => {props.trackSelect(index); console.log(playerTracks)}} className='sidebar__button' aria-label='Select Track'>
                {currentTrackIndex === props.track.index && playerTracks.id === props.queueId ? <HiMiniSpeakerWave id='speaker'/> : <h4 className='album-track-index'>
                    { props.track.index + 1 }
                </h4>}
                <div className='sidebar__info'>
                  <h4>
                    {props.track.title}
                  </h4>
                  <h5>
                    {props.track.artist}
                  </h5>
                </div>
            </button>
          </li>
  )
}

export default AlbumTrackTile