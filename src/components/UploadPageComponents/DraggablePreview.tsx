
interface DraggablePreviewProps {
  id: any,
  text: any,
  index: any,
  inputName: any,
  setInputName: any,
  handleDragStart: any,
  handleDragOver: any,
  handleDrop: any
}



const DraggablePreview = (props:DraggablePreviewProps) => {
  return (

      <li className="preview__input"
      draggable="true"
      onDragStart={(e) => props.handleDragStart(e, props.id)}
      onDragOver={(e) => props.handleDragOver(e)}
      onDrop={(e) => props.handleDrop(e, props.id)}>
        <input
          type="text"
          value={props.inputName}
          onChange={(e) => props.setInputName(e.target.value)}
          placeholder="Track Title"
        />
        <span>{props.text}</span>
      </li>
  );
};

export default DraggablePreview;