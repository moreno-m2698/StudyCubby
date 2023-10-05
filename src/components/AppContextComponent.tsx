import { useState, createContext } from 'react';
import { Album, PlayerTracks } from '../types';
import Visualizer from './VisualizerComponents/Visualizer';
import Player from './PlayerComponents/Player';
import '../CSS/content.css';
import '../CSS/sidebar.css'
import '../CSS/player.css'
import PlayerSidebar from './MusicSideBarComponents/PlayerSidebar';


export interface AppContextValues {
    albums: Album[],
    currentTrackIndex: number
    playerTracks: PlayerTracks
    setCurrentTrackIndex?: React.Dispatch<React.SetStateAction<number>>,
    setErrorState?: React.Dispatch<React.SetStateAction<boolean>>,
    setAlbums?: React.Dispatch<React.SetStateAction<Album[]>>,
    setPlayerTracks?: React.Dispatch<React.SetStateAction<PlayerTracks>>
}

export const AppContext = createContext<AppContextValues>({albums: [], currentTrackIndex: 0, playerTracks: {id: 'none', tracks: []}});

function AppContextComponent() {

  
  const [albums, setAlbums] = useState<Album[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playerTracks, setPlayerTracks] = useState<PlayerTracks>({id: 'none', tracks: []});

  return (
    <>
      <AppContext.Provider value = {{albums, currentTrackIndex, playerTracks, setCurrentTrackIndex, setAlbums, setPlayerTracks }}>
        <section aria-label={'Music Player'} className = "app__body">
          <div className='visualizer'>
            <Visualizer />
          </div>
          <div className='sidebar'>
            <PlayerSidebar />
          </div>
        </section>
        <footer className='player'>
          <Player />
        </footer>
      </AppContext.Provider>
    </>
  )
}

export default AppContextComponent
