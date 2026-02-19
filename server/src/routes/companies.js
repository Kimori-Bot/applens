const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/companies/:id - Get company details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure user can only access their own company
    if (parseInt(id) !== req.company.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'SELECT id, name, email, api_key, created_at, updated_at FROM companies WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ company: result.rows[0] });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to get company' });
  }
});

// PATCH /api/companies/:id - Update company
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    // Ensure user can only update their own company
    if (parseInt(id) !== req.company.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'UPDATE companies SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3 RETURNING id, name, email, api_key, updated_at',
      [name, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [req.company.id, 'company_updated', { name, email }]
    );

    res.json({ company: result.rows[0] });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// POST /api/companies/:id/api-key - Generate API key
router.post('/:id/api-key', async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure user can only regenerate their own API key
    if (parseInt(id) !== req.company.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const crypto = require('crypto');
    const newApiKey = 'apl_' + crypto.randomBytes(16).toString('hex');

    const result = await query(
      'UPDATE companies SET api_key = $1 WHERE id = $2 RETURNING api_key',
      [newApiKey, id]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [req.company.id, 'api_key_generated', {}]
    );

    res.json({ apiKey: result.rows[0].api_key });
  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// GET /api/companies/:id/dashboard - Dashboard stats
router.get('/:id/dashboard', async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure user can only access their own dashboard
    if (parseInt(id) !== req.company.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get app counts
    const appCounts = await query(
      'SELECT platform, COUNT(*) as count FROM apps WHERE company_id = $1 GROUP BY platform',
      [id]
    );

    // Get total apps
    const totalApps = await query(
      'SELECT COUNT(*) as count FROM apps WHERE company_id = $1',
      [id]
    );

    // Get total issues
    const totalIssues = await query(
      `SELECT COUNT(*) as count FROM issues i
       JOIN apps a ON i.app_id = a.id
       WHERE a.company_id = $1`,
      [id]
    );

    // Get issues by severity
    const issuesBySeverity = await query(
      `SELECT i.severity, COUNT(*) as count FROM issues i
       JOIN apps a ON i.app_id = a.id
       WHERE a.company_id = $1
       GROUP BY i.severity`,
      [id]
    );

    // Get recent activity
    const recentActivity = await query(
      `SELECT id, action, details, created_at FROM activity_logs
       WHERE company_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [id]
    );

    // Get recent apps
    const recentApps = await query(
      `SELECT id, name, platform, bundle_id, created_at FROM apps
       WHERE company_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [id]
    );

    res.json({
      stats: {
        totalApps: parseInt(totalApps.rows[0]?.count || 0),
        iosApps: appCounts.rows.find(a => a.platform === 'ios')?.count || 0,
        androidApps: appCounts.rows.find(a => a.platform === 'android')?.count || 0,
        totalIssues: parseInt(totalIssues.rows[0]?.count || 0),
        issuesBySeverity: issuesBySeverity.rows.reduce((acc, row) => {
          acc[row.severity] = parseInt(row.count);
          return acc;
        }, {}),
      },
      recentActivity: recentActivity.rows,
      recentApps: recentApps.rows,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

module.exports = router;
