const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '7d';

/**
 * Extract and verify a JWT from the Authorization header.
 * On success, attaches req.user = { user_id, email } and returns the user.
 * On failure, sends 401 and returns null.
 */
function requireAuth(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { user_id: payload.user_id, email: payload.email };
    return req.user;
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
}

/**
 * Sign a JWT for the given user.
 */
function signToken(user) {
  return jwt.sign(
    { user_id: user.id, email: user.email, name: user.name || '' },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

module.exports = { requireAuth, signToken };
