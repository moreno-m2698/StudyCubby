import { useContext, useState } from "react"
import { AppContext } from "../AppContextComponent.tsx"
import {Album} from "../../types.ts"
import { getAlbums } from '../../API/AlbumAPICalls.tsx';
import { useQuery } from "@tanstack/react-query"
import AlbumTile from "./AlbumTile.tsx";


function AlbumSideBar() {

    const {setAlbums} = useContext(AppContext)
    const [selectedAlbum, setSelectedAlbum] = useState<number|null>(null);

    const albumQuery = useQuery({
        queryKey: ["album"],
        queryFn: () => albumResponseHandler()
    })


    async function albumResponseHandler() {
        try {
            const response = await getAlbums();
            setAlbums!(response)
            return response
          } catch (err) {
            console.log("There was an error in getting track response: ", err)
            throw(err)
          }
    }




    return (
        <ul className='sidebar__content outer'>
            {albumQuery.isLoading ? 
            <p>Loading...</p>
            : albumQuery.isError ?
            <p>Error Loading Albums</p>
            : albumQuery.data?.map((album:Album) => <AlbumTile album={album} key={album.id} selectedAlbum={selectedAlbum} setSelectedAlbum={setSelectedAlbum} />
            )}
        </ul>
    )
}

export default AlbumSideBar
