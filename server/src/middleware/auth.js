/**
 * AppLens Auth Middleware
 * Express middleware for authentication
 */

const authService = require('../services/auth');

// Verify JWT token middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = authService.verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
  
  req.companyId = decoded.companyId;
  req.company = decoded;
  next();
}

// Optional auth middleware (for public routes)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = authService.verifyToken(token);
  
  if (decoded) {
    req.companyId = decoded.companyId;
    req.company = decoded;
  }
  
  next();
}

module.exports = {
  authenticate,
  optionalAuth
};
