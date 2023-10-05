import { useContext, useState } from "react"
import { AppContext } from "../AppContextComponent.tsx"
import {Album} from "../../types.ts"
import { getAlbums, getAlbumTracks } from '../../API/AlbumAPICalls.tsx';
import { useQuery } from "@tanstack/react-query"
import AlbumTile from "./AlbumTile.tsx";


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
                    <AlbumTile album={album} index={index} selected={selected} setSelected={setSelected} />
                )}
            </ul>
    )
}

export default AlbumSideBar
