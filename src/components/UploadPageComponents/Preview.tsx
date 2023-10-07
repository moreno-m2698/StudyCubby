
import DraggablePreview from './DraggablePreview'

interface PreviewProps  {
    fileData: any
    setFileData: any
    isLoading: boolean
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>

}

function Preview(props:PreviewProps) {


    const handleDragStart = (event: any, id: any) => {
        event.dataTransfer.setData('text/plain', id);
      };
    
      const handleDragOver = (event:any ) => {
        event.preventDefault();
      };
    
      const handleDrop = (event: any, targetId:any ) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData('text/plain');
    
        const updatedElements = [...props.fileData];
        const sourceIndex = props.fileData.findIndex((el: any) => el.id === Number(sourceId));
        const targetIndex = props.fileData.findIndex((el: any) => el.id === targetId);
    
        const [movedElement] = updatedElements.splice(sourceIndex, 1);
        updatedElements.splice(targetIndex, 0, movedElement);
    
        props.setFileData(updatedElements);
      };
    
      const handleInputNameChange = (id: any, value: any) => {
        const updatedElements = props.fileData.map((el: any) =>
          el.id === id ? { ...el, inputName: value } : el
        );
        props.setFileData(updatedElements);
      };
    

  return (
    <ul className='upload__previewer'>
         {props.fileData.map((element: any, index: any) => (
          <DraggablePreview
            key={element.id}
            id={element.id}
            text={element.fileName}
            index={index}
            inputName={element.inputName}
            setInputName={(value: any) => handleInputNameChange(element.id, value)}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            isLoading={props.isLoading}
            setIsLoading={props.setIsLoading}
          />
        ))}
    </ul>
  )
}

export default Preview