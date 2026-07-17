const { signToken } = require('../_lib/auth');
const { getDb } = require('../_lib/db');
const bcrypt = require('bcryptjs');

const BCRYPT_COST = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  // Only accept POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Parse body
  let body;
  try {
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const { email, password, name } = body || {};

  // Validate
  if (!email || !EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

  if (!password || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  if (!name || name.trim().length === 0) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  try {
    const db = await getDb();

    // Check duplicate email
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, BCRYPT_COST);

    // Insert user
    const result = await db.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, password_hash, name.trim()]
    );

    const user = result.rows[0];
    const token = signToken(user);

    res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
