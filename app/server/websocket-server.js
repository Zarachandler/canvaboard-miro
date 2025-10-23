const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 }); // Use 8080 everywhere for clarity

// Store active connections per board
const boardConnections = new Map();

wss.on('connection', (ws, request) => {
  console.log('New WebSocket connection attempt');

  // For ws, use the full host to parse query params (supported in Node 16+)
  const url = new URL(request.url, `http://${request.headers.host}`);
  const boardId = url.searchParams.get('boardId');
  const userId = url.searchParams.get('userId');

  console.log(`User ${userId} connected to board ${boardId}`);

  if (!boardId || !userId) {
    console.log('Missing boardId or userId, closing connection');
    ws.close();
    return;
  }

  
  if (!boardConnections.has(boardId)) {
    boardConnections.set(boardId, new Map());
  }

  const boardUsers = boardConnections.get(boardId);
  boardUsers.set(userId, ws);

  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received message:', message.type, 'from', message.userId);

      // Broadcast cursor movements to all other users in the same board
      if (message.type === 'cursor_move' || message.type === 'join') {
        boardUsers.forEach((userWs, otherUserId) => {
          if (otherUserId !== userId && userWs.readyState === WebSocket.OPEN) {
            userWs.send(JSON.stringify(message));
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log(`User ${userId} disconnected from board ${boardId}`);
    if (boardUsers) {
      boardUsers.delete(userId);
      if (boardUsers.size === 0) {
        boardConnections.delete(boardId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log('WebSocket server running on port 8080');
