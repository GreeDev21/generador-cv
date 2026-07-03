// Greedev CV — Local HTTP Server (Node.js stdlib, zero npm)
// Serves static files, exposes POST /api/save for filesystem writes,
// and GET /api/versions for version listing.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function getMimeType(ext) {
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Reject paths containing '..' to prevent directory traversal.
 */
function isSafePath(p) {
  // Normalize to forward slashes for checking
  const normalized = p.replace(/\\/g, '/');
  return !normalized.includes('..');
}

/**
 * Collect the entire request body as a string.
 */
function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname;

    // ── POST /api/save ───────────────────────────────────────────────
    if (req.method === 'POST' && pathname === '/api/save') {
      let body;
      try {
        body = await collectBody(req);
        const parsed = JSON.parse(body);

        if (!parsed.path || parsed.content === undefined) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Missing "path" or "content" in request body' }));
        }

        if (!isSafePath(parsed.path)) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Invalid path' }));
        }

        const fullPath = path.join(ROOT, parsed.path);
        const dir = path.dirname(fullPath);

        // Create parent directories if they don't exist
        await fs.promises.mkdir(dir, { recursive: true });

        // Write file with 2-space indentation
        await fs.promises.writeFile(fullPath, JSON.stringify(parsed.content, null, 2), 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        if (err instanceof SyntaxError) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
        }
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    }

    // ── DELETE /api/save ──────────────────────────────────────────────
    if (req.method === 'DELETE' && pathname === '/api/save') {
      let body;
      try {
        body = await collectBody(req);
        const parsed = JSON.parse(body);
        if (!parsed.path) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Missing "path" in request body' }));
        }
        if (!isSafePath(parsed.path)) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Invalid path' }));
        }
        const fullPath = path.join(ROOT, parsed.path);
        await fs.promises.unlink(fullPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    }

    // ── GET /api/versions ────────────────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/versions') {
      const versionsDir = path.join(ROOT, 'data', 'versions');

      let files;
      try {
        files = await fs.promises.readdir(versionsDir);
      } catch {
        // Directory doesn't exist yet — return empty list
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify([]));
      }

      const jsonFiles = files.filter((f) => f.endsWith('.json'));
      const versions = [];

      for (const file of jsonFiles) {
        try {
          const content = await fs.promises.readFile(path.join(versionsDir, file), 'utf8');
          const parsed = JSON.parse(content);
          versions.push({
            id: parsed.id,
            label: parsed.label,
            created: parsed.created,
            updated: parsed.updated,
          });
        } catch {
          // Skip malformed version files
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(versions));
    }

    // ── GET static files ─────────────────────────────────────────────
    if (req.method === 'GET') {
      // Default to index.html for root
      let safePath = pathname === '/' ? '/index.html' : pathname;

      if (!isSafePath(safePath)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Bad request');
      }

      const fullPath = path.join(ROOT, safePath);

      try {
        const content = await fs.promises.readFile(fullPath);
        const ext = path.extname(fullPath);
        res.writeHead(200, { 'Content-Type': getMimeType(ext) });
        return res.end(content);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not found');
      }
    }

    // ── Fallback: 404 ────────────────────────────────────────────────
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal server error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CV Server running on http://0.0.0.0:${PORT}`);
});
