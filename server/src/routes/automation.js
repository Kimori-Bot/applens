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

// Helper: Use AI to decide next action
async function decideNextAction(appId, currentScreen, visitedScreens, elements) {
  // Simple AI decision logic - in production, this would call an AI service
  const actionTypes = ['tap', 'swipe_up', 'swipe_down', 'swipe_left', 'swipe_right'];
  
  if (!elements || elements.length === 0) {
    return { action: 'swipe_up', target: null };
  }

  // Find clickable elements
  const clickableElements = elements.filter(el => el.clickable);
  
  if (clickableElements.length > 0) {
    // Pick a random clickable element
    const randomEl = clickableElements[Math.floor(Math.random() * clickableElements.length)];
    return { 
      action: 'tap', 
      target: randomEl.element_id,
      params: { x: randomEl.bounds?.x, y: randomEl.bounds?.y }
    };
  }

  // No clickable elements, try swiping
  const randomAction = actionTypes[Math.floor(Math.random() * actionTypes.length)];
  return { action: randomAction, target: null };
}

// POST /api/automation/start - Start exploration
router.post('/start', async (req, res) => {
  try {
    const { app_id, max_explorations = 100 } = req.body;

    if (!app_id) {
      return res.status(400).json({ error: 'app_id is required' });
    }

    // Verify ownership
    const hasAccess = await verifyAppOwnership(app_id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already running
    const existingState = await query(
      'SELECT * FROM automation_state WHERE app_id = $1 AND is_running = true',
      [app_id]
    );

    if (existingState.rows.length > 0) {
      return res.status(400).json({ error: 'Automation already running for this app' });
    }

    // Create a new session
    const sessionResult = await query(
      'INSERT INTO sessions (app_id, company_id, status) VALUES ($1, $2, $3) RETURNING *',
      [app_id, req.company.id, 'running']
    );
    const session = sessionResult.rows[0];

    // Initialize automation state
    await query(
      `INSERT INTO automation_state (app_id, is_running, max_explorations, started_at, visited_screens)
       VALUES ($1, true, $2, NOW(), '[]')
       ON CONFLICT (app_id) DO UPDATE SET
         is_running = true,
         max_explorations = $2,
         started_at = NOW(),
         exploration_count = 0,
         visited_screens = '[]'`,
      [app_id, max_explorations]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [req.company.id, 'automation_started', { appId: app_id, sessionId: session.id }]
    );

    res.json({
      message: 'Automation started successfully',
      session
    });
  } catch (error) {
    console.error('Start automation error:', error);
    res.status(500).json({ error: 'Failed to start automation' });
  }
});

// POST /api/automation/stop - Stop exploration
router.post('/stop', async (req, res) => {
  try {
    const { app_id } = req.body;

    if (!app_id) {
      return res.status(400).json({ error: 'app_id is required' });
    }

    // Verify ownership
    const hasAccess = await verifyAppOwnership(app_id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Stop automation
    const result = await query(
      `UPDATE automation_state 
       SET is_running = false, updated_at = NOW() 
       WHERE app_id = $1 
       RETURNING *`,
      [app_id]
    );

    // Update session status
    await query(
      `UPDATE sessions 
       SET status = 'completed', completed_at = NOW() 
       WHERE app_id = $1 AND status = 'running'
       RETURNING *`,
      [app_id]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [req.company.id, 'automation_stopped', { appId: app_id }]
    );

    res.json({
      message: 'Automation stopped successfully',
      automationState: result.rows[0]
    });
  } catch (error) {
    console.error('Stop automation error:', error);
    res.status(500).json({ error: 'Failed to stop automation' });
  }
});

// GET /api/automation/status - Get automation status
router.get('/status', async (req, res) => {
  try {
    const { app_id } = req.query;

    if (!app_id) {
      return res.status(400).json({ error: 'app_id is required' });
    }

    // Verify ownership
    const hasAccess = await verifyAppOwnership(app_id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get automation state
    const automationResult = await query(
      'SELECT * FROM automation_state WHERE app_id = $1',
      [app_id]
    );

    // Get latest session
    const sessionResult = await query(
      `SELECT * FROM sessions WHERE app_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [app_id]
    );

    // Get command counts
    let commands = { total: 0, completed: 0, failed: 0 };
    if (sessionResult.rows.length > 0) {
      const commandCounts = await query(
        `SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'completed') as completed,
           COUNT(*) FILTER (WHERE status = 'failed') as failed
         FROM commands WHERE session_id = $1`,
        [sessionResult.rows[0].id]
      );
      commands = commandCounts.rows[0];
    }

    res.json({
      automation: automationResult.rows[0] || null,
      session: sessionResult.rows[0] || null,
      commands
    });
  } catch (error) {
    console.error('Get automation status error:', error);
    res.status(500).json({ error: 'Failed to get automation status' });
  }
});

// POST /api/automation/execute - Execute a single automation step
router.post('/execute', async (req, res) => {
  try {
    const { app_id, action, target, params } = req.body;

    if (!app_id || !action) {
      return res.status(400).json({ error: 'app_id and action are required' });
    }

    // Verify ownership
    const hasAccess = await verifyAppOwnership(app_id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get current session
    const sessionResult = await query(
      `SELECT * FROM sessions WHERE app_id = $1 AND status = 'running' ORDER BY created_at DESC LIMIT 1`,
      [app_id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active session found' });
    }

    const session = sessionResult.rows[0];

    // Insert command
    const commandResult = await query(
      `INSERT INTO commands (session_id, app_id, command_type, target, params, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [session.id, app_id, action, target, JSON.stringify(params || {})]
    );

    res.json({
      message: 'Command queued',
      command: commandResult.rows[0]
    });
  } catch (error) {
    console.error('Execute automation error:', error);
    res.status(500).json({ error: 'Failed to execute automation' });
  }
});

// POST /api/automation/next - Execute next AI-driven step
router.post('/next', async (req, res) => {
  try {
    const { app_id } = req.body;

    if (!app_id) {
      return res.status(400).json({ error: 'app_id is required' });
    }

    // Verify ownership
    const hasAccess = await verifyAppOwnership(app_id, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get automation state
    const automationResult = await query(
      'SELECT * FROM automation_state WHERE app_id = $1',
      [app_id]
    );

    if (automationResult.rows.length === 0 || !automationResult.rows[0].is_running) {
      return res.status(400).json({ error: 'Automation not running' });
    }

    const automationState = automationResult.rows[0];

    // Check max explorations
    if (automationState.exploration_count >= automationState.max_explorations) {
      await query(
        'UPDATE automation_state SET is_running = false WHERE app_id = $1',
        [app_id]
      );
      return res.json({ 
        done: true, 
        message: 'Max explorations reached',
        exploration_count: automationState.exploration_count
      });
    }

    // Get current session
    const sessionResult = await query(
      `SELECT * FROM sessions WHERE app_id = $1 AND status = 'running' ORDER BY created_at DESC LIMIT 1`,
      [app_id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active session found' });
    }

    const session = sessionResult.rows[0];

    // Get latest screen
    const screenResult = await query(
      `SELECT * FROM screens WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [session.id]
    );

    // Get elements for current screen
    let elements = [];
    if (screenResult.rows.length > 0) {
      const elementsResult = await query(
        'SELECT * FROM elements WHERE screen_id = $1',
        [screenResult.rows[0].id]
      );
      elements = elementsResult.rows;
    }

    // Decide next action using AI
    const decision = await decideNextAction(
      app_id,
      screenResult.rows[0]?.screen_name || null,
      automationState.visited_screens || [],
      elements
    );

    // Insert command
    const commandResult = await query(
      `INSERT INTO commands (session_id, app_id, command_type, target, params, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [session.id, app_id, decision.action, decision.target, JSON.stringify(decision.params || {})]
    );

    // Update automation state
    await query(
      `UPDATE automation_state 
       SET exploration_count = exploration_count + 1,
           last_action = $1,
           updated_at = NOW()
       WHERE app_id = $2`,
      [decision.action, app_id]
    );

    res.json({
      command: commandResult.rows[0],
      decision,
      exploration_count: automationState.exploration_count + 1,
      max_explorations: automationState.max_explorations
    });
  } catch (error) {
    console.error('Next automation step error:', error);
    res.status(500).json({ error: 'Failed to execute next step' });
  }
});

module.exports = router;
