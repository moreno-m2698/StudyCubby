import {useState, useRef, useEffect, useContext, createContext} from 'react'
import Controls from './Controls';
import Details from './Details';
import { AppContext } from '../AppContextComponent';


export interface PlayerContext {
    isPlaying: boolean,
    setIsPlaying?: React.Dispatch<React.SetStateAction<boolean>>
  }

export const PlayerContext= createContext<PlayerContext>({isPlaying: false});

function Player() {

    const audioElement = useRef<HTMLAudioElement | null>(null); 


    const {currentTrackIndex, playerTracks} = useContext(AppContext)

    const [isPlaying, setIsPlaying] = useState(false); 

    

    useEffect(() => {
        if (audioElement.current !== null) {
            if (isPlaying) {
                audioElement.current.play();
            } else {
                audioElement.current.pause();
        }
    }
    });

    return (
        <PlayerContext.Provider value={{isPlaying, setIsPlaying}}>
                {(playerTracks.tracks !== undefined) ? ((playerTracks.tracks.length === 0) ? null :
                <>
                <audio src={playerTracks.tracks[currentTrackIndex].audio} ref={audioElement}></audio>
                <Details/>
                <Controls/>
                <div className='player-placeholder'>
                </div>    
                </>): null
                }  
        </PlayerContext.Provider>
    );
}

export default Player;