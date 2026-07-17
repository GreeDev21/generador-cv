const { requireAuth } = require('../_lib/auth');
const { getDb } = require('../_lib/db');

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const db = await getDb();
      const result = await db.query(
        'SELECT id, label, created_at, updated_at FROM cv_versions WHERE user_id = $1 ORDER BY created_at ASC',
        [user.user_id]
      );
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('GET versions error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  if (req.method === 'POST') {
    let body;
    try {
      if (typeof req.body === 'string') body = JSON.parse(req.body);
      else body = req.body;
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }

    if (!body || !body.label || !body.config) {
      res.status(400).json({ error: 'Missing "label" or "config" in request body' });
      return;
    }

    try {
      const db = await getDb();
      const result = await db.query(
        `INSERT INTO cv_versions (user_id, label, config, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, label, created_at, updated_at`,
        [user.user_id, body.label, JSON.stringify(body.config)]
      );
      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('POST version error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
