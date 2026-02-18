/**
 * AppLens Auth Routes
 * API endpoints for authentication
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/auth');

// POST /api/auth/register - Sign up
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const result = await authService.register(name, email, password);

    res.status(201).json({
      message: 'Registration successful',
      ...result
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// POST /api/auth/login - Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password);

    res.json({
      message: 'Login successful',
      ...result
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Invalid credentials' });
  }
});

// GET /api/auth/me - Get current company
router.get('/me', authService.verifyTokenMiddleware, async (req, res) => {
  try {
    const company = await authService.getCompanyById(req.companyId);
    res.json({ company });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(404).json({ error: 'Company not found' });
  }
});

// POST /api/auth/api-key - Generate/regenerate API key
router.post('/api-key', authService.verifyTokenMiddleware, async (req, res) => {
  try {
    const result = await authService.regenerateApiKey(req.companyId);
    res.json({
      message: 'API key regenerated successfully',
      apiKey: result.company.apiKey
    });
  } catch (error) {
    console.error('API key generation error:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

module.exports = router;
