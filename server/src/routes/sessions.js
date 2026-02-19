const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Helper to verify session ownership
async function verifySessionOwnership(sessionId, companyId) {
  const result = await query(
    'SELECT s.id, s.app_id, a.company_id FROM sessions s JOIN apps a ON s.app_id = a.id WHERE s.id = $1',
    [sessionId]
  );
  return result.rows.length > 0 && result.rows[0].company_id === companyId;
}

// GET /api/sessions - List all sessions for the company
router.get('/', async (req, res) => {
  try {
    const { app_id, status, limit = 20, offset = 0 } = req.query;

    let whereClause = 'WHERE s.company_id = $1';
    const params = [req.company.id];

    if (app_id) {
      // Verify app ownership
      const hasAccess = await query(
        'SELECT company_id FROM apps WHERE id = $1 AND company_id = $2',
        [app_id, req.company.id]
      );
      if (hasAccess.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
      whereClause += ' AND s.app_id = $' + (params.length + 1);
      params.push(app_id);
    }

    if (status) {
      whereClause += ' AND s.status = $' + (params.length + 1);
      params.push(status);
    }

    params.push(parseInt(limit), parseInt(offset));

    const result = await query(
      `SELECT s.*, a.name as app_name, a.platform
       FROM sessions s
       JOIN apps a ON s.app_id = a.id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM sessions s ${whereClause.split('ORDER BY')[0]}`,
      params.slice(0, -2)
    );

    res.json({
      sessions: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /api/sessions/:id - Get session details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const hasAccess = await verifySessionOwnership(id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sessionResult = await query(
      `SELECT s.*, a.name as app_name, a.platform, a.bundle_id
       FROM sessions s
       JOIN apps a ON s.app_id = a.id
       WHERE s.id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Get command count
    const commandCounts = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'failed') as failed,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'running') as running
       FROM commands WHERE session_id = $1`,
      [id]
    );

    // Get screen count
    const screenCount = await query(
      'SELECT COUNT(*) FROM screens WHERE session_id = $1',
      [id]
    );

    // Get test run if exists
    const testRunResult = await query(
      'SELECT * FROM test_runs WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );

    res.json({
      session,
      commands: commandCounts.rows[0],
      screenCount: parseInt(screenCount.rows[0].count),
      testRun: testRunResult.rows[0] || null
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// GET /api/sessions/:id/screens - Get session screens
router.get('/:id/screens', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const hasAccess = await verifySessionOwnership(id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const screensResult = await query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM elements WHERE screen_id = s.id) as element_count
       FROM screens s
       WHERE s.session_id = $1
       ORDER BY s.created_at ASC`,
      [id]
    );

    // Get elements for each screen
    const screens = await Promise.all(screensResult.rows.map(async (screen) => {
      const elementsResult = await query(
        'SELECT * FROM elements WHERE screen_id = $1 ORDER BY created_at ASC',
        [screen.id]
      );
      return {
        ...screen,
        elements: elementsResult.rows
      };
    }));

    res.json({ screens });
  } catch (error) {
    console.error('Get session screens error:', error);
    res.status(500).json({ error: 'Failed to get session screens' });
  }
});

// GET /api/sessions/:id/commands - Get session commands
router.get('/:id/commands', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    // Verify ownership
    const hasAccess = await verifySessionOwnership(id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let queryText = 'SELECT * FROM commands WHERE session_id = $1';
    const params = [id];

    if (status) {
      queryText += ' AND status = $2';
      params.push(status);
    }

    queryText += ' ORDER BY created_at ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);

    res.json({ commands: result.rows });
  } catch (error) {
    console.error('Get session commands error:', error);
    res.status(500).json({ error: 'Failed to get session commands' });
  }
});

// DELETE /api/sessions/:id - Cancel/delete session
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const hasAccess = await verifySessionOwnership(id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update session status to cancelled
    await query(
      `UPDATE sessions SET status = 'cancelled', completed_at = NOW() WHERE id = $1`,
      [id]
    );

    // Stop automation if running
    await query(
      `UPDATE automation_state SET is_running = false WHERE app_id = (SELECT app_id FROM sessions WHERE id = $1)`,
      [id]
    );

    res.json({ message: 'Session cancelled successfully' });
  } catch (error) {
    console.error('Cancel session error:', error);
    res.status(500).json({ error: 'Failed to cancel session' });
  }
});

module.exports = router;
