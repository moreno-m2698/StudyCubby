import {useContext} from 'react'
import { PlayerContext } from '../Player'

function PlayButton() {

    const {isPlaying, setIsPlaying} = useContext(PlayerContext)

    return (
      
        <button className="player__play" onClick={() => setIsPlaying(!isPlaying)}>
            {(!isPlaying) ? 
                <svg role="img" height='16' width='16' viewBox="0 0 16 16">
                    <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"></path>
                </svg>: <svg role="img" height='16' width='16' viewBox="0 0 16 16">
                    <path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"></path>
                </svg>
            }

        </button>


    )
}

export default PlayButton