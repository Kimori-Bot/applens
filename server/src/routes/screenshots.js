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

// GET /api/screenshots/:appId - Get all screenshots for an app
router.get('/:appId', async (req, res) => {
  try {
    const { appId } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT id, app_id, file_path, thumbnail_path, screen_name, screen_purpose, navigation_order, created_at
       FROM screenshots
       WHERE app_id = $1
       ORDER BY navigation_order ASC, created_at ASC`,
      [appId]
    );

    res.json({ screenshots: result.rows });
  } catch (error) {
    console.error('Get screenshots error:', error);
    res.status(500).json({ error: 'Failed to get screenshots' });
  }
});

// GET /api/screenshots/:appId/:screenshotId - Get single screenshot
router.get('/:appId/:screenshotId', async (req, res) => {
  try {
    const { appId, screenshotId } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'SELECT * FROM screenshots WHERE id = $1 AND app_id = $2',
      [screenshotId, appId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }

    res.json({ screenshot: result.rows[0] });
  } catch (error) {
    console.error('Get screenshot error:', error);
    res.status(500).json({ error: 'Failed to get screenshot' });
  }
});

// POST /api/screenshots/:appId - Add screenshot(s)
router.post('/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { screenshots } = req.body; // Array of { file_path, screen_name, screen_purpose, navigation_order }

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!Array.isArray(screenshots) || screenshots.length === 0) {
      return res.status(400).json({ error: 'Screenshots array is required' });
    }

    const insertedScreenshots = [];
    for (const ss of screenshots) {
      const result = await query(
        `INSERT INTO screenshots (app_id, file_path, thumbnail_path, screen_name, screen_purpose, navigation_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [appId, ss.file_path, ss.thumbnail_path, ss.screen_name, ss.screen_purpose, ss.navigation_order || 0]
      );
      insertedScreenshots.push(result.rows[0]);
    }

    res.status(201).json({ screenshots: insertedScreenshots });
  } catch (error) {
    console.error('Create screenshot error:', error);
    res.status(500).json({ error: 'Failed to create screenshot' });
  }
});

// PUT /api/screenshots/:appId/:screenshotId - Update screenshot metadata
router.put('/:appId/:screenshotId', async (req, res) => {
  try {
    const { appId, screenshotId } = req.params;
    const { screen_name, screen_purpose, navigation_order } = req.body;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `UPDATE screenshots 
       SET screen_name = COALESCE($1, screen_name),
           screen_purpose = COALESCE($2, screen_purpose),
           navigation_order = COALESCE($3, navigation_order)
       WHERE id = $4 AND app_id = $5
       RETURNING *`,
      [screen_name, screen_purpose, navigation_order, screenshotId, appId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }

    res.json({ screenshot: result.rows[0] });
  } catch (error) {
    console.error('Update screenshot error:', error);
    res.status(500).json({ error: 'Failed to update screenshot' });
  }
});

// DELETE /api/screenshots/:appId/:screenshotId - Delete screenshot
router.delete('/:appId/:screenshotId', async (req, res) => {
  try {
    const { appId, screenshotId } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'DELETE FROM screenshots WHERE id = $1 AND app_id = $2 RETURNING id',
      [screenshotId, appId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }

    res.json({ message: 'Screenshot deleted successfully' });
  } catch (error) {
    console.error('Delete screenshot error:', error);
    res.status(500).json({ error: 'Failed to delete screenshot' });
  }
});

// GET /api/screenshots/:appId/flow - Get navigation flow
router.get('/:appId/flow', async (req, res) => {
  try {
    const { appId } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all screenshots in order
    const screenshots = await query(
      `SELECT id, screen_name, screen_purpose, navigation_order
       FROM screenshots
       WHERE app_id = $1
       ORDER BY navigation_order ASC, id ASC`,
      [appId]
    );

    // Build flow structure
    const flow = screenshots.rows.map((ss, index) => ({
      id: ss.id,
      name: ss.screen_name || `Screen ${index + 1}`,
      purpose: ss.screen_purpose,
      order: ss.navigation_order || index,
      next: index < screenshots.rows.length - 1 ? screenshots.rows[index + 1].id : null,
      previous: index > 0 ? screenshots.rows[index - 1].id : null,
    }));

    res.json({ flow });
  } catch (error) {
    console.error('Get navigation flow error:', error);
    res.status(500).json({ error: 'Failed to get navigation flow' });
  }
});

module.exports = router;
