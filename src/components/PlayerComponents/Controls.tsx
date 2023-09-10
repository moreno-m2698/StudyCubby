import { useContext } from 'react';
import SkipBackwardButton from './ButtonComponents/SkipBackwardButton'
import SkipForwardButton from './ButtonComponents/SkipForwardButton'
import PlayButton from './ButtonComponents/PlayButton'
import { AppContext } from '../AppContextComponent';

function Controls() {

    const {currentTrackIndex, setCurrentTrackIndex, playerTracks} = useContext(AppContext)

    const SkipTrack = (forwards = true) => {
        if (setCurrentTrackIndex  !== undefined) {

            const endIndex = playerTracks.tracks.length - 1;

            let tempT = ((forwards) ? 1 : -1) + currentTrackIndex;

            const isGreaterThanEndIndex = tempT > endIndex;

            const isLessThanStartIndex = tempT < 0;

            tempT = (isGreaterThanEndIndex) ? 0 : tempT;

            tempT = (isLessThanStartIndex) ? endIndex : tempT;

            setCurrentTrackIndex(tempT);

        }
    }

    return (
        <div className="player__controls">
            <SkipBackwardButton SkipTrack = {SkipTrack}/>
            <PlayButton />
            <SkipForwardButton SkipTrack = {SkipTrack}/>
        </div>
    )
}

export default Controls