"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface ZoomableGridProps {
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  gridSize?: number;
  boardWidth?: number;
  boardHeight?: number;
  children?: React.ReactNode;
}

function SvgGrid({
  width,
  height,
  gridSize,
  strokeColor = "rgba(0,0,0,0.06)",
  strokeWidth = 1,
}: {
  width: number;
  height: number;
  gridSize: number;
  strokeColor?: string;
  strokeWidth?: number;
}) {
  const verticalLines = [];
  for (let x = 0; x <= width; x += gridSize) {
    verticalLines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    );
  }

  const horizontalLines = [];
  for (let y = 0; y <= height; y += gridSize) {
    horizontalLines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    );
  }

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <g>{verticalLines}</g>
      <g>{horizontalLines}</g>
    </svg>
  );
}

export default function ZoomableGrid({
  initialZoom = 1,
  minZoom = 0.25,
  maxZoom = 4,
  gridSize = 40,
  boardWidth = 5000,
  boardHeight = 3000,
  children,
}: ZoomableGridProps) {
  const [zoom, setZoom] = useState(initialZoom);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [cursorMode, setCursorMode] = useState<"select" | "hand">("select");
  const [selection, setSelection] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement | null>(null);

  // stable stopDragging function
  const stopDragging = useCallback(() => {
    dragging.current = false;
    if (gridRef.current)
      gridRef.current.style.cursor = cursorMode === "hand" ? "grab" : "crosshair";
    if (cursorMode === "select") {
      setSelection(null);
    }
  }, [cursorMode]);

  // center board on mount / resize
  useEffect(() => {
    const center = () => {
      setOffset({
        x: -boardWidth / 2 + window.innerWidth / 2,
        y: -boardHeight / 2 + window.innerHeight / 2,
      });
    };
    center();
    window.addEventListener("resize", center);
    return () => window.removeEventListener("resize", center);
  }, [boardWidth, boardHeight]);

  // mouseup listener
  useEffect(() => {
    window.addEventListener("mouseup", stopDragging);
    return () => window.removeEventListener("mouseup", stopDragging);
  }, [stopDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };

    if (cursorMode === "select") {
      const rect = gridRef.current?.getBoundingClientRect();
      if (rect) {
        setSelection({
          startX: (e.clientX - rect.left - offset.x) / zoom,
          startY: (e.clientY - rect.top - offset.y) / zoom,
          endX: (e.clientX - rect.left - offset.x) / zoom,
          endY: (e.clientY - rect.top - offset.y) / zoom,
        });
      }
    }

    if (cursorMode === "hand" && gridRef.current) {
      gridRef.current.style.cursor = "grabbing";
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;

    if (cursorMode === "hand") {
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (cursorMode === "select" && selection) {
      const rect = gridRef.current?.getBoundingClientRect();
      if (rect) {
        setSelection((prev) =>
          prev && {
            ...prev,
            endX: (e.clientX - rect.left - offset.x) / zoom,
            endY: (e.clientY - rect.top - offset.y) / zoom,
          }
        );
      }
    }

    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, minZoom), maxZoom));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      handleZoom(e.deltaY < 0 ? 0.1 : -0.1);
    }
  };

  return (
    <div
      className="relative w-full h-full bg-gray-50 overflow-hidden select-none"
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="absolute bottom-4 right-4 z-50 flex space-x-2 bg-white rounded px-2 border shadow-sm">
        <button
          title="Select"
          onClick={() => setCursorMode("select")}
          className={`p-2 rounded ${cursorMode === "select" ? "bg-blue-100" : ""}`}
        >
          🖱
        </button>
        <button
          title="Hand (Pan)"
          onClick={() => setCursorMode("hand")}
          className={`p-2 rounded ${cursorMode === "hand" ? "bg-blue-100" : ""}`}
        >
          ✋
        </button>
        <button title="Zoom in" onClick={() => handleZoom(0.1)} className="p-2 rounded">
          ➕
        </button>
        <button title="Zoom out" onClick={() => handleZoom(-0.1)} className="p-2 rounded">
          ➖
        </button>
        <div className="font-mono px-2 py-1">{Math.round(zoom * 100)}%</div>
      </div>

      {/* Grid container */}
      <div
        ref={gridRef}
        style={{
          width: "100vw",
          height: "100vh",
          cursor: cursorMode === "hand" ? "grab" : "crosshair",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "top left",
            width: boardWidth,
            height: boardHeight,
            position: "relative",
          }}
        >
          <SvgGrid width={boardWidth} height={boardHeight} gridSize={gridSize} />
          {selection && (
            <div
              style={{
                position: "absolute",
                left: Math.min(selection.startX, selection.endX),
                top: Math.min(selection.startY, selection.endY),
                width: Math.abs(selection.endX - selection.startX),
                height: Math.abs(selection.endY - selection.startY),
                backgroundColor: "rgba(0, 123, 255, 0.12)",
                border: "1px dashed rgba(0, 123, 255, 0.9)",
                zIndex: 1000,
                pointerEvents: "none",
              }}
            />
          )}
          <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
