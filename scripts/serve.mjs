import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.txt':'text/plain; charset=utf-8'};
const server = http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (pathname.split('/').some(part=>part.startsWith('.'))) {res.writeHead(404).end('Not found');return;}
    let file = path.resolve(root,'.'+pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {res.writeHead(404).end('Not found');return;}
    if ((await stat(file)).isDirectory()) file = path.join(file,'index.html');
    const content = await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'}).end(content);
  } catch {res.writeHead(404).end('Not found');}
});
server.listen(port,'0.0.0.0',()=>console.log(`Local: http://localhost:${port}`));
