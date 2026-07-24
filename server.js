const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
let currentGfxState = {
  theme: 'theme-starting-list',
  position: 'pos-bottom-grid',
  displayContent: 'both',
  nameFormat: 'full',
  timestamp: Date.now()
};

// SSE Clients Registry
const sseClients = new Set();

// Allowed Upstream Hostnames for SSRF Protection
const ALLOWED_UPSTREAM_HOSTS = [
  'apihub-staging.mikatiming.net',
  'apihub.mikatiming.net'
];

// Helper: Get Local Network IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    // Filter out VirtualBox, VMware, Hyper-V, and Docker virtual adapters
    if (/virtual|vbox|vmware|vEthernet|docker|loopback/i.test(name)) continue;

    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  // Fallback to all non-internal IPv4 if virtual filter filtered everything
  if (ips.length === 0) {
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push(iface.address);
        }
      }
    }
  }
  return ips;
}

// Broadcast State Update to SSE Clients
function broadcastGfxState(state) {
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const clientRes of sseClients) {
    clientRes.write(payload);
  }
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
  '.ico': 'image/x-icon',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
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

  // 2. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
  if (pathname === '/api/gfx-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(`data: ${JSON.stringify(currentGfxState)}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 3. GFX STATE API
  if (pathname === '/api/gfx-state') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 5 * 1024 * 1024) { // 5MB payload limit guard
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Payload Too Large' }));
          req.destroy();
        }
      });
      req.on('end', () => {
        try {
          currentGfxState = JSON.parse(body);
          currentGfxState.timestamp = Date.now();
          broadcastGfxState(currentGfxState);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', timestamp: currentGfxState.timestamp }));
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

  // 4. SECURE CORS PROXY FOR MIKA TIMING API
  if (pathname === '/api/proxy') {
    const targetUrlString = parsedUrl.searchParams.get('url');
    const apiKey = parsedUrl.searchParams.get('apiKey') || '';
    const apiVersion = parsedUrl.searchParams.get('apiVersion') || '1';

    if (!targetUrlString) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing target url parameter' }));
      return;
    }

    try {
      const targetUrl = new URL(targetUrlString);

      // SSRF Whitelist Check
      if (!ALLOWED_UPSTREAM_HOSTS.includes(targetUrl.hostname.toLowerCase())) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Access Forbidden: Domain not whitelisted for SSRF protection',
          targetHost: targetUrl.hostname
        }));
        return;
      }

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
        rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '1' // Configurable TLS verification
      };

      const requester = targetUrl.protocol === 'https:' ? https : http;

      const proxyReq = requester.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        // Stream response directly to client without buffering in memory
        proxyRes.pipe(res);
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

  // 5. SECURE STATIC FILE SERVER
  const targetFile = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.normalize(path.join(__dirname, targetFile));

  // Path Traversal Security Check
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden: Invalid Path');
    return;
  }

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

