const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Helper to verify app ownership
async function verifyAppOwnership(appId, companyId) {
  const result = await query(
    'SELECT company_id FROM apps WHERE id = $1',
    [appId]
  );
  return result.rows.length > 0 && result.rows[0].company_id === companyId;
}

// GET /api/issues/:appId - Get all issues for an app
router.get('/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { severity, issue_type, limit = 50, offset = 0 } = req.query;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let whereClause = 'WHERE i.app_id = $1';
    const params = [appId];

    if (severity) {
      whereClause += ' AND i.severity = $2';
      params.push(severity);
    }

    if (issue_type) {
      whereClause += params.length === 2 
        ? ' AND i.issue_type = $3' 
        : ' AND i.issue_type = $2';
      params.push(issue_type);
    }

    params.push(parseInt(limit), parseInt(offset));

    const result = await query(
      `SELECT i.id, i.severity, i.issue_type, i.description, i.created_at,
              s.id as screenshot_id, s.file_path, s.screen_name
       FROM issues i
       LEFT JOIN screenshots s ON i.screenshot_id = s.id
       ${whereClause}
       ORDER BY 
         CASE i.severity 
           WHEN 'critical' THEN 1 
           WHEN 'high' THEN 2 
           WHEN 'medium' THEN 3 
           WHEN 'low' THEN 4 
           ELSE 5 
         END,
         i.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM issues i ${whereClause.replace('LIMIT $' + (params.length - 1), '').replace(' OFFSET $' + params.length, '')}`,
      params.slice(0, -2)
    );

    res.json({
      issues: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Failed to get issues' });
  }
});

// GET /api/issues/:appId/:issueId - Get single issue
router.get('/:appId/:issueId', async (req, res) => {
  try {
    const { appId, issueId } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT i.*, s.file_path as screenshot_path, s.screen_name
       FROM issues i
       LEFT JOIN screenshots s ON i.screenshot_id = s.id
       WHERE i.id = $1 AND i.app_id = $2`,
      [issueId, appId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ issue: result.rows[0] });
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({ error: 'Failed to get issue' });
  }
});

// POST /api/issues/:appId - Create issue(s)
router.post('/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { issues } = req.body; // Array of { severity, issue_type, description, screenshot_id }

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ error: 'Issues array is required' });
    }

    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    const insertedIssues = [];

    for (const issue of issues) {
      if (!issue.issue_type) {
        continue;
      }

      const severity = validSeverities.includes(issue.severity) ? issue.severity : 'info';

      const result = await query(
        `INSERT INTO issues (app_id, screenshot_id, severity, issue_type, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [appId, issue.screenshot_id, severity, issue.issue_type, issue.description]
      );
      insertedIssues.push(result.rows[0]);
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [req.company.id, 'issues_created', { appId, count: insertedIssues.length }]
    );

    res.status(201).json({ issues: insertedIssues });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// PUT /api/issues/:appId/:issueId - Update issue
router.put('/:appId/:issueId', async (req, res) => {
  try {
    const { appId, issueId } = req.params;
    const { severity, issue_type, description } = req.body;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    const severityValue = validSeverities.includes(severity) ? severity : null;

    const result = await query(
      `UPDATE issues 
       SET severity = COALESCE($1, severity),
           issue_type = COALESCE($2, issue_type),
           description = COALESCE($3, description)
       WHERE id = $4 AND app_id = $5
       RETURNING *`,
      [severityValue, issue_type, description, issueId, appId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ issue: result.rows[0] });
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// DELETE /api/issues/:appId/:issueId - Delete issue
router.delete('/:appId/:issueId', async (req, res) => {
  try {
    const { appId, issueId } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'DELETE FROM issues WHERE id = $1 AND app_id = $2 RETURNING id',
      [issueId, appId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

// GET /api/issues/:appId/summary - Get issue summary
router.get('/:appId/summary', async (req, res) => {
  try {
    const { appId } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get count by severity
    const bySeverity = await query(
      `SELECT severity, COUNT(*) as count 
       FROM issues 
       WHERE app_id = $1 
       GROUP BY severity`,
      [appId]
    );

    // Get count by type
    const byType = await query(
      `SELECT issue_type, COUNT(*) as count 
       FROM issues 
       WHERE app_id = $1 
       GROUP BY issue_type
       ORDER BY count DESC`,
      [appId]
    );

    // Get total
    const total = await query(
      'SELECT COUNT(*) as count FROM issues WHERE app_id = $1',
      [appId]
    );

    res.json({
      total: parseInt(total.rows[0].count),
      bySeverity: bySeverity.rows.reduce((acc, row) => {
        acc[row.severity] = parseInt(row.count);
        return acc;
      }, {}),
      byType: byType.rows,
    });
  } catch (error) {
    console.error('Get issue summary error:', error);
    res.status(500).json({ error: 'Failed to get issue summary' });
  }
});

module.exports = router;
