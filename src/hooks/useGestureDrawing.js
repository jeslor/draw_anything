import { useEffect, useRef, useState, useCallback } from "react";
import { Camera } from "@mediapipe/camera_utils";
import { Hands } from "@mediapipe/hands";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PINCH_THRESHOLD = 0.08;
const SMOOTHING = 0.4;
const MOVE_THRESHOLD = 0.9;
const MAX_HISTORY_STATES = 50;

const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; // <<< REPLACE THIS with your actual API key

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const useHandTracking = () => {
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
  const currentStrokeColorRef = useRef(currentColor); // Use a ref for immediate color updates in effect

  const [canUndoRedo, setCanUndoRedo] = useState({
    canUndo: false,
    canRedo: false,
  });

  const genAI = useRef(null);
  const model = useRef(null);

  useEffect(() => {
    genAI.current = new GoogleGenerativeAI(GEMINI_API_KEY);
    model.current = genAI.current.getGenerativeModel({
      model: "gemini-pro-vision",
    });
  }, []);

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

    // Limit history to prevent memory issues
    if (newHistory.length > MAX_HISTORY_STATES) {
      newHistory.shift(); // Remove the oldest state
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
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    saveCanvasState();
  }, [saveCanvasState]);

  // Position pencil based on drawing coordinates
  const positionPencil = useCallback((x, y) => {
    const drawCanvas = drawCanvasRef.current;
    const pencil = pencilRef.current;

    if (!drawCanvas || !pencil) return;

    const canvasRect = drawCanvas.getBoundingClientRect();
    const naturalWidth = drawCanvas.width;
    const naturalHeight = drawCanvas.height;

    const scaleX = canvasRect.width / naturalWidth;
    const scaleY = canvasRect.height / naturalHeight;

    const cssX = x * scaleX;
    const cssY = y * scaleY;

    pencil.style.left = `${cssX - 5}px`;
    pencil.style.top = `${cssY - 10}px`;
    pencil.style.display = "block";
  }, []);

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

        const drawX = (1 - thumbTip.x) * drawCanvas.width;
        const drawY = thumbTip.y * drawCanvas.height;

        if (smoothX === null || smoothY === null) {
          smoothX = drawX;
          smoothY = drawY;
        } else {
          smoothX += SMOOTHING * (drawX - smoothX);
          smoothY += SMOOTHING * (drawY - smoothY);
        }

        positionPencil(smoothX, smoothY);

        if (pinchDistance < PINCH_THRESHOLD) {
          if (!drawing) {
            lastX = null;
            lastY = null;
            strokeStarted = false;
            drawCtx.beginPath();
          }
          drawing = true;
          setGesture("Drawing Mode");
        } else {
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
            lastX = smoothX;
            lastY = smoothY;
            drawCtx.beginPath();
            drawCtx.moveTo(smoothX, smoothY);
            drawCtx.strokeStyle = currentStrokeColorRef.current; // Use ref here
            drawCtx.lineWidth = 4;
            drawCtx.lineCap = "round";
            drawCtx.lineJoin = "round";
          } else {
            const dist = Math.hypot(smoothX - lastX, smoothY - lastY);
            if (dist > MOVE_THRESHOLD) {
              drawCtx.lineTo(smoothX, smoothY);
              drawCtx.stroke();
              strokeStarted = true;
              lastX = smoothX;
              lastY = smoothY;
            }
          }
        }

        // MediaPipe Hand Landmark Drawing (for visualization)
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

        lms.forEach((pt) => {
          const px = pt.x * landmarkCanvas.width;
          const py = pt.y * landmarkCanvas.height;
          landmarkCtx.beginPath();
          landmarkCtx.arc(px, py, 4, 0, 2 * Math.PI);
          landmarkCtx.fillStyle = "red";
          landmarkCtx.fill();
        });
      } else {
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

    return () => {
      if (camera) {
        camera.stop();
      }
      hands.close(); // Important for MediaPipe to release resources
    };
  }, [saveCanvasState, updateUndoRedoStates, positionPencil]);

  const handleRefineDrawing = useCallback(async () => {
    if (isRefining || !model.current) return;

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
      const result = await model.current.generateContent([
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
  }, [isRefining, saveCanvasState]);

  const handleColorChange = useCallback((color) => {
    setCurrentColor(color);
    currentStrokeColorRef.current = color; // Update ref for immediate effect in drawing
  }, []);

  return {
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
  };
};
