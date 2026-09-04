#!/usr/bin/env node
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist', import.meta.url));
const keyPath = fileURLToPath(new URL('./preview-key.pem', import.meta.url));
const certPath = fileURLToPath(new URL('./preview-cert.pem', import.meta.url));
const port = Number(process.env.PREVIEW_PORT ?? 4322);

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 3650 -nodes -subj "/CN=localhost"`,
    { stdio: 'ignore' },
  );
}

const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

https
  .createServer(
    {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
    (req, res) => {
      let urlPath = decodeURIComponent(req.url?.split('?')[0] ?? '/');
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      const filePath = path.join(root, urlPath);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': types[path.extname(filePath)] ?? 'application/octet-stream',
        });
        res.end(data);
      });
    },
  )
  .listen(port, () => {
    process.stdout.write(`preview-https listening on https://localhost:${port}\n`);
  });
