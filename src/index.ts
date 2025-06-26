import http from 'http';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const server = http.createServer((req, res) => {
    if(req.method === 'GET') {
        // 处理静态文件请求
        const url = req.url || '/';
        console.log('GET请求url:', url);
        // 修正静态资源路径拼接，防止path.join被url的/覆盖
        const safeUrl = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
        let filePath = path.join(__dirname, 'public', safeUrl);
        const extname = path.extname(filePath);
        
        // 设置内容类型
        const mimeTypes: Record<string, string> = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css'
        };

        fs.readFile(filePath, (err, content) => {
            if(err) {
                if(err.code === 'ENOENT') {
                    // 文件不存在
                    res.writeHead(404);
                    res.end('File not found');
                } else {
                    // 服务器错误
                    res.writeHead(500);
                    res.end('Server error');
                }
            } else {
                // 成功读取文件
                res.writeHead(200, {
                    'Content-Type': mimeTypes[extname] || 'text/plain'
                });
                res.end(content, 'utf-8');
            }
        });
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
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`HTTP: http://0.0.0.0:${port}`);
  console.log(`WebSocket: ws://0.0.0.0:${port}`);
});