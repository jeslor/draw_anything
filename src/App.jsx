import React from "react";
import Navbar from "./components/Navbar";
import draw from "./assets/draw.webp";
import { Icon } from "@iconify/react/dist/iconify.js";

const colors = {
  red: "rgba(255, 0, 0, 0.9)",
  green: "rgba(0, 255, 0, 0.9)",
  blue: "rgba(0, 0, 255, 0.9)",
  yellow: "rgba(255, 255, 0, 0.9)",
};

const App = () => {
  return (
    <main className="">
      <Navbar />
      <div className="flex  justify-center h-screen pt-[60px] fixed w-full">
        <div className="w-[360px] text-gray-300 px-4 flex flex-col justify-center py-5 border-r-[1px] border-gray-100/10 bg-gray-100/5 backdrop-blur-2xl">
          <h1 className="text-[35px] font-semibold leading-[41px]">
            Draw anything with hand gestures
          </h1>
          <div className="flex flex-col  justify-center">
            <p className="text-[14px] pt-6 mb-2  leading-[18px] opacity-65">
              Use your camera to draw anything you want with hand gestures.
            </p>
            <div className="w-full h-[300px] flex justify-center items-center bg-amber-50 rounded-2xl">
              Camera
            </div>
            <div>
              <button className="mainButton mt-4 w-full py-3">
                <span className="text-[14px] font-semibold text-gray-100">
                  Start Drawing
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 flex justify-center items-center h-full px-6">
          {" "}
          <div className="bg-mainColor rounded-3xl w-full h-full max-h-[500px]  flex items-center justify-center">
            <img
              src={draw}
              alt=""
              className=" w-[80%] "
              style={{
                fillOpacity: "shadowColor: rgba(255, 0, 0, 0.9)",
              }}
            />
          </div>
        </div>
        <div className="w-[340px]  h-full py-5 pt-[6rem] border-l-[1px] border-gray-100/10 bg-gray-100/5 backdrop-blur-2xl flex flex-col justify-between">
          <div className="flex flex-col items-center justify-center gap-y-4 px-7">
            <button className="mainButton w-full py-3 text-start capitalize flex items-center gap-x-2">
              <Icon icon="grommet-icons:undo" />
              undo
            </button>
            <button className="mainButton w-full py-3 text-start capitalize flex items-center gap-x-2">
              <Icon icon="grommet-icons:redo" />
              redo
            </button>
            <button className="mainButton w-full py-3 text-start capitalize flex items-center gap-x-2">
              <Icon icon="lsicon:clear-outline" />
              clear canvas
            </button>
          </div>
          <div></div>
        </div>
      </div>
    </main>
  );
};

export default App;
