const { requireAuth } = require('../../_lib/auth');
const { getDb } = require('../../_lib/db');

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  // Extract :id from the URL path: /api/cv/versions/{id}
  // Vercel passes it as req.query.id
  const versionId = req.query.id;

  if (!versionId) {
    res.status(400).json({ error: 'Version ID is required' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const db = await getDb();

    if (req.method === 'GET') {
      const result = await db.query(
        'SELECT config FROM cv_versions WHERE user_id = $1 AND id = $2',
        [user.user_id, versionId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Version not found' });
        return;
      }

      res.status(200).json(result.rows[0].config);
      return;
    }

    if (req.method === 'PATCH') {
      let body;
      try {
        if (typeof req.body === 'string') body = JSON.parse(req.body);
        else body = req.body;
      } catch {
        res.status(400).json({ error: 'Invalid JSON body' });
        return;
      }

      if (!body || (body.label === undefined && body.config === undefined)) {
        res.status(400).json({ error: 'Missing "label" or "config" to update' });
        return;
      }

      // Build dynamic UPDATE
      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      if (body.label !== undefined) {
        setClauses.push(`label = $${paramIndex++}`);
        values.push(body.label);
      }
      if (body.config !== undefined) {
        setClauses.push(`config = $${paramIndex++}`);
        values.push(JSON.stringify(body.config));
      }

      setClauses.push(`updated_at = NOW()`);

      values.push(user.user_id, versionId);

      const result = await db.query(
        `UPDATE cv_versions SET ${setClauses.join(', ')}
         WHERE user_id = $${paramIndex++} AND id = $${paramIndex}
         RETURNING id, label, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Version not found' });
        return;
      }

      res.status(200).json(result.rows[0]);
      return;
    }

    if (req.method === 'DELETE') {
      // Check count
      const countResult = await db.query(
        'SELECT COUNT(*)::int AS count FROM cv_versions WHERE user_id = $1',
        [user.user_id]
      );

      if (countResult.rows[0].count <= 1) {
        res.status(400).json({ error: 'Cannot delete the last version' });
        return;
      }

      const result = await db.query(
        'DELETE FROM cv_versions WHERE user_id = $1 AND id = $2 RETURNING id',
        [user.user_id, versionId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Version not found' });
        return;
      }

      res.status(204).end();
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Version handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
