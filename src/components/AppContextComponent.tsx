import { useState, createContext } from 'react';
import { Track, Album, PlayerTracks } from '../types';
import Visualizer from './VisualizerComponents/Visualizer';
import Player from './PlayerComponents/Player';
import { getTracks } from '../API/ApiCalls';
import '../CSS/content.css';
import '../CSS/sidebar.css'
import '../CSS/player.css'
import PlayerSidebar from './MusicSideBarComponents/PlayerSidebar';


export interface AppContextValues {
    tracks: Track[],
    albums: Album[],
    currentTrackIndex: number
    playerTracks: PlayerTracks
    setCurrentTrackIndex?: React.Dispatch<React.SetStateAction<number>>,
    setTracks?: React.Dispatch<React.SetStateAction<Track[]>>,
    setErrorState?: React.Dispatch<React.SetStateAction<boolean>>,
    setAlbums?: React.Dispatch<React.SetStateAction<Album[]>>,
    setPlayerTracks?: React.Dispatch<React.SetStateAction<PlayerTracks>>
}

export const AppContext = createContext<AppContextValues>({tracks: [], albums: [], currentTrackIndex: 0, playerTracks: {id: 'none', tracks: []}});

function AppContextComponent() {

  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [errorState, setErrorState] = useState(false);
  const [playerTracks, setPlayerTracks] = useState<PlayerTracks>({id: 'none', tracks: []});

  const getButton = (content: string) => { 
    return (
      <>
        <button
            className='blue-btn'
            onClick={() => getTracks()}
        >{content}</button>
      </>
      )
    }

    if (errorState) {
      return (
        <div className='vert-flex'>
          <h1>Could not get songs</h1>
          {getButton('Try Again')}
        </div>

      )
    }

  return (
    <>
      <AppContext.Provider value = {{tracks, albums, currentTrackIndex, playerTracks, setCurrentTrackIndex, setTracks, setErrorState, setAlbums, setPlayerTracks }}>
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
