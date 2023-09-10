import React from 'react'
import DraggablePreview from './DraggablePreview'

interface PreviewProps  {
    fileData: any
    setFileData: any

}

function Preview(props:PreviewProps) {


    const meta = props.fileData
    

    const handleDragStart = (event, id) => {
        event.dataTransfer.setData('text/plain', id);
      };
    
      const handleDragOver = (event) => {
        event.preventDefault();
      };
    
      const handleDrop = (event, targetId) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData('text/plain');
    
        const updatedElements = [...props.fileData];
        const sourceIndex = props.fileData.findIndex((el) => el.id === Number(sourceId));
        const targetIndex = props.fileData.findIndex((el) => el.id === targetId);
    
        const [movedElement] = updatedElements.splice(sourceIndex, 1);
        updatedElements.splice(targetIndex, 0, movedElement);
    
        props.setFileData(updatedElements);
      };
    
      const handleInputNameChange = (id, value) => {
        const updatedElements = props.fileData.map((el) =>
          el.id === id ? { ...el, inputName: value } : el
        );
        props.setFileData(updatedElements);
      };
    

  return (
    <ul className='upload__previewer'>
         {props.fileData.map((element, index) => (
          <DraggablePreview
            key={element.id}
            id={element.id}
            text={element.fileName}
            index={index}
            inputName={element.inputName}
            setInputName={(value) => handleInputNameChange(element.id, value)}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
          />
        ))}
    </ul>
  )
}

export default Preview