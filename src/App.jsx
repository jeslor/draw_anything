import React, { useEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import { Icon } from "@iconify/react";
import { Camera } from "@mediapipe/camera_utils";
import { Hands } from "@mediapipe/hands";

const App = () => {
  const videoRef = useRef(null);
  const landmarkCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const [currentColor, setCurrentColor] = useState("#800080");
  const [gesture, setGesture] = useState("-");

  useEffect(() => {
    const video = videoRef.current;
    const landmarkCanvas = landmarkCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    const landmarkCtx = landmarkCanvas.getContext("2d");
    const drawCtx = drawCanvas.getContext("2d");

    landmarkCanvas.width = drawCanvas.width = 640;
    landmarkCanvas.height = drawCanvas.height = 480;

    let lastX = null;
    let lastY = null;
    let smoothX = null;
    let smoothY = null;
    let drawing = false;
    let erasing = false;
    let changingColor = false;
    let lastGestureTime = 0;

    const SMOOTHING = 0.5;
    const MOVE_THRESHOLD = 1.0;
    const COOLDOWN_MS = 300;

    function distance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function midpoint(a, b) {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function isDrawingMode(lms) {
      return (
        distance(lms[4], lms[8]) < 0.05 &&
        distance(lms[8], lms[20]) > 0.06 &&
        distance(lms[8], lms[17]) > 0.06
      );
    }

    function isErasingMode(lms) {
      return (
        distance(lms[4], lms[8]) > 0.06 &&
        lms[8].y < lms[6].y &&
        lms[12].y < lms[10].y &&
        lms[16].y > lms[14].y &&
        lms[20].y > lms[18].y
      );
    }

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      landmarkCtx.clearRect(0, 0, landmarkCanvas.width, landmarkCanvas.height);

      const now = Date.now();

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const lms = results.multiHandLandmarks[0];
        const indexTip = lms[8];
        const thumbTip = lms[4];

        const pencilMid = midpoint(thumbTip, indexTip);
        const x = (1 - indexTip.x) * drawCanvas.width;
        const y = indexTip.y * drawCanvas.height;

        if (smoothX === null || smoothY === null) {
          smoothX = x;
          smoothY = y;
        } else {
          smoothX += SMOOTHING * (x - smoothX);
          smoothY += SMOOTHING * (y - smoothY);
        }

        const isDraw = isDrawingMode(lms);
        const isErase = isErasingMode(lms);

        if (isDraw && now - lastGestureTime > COOLDOWN_MS) {
          drawing = true;
          erasing = false;
          setGesture("Drawing Mode");
          lastGestureTime = now;
        } else if (isErase && now - lastGestureTime > COOLDOWN_MS) {
          drawing = false;
          erasing = true;
          setGesture("Erasing Mode");
          lastGestureTime = now;
        } else if (!isDraw && !isErase) {
          drawing = false;
          erasing = false;
          setGesture("-");
          lastX = lastY = null;
        }

        if (drawing) {
          const dx = smoothX - lastX;
          const dy = smoothY - lastY;
          const dist = Math.hypot(dx, dy);

          if (lastX !== null && lastY !== null && dist > MOVE_THRESHOLD) {
            drawCtx.beginPath();
            drawCtx.moveTo(lastX, lastY);
            drawCtx.lineTo(smoothX, smoothY);
            drawCtx.strokeStyle = currentColor;
            drawCtx.lineWidth = 4;
            drawCtx.lineCap = "round";
            drawCtx.stroke();
          }
          lastX = smoothX;
          lastY = smoothY;
        }

        if (erasing) {
          const mid = midpoint(lms[8], lms[12]);
          const eraseX = (1 - mid.x) * drawCanvas.width;
          const eraseY = mid.y * drawCanvas.height;
          drawCtx.save();
          drawCtx.beginPath();
          drawCtx.arc(eraseX, eraseY, 20, 0, 2 * Math.PI);
          drawCtx.clip();
          drawCtx.clearRect(eraseX - 25, eraseY - 25, 50, 50);
          drawCtx.restore();
        }

        const connections = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [0, 5],
          [5, 6],
          [6, 7],
          [7, 8],
          [5, 9],
          [9, 10],
          [10, 11],
          [11, 12],
          [9, 13],
          [13, 14],
          [14, 15],
          [15, 16],
          [13, 17],
          [17, 18],
          [18, 19],
          [19, 20],
          [0, 17],
        ];
        landmarkCtx.strokeStyle = "green";
        landmarkCtx.lineWidth = 2;
        connections.forEach(([start, end]) => {
          const x1 = lms[start].x * landmarkCanvas.width;
          const y1 = lms[start].y * landmarkCanvas.height;
          const x2 = lms[end].x * landmarkCanvas.width;
          const y2 = lms[end].y * landmarkCanvas.height;
          landmarkCtx.beginPath();
          landmarkCtx.moveTo(x1, y1);
          landmarkCtx.lineTo(x2, y2);
          landmarkCtx.stroke();
        });
      }
    });

    if (video) {
      const camera = new Camera(video, {
        onFrame: async () => {
          await hands.send({ image: video });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, [currentColor]);

  return (
    <main>
      <Navbar />
      <div className="flex justify-center h-screen pt-[60px] fixed w-full">
        <div className="w-[360px] px-4 py-5 text-gray-300 border-r border-gray-100/10 bg-gray-100/5 backdrop-blur-2xl">
          <h1 className="text-[35px] font-semibold">Draw with Hand Gestures</h1>
          <p className="text-[14px] pt-6 mb-2 opacity-65">
            Use your camera to draw, erase or select color.
          </p>
          <div className="relative w-full h-[300px] rounded-2xl">
            <video ref={videoRef} className="" autoPlay muted playsInline />
            <canvas
              ref={landmarkCanvasRef}
              className="absolute w-full h-full rounded-2xl"
            />
          </div>
          <p className="pt-2 text-sm text-green-400">Mode: {gesture}</p>
        </div>

        <div className="flex-1 flex justify-center items-center h-full px-6">
          <div className="relative w-full h-full max-h-[500px] bg-mainColor rounded-3xl">
            <canvas
              ref={drawCanvasRef}
              className="absolute w-full h-full rounded-3xl"
            />
          </div>
        </div>

        <div className="w-[340px] h-full py-5 pt-[6rem] border-l border-gray-100/10 bg-gray-100/5 backdrop-blur-2xl flex flex-col">
          <div className="px-7 gap-y-4 flex flex-col">
            <button className="mainButton py-3 text-start flex items-center gap-x-2">
              <Icon className="text-[28px]" icon="grommet-icons:undo" /> Undo
            </button>
            <button className="mainButton py-3 text-start flex items-center gap-x-2">
              <Icon className="text-[28px]" icon="grommet-icons:redo" /> Redo
            </button>
            <button
              className="mainButton py-3 text-start flex items-center gap-x-2"
              onClick={() => {
                const ctx = drawCanvasRef.current.getContext("2d");
                ctx.clearRect(
                  0,
                  0,
                  drawCanvasRef.current.width,
                  drawCanvasRef.current.height
                );
              }}
            >
              <Icon className="text-[28px]" icon="lsicon:clear-outline" /> Clear
              Canvas
            </button>
          </div>

          <h2 className="text-[18px] font-semibold text-gray-200 px-4 mt-6">
            Select Color
          </h2>
          <div className="flex items-center justify-start flex-wrap gap-2 px-4 py-3">
            {[
              "red",
              "green",
              "blue",
              "purple",
              "orange",
              "pink",
              "brown",
              "gray",
            ].map((color) => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                style={{ backgroundColor: color }}
                className="w-[40px] h-[40px] rounded-md transition-all duration-300 hover:scale-110 cursor-pointer"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default App;
