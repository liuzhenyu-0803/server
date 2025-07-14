const { execSync } = require('child_process');
const PORT = process.env.PORT || 3000;

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

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('hello');
});

app.listen(PORT, '0.0.0.0', () => {
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