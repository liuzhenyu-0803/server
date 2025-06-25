import http from 'http';
import WebSocket from 'ws';

const server = http.createServer((req, res) => {
    if(req.method === 'GET') {
    // 处理GET请求
    console.log(`Received a GET request: url=${req.url}, headers=${JSON.stringify(req.headers)}`);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('This is a GET request');
  } else if(req.method === 'POST') {
    // 处理POST请求
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log(`Received a POST request: url=${req.url}, body=${body}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Received POST data',
        data: body
      }));
    });
  } else {
    // 其他请求方法
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
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