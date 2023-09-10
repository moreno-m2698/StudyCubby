
export interface Track {
    id: number,
    title: string,
    albumId: number,
    artist: string,
    index: number
}


export interface Album {
    id: number,
    title: string,
    artist: string,
    image?: string,
    tracks?: Track[],
    queueId?: string
}

export interface PlayerTracks { //This interface is used to create queue objects which will be used to help keep track of different players during lazy loading
    id: string,
    tracks?: Track[]
}