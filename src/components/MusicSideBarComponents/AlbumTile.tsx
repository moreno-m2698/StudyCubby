import React from 'react'
import { Album } from '../../types'


interface AlbumTileProps {
    album: Album,
    index: number,
    selected: number
}

function AlbumTile(props:AlbumTileProps) {



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
                        {!album.tracks ? null : <AlbumUnfoldComponent queueId={album.queueId} tracks={album.tracks} albumIndex={index} selectedIndex={selected}/>}
                    </li>
  )
}

export default AlbumTile