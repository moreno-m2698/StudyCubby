import { useState } from "react";
import SidebarNavigator from "./SidebarNavigator";
import AlbumSideBar from "./AlbumSideBar";
import MusicSideBar from "./MusicSideBar";

function PlayerSidebar() {

    const [playerMode, setPlayerMode] = useState();


  return (
    <>
        <SidebarNavigator setPlayerMode={setPlayerMode} playerMode={playerMode}/>
        {(playerMode === 'tracks') ? <MusicSideBar />: (playerMode === 'albums' ? <AlbumSideBar/> : null )}
    </>
    
  )
}

export default PlayerSidebar