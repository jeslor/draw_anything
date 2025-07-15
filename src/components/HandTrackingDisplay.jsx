import React from "react";

const HandTrackingDisplay = ({ videoRef, landmarkCanvasRef, gesture }) => {
  return (
    <div className="w-[360px] px-4 pb-5 pt-[4rem] text-gray-300 border-r border-gray-100/10 bg-gray-100/5 backdrop-blur-2xl">
      <h1 className="text-[35px] font-semibold leading-[37px]">
        Draw anything with Hand Gestures
      </h1>
      <p className="text-[14px] pt-6 mb-2 opacity-65">
        select color on the right, pinch index finger and thumb to start drawing
        on the canvas.
      </p>
      <div className="relative w-full h-[300px] rounded-2xl overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover transform -scale-x-100"
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={landmarkCanvasRef}
          className="absolute w-full h-full rounded-2xl z-20 top-0 transform -scale-x-100"
        />
      </div>
      <p className="pt-3 text-sm text-green-400">Mode: {gesture}</p>
    </div>
  );
};

export default HandTrackingDisplay;
