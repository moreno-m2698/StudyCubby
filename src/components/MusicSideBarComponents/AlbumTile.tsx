import { useContext } from "react"
import { AppContext } from "../AppContextComponent.tsx"
import { Album, Track } from '../../types'
import { getAlbumTracks } from "../../API/AlbumAPICalls"

import AlbumTrackTile from "./AlbumTrackTile.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";


interface AlbumTileProps {
    album: Album,
    selectedAlbum: number | null,
    setSelectedAlbum: React.Dispatch<React.SetStateAction<number | null>>
}

function AlbumTile(props:AlbumTileProps) {

    const queryClient = useQueryClient()
    const { setCurrentTrackIndex, playerTracks, setPlayerTracks} = useContext(AppContext);

    const albumTrackQuery = useQuery({
        queryKey: [`album`, 'tracks', props.album.id],
        queryFn: () => {console.log(`Here are the tracks for ${props.album.title}: `, props.album.tracks) 
                        return props.album.tracks}
    })

    const albumTrackMutation  = useMutation({
        mutationFn: async (album:Album) => {
            console.log("In the mutation")
            const tracks = await getAlbumTracks(album.id, album.image!)
            for (let i = 0; i < tracks.length ; i++) {
                album.tracks!.push(tracks[i])
                console.log(tracks[i].title)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries([`album`, 'tracks', props.album.id])
        }
    })

    async function albumTrackResponse(album: Album) {
        try {
            const response = await getAlbumTracks(album.id, album.image!)
            console.log('Here is albumTrackResponse', response)
            return response
          } catch (err) {
            console.log("There was an error in getting track response: ", err)
          }
    }


    async function albumButtonCallback(album: Album) {

        if (props.selectedAlbum === album.id) {
            //Closes album if album is already open
            return props.setSelectedAlbum(null)
        }   
        console.log(album.tracks?.length)

        if (album.tracks!.length === 0) {
            albumTrackMutation.mutate(album)
        }

        props.setSelectedAlbum(album.id)

    }

    function albumTrackCallback(trackIndex: number) {
        if (playerTracks.id !== props.album.queueId) {
            const albumTracks = {
                id: props.album.queueId,
                tracks: albumTrackQuery.data
            }
            setPlayerTracks!(albumTracks)
        }
        setCurrentTrackIndex!(trackIndex)
    } 

    return (
    <li className='sidebar__item' key={props.album.id}>
        <button
            className='sidebar__button album__button'
            aria-label='Expand Album'
            onClick={() => albumButtonCallback(props.album)}
            data-toggled={props.album.id===props.selectedAlbum}
        >
            <img className='sidebar__image' src={props.album.image} alt={props.album.title}/>
            <div className='sidebar__info'>
                <h2>
                    {props.album.title}
                </h2>
                <h3>
                    {props.album.artist}
                </h3>
            </div>
        </button>
        {/*This is the toggle information*/}
        <ol className={props.selectedAlbum === props.album.id ? 'sidebar__content accordion--show' : 'sidebar__content accordion'} aria-label='Album Tracks'>
            {albumTrackQuery.isLoading ? 
            <li>...Loading</li> 
            : albumTrackQuery.isError ?
            <li>Error Loading Tracks</li> 
            : albumTrackQuery.data!.map((track: Track) => <AlbumTrackTile album={props.album} albumTrackCallback={albumTrackCallback} track={track} key={track.index}/>)}
        </ol>
    </li>
  )
}

export default AlbumTile