import { useContext } from 'react'
import { Track } from '../../types'
import { AppContext } from '../AppContextComponent'
import { HiMiniSpeakerWave } from "react-icons/hi2"
interface AlbumUnfoldProps {
    tracks: Track[]
    selectedIndex: number|null
    albumIndex: number,
    queueId: string
}

function AlbumUnfoldComponent(props: AlbumUnfoldProps) {

  const {currentTrackIndex, setCurrentTrackIndex, playerTracks, setPlayerTracks} = useContext(AppContext);
  const trackSelect = (index:number) => {
    if (playerTracks.id !== props.queueId) {
      const albumQueue = {
        id: props.queueId,
        tracks: props.tracks
      }

      if (setPlayerTracks !== undefined) {
        setPlayerTracks(albumQueue)
      }
    }

    if (setCurrentTrackIndex !== undefined) {
      setCurrentTrackIndex(index);
    }
  }

  return (
    <ol className={props.selectedIndex === props.albumIndex ? 'sidebar__content accordion--show' : 'sidebar__content accordion'} aria-label='Album Tracks'>
      {props.tracks.map((song, index) => (
          <li className='sidebar__item'>
            <button onClick={() => {trackSelect(index); console.log(playerTracks)}} key={index} className='sidebar__button' aria-label='Select Track'>
                {currentTrackIndex === index && playerTracks.id === props.queueId ? <HiMiniSpeakerWave id='speaker'/> : <h4 className='album-track-index'>
                    { song.index + 1 }
                </h4>}
                <div className='sidebar__info'>
                  <h4>
                    {song.title}
                  </h4>
                  <h5>
                    {song.artist}
                  </h5>
                </div>
            </button>
          </li>
      ))}
    </ol>
  )
}

export default AlbumUnfoldComponent
