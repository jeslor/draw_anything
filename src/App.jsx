import React from "react";
import Navbar from "./components/Navbar";
import HandTrackingDisplay from "./components/HandTrackingDisplay";
import DrawingCanvas from "./components/DrawingCanvas";
import ControlPanel from "./components/ControlPanel";
import { useHandTracking } from "./hooks/useGestureDrawing";

const App = () => {
  const {
    videoRef,
    landmarkCanvasRef,
    drawCanvasRef,
    pencilRef,
    currentColor,
    gesture,
    isRefining,
    canUndoRedo,
    handleUndo,
    handleRedo,
    handleClearCanvas,
    handleRefineDrawing,
    handleColorChange,
  } = useHandTracking();

  return (
    <main>
      <Navbar />
      <div className="flex justify-center h-screen pt-[60px] fixed w-full">
        <HandTrackingDisplay
          videoRef={videoRef}
          landmarkCanvasRef={landmarkCanvasRef}
          gesture={gesture}
        />

        <div className="flex-1 flex justify-center items-center h-full px-6">
          <DrawingCanvas drawCanvasRef={drawCanvasRef} pencilRef={pencilRef} />
        </div>

        <ControlPanel
          canUndoRedo={canUndoRedo}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          handleClearCanvas={handleClearCanvas}
          handleRefineDrawing={handleRefineDrawing}
          isRefining={isRefining}
          currentColor={currentColor}
          handleColorChange={handleColorChange}
        />
      </div>
    </main>
  );
};

export default App;
