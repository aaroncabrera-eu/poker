// Servidor local sencillo para probar la app (sin instalar nada).
// Uso: npm start  ->  abre http://localhost:5173
// Desde el móvil (misma wifi): usa la dirección "Red" que aparece al arrancar.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT) || 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};

http.createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404).end('No encontrado');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Local: http://localhost:${PORT}`);
  for (const nets of Object.values(networkInterfaces()))
    for (const n of nets ?? [])
      if (n.family === 'IPv4' && !n.internal) console.log(`  Red:   http://${n.address}:${PORT}`);
  console.log('');
});
