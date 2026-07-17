const { requireAuth } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = requireAuth(req, res);
  if (!user) return;

  // user is already decoded from JWT: { user_id, email, name }
  res.status(200).json({
    id: user.user_id,
    email: user.email,
    name: user.name || '',
  });
};
