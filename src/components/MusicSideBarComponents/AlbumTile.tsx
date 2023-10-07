import { useContext } from "react"
import { AppContext } from "../AppContextComponent.tsx"
import { Album, Track } from '../../types'
import { getAlbumTracks } from "../../API/AlbumAPICalls"
import AlbumUnfoldComponent from "./AlbumUnfoldComponent.tsx";
import { useQuery, useMutation } from "@tanstack/react-query";


interface AlbumTileProps {
    album: Album,
    selectedAlbum: number | null,
    setSelectedAlbum: React.Dispatch<React.SetStateAction<number | null>>
}

function AlbumTile(props:AlbumTileProps) {

    const {albums, setAlbums} = useContext(AppContext)
    const {currentTrackIndex, setCurrentTrackIndex, playerTracks, setPlayerTracks} = useContext(AppContext);

    const albumTrackQuery = useQuery({
        queryKey: [`album`, 'tracks', props.album.id],
        queryFn: () => albumTrackResponseHandler(props.album.id)
    })

    async function albumTrackResponseHandler(albumID:number) {
        try {
            const response = await getAlbumTracks(albumID, props.album.image!)
            props.album.tracks = response
            console.log('Here is albumTrackResponse', response)
            return response
          } catch (err) {
            console.log("There was an error in getting track response: ", err)
          }
    }


    async function albumButtonCallback(albumId: number) {

        if (props.selectedAlbum === albumId) {
            //Closes album if album is already open
            return props.setSelectedAlbum(null)
        }
        // if (!album.tracks && setAlbums !== undefined) {
        //     const trackResponse = await getAlbumTracks(album.id, album.image!);

        //     album.tracks = trackResponse
        // }
        props.setSelectedAlbum(albumId)

    }

    const trackSelect = (index:number) => {
        if (playerTracks.id !== props.album.queueId) {
          const albumQueue = {
            id: props.queueId,
            tracks: props.tracks
          }
    
          if (setPlayerTracks !== undefined) {
            setPlayerTracks(albumQueue)
          }
        }
    
        if (setCurrentTrackIndex !== undefined) {
          setCurrentTrackIndex(index);
        }
    }

    return (
    <li className='sidebar__item' key={props.album.id}>
        <button
            className='sidebar__button album__button'
            aria-label='Expand Album'
            onClick={() => albumButtonCallback(props.album.id)}
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
            : albumTrackQuery.data.map((track: Track) => <li>{track.title}</li>)}
        </ol>
        {/*albumTrackQuery.data ? null : <AlbumUnfoldComponent queueId={props.album.queueId} tracks={albumTrackQuery.data} albumIndex={props.index} selectedIndex={props.selected}/>*/}
    </li>
  )
}

export default AlbumTile