
const { execSync } = require('child_process');
const http = require('http'); // 引入 http 模块，用于创建 HTTP 服务器
const https = require('https'); // 引入 https 模块，用于处理 HTTPS 请求
const url = require('url'); // 引入 url 模块，用于解析 URL

// 定义代理服务器监听的端口
const PORT = 3000;

/**
 * 检查并杀死占用 3000 端口的进程
 * Windows: 使用 netstat + taskkill
 * Linux (如 Ubuntu): 使用 lsof + kill
 */
const osType = process.platform;
try {
  if (osType === 'win32') {
    const result = execSync(`netstat -ano | findstr :${PORT} | findstr LISTENING`, { encoding: 'utf8' });
    const lines = result.split('\n').filter(Boolean);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[4];
      if (pid) {
        console.log(`Killing process on port ${PORT}: PID=${pid}`);
        execSync(`taskkill /PID ${pid} /F`);
      }
    }
  } else {
    // Linux/macOS
    const result = execSync(`lsof -i :${PORT} -sTCP:LISTEN -t`, { encoding: 'utf8' });
    const pids = result.split('\n').filter(Boolean);
    for (const pid of pids) {
      console.log(`Killing process on port ${PORT}: PID=${pid}`);
      execSync(`kill -9 ${pid}`);
    }
  }
} catch (e) {
  // 没有进程占用端口时会抛异常，忽略即可
}

// 创建代理服务器
const proxy = http.createServer((req, res) => {
  // req: 客户端发送给代理服务器的请求
  // res: 代理服务器发送给客户端的响应

  // 日志：收到请求时打印
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);

  // 解析客户端请求的 URL
  let urlObj;
  try {
    urlObj = new URL(req.url);
  } catch (e) {
    // 如果是相对路径，构造完整 URL
    urlObj = new URL(req.url, 'http://localhost');
  }

  // 检查是否为 HTTPS 请求
  const isHttps = urlObj.protocol === 'https:';

  // 配置转发请求的选项
  const options = {
    hostname: urlObj.hostname, // 目标服务器的主机名
    port: urlObj.port || (isHttps ? 443 : 80), // 优先使用 URL 中的端口，没有时使用默认端口
    path: urlObj.pathname + urlObj.search, // 目标服务器的路径和查询参数
    method: req.method, // 使用与客户端请求相同的方法 (GET, POST, 等)
    headers: req.headers // 转发客户端请求头
  };

  // 根据协议 (HTTP 或 HTTPS) 创建请求
  const proxyReq = (isHttps ? https : http).request(options, proxyRes => {
    // proxyRes: 目标服务器返回的响应

    // 将目标服务器的响应头设置到代理服务器的响应中
    res.writeHead(proxyRes.statusCode, proxyRes.headers);

    // 将目标服务器的响应体通过管道传递给客户端
    proxyRes.pipe(res, {
      end: true // 结束响应
    });
    
    // 处理 HTTPS 的 CONNECT 方法
    proxy.on('connect', (req, clientSocket, head) => {
      console.log(`[${new Date().toISOString()}] CONNECT ${req.url} from ${clientSocket.remoteAddress}`);
    
      // 收到 CONNECT 请求后打印日志
      console.log(`[${new Date().toISOString()}] 收到 CONNECT 请求: ${req.method} ${req.url} from ${clientSocket.remoteAddress}`);
    
      const { hostname, port } = new URL(`http://${req.url}`);
      const serverSocket = require('net').createConnection(port || 443, hostname, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });
    
      serverSocket.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] CONNECT 连接出错 (${req.url}):`, err.message);
        clientSocket.end();
      });
    
      clientSocket.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] 客户端连接出错 (${req.url}):`, err.message);
        serverSocket.end();
      });
    });
  });

  // 监听代理请求的错误事件
  proxyReq.on('error', err => {
    console.error(`[${new Date().toISOString()}] 代理请求出错 (${req.url}):`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { // 返回 502 Bad Gateway 更合适
        'Content-Type': 'text/plain'
      });
      res.end('代理连接失败'); // 结束响应
    }
  });

  // 设置请求超时
  proxyReq.setTimeout(30000, () => {
    console.error(`[${new Date().toISOString()}] 代理请求超时 (${req.url})`);
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, {
        'Content-Type': 'text/plain'
      });
      res.end('代理请求超时');
    }
  });

  // 将客户端的请求体通过管道传递给代理请求
  req.pipe(proxyReq, {
    end: true // 结束请求
  });
});

proxy.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  let localIP = '127.0.0.1';
  for (const dev in ifaces) {
    for (const details of ifaces[dev]) {
      if (details.family === 'IPv4' && !details.internal) {
        localIP = details.address;
        break;
      }
    }
  }
  console.log(`本地访问:   http://localhost:${PORT}`);
  console.log(`局域网访问: http://${localIP}:${PORT}`);
});
