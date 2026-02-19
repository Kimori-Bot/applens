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

// GET /api/apps - List all apps for the company
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT a.id, a.name, a.bundle_id, a.platform, a.created_at, a.updated_at,
              (SELECT COUNT(*) FROM screenshots WHERE app_id = a.id) as screenshot_count,
              (SELECT COUNT(*) FROM issues WHERE app_id = a.id) as issue_count,
              (SELECT COUNT(*) FROM sessions WHERE app_id = a.id) as session_count
       FROM apps a
       WHERE a.company_id = $1
       ORDER BY a.created_at DESC`,
      [req.company.id]
    );

    res.json({ apps: result.rows });
  } catch (error) {
    console.error('List apps error:', error);
    res.status(500).json({ error: 'Failed to list apps' });
  }
});

// GET /api/apps/companies/:companyId/apps - List company's apps (alternate route)
router.get('/companies/:companyId/apps', async (req, res) => {
  try {
    const { companyId } = req.params;

    // Ensure user can only access their own apps
    if (parseInt(companyId) !== req.company.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT a.id, a.name, a.bundle_id, a.platform, a.created_at, a.updated_at,
              (SELECT COUNT(*) FROM screenshots WHERE app_id = a.id) as screenshot_count,
              (SELECT COUNT(*) FROM issues WHERE app_id = a.id) as issue_count
       FROM apps a
       WHERE a.company_id = $1
       ORDER BY a.created_at DESC`,
      [companyId]
    );

    res.json({ apps: result.rows });
  } catch (error) {
    console.error('List apps error:', error);
    res.status(500).json({ error: 'Failed to list apps' });
  }
});

// POST /api/apps - Create new app
router.post('/', async (req, res) => {
  try {
    const { name, bundle_id, platform } = req.body;

    if (!name || !platform) {
      return res.status(400).json({ error: 'Name and platform are required' });
    }

    if (!['ios', 'android'].includes(platform)) {
      return res.status(400).json({ error: 'Platform must be ios or android' });
    }

    const result = await query(
      'INSERT INTO apps (company_id, name, bundle_id, platform) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.company.id, name, bundle_id, platform]
    );

    const app = result.rows[0];

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [req.company.id, 'app_created', { appId: app.id, appName: app.name, platform: app.platform }]
    );

    res.status(201).json({ app });
  } catch (error) {
    console.error('Create app error:', error);
    res.status(500).json({ error: 'Failed to create app' });
  }
});

// GET /api/apps/:id - Get app details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get app and verify ownership
    const appResult = await query(
      'SELECT * FROM apps WHERE id = $1',
      [id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'App not found' });
    }

    const app = appResult.rows[0];

    // Ensure user owns this app
    if (app.company_id !== req.company.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get screenshot count
    const screenshotCount = await query(
      'SELECT COUNT(*) FROM screenshots WHERE app_id = $1',
      [id]
    );

    // Get issue count
    const issueCount = await query(
      'SELECT COUNT(*) FROM issues WHERE app_id = $1',
      [id]
    );

    // Get session count
    const sessionCount = await query(
      'SELECT COUNT(*) FROM sessions WHERE app_id = $1',
      [id]
    );

    res.json({
      app: {
        ...app,
        screenshotCount: parseInt(screenshotCount.rows[0].count),
        issueCount: parseInt(issueCount.rows[0].count),
        sessionCount: parseInt(sessionCount.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Get app error:', error);
    res.status(500).json({ error: 'Failed to get app' });
  }
});

// PUT /api/apps/:id - Update app
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bundle_id, platform } = req.body;

    // Verify ownership
    const appResult = await query('SELECT company_id FROM apps WHERE id = $1', [id]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'App not found' });
    }

    if (appResult.rows[0].company_id !== req.company.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'UPDATE apps SET name = COALESCE($1, name), bundle_id = COALESCE($2, bundle_id), platform = COALESCE($3, platform) WHERE id = $4 RETURNING *',
      [name, bundle_id, platform, id]
    );

    res.json({ app: result.rows[0] });
  } catch (error) {
    console.error('Update app error:', error);
    res.status(500).json({ error: 'Failed to update app' });
  }
});

// DELETE /api/apps/:id - Delete app
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const appResult = await query('SELECT company_id, name FROM apps WHERE id = $1', [id]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'App not found' });
    }

    if (appResult.rows[0].company_id !== req.company.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM apps WHERE id = $1', [id]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [req.company.id, 'app_deleted', { appName: appResult.rows[0].name }]
    );

    res.json({ message: 'App deleted successfully' });
  } catch (error) {
    console.error('Delete app error:', error);
    res.status(500).json({ error: 'Failed to delete app' });
  }
});

// POST /api/apps/:id/test - Start test run
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { device_id, max_explorations = 100 } = req.body;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create a new session
    const sessionResult = await query(
      'INSERT INTO sessions (app_id, company_id, device_id, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, req.company.id, device_id, 'running']
    );
    const session = sessionResult.rows[0];

    // Create test run
    const testRunResult = await query(
      'INSERT INTO test_runs (app_id, session_id, status) VALUES ($1, $2, $3) RETURNING *',
      [id, session.id, 'running']
    );
    const testRun = testRunResult.rows[0];

    // Initialize automation state
    await query(
      `INSERT INTO automation_state (app_id, is_running, max_explorations, started_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (app_id) DO UPDATE SET
         is_running = true,
         max_explorations = $3,
         started_at = NOW(),
         exploration_count = 0,
         visited_screens = '[]'`,
      [id, true, max_explorations]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [req.company.id, 'test_started', { appId: id, sessionId: session.id }]
    );

    res.status(201).json({
      session,
      testRun,
      message: 'Test started successfully'
    });
  } catch (error) {
    console.error('Start test error:', error);
    res.status(500).json({ error: 'Failed to start test' });
  }
});

// GET /api/apps/:id/status - Get test status
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get latest session
    const sessionResult = await query(
      `SELECT * FROM sessions WHERE app_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    // Get latest test run
    const testRunResult = await query(
      `SELECT * FROM test_runs WHERE app_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    // Get automation state
    const automationResult = await query(
      'SELECT * FROM automation_state WHERE app_id = $1',
      [id]
    );

    // Get command counts
    if (sessionResult.rows.length > 0) {
      const commandCounts = await query(
        `SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'completed') as completed,
           COUNT(*) FILTER (WHERE status = 'failed') as failed
         FROM commands WHERE session_id = $1`,
        [sessionResult.rows[0].id]
      );

      res.json({
        session: sessionResult.rows[0] || null,
        testRun: testRunResult.rows[0] || null,
        automation: automationResult.rows[0] || null,
        commands: commandCounts.rows[0]
      });
    } else {
      res.json({
        session: null,
        testRun: testRunResult.rows[0] || null,
        automation: automationResult.rows[0] || null,
        commands: { total: 0, completed: 0, failed: 0 }
      });
    }
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// GET /api/apps/:id/screens - Get screens
router.get('/:id/screens', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get latest session
    const sessionResult = await query(
      `SELECT id FROM sessions WHERE app_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.json({ screens: [] });
    }

    const screensResult = await query(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM elements WHERE screen_id = s.id) as element_count
       FROM screens s
       WHERE s.session_id = $1
       ORDER BY s.created_at ASC`,
      [sessionResult.rows[0].id]
    );

    res.json({ screens: screensResult.rows });
  } catch (error) {
    console.error('Get screens error:', error);
    res.status(500).json({ error: 'Failed to get screens' });
  }
});

// GET /api/apps/:id/issues - Get issues
router.get('/:id/issues', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT i.*, s.screen_name, s.file_path as screenshot_path
       FROM issues i
       LEFT JOIN screenshots s ON i.screenshot_id = s.id
       WHERE i.app_id = $1
       ORDER BY 
         CASE i.severity 
           WHEN 'critical' THEN 1 
           WHEN 'high' THEN 2 
           WHEN 'medium' THEN 3 
           WHEN 'low' THEN 4 
           ELSE 5 
         END,
         i.created_at DESC`,
      [id]
    );

    // Group by severity
    const issuesBySeverity = result.rows.reduce((acc, issue) => {
      if (!acc[issue.severity]) {
        acc[issue.severity] = [];
      }
      acc[issue.severity].push(issue);
      return acc;
    }, {});

    res.json({
      issues: result.rows,
      issuesBySeverity,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Failed to get issues' });
  }
});

module.exports = router;
