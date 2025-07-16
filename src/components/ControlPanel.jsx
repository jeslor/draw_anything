import React from "react";
import { Icon } from "@iconify/react";

const ControlPanel = ({
  canUndoRedo,
  handleUndo,
  handleRedo,
  handleClearCanvas,
  handleRefineDrawing,
  isRefining,
  currentColor,
  handleColorChange,
}) => {
  const colors = [
    "red",
    "green",
    "blue",
    "purple",
    "orange",
    "pink",
    "brown",
    "gray",
  ];

  return (
    <div className="w-[340px] h-full py-5 pt-[6rem] border-l border-gray-100/10 bg-gray-100/5 backdrop-blur-2xl flex flex-col">
      <div className="px-7 gap-y-4 flex flex-col">
        <button
          className={`mainButton py-3 text-start flex items-center gap-x-2 ${
            !canUndoRedo.canUndo ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={handleUndo}
          disabled={!canUndoRedo.canUndo}
        >
          <Icon className="text-[28px]" icon="grommet-icons:undo" /> Undo
        </button>
        <button
          className={`mainButton py-3 text-start flex items-center gap-x-2 ${
            !canUndoRedo.canRedo ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={handleRedo}
          disabled={!canUndoRedo.canRedo}
        >
          <Icon className="text-[28px]" icon="grommet-icons:redo" /> Redo
        </button>
        <button
          className="mainButton py-3 text-start flex items-center gap-x-2"
          onClick={handleClearCanvas}
        >
          <Icon className="text-[28px]" icon="lsicon:clear-outline" /> Clear
          Canvas
        </button>
        <button
          className="mainButton py-3 text-start flex items-center gap-x-2"
          onClick={handleRefineDrawing}
          disabled={isRefining}
        >
          {isRefining ? (
            <>
              <span className="loader-circle w-5 h-5 rounded-full border-2 border-t-transparent border-white animate-spin" />
              Refining...
            </>
          ) : (
            <>
              <Icon icon="tabler:wand" className="text-[28px]" /> Refine
            </>
          )}
        </button>
      </div>

      <h2 className="text-[18px] font-semibold text-gray-200 px-4 mt-6">
        Select Color
      </h2>
      <div className="flex items-center justify-start flex-wrap gap-3 px-4 py-3">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => handleColorChange(color)}
            style={{ backgroundColor: color }}
            className={`w-[37px] h-[37px] rounded-md transition-all duration-300 cursor-pointer ${
              currentColor === color
                ? "scale-115 ring-2 ring-white"
                : "hover:scale-110"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ControlPanel;
