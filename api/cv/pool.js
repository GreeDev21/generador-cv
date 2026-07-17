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
        'SELECT data FROM cv_pools WHERE user_id = $1',
        [user.user_id]
      );
      res.status(200).json({ data: result.rows[0]?.data || null });
    } catch (err) {
      console.error('GET pool error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  if (req.method === 'PUT') {
    let body;
    try {
      if (typeof req.body === 'string') body = JSON.parse(req.body);
      else body = req.body;
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }

    if (!body || body.data === undefined) {
      res.status(400).json({ error: 'Missing "data" in request body' });
      return;
    }

    try {
      const db = await getDb();
      await db.query(
        `INSERT INTO cv_pools (user_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET data = $2, updated_at = NOW()`,
        [user.user_id, JSON.stringify(body.data)]
      );
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('PUT pool error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
