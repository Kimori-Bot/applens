const express = require('express');
const { query } = require('../db');

const router = express.Router();

// No authentication required for SDK endpoints - uses API key

// Helper to verify API key
async function verifyApiKey(req) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return null;
  }

  const result = await query(
    'SELECT id, name FROM companies WHERE api_key = $1',
    [apiKey]
  );

  return result.rows[0] || null;
}

// Helper to verify session ownership
async function verifySession(sessionId, companyId) {
  const result = await query(
    'SELECT s.*, a.company_id FROM sessions s JOIN apps a ON s.app_id = a.id WHERE s.id = $1',
    [sessionId]
  );
  return result.rows.length > 0 && result.rows[0].company_id === companyId;
}

// GET /api/test/commands - Poll for pending commands
router.get('/commands', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // Verify API key
    const company = await verifyApiKey(req);
    if (!company) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Verify session ownership
    const hasAccess = await verifySession(session_id, company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get pending commands
    const result = await query(
      `SELECT * FROM commands 
       WHERE session_id = $1 AND status IN ('pending', 'running')
       ORDER BY created_at ASC
       LIMIT 10`,
      [session_id]
    );

    // Mark commands as running
    for (const cmd of result.rows) {
      if (cmd.status === 'pending') {
        await query(
          'UPDATE commands SET status = $1 WHERE id = $2',
          ['running', cmd.id]
        );
      }
    }

    res.json({ commands: result.rows });
  } catch (error) {
    console.error('Get commands error:', error);
    res.status(500).json({ error: 'Failed to get commands' });
  }
});

// POST /api/test/commandResult - Report command result
router.post('/commandResult', async (req, res) => {
  try {
    const { command_id, status, result, error_message } = req.body;

    if (!command_id) {
      return res.status(400).json({ error: 'command_id is required' });
    }

    // Verify API key
    const company = await verifyApiKey(req);
    if (!company) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Get command and verify ownership
    const cmdResult = await query(
      `SELECT c.*, a.company_id FROM commands c 
       JOIN apps a ON c.app_id = a.id 
       WHERE c.id = $1`,
      [command_id]
    );

    if (cmdResult.rows.length === 0) {
      return res.status(404).json({ error: 'Command not found' });
    }

    if (cmdResult.rows[0].company_id !== company.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update command
    await query(
      `UPDATE commands 
       SET status = $1, result = $2, completed_at = NOW()
       WHERE id = $3`,
      [status, JSON.stringify(result || {}), command_id]
    );

    // Update session if failed
    if (status === 'failed') {
      await query(
        `UPDATE sessions 
         SET status = 'failed', error_message = $1, completed_at = NOW()
         WHERE id = $2`,
        [error_message, cmdResult.rows[0].session_id]
      );

      // Stop automation
      await query(
        'UPDATE automation_state SET is_running = false WHERE app_id = $1',
        [cmdResult.rows[0].app_id]
      );
    }

    res.json({ message: 'Command result recorded' });
  } catch (error) {
    console.error('Report command result error:', error);
    res.status(500).json({ error: 'Failed to report command result' });
  }
});

// POST /api/test/screen - Track screen
router.post('/screen', async (req, res) => {
  try {
    const { session_id, screen_name, screen_hash, screenshot_path } = req.body;

    if (!session_id || !screen_name) {
      return res.status(400).json({ error: 'session_id and screen_name are required' });
    }

    // Verify API key
    const company = await verifyApiKey(req);
    if (!company) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Verify session ownership
    const hasAccess = await verifySession(session_id, company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get app_id from session
    const sessionResult = await query(
      'SELECT app_id FROM sessions WHERE id = $1',
      [session_id]
    );

    // Insert screen
    const screenResult = await query(
      `INSERT INTO screens (session_id, app_id, screen_name, screen_hash, screenshot_path)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [session_id, sessionResult.rows[0].app_id, screen_name, screen_hash, screenshot_path]
    );

    // Update automation state
    await query(
      `UPDATE automation_state 
       SET current_screen = $1, updated_at = NOW()
       WHERE app_id = $2`,
      [screen_name, sessionResult.rows[0].app_id]
    );

    res.json({ screen: screenResult.rows[0] });
  } catch (error) {
    console.error('Track screen error:', error);
    res.status(500).json({ error: 'Failed to track screen' });
  }
});

// POST /api/test/element - Track element
router.post('/element', async (req, res) => {
  try {
    const { screen_id, element_id, element_type, text, bounds, resource_id, content_desc, enabled, clickable } = req.body;

    if (!screen_id || !element_id) {
      return res.status(400).json({ error: 'screen_id and element_id are required' });
    }

    // Verify API key
    const company = await verifyApiKey(req);
    if (!company) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Verify screen ownership
    const screenResult = await query(
      `SELECT s.*, a.company_id FROM screens s 
       JOIN apps a ON s.app_id = a.id 
       WHERE s.id = $1`,
      [screen_id]
    );

    if (screenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }

    if (screenResult.rows[0].company_id !== company.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Upsert element (update if exists, insert if not)
    const elementResult = await query(
      `INSERT INTO elements (screen_id, element_id, element_type, text, bounds, resource_id, content_desc, enabled, clickable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (screen_id, element_id) DO UPDATE SET
         element_type = $3,
         text = $4,
         bounds = $5,
         resource_id = $6,
         content_desc = $7,
         enabled = $8,
         clickable = $9
       RETURNING *`,
      [screen_id, element_id, element_type, text, JSON.stringify(bounds || {}), resource_id, content_desc, enabled !== false, clickable || false]
    );

    res.json({ element: elementResult.rows[0] });
  } catch (error) {
    console.error('Track element error:', error);
    res.status(500).json({ error: 'Failed to track element' });
  }
});

// GET /api/test/session - Get session info for SDK
router.get('/session', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // Verify API key
    const company = await verifyApiKey(req);
    if (!company) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Verify session ownership
    const hasAccess = await verifySession(session_id, company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get session details
    const sessionResult = await query(
      `SELECT s.*, a.name as app_name, a.platform
       FROM sessions s
       JOIN apps a ON s.app_id = a.id
       WHERE s.id = $1`,
      [session_id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get latest screen
    const latestScreen = await query(
      'SELECT * FROM screens WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1',
      [session_id]
    );

    res.json({
      session: sessionResult.rows[0],
      latestScreen: latestScreen.rows[0] || null
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// POST /api/test/heartbeat - SDK heartbeat to keep session alive
router.post('/heartbeat', async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // Verify API key
    const company = await verifyApiKey(req);
    if (!company) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Verify session ownership
    const hasAccess = await verifySession(session_id, company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ 
      status: 'alive', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Failed to process heartbeat' });
  }
});

module.exports = router;
