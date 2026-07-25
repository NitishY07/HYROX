const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const REAL_ATHLETE_PAIRS = [
  { rank: 1, bib: '101', name: 'Daniel Seymour & Tanya Rajanish Nirmal', club: 'HYROX INDIA', nat: 'IND', split: 'SLED PUSH 50M', time: '00:00:00', delta: '' },
  { rank: 2, bib: '102', name: 'Manav Gidwani & Vishwaja Shinde', club: 'FITNESS FIRST', nat: 'IND', split: 'SKIERG 1000M', time: '00:00:00', delta: '+3.5s' },
  { rank: 3, bib: '103', name: 'Ajinkya Shevate & Manali Shevate', club: 'CROSSFIT 9ONE', nat: 'IND', split: 'BURPEE BROAD JUMP', time: '00:00:00', delta: '+7.2s' },
  { rank: 4, bib: '104', name: 'Vijay Andrews & Prachi Shukla', club: 'HYFIT ACADEMY', nat: 'IND', split: 'ROWING 1000M', time: '00:00:00', delta: '+11.0s' },
  { rank: 5, bib: '105', name: 'Chitwan Goel & Megha Kishore', club: 'VYOM YOGA STUDIO', nat: 'IND', split: 'FARMERS CARRY', time: '00:00:00', delta: '+15.1s' },
  { rank: 6, bib: '106', name: 'Teddy Cardozo & Swezial Dsouza', club: 'LIFTR GYM', nat: 'IND', split: 'SLED PULL 50M', time: '00:00:00', delta: '+18.8s' },
  { rank: 7, bib: '107', name: 'Brijesh Gajjar & Hetanshi Gajjar', club: 'FITFORMANCE', nat: 'IND', split: 'WALL BALLS 100', time: '00:00:00', delta: '+22.4s' },
  { rank: 8, bib: '108', name: 'Aanchal Singh & Harsh Kumar', club: '6262 FITNESS', nat: 'IND', split: 'SANDBAG LUNGES 100M', time: '00:00:00', delta: '+26.0s' },
  { rank: 9, bib: '109', name: 'Zaid Hashmi & Pournima Pardeshi', club: 'FLEXFIT', nat: 'IND', split: 'ROXZONE TRANSITION', time: '00:00:00', delta: '+30.2s' },
  { rank: 10, bib: '110', name: 'Sekhawat Monusingh & Susithra P M', club: 'HITENSITY', nat: 'IND', split: 'FINISH LINE', time: '00:00:00', delta: '+34.5s' },
  { rank: 11, bib: '111', name: 'Purva Wahi & Maninder Singh', club: 'ARCH PHYSIO', nat: 'IND', split: 'RUN 1 1000M', time: '00:00:00', delta: '+38.1s' },
  { rank: 12, bib: '112', name: 'Satvik Krishna Gupta & Millie Saroha', club: 'LATERALUS', nat: 'IND', split: 'SLED PUSH 50M', time: '00:00:00', delta: '+42.0s' },
  { rank: 13, bib: '113', name: 'Anand Bhagat & Zareen Siddique', club: 'THE FIT GROUND', nat: 'IND', split: 'SKIERG 1000M', time: '00:00:00', delta: '+46.2s' },
  { rank: 14, bib: '114', name: 'Shatrugan Joukani & Apeksha Champaneri', club: 'TRF SPACE', nat: 'IND', split: 'BURPEE BROAD JUMP', time: '00:00:00', delta: '+50.0s' },
  { rank: 15, bib: '115', name: 'Priyanka Prasad & Nobel Dhingra', club: 'BLACK BX', nat: 'IND', split: 'ROWING 1000M', time: '00:00:00', delta: '+54.1s' },
  { rank: 16, bib: '116', name: 'Sparsha S Vasisht & Surya S Vasisht', club: 'KONGFIT', nat: 'IND', split: 'FARMERS CARRY', time: '00:00:00', delta: '+58.5s' },
  { rank: 17, bib: '117', name: 'Deepak Kumar & Renu Venugopal', club: 'CROSSFIT HUB', nat: 'IND', split: 'SLED PULL 50M', time: '00:00:00', delta: '+1:03s' },
  { rank: 18, bib: '118', name: 'Megumi Saito & Anubhav Rai', club: 'HYROX TOKYO', nat: 'JPN', split: 'WALL BALLS 100', time: '00:00:00', delta: '+1:07s' },
  { rank: 19, bib: '119', name: 'Pravin Rao & Suditi Bhaduria', club: 'PEAK FITNESS', nat: 'IND', split: 'SANDBAG LUNGES 100M', time: '00:00:00', delta: '+1:11s' },
  { rank: 20, bib: '120', name: 'Priyam Poddar & Meenal Jain', club: 'RED BULL GYM', nat: 'IND', split: 'ROXZONE TRANSITION', time: '00:00:00', delta: '+1:15s' },
  { rank: 21, bib: '121', name: 'Parshant Sharma & Riya Kataria (Rekha)', club: 'FITZONE DELHI', nat: 'IND', split: 'FINISH LINE', time: '00:00:00', delta: '+1:20s' },
  { rank: 22, bib: '122', name: 'Ridhisha Shetty & Ritvik Shetty', club: 'MUMBAI STRIDERS', nat: 'IND', split: 'RUN 1 1000M', time: '00:00:00', delta: '+1:24s' },
  { rank: 23, bib: '123', name: 'Devender Singh & Rachna Kalkal', club: 'DELHI STEEL', nat: 'IND', split: 'SLED PUSH 50M', time: '00:00:00', delta: '+1:29s' },
  { rank: 24, bib: '124', name: 'Divtesh Singh Dhir & Palak Kaur', club: 'PUNJAB FITNESS', nat: 'IND', split: 'SKIERG 1000M', time: '00:00:00', delta: '+1:33s' },
  { rank: 25, bib: '125', name: 'Akshay Sharma & Akriti', club: 'STEEL GYM', nat: 'IND', split: 'BURPEE BROAD JUMP', time: '00:00:00', delta: '+1:37s' },
  { rank: 26, bib: '126', name: 'Ishani Dave & Meet Pandya', club: 'GUJARAT HARRIERS', nat: 'IND', split: 'ROWING 1000M', time: '00:00:00', delta: '+1:42s' },
  { rank: 27, bib: '127', name: 'Abhijeet Ghadge & Zahabiya Merchant', club: 'IRON GYM', nat: 'IND', split: 'FARMERS CARRY', time: '00:00:00', delta: '+1:46s' },
  { rank: 28, bib: '128', name: 'Gunjan Mehta & Mansi Nautiyal', club: 'POWER FITNESS', nat: 'IND', split: 'FINISH LINE', time: '00:00:00', delta: '+1:51s' }
];

let currentGfxState = {
  theme: 'theme-starting-list',
  position: 'pos-bottom-grid',
  displayContent: 'both',
  gridMode: 'startlist',
  raceClockTime: '00:03:31',
  nameFormat: 'full',
  leaderboard: REAL_ATHLETE_PAIRS,
  tickerItems: REAL_ATHLETE_PAIRS.map(p => ({ bib: p.bib, name: p.name, checkpoint: p.split, time: p.time })),
  visibleElements: {
    banner: false,
    leaderboard: true,
    lowerThird: false,
    ticker: true,
    showTimer: false,
    showClubs: true,
    raceClock: true
  },
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

