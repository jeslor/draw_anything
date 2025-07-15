import React, { useEffect, useRef, useState, useCallback } from "react";
import Navbar from "./components/Navbar";
import { Icon } from "@iconify/react";
import { Camera } from "@mediapipe/camera_utils";
import { Hands } from "@mediapipe/hands";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pencilImage from "./assets/pencil.png";

const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; // <<< REPLACE THIS with your actual API key

const App = () => {
  const videoRef = useRef(null);
  const landmarkCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const pencilRef = useRef(null);
  const [currentColor, setCurrentColor] = useState("#800080");
  const [gesture, setGesture] = useState("Idle (Pinch to Draw)");
  const [isRefining, setIsRefining] = useState(false);

  // Undo/Redo state
  const canvasHistoryRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const currentStrokeColorRef = useRef(currentColor);
  const [canUndoRedo, setCanUndoRedo] = useState({
    canUndo: false,
    canRedo: false,
  });

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-pro-vision",
  });

  // Update undo/redo button states
  const updateUndoRedoStates = useCallback(() => {
    const canUndo = historyIndexRef.current > 0;
    const canRedo =
      historyIndexRef.current < canvasHistoryRef.current.length - 1;
    setCanUndoRedo({ canUndo, canRedo });
  }, []);

  // Save canvas state to history
  const saveCanvasState = useCallback(() => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const imageData = drawCanvas.toDataURL();

    // Remove any states after current index (for when we're in middle of history)
    const newHistory = canvasHistoryRef.current.slice(
      0,
      historyIndexRef.current + 1
    );
    newHistory.push(imageData);

    // Limit history to 50 states to prevent memory issues
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      historyIndexRef.current++;
    }

    canvasHistoryRef.current = newHistory;
    updateUndoRedoStates();
  }, [updateUndoRedoStates]);

  // Restore canvas state from history
  const restoreCanvasState = useCallback((imageData) => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    const ctx = drawCanvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      ctx.drawImage(img, 0, 0);
    };

    img.src = imageData;
  }, []);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      restoreCanvasState(canvasHistoryRef.current[historyIndexRef.current]);
      updateUndoRedoStates();
    }
  }, [restoreCanvasState, updateUndoRedoStates]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < canvasHistoryRef.current.length - 1) {
      historyIndexRef.current++;
      restoreCanvasState(canvasHistoryRef.current[historyIndexRef.current]);
      updateUndoRedoStates();
    }
  }, [restoreCanvasState, updateUndoRedoStates]);

  // Clear canvas and save state
  const handleClearCanvas = useCallback(() => {
    const ctx = drawCanvasRef.current.getContext("2d");
    ctx.clearRect(
      0,
      0,
      drawCanvasRef.current.width,
      drawCanvasRef.current.height
    );
    saveCanvasState();
  }, [saveCanvasState]);

  // Position pencil based on drawing coordinates
  function positionPencil(x, y) {
    const drawCanvas = drawCanvasRef.current;
    const pencil = pencilRef.current;

    if (!drawCanvas || !pencil) return;

    // Get displayed size of the canvas (CSS size)
    const canvasRect = drawCanvas.getBoundingClientRect();

    // Get natural drawing size of canvas (width & height attributes)
    const naturalWidth = drawCanvas.width;
    const naturalHeight = drawCanvas.height;

    // Calculate scale factor between natural size and displayed size
    const scaleX = canvasRect.width / naturalWidth;
    const scaleY = canvasRect.height / naturalHeight;

    // Convert internal drawing coordinates (x, y) to CSS pixels inside container
    const cssX = x * scaleX;
    const cssY = y * scaleY;

    // Position pencil with offset to match tip
    pencil.style.left = `${cssX - 5}px`; // adjust -5 for pencil tip alignment
    pencil.style.top = `${cssY - 25}px`; // adjust -25 for pencil tip alignment
    pencil.style.display = "block";
  }

  useEffect(() => {
    const video = videoRef.current;
    const landmarkCanvas = landmarkCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    const pencil = pencilRef.current;

    if (!video || !landmarkCanvas || !drawCanvas || !pencil) return;

    const landmarkCtx = landmarkCanvas.getContext("2d");
    const drawCtx = drawCanvas.getContext("2d");

    landmarkCanvas.width = drawCanvas.width = 640;
    landmarkCanvas.height = drawCanvas.height = 480;

    // Save initial blank canvas state only once
    if (canvasHistoryRef.current.length === 0) {
      const initialState = drawCanvas.toDataURL();
      canvasHistoryRef.current.push(initialState);
      historyIndexRef.current = 0;
      updateUndoRedoStates();
    }

    let lastX = null;
    let lastY = null;
    let smoothX = null;
    let smoothY = null;
    let drawing = false;
    let strokeStarted = false;
    let currentStrokeColor = currentColor;

    const SMOOTHING = 0.5;
    const MOVE_THRESHOLD = 1.0;
    const PINCH_THRESHOLD = 0.05;

    function distance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
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

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const lms = results.multiHandLandmarks[0];
        const thumbTip = lms[4]; // Thumb tip landmark
        const indexTip = lms[8]; // Index finger tip landmark

        const pinchDistance = distance(indexTip, thumbTip);

        // Use thumb tip for drawing position (where the line will be drawn)
        const drawX = (1 - thumbTip.x) * drawCanvas.width;
        const drawY = thumbTip.y * drawCanvas.height;

        if (smoothX === null || smoothY === null) {
          smoothX = drawX;
          smoothY = drawY;
        } else {
          smoothX += SMOOTHING * (drawX - smoothX);
          smoothY += SMOOTHING * (drawY - smoothY);
        }

        // Always show and position pencil exactly where the line will be drawn
        positionPencil(smoothX, smoothY);

        if (pinchDistance < PINCH_THRESHOLD) {
          if (!drawing) {
            // Reset drawing state and set current color
            lastX = null;
            lastY = null;
            currentStrokeColor = currentColor;
            strokeStarted = false;
            drawCtx.beginPath(); // Start fresh path
          }
          drawing = true;
          setGesture("Drawing Mode");
        } else {
          // If we were drawing and now stopped, save canvas state
          if (drawing && strokeStarted) {
            saveCanvasState();
          }
          drawing = false;
          strokeStarted = false;
          setGesture("Idle (Pinch to Draw)");
          lastX = null;
          lastY = null;
        }

        if (drawing) {
          if (lastX === null || lastY === null) {
            // First point of the stroke
            lastX = smoothX;
            lastY = smoothY;
            drawCtx.beginPath();
            drawCtx.moveTo(smoothX, smoothY);
            drawCtx.strokeStyle = currentStrokeColorRef.current;
            drawCtx.lineWidth = 4;
            drawCtx.lineCap = "round";
            drawCtx.lineJoin = "round";
          } else {
            const dx = smoothX - lastX;
            const dy = smoothY - lastY;
            const dist = Math.hypot(dx, dy);

            if (dist > MOVE_THRESHOLD) {
              drawCtx.lineTo(smoothX, smoothY);
              drawCtx.stroke();
              strokeStarted = true;
              lastX = smoothX;
              lastY = smoothY;
            }
          }
        }

        // --- MediaPipe Hand Landmark Drawing (for visualization) ---
        const connections = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4], // Thumb
          [0, 5],
          [5, 6],
          [6, 7],
          [7, 8], // Index finger
          [5, 9],
          [9, 10],
          [10, 11],
          [11, 12], // Middle finger
          [9, 13],
          [13, 14],
          [14, 15],
          [15, 16], // Ring finger
          [13, 17],
          [17, 18],
          [18, 19],
          [19, 20], // Pinky finger
          [0, 17], // Palm base connection
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

        lms.forEach((pt) => {
          const px = pt.x * landmarkCanvas.width;
          const py = pt.y * landmarkCanvas.height;
          landmarkCtx.beginPath();
          landmarkCtx.arc(px, py, 4, 0, 2 * Math.PI);
          landmarkCtx.fillStyle = "red";
          landmarkCtx.fill();
        });
      } else {
        // If we were drawing and hand disappeared, save canvas state
        if (drawing && strokeStarted) {
          saveCanvasState();
        }
        drawing = false;
        strokeStarted = false;
        pencil.style.display = "none";
        setGesture("-");
        lastX = null;
        lastY = null;
      }
    });

    let camera;
    if (video) {
      camera = new Camera(video, {
        onFrame: async () => {
          await hands.send({ image: video });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }

    // Cleanup function
    return () => {
      if (camera) {
        camera.stop();
      }
    };
  }, [currentColor, saveCanvasState, updateUndoRedoStates]); // Only depend on currentColor

  const handleRefineDrawing = async () => {
    if (isRefining) return;

    setIsRefining(true);
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) {
      console.error("Drawing canvas not found.");
      setIsRefining(false);
      return;
    }

    const dataUrl = drawCanvas.toDataURL("image/png");
    const base64Image = dataUrl.split(",")[1];

    if (!base64Image) {
      console.error("Could not get image data from canvas.");
      setIsRefining(false);
      return;
    }

    try {
      const result = await model.generateContent([
        {
          text: "Refine this drawing, make it look more polished and artistic. Do not add or remove elements, just improve the existing lines and shapes. Return only the refined image.",
        },
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image,
          },
        },
      ]);

      const response = await result.response;
      const parts = response.candidates[0].content.parts;

      const imagePart = parts.find(
        (part) =>
          part.inlineData && part.inlineData.mimeType.startsWith("image/")
      );

      if (imagePart && imagePart.inlineData) {
        const refinedBase64 = imagePart.inlineData.data;
        const refinedImageSrc = `data:${imagePart.inlineData.mimeType};base64,${refinedBase64}`;

        const img = new Image();
        img.onload = () => {
          const drawCtx = drawCanvas.getContext("2d");
          drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
          drawCtx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
          saveCanvasState(); // Save refined state to history
          setIsRefining(false);
        };
        img.onerror = (error) => {
          console.error("Error loading refined image:", error);
          setIsRefining(false);
        };
        img.src = refinedImageSrc;
      } else {
        console.warn("Gemini did not return an image. Response parts:", parts);
        const textPart = parts.find((part) => part.text);
        if (textPart) {
          alert("Gemini responded with text: " + textPart.text);
        } else {
          alert(
            "Gemini did not return a recognizable image or text for refinement."
          );
        }
        setIsRefining(false);
      }
    } catch (error) {
      console.error("Error refining drawing with Gemini:", error);
      alert(
        "Failed to refine drawing. Check console for details and API key/usage."
      );
      setIsRefining(false);
    }
  };

  const handleColorChange = (color) => {
    setCurrentColor(color);
    currentStrokeColorRef.current = color; // Update ref so drawing uses correct color
  };

  return (
    <main>
      <Navbar />
      <div className="flex justify-center h-screen pt-[60px] fixed w-full">
        <div className="w-[360px] px-4 pb-5 pt-[4rem] text-gray-300 border-r border-gray-100/10 bg-gray-100/5 backdrop-blur-2xl">
          <h1 className="text-[35px] font-semibold leading-[37px]">
            Draw anything with Hand Gestures
          </h1>
          <p className="text-[14px] pt-6 mb-2 opacity-65">
            select color on the right, pinch index finger and thumb to start
            drawing on the canvas.
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

        <div className="flex-1 flex justify-center items-center h-full px-6">
          <div className="relative w-full h-[80%] bg-mainColor rounded-3xl">
            <canvas
              ref={drawCanvasRef}
              className="absolute w-full h-full rounded-3xl "
            />
            <span
              ref={pencilRef}
              alt="Pencil"
              className="absolute text-white z-10 h-[20px] w-[20px] bg-amber-400 rounded-full"
            ></span>
          </div>
        </div>

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
                  <Icon
                    icon="line-md:loading-loop"
                    className="text-[28px] animate-spin"
                  />{" "}
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
      </div>
    </main>
  );
};

export default App;
