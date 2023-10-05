import { useContext } from "react"
import { AppContext } from "../AppContextComponent.tsx"
import { Album } from '../../types'
import { getAlbumTracks } from "../../API/AlbumAPICalls"
import AlbumUnfoldComponent from "./AlbumUnfoldComponent.tsx";


interface AlbumTileProps {
    album: Album,
    index: number,
    selected: number | null,
    setSelected: React.Dispatch<React.SetStateAction<number | null>>
}

function AlbumTile(props:AlbumTileProps) {

    const {albums, setAlbums} = useContext(AppContext)

    const accordionToggle = async (index: number) => {

        const album = albums[index]


        if (props.selected === props.index) {
            return props.setSelected(null)
        }
        if (!album.tracks && album.image !== undefined && setAlbums !== undefined) {
            const trackResponse = await getAlbumTracks(album.id, album.image);

            album.tracks = trackResponse
            setAlbums(albums);
        }

        props.setSelected(index);
    }

    return (
    <li className='sidebar__item' key={props.index}>
        <button
            className='sidebar__button album__button'
            aria-label='Expand Album'
            onClick={() => accordionToggle(props.index)}
            data-toggled={props.index===props.selected}
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
        {!props.album.tracks ? null : <AlbumUnfoldComponent queueId={props.album.queueId} tracks={props.album.tracks} albumIndex={props.index} selectedIndex={props.selected}/>}
    </li>
  )
}

export default AlbumTile