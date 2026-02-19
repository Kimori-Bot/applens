const jwt = require('jsonwebtoken');
const { query } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function generateToken(company) {
  return jwt.sign(
    { 
      id: company.id, 
      email: company.email, 
      name: company.name 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Verify company still exists
    try {
      const result = await query('SELECT id, name, email, api_key FROM companies WHERE id = $1', [decoded.id]);
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Company not found' });
      }

      req.company = result.rows[0];
      next();
    } catch (dbError) {
      console.error('Database error during auth:', dbError);
      return res.status(500).json({ error: 'Authentication verification failed' });
    }
  });
}

function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  query('SELECT id, name, email FROM companies WHERE api_key = $1', [apiKey])
    .then(result => {
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Invalid API key' });
      }
      req.company = result.rows[0];
      next();
    })
    .catch(err => {
      console.error('API key verification error:', err);
      res.status(500).json({ error: 'API key verification failed' });
    });
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  requireApiKey,
};
