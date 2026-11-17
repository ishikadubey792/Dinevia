import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse
} from '@angular/ssr/node';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const browserDistFolder = resolve(join(import.meta.dirname, '../browser'));
const angularApp = new AngularNodeAppEngine({
  allowedHosts: ['localhost', '127.0.0.1']
});

/**
 * Standard MIME types for static assets served from /browser
 */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.mjs': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=UTF-8',
  '.map': 'application/json; charset=UTF-8'
};

/**
 * Safely serves static assets from the /browser distribution folder:
 * - Serves matching physical files with correct MIME types and cache headers.
 * - Does not serve directory indices or index.html, allowing Angular SSR to handle routing.
 * - Protects against path traversal attacks.
 *
 * @returns true if the request was handled by serving a static file, false otherwise.
 */
function serveStaticFile(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }

  // Security guard: Reject path traversal attempts immediately
  const rawUrl = req.url || '/';
  if (rawUrl.includes('..') || rawUrl.toLowerCase().includes('%2e%2e')) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
    res.end('Forbidden');
    return true;
  }

  const host = req.headers.host || 'localhost';
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(req.url || '/', `http://${host}`).pathname);
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
    res.end('Bad Request');
    return true;
  }

  // Do not statically serve directory roots; pass to Angular SSR
  if (pathname === '/' || pathname.endsWith('/')) {
    return false;
  }

  // Normalize path and prevent directory traversal
  const safePath = normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = resolve(browserDistFolder, '.' + safePath);

  // Security guard: Ensure target path remains strictly inside the browser distribution directory
  if (!filePath.startsWith(browserDistFolder)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
    res.end('Forbidden');
    return true;
  }

  if (existsSync(filePath)) {
    try {
      const stat = statSync(filePath);
      if (stat.isFile()) {
        const ext = extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        if (req.method === 'HEAD') {
          res.end();
          return true;
        }

        const stream = createReadStream(filePath);
        stream.on('error', () => {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
            res.end('Internal Server Error');
          }
        });
        stream.pipe(res);
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Native Node.js request listener handling static assets and delegating to Angular SSR.
 */
export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next?: (err?: unknown) => void
): Promise<void> {
  // 1. Serve static files if matching file exists in /browser
  if (serveStaticFile(req, res)) {
    return;
  }

  // 2. Delegate to Angular SSR engine
  try {
    const response = await angularApp.handle(req);
    if (response) {
      await writeResponseToNodeResponse(response, res);
      return;
    }
  } catch (error) {
    if (next) {
      next(error);
      return;
    }
    console.error('Angular SSR Error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
      res.end('500 Internal Server Error');
    }
    return;
  }

  // 3. Fallback when neither a static asset nor an Angular route responded
  if (next) {
    next();
  } else if (!res.headersSent) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
    res.end('404 Not Found');
  }
}

/**
 * Start native HTTP server if this module is the main entry point or launched via PM2.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT']) || 4000;
  const server = createServer((req, res) => {
    handleRequest(req, res);
  });

  server.listen(port, () => {
    console.log(`Native Node.js HTTP server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI dev-server or serverless adapters.
 */
export const reqHandler = createNodeRequestHandler(handleRequest);
