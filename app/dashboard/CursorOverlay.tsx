'use client';

import { useEffect, useRef, useState } from 'react';

interface CursorData {
  userId: string;
  boardId: string;
  x: number;
  y: number;
  name: string;
  color: string;
}

export default function CursorOverlay({
  boardId,
  userId
}: {
  boardId: string;
  userId: string;
}) {
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === 'cursor' &&
          data.boardId === boardId &&
          data.userId !== userId
        ) {
          setCursors((prev) => ({
            ...prev,
            [data.userId]: data
          }));
        }
      } catch (err) {
        console.error('Invalid cursor data', err);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [boardId, userId]);

  return (
    <>
      {Object.values(cursors).map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none z-50 flex items-center space-x-1"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="drop-shadow"
            style={{ color: cursor.color }}
          >
            <path d="M3 3L21 12L14 14L12 21L3 3Z" />
          </svg>
          <div className="bg-white border border-slate-300 rounded px-1 text-xs text-slate-700 shadow-sm">
            {cursor.name}
          </div>
        </div>
      ))}
    </>
  );
}