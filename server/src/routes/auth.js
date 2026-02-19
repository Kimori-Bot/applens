const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../db');
const { generateToken, authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// POST /api/auth/register - Company signup
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Company name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validateRequest, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if company already exists
    const existing = await query('SELECT id FROM companies WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Company with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate API key
    const apiKey = 'apl_' + crypto.randomBytes(16).toString('hex');

    // Insert company
    const result = await query(
      'INSERT INTO companies (name, email, password_hash, api_key) VALUES ($1, $2, $3, $4) RETURNING id, name, email, api_key, created_at',
      [name, email, passwordHash, apiKey]
    );

    const company = result.rows[0];

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [company.id, 'company_registered', { email: company.email }]
    );

    // Generate JWT
    const token = generateToken(company);

    res.status(201).json({
      message: 'Company registered successfully',
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        apiKey: company.api_key,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login - Company login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find company
    const result = await query(
      'SELECT id, name, email, password_hash, api_key, created_at FROM companies WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const company = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, company.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [company.id, 'company_logged_in', { email: company.email }]
    );

    // Generate JWT
    const token = generateToken(company);

    res.json({
      message: 'Login successful',
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        apiKey: company.api_key,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me - Get current company
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      company: {
        id: req.company.id,
        name: req.company.name,
        email: req.company.email,
        apiKey: req.company.api_key,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get company info' });
  }
});

// POST /api/auth/refresh-token - Refresh JWT
router.post('/refresh-token', authenticateToken, async (req, res) => {
  try {
    const token = generateToken(req.company);
    res.json({ token });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [req.company.id, 'company_logged_out', { email: req.company.email }]
    );
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// POST /api/auth/change-password - Change password
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], validateRequest, authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const result = await query('SELECT password_hash FROM companies WHERE id = $1', [req.company.id]);
    const company = result.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, company.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query('UPDATE companies SET password_hash = $1 WHERE id = $2', [passwordHash, req.company.id]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [req.company.id, 'password_changed', {}]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/reset-password-request - Request password reset
router.post('/reset-password-request', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
], validateRequest, async (req, res) => {
  // In production, send email with reset token
  // For now, just return success to prevent email enumeration
  res.json({ message: 'If an account with that email exists, a password reset link has been sent' });
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], validateRequest, async (req, res) => {
  // In production, verify token and update password
  res.status(501).json({ error: 'Password reset not implemented yet' });
});

module.exports = router;
