import React, {useState} from 'react'
//import '../../CSS/sidebarNavigator.css'

interface SidebarNavigatorProps {
  playerMode: string|undefined,
  setPlayerMode: any
}


function SidebarNavigator(props: SidebarNavigatorProps) {
    const [selectedRadioButton, setSelectedRadioButton] = useState('');
    const isRadioSelected = (value: string): boolean => props.playerMode === value;
    const handleRadioClick = (event: React.ChangeEvent<HTMLInputElement>): void => props.setPlayerMode(event.currentTarget.value);
  return (
    <div className='sidebar__radio'>
        <input type='radio' name='sidebar-mode' id='albums' value='albums' checked={isRadioSelected('albums')} onChange={handleRadioClick}/>
        <label htmlFor='albums'>Albums</label>
        <input type='radio' name='sidebar-mode' id='tracks' value='tracks' checked={isRadioSelected('tracks')} onChange={handleRadioClick}/>
        <label htmlFor='tracks'>Tracks</label>
    </div>
  )
}

export default SidebarNavigator