import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 3000);
const backendRaw = String(process.env.BACKEND_URL || '').replace(/\/+$/, '');

if (!backendRaw || !/^https?:\/\//i.test(backendRaw)) {
  throw new Error('BACKEND_URL must be the backend origin, e.g. https://backend.up.railway.app');
}

const backend = new URL(backendRaw);
const upstreamTransport = backend.protocol === 'https:' ? https : http;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:; upgrade-insecure-requests"
  );
}

function proxyHttp(req, res) {
  const headers = { ...req.headers, host: backend.host };
  headers['x-forwarded-host'] = req.headers.host || '';
  headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || 'https';

  const upstream = upstreamTransport.request(
    {
      protocol: backend.protocol,
      hostname: backend.hostname,
      port: backend.port || undefined,
      method: req.method,
      path: req.url,
      headers,
      timeout: 30_000,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );

  upstream.on('timeout', () => upstream.destroy(new Error('Backend proxy timeout')));
  upstream.on('error', (error) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ success: false, message: 'Backend temporarily unavailable.' }));
    console.error('[frontend proxy] HTTP error:', error.message);
  });

  req.pipe(upstream);
}

function safeStaticPath(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath.split('?')[0]);
  } catch {
    return null;
  }
  const relative = decoded.replace(/^\/+/, '');
  const candidate = path.resolve(distDir, relative);
  const root = `${path.resolve(distDir)}${path.sep}`;
  if (candidate !== path.resolve(distDir) && !candidate.startsWith(root)) return null;
  return candidate;
}

function sendFile(req, res, filePath, { immutable = false, noCache = false } = {}) {
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) return sendIndex(res);
    setSecurityHeaders(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    if (immutable) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else if (noCache) res.setHeader('Cache-Control', 'no-cache');
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

function sendIndex(res) {
  const indexPath = path.join(distDir, 'index.html');
  setSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(indexPath)
    .on('error', () => {
      res.statusCode = 503;
      res.end('Frontend build is unavailable. Run npm run build.');
    })
    .pipe(res);
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  // The browser only talks to this frontend origin. API and Socket.IO HTTP
  // traffic are forwarded server-side to the separate Railway backend.
  if (url === '/api' || url.startsWith('/api/') || url === '/socket.io' || url.startsWith('/socket.io/')) {
    return proxyHttp(req, res);
  }

  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    setSecurityHeaders(res);
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }

  const filePath = safeStaticPath(url);
  if (!filePath || filePath === path.resolve(distDir)) return sendIndex(res);
  const immutable = filePath.includes(`${path.sep}assets${path.sep}`);
  return sendFile(req, res, filePath, { immutable });
});

// Proxy Socket.IO/WebSocket upgrades through the same frontend origin.
server.on('upgrade', (req, clientSocket, head) => {
  const url = req.url || '';
  if (!(url === '/socket.io' || url.startsWith('/socket.io/'))) {
    clientSocket.destroy();
    return;
  }

  const headers = { ...req.headers, host: backend.host };
  headers['x-forwarded-host'] = req.headers.host || '';
  headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || 'https';

  const upstreamReq = upstreamTransport.request({
    protocol: backend.protocol,
    hostname: backend.hostname,
    port: backend.port || undefined,
    method: req.method,
    path: req.url,
    headers,
  });

  upstreamReq.on('upgrade', (upstreamRes, upstreamSocket, upstreamHead) => {
    let responseHead = `HTTP/1.1 ${upstreamRes.statusCode} ${upstreamRes.statusMessage || 'Switching Protocols'}\r\n`;
    for (let i = 0; i < upstreamRes.rawHeaders.length; i += 2) {
      responseHead += `${upstreamRes.rawHeaders[i]}: ${upstreamRes.rawHeaders[i + 1]}\r\n`;
    }
    responseHead += '\r\n';
    clientSocket.write(responseHead);
    if (upstreamHead?.length) clientSocket.write(upstreamHead);
    if (head?.length) upstreamSocket.write(head);
    upstreamSocket.pipe(clientSocket).pipe(upstreamSocket);
  });

  upstreamReq.on('response', (upstreamRes) => {
    clientSocket.write(`HTTP/1.1 ${upstreamRes.statusCode || 502} ${upstreamRes.statusMessage || ''}\r\n\r\n`);
    clientSocket.destroy();
  });
  upstreamReq.on('error', (error) => {
    console.error('[frontend proxy] WebSocket error:', error.message);
    clientSocket.destroy();
  });
  upstreamReq.end();
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[frontend] listening on ${port}; proxying /api and /socket.io to ${backend.origin}`);
});
