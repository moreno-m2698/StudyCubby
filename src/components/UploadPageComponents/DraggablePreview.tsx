import React from 'react';

const DraggablePreview = ({ id, text, index, inputName, setInputName, handleDragStart, handleDragOver, handleDrop }) => {
  return (

      <li className="preview__input"
      draggable="true"
      onDragStart={(e) => handleDragStart(e, id)}
      onDragOver={(e) => handleDragOver(e)}
      onDrop={(e) => handleDrop(e, id)}>
        <input
          type="text"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          placeholder="Track Title"
        />
        <span>{text}</span>
      </li>
  );
};

export default DraggablePreview;