//Will need author, song name, and image
import { Track } from '../../types';
import { useContext } from "react"
import { AppContext } from "../AppContextComponent"


interface MusicTileProps {
    track: Track, 
    key: number,
    trackIndex: number
}


function MusicTile(props: MusicTileProps) {


    const {setCurrentTrackIndex, tracks, playerTracks, setPlayerTracks} = useContext(AppContext)

    const selectTrack = () => {
        console.log(playerTracks.id)
        if (playerTracks.id != "tracks") {
            const trackQueue = {
                id: "tracks",
                tracks: tracks
            }
            setPlayerTracks(trackQueue)
        }
        if (setCurrentTrackIndex !== undefined) {
            setCurrentTrackIndex(props.trackIndex)
        }
    }



    return (

        <li className="sidebar__item">
            <button 
                onClick={() => selectTrack()}
                className='sidebar__button'
                aria-label='Select Track'
            >            
                <img className='sidebar__image' src={props.track.image} alt={props.track.title}/>
                <div className='sidebar__info'>
                    <h2>
                        {props.track.title}
                    </h2>
                    <h3>
                        {props.track.artist}
                    </h3>
                </div>

            </button>
        </li>
    )

}

export default MusicTile