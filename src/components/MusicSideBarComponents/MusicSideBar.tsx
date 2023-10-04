import { useContext, useEffect } from "react"
import { AppContext } from "../AppContextComponent.tsx"
import MusicTile from "./MusicTile"
import { Track } from "../../types.ts"
import { getTracks } from '../../API/ApiCalls';
import { useQuery, useMutation } from "@tanstack/react-query"


function MusicSideBar() {

    const {tracks, setTracks, setErrorState, setPlayerTracks} = useContext(AppContext)

    const trackQuery = useQuery({
      queryKey: ["tracks"],
      queryFn: () => getTracks().then((trackResposnse) => [...trackResposnse.tracks])
    })

    useEffect(() => {
        (async() => {
            if (tracks.length === 0 && setTracks !== undefined && setErrorState !== undefined && setPlayerTracks !== undefined)   {
              
              const response = await getTracks();
              if (response !== undefined) {
              const tracks = response.tracks
              const errorState = response.errorState
              const trackQueue = {
                id: "tracks",
                tracks: tracks
              }

              setPlayerTracks(trackQueue)
              setTracks(tracks)
              setErrorState(errorState)
            }
            }
          })();

    }
    ,[])


    return (
          <ul className="sidebar__content outer">
              {(trackQuery.isLoading) ? "...Loading" : tracks.map((track:Track, index) => <MusicTile track={track} key={index} trackIndex={index}/>)}
          </ul>
    )
}

export default MusicSideBar