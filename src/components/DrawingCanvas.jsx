import React from "react";

const DrawingCanvas = ({ drawCanvasRef, pencilRef }) => {
  return (
    <div className="relative w-full h-[80%] bg-mainColor rounded-3xl">
      <canvas
        ref={drawCanvasRef}
        className="absolute w-full h-full rounded-3xl"
      />
      <span
        ref={pencilRef}
        alt="Pencil"
        className="absolute text-white z-10 h-[20px] w-[20px] bg-amber-400 rounded-full"
      ></span>
    </div>
  );
};

export default DrawingCanvas;
