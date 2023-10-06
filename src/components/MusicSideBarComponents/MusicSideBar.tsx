import { useContext } from "react"
import { AppContext } from "../AppContextComponent.tsx"
import MusicTile from "./MusicTile"
import { Track } from "../../types.ts"
import { getTracks } from '../../API/ApiCalls';
import { useQuery } from "@tanstack/react-query"


function MusicSideBar() {

  const {setPlayerTracks} = useContext(AppContext)

  const trackQuery = useQuery({
    queryKey: ["track"],
    queryFn: () => trackResponseHandler()
  })

  async function trackResponseHandler() {
    try {
      if (setPlayerTracks !== undefined) {
        const response = await getTracks();
        const tracks = response?.tracks
        const trackQueue = {
          id: "tracks",
          tracks: tracks
        }
        setPlayerTracks(trackQueue)
        return trackQueue.tracks
      }
    } catch (err) {
      console.log("There was an error in getting track response: ", err)
    }
  }

  if (trackQuery.isLoading) 
    return (
      <ul className="sidebar__content outer">
        <li>"...Loading"</li>
      </ul>
    )
  if (trackQuery.isError) 
    return (
      <pre>{JSON.stringify(trackQuery.error)}</pre>
    ) 
  return (
      <ul className="sidebar__content outer">
        {trackQuery.data?.map((track:Track, index) => <MusicTile track={track} key={index} trackIndex={index} trackQuery = {trackQuery.data}/>)}
      </ul>
  )
}

export default MusicSideBar