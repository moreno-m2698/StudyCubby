import { useContext, useState } from "react"
import { AppContext } from "../AppContextComponent.tsx"
import {Album} from "../../types.ts"
import { getAlbums, getAlbumTracks } from '../../API/AlbumAPICalls.tsx';
import AlbumUnfoldComponent from "./AlbumUnfoldComponent.tsx";
import { useQuery } from "@tanstack/react-query"


function AlbumSideBar() {

    const {albums, setAlbums} = useContext(AppContext)
    const [selected, setSelected] = useState<number|null>(null);

    const albumQuery = useQuery({
        queryKey: ["albums"],
        queryFn: () => albumResponseHandler()
      })


    async function albumResponseHandler() {
        try {
            if (setAlbums !== undefined){
                const response = await getAlbums();
                setAlbums(response)
                return response
            }
          } catch (err) {
            console.log("There was an error in getting track response: ", err)
          }
    }
    
    // useEffect(() => {
    //     (async() => {
    //         if (albums.length === 0 && setAlbums !== undefined) {
    //             const response = await getAlbums();
    //             const newAlbums = response
    //             setAlbums(newAlbums)

    //         }
    //       })();
    // }
    // ,[])

    

    const accordionToggle = async (index: number) => {

        const album = albums[index]


        if (selected === index) {
            return setSelected(null)
        }
        if (!album.tracks && album.image !== undefined && setAlbums !== undefined) {
            const trackResponse = await getAlbumTracks(album.id, album.image);

            album.tracks = trackResponse
            setAlbums(albums);
        }

        setSelected(index);
    }

    if (albumQuery.isLoading) {
        return (
            <ul className='sidebar__content outer'>
                <p>Loading...</p>
            </ul>
        )
    }


    return (
            <ul className='sidebar__content outer'>
                {albumQuery.data?.map((album:Album, index: number) =>
                    <li className='sidebar__item' key={index}>
                        <button
                            className='sidebar__button album__button'
                            aria-label='Expand Album'
                            onClick={() => accordionToggle(index)}
                            data-toggled={index===selected}
                        >
                            <img className='sidebar__image' src={album.image} alt={album.title}/>
                            <div className='sidebar__info'>
                                <h2>
                                    {album.title}
                                </h2>
                                <h3>
                                    {album.artist}
                                </h3>
                            </div>
                        </button>
                        {/*This is the toggle information*/}
                        {!album.tracks ? null : <AlbumUnfoldComponent queueId={album.queueId} tracks={album.tracks} albumIndex={index} selectedIndex={selected}/>}
                    </li>
                )}
            </ul>
    )
}

export default AlbumSideBar
