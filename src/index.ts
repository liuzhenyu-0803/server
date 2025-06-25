import http from 'http';
import WebSocket from 'ws';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, world!');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log(`Received message: ${message}`);
    ws.send(`Hello, you sent -> ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`HTTP: http://localhost:${port}`);
  console.log(`WebSocket: ws://localhost:${port}`);
});