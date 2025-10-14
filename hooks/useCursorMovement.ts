import { useEffect, useRef, useCallback, useState } from 'react';

interface UseCursorMovementProps {
  boardId: string;
  userId: string;
  userName: string;
  userColor: string;
}

export const useCursorMovement = ({ 
  boardId, 
  userId, 
  userName, 
  userColor 
}: UseCursorMovementProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const connect = useCallback(() => {
    // Clean up any existing connection
    cleanup();

    try {
      // Use environment variable or default to localhost
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      console.log('Connecting to WebSocket:', `${wsUrl}?boardId=${boardId}&userId=${userId}`);
      
      const ws = new WebSocket(`${wsUrl}?boardId=${boardId}&userId=${userId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        
        // Send join message
        const joinMessage = {
          type: 'join',
          boardId,
          userId,
          userName,
          userColor,
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(joinMessage));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received WebSocket message:', message.type);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds if not a normal closure
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
      
      // Retry connection after error
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Retrying WebSocket connection after error...');
        connect();
      }, 5000);
    }
  }, [boardId, userId, userName, userColor, cleanup]);

  // Function to send cursor position
  const sendCursor = useCallback((x: number, y: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'cursor_move',
        boardId,
        userId,
        userName,
        userColor,
        position: { x, y },
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.log('WebSocket not connected, cannot send cursor position');
    }
  }, [boardId, userId, userName, userColor]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (boardId && userId && userId !== 'anonymous') {
      console.log('Initializing WebSocket connection...');
      connect();
    } else {
      console.log('Skipping WebSocket connection - missing boardId or userId');
    }

    return () => {
      console.log('Cleaning up WebSocket connection...');
      cleanup();
    };
  }, [connect, cleanup, boardId, userId]);

  return {
    sendCursor,
    isConnected
  };
};