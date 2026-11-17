import { useContext } from "react"
import { AppContext } from "../AppContextComponent"

function Details() {

    const {playerTracks: queue, currentTrackIndex} = useContext(AppContext)

    return (
    <> {(queue.tracks!!== undefined) ?
        <div className="player__details">
            <img src={queue.tracks[currentTrackIndex].image} alt={queue.tracks[currentTrackIndex].title} className='player__image'/>
            <div className="player__info">
                    <h2>
                        {queue.tracks[currentTrackIndex].title}
                    </h2>
                    <h3>
                        {queue.tracks[currentTrackIndex].artist}
                    </h3>
            </div>
        </div>: null}
    </>)
}

export default Details