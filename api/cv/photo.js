const jwt = require('jsonwebtoken');
const { requireAuth } = require('../_lib/auth');
const { getDb } = require('../_lib/db');
const { put, del } = require('@vercel/blob');

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const JWT_SECRET = process.env.JWT_SECRET;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') return handlePost(req, res);
  if (req.method === 'GET') return handleGet(req, res);

  res.status(405).json({ error: 'Method not allowed' });
};

async function handlePost(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  let formData;
  try {
    formData = await getFormData(req);
  } catch (err) {
    res.status(400).json({ error: 'Failed to parse form data' });
    return;
  }

  const file = formData.get('file');
  if (!file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  // Validate MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    res.status(415).json({ error: 'Unsupported file type. Allowed: PNG, JPEG, WebP' });
    return;
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    res.status(413).json({ error: 'File too large. Maximum size is 2 MB' });
    return;
  }

  try {
    const ext = (file.name && file.name.split('.').pop()) || 'png';
    const filename = 'cv-photos/' + user.user_id + '/' + Date.now() + '.' + ext;
    const buffer = Buffer.from(await file.arrayBuffer());

    const blob = await put(filename, buffer, {
      access: 'public',
      token: BLOB_TOKEN,
    });

    // Delete old blob if replacing
    const db = await getDb();
    const result = await db.query(
      "SELECT data->'personalInfo'->>'photo' AS photo FROM cv_pools WHERE user_id = $1",
      [user.user_id]
    );

    const oldPhotoUrl = result.rows[0]?.photo;
    if (oldPhotoUrl) {
      try {
        await del(oldPhotoUrl, { token: BLOB_TOKEN });
      } catch (_) {
        // Non-critical: old blob may be deleted or URL malformed
      }
    }

    // Update database using jsonb_set
    await db.query(
      "UPDATE cv_pools SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{personalInfo,photo}', $1::jsonb), updated_at = NOW() WHERE user_id = $2",
      [JSON.stringify(blob.url), user.user_id]
    );

    res.status(200).json({ url: blob.url, filename: blob.pathname });
  } catch (err) {
    console.error('POST photo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req, res) {
  // Extract JWT from query param for <img> tags (cannot set Bearer header from markup)
  const token = req.query && req.query.token;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const db = await getDb();
    const result = await db.query(
      "SELECT data->'personalInfo'->>'photo' AS photo FROM cv_pools WHERE user_id = $1",
      [payload.user_id]
    );

    const photoUrl = result.rows[0]?.photo;
    if (!photoUrl) {
      res.status(404).json({ error: 'No photo found' });
      return;
    }

    // Fetch blob and pipe response (proxy — never expose the real Blob URL)
    const blobRes = await fetch(photoUrl);
    if (!blobRes.ok) {
      res.status(404).json({ error: 'Photo not found in storage' });
      return;
    }

    const contentType = blobRes.headers.get('Content-Type') || 'image/png';
    const buffer = Buffer.from(await blobRes.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.status(200).send(buffer);
  } catch (err) {
    console.error('GET photo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Parse multipart/form-data from a Node.js IncomingMessage.
 * Collects the body stream into a Buffer, then creates a web Request
 * to use the standard formData() API.
 */
async function getFormData(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const headers = {};
  for (const key of Object.keys(req.headers)) {
    const value = req.headers[key];
    if (value !== undefined && value !== null) {
      headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
    }
  }

  const webReq = new Request('http://localhost', {
    method: req.method,
    headers: headers,
    body: buffer,
  });

  return await webReq.formData();
}
