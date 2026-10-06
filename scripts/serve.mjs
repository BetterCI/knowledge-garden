import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('site');
const port = Number(process.env.PORT || 4173);
const base = process.env.GARDEN_BASE_PATH || '/';
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json' };
const server = http.createServer(async (req,res) => {
  try {
    const incoming = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!incoming.startsWith(base)) { res.writeHead(404).end('Not found'); return; }
    const pathname = '/' + incoming.slice(base.length);
    const target = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const body = await fs.readFile(target);
    res.writeHead(200, { 'Content-Type':mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Knowledge Garden: http://127.0.0.1:${port}${base}`));
