const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
let currentGfxState = {};

// Helper: Get Local Network IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. GET NETWORK IPS API
  if (pathname === '/api/network-ip') {
    const ips = getLocalIpAddresses();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ips: ips,
      overlayUrls: ips.map(ip => `http://${ip}:${PORT}/overlay.html`),
      localOverlayUrl: `http://localhost:${PORT}/overlay.html`
    }));
    return;
  }

  // 2. GFX STATE API
  if (pathname === '/api/gfx-state') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          currentGfxState = JSON.parse(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(currentGfxState));
      return;
    }
  }

  // 3. CORS PROXY FOR MIKA TIMING API
  if (pathname === '/api/proxy') {
    const targetUrlString = parsedUrl.searchParams.get('url');
    const apiKey = parsedUrl.searchParams.get('apiKey') || 'sportvot';
    const apiVersion = parsedUrl.searchParams.get('apiVersion') || '1';

    if (!targetUrlString) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing target url parameter' }));
      return;
    }

    try {
      const targetUrl = new URL(targetUrlString);
      const authHeader = 'Basic ' + Buffer.from(`apiVersion=${apiVersion};apiKey=${apiKey};:`).toString('base64');

      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SportVotGFX/1.0'
        },
        rejectUnauthorized: false
      };

      const requester = targetUrl.protocol === 'https:' ? https : http;

      const proxyReq = requester.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => { data += chunk; });
        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(data);
        });
      });

      proxyReq.on('error', (err) => {
        console.error('Proxy Error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch upstream API', details: err.message }));
      });

      proxyReq.end();
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid URL format', details: err.message }));
    }
    return;
  }

  // 4. STATIC FILE SERVER
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log(`====================================================`);
  console.log(` MIKA TIMING & SPORTVOT GFX SUITE SERVER RUNNING `);
  console.log(`====================================================`);
  console.log(` Local Dashboard:   http://localhost:${PORT}`);
  console.log(` Local Overlay:     http://localhost:${PORT}/overlay.html`);
  if (ips.length > 0) {
    console.log(` Network Overlay:   http://${ips[0]}:${PORT}/overlay.html`);
    console.log(` (Use Network Overlay link for OBS/vMix on other PCs!)`);
  }
  console.log(`====================================================`);
});
