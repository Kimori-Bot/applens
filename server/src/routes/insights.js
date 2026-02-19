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

// GET /api/insights/:appId - Get AI insights for an app
router.get('/:appId', async (req, res) => {
  try {
    const { appId } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'SELECT * FROM app_insights WHERE app_id = $1',
      [appId]
    );

    if (result.rows.length === 0) {
      // Return empty insights if none generated yet
      return res.json({
        insights: null,
        message: 'No insights generated yet. Run analysis to generate insights.',
      });
    }

    res.json({ insights: result.rows[0] });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// POST /api/insights/:appId - Generate AI insights
router.post('/:appId', async (req, res) => {
  try {
    const { appId } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get app details and screenshots
    const appResult = await query('SELECT * FROM apps WHERE id = $1', [appId]);
    const app = appResult.rows[0];

    const screenshotsResult = await query(
      'SELECT id, screen_name, screen_purpose, navigation_order FROM screenshots WHERE app_id = $1 ORDER BY navigation_order',
      [appId]
    );
    const screenshots = screenshotsResult.rows;

    const issuesResult = await query(
      `SELECT severity, issue_type, description FROM issues WHERE app_id = $1`,
      [appId]
    );
    const issues = issuesResult.rows;

    // Generate AI insights based on available data
    // In production, this would call an AI service like OpenAI
    // For now, we generate insights from the available data
    
    // Generate app description
    let description = `AppLens analysis for ${app.name}`;
    if (app.platform) {
      description += ` (${app.platform.toUpperCase()})`;
    }
    if (app.bundle_id) {
      description += `\nBundle ID: ${app.bundle_id}`;
    }
    description += `\n\nThis app has been analyzed with ${screenshots.length} screens captured and ${issues.length} issues identified.`;

    // Generate screen mappings
    const screenMappings = screenshots.map((ss, index) => ({
      screenId: ss.id,
      name: ss.screen_name || `Screen ${index + 1}`,
      purpose: ss.screen_purpose || inferScreenPurpose(ss.screen_name, index, screenshots.length),
      order: index + 1,
    }));

    // Generate recommendations based on issues
    const recommendations = generateRecommendations(issues, screenshots.length);

    // Upsert insights
    const result = await query(
      `INSERT INTO app_insights (app_id, description, screen_mappings, recommendations)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (app_id) 
       DO UPDATE SET description = $2, screen_mappings = $3, recommendations = $4, generated_at = NOW()
       RETURNING *`,
      [appId, description, JSON.stringify(screenMappings), JSON.stringify(recommendations)]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (company_id, action, details) VALUES ($1, $2, $3)',
      [req.company.id, 'insights_generated', { appId, screenCount: screenshots.length, issueCount: issues.length }]
    );

    res.status(201).json({
      insights: result.rows[0],
      message: 'AI insights generated successfully',
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Helper function to infer screen purpose
function inferScreenPurpose(screenName, index, total) {
  const name = (screenName || '').toLowerCase();
  
  if (name.includes('splash') || name.includes('launch') || index === 0) {
    return 'Entry point - App launch screen';
  }
  if (name.includes('home')) {
    return 'Main navigation hub';
  }
  if (name.includes('login') || name.includes('signin') || name.includes('register')) {
    return 'Authentication flow';
  }
  if (name.includes('profile') || name.includes('settings')) {
    return 'User account management';
  }
  if (name.includes('detail')) {
    return 'Content detail view';
  }
  if (name.includes('list')) {
    return 'Content listing view';
  }
  
  return `Navigation step ${index + 1} of ${total}`;
}

// Helper function to generate recommendations
function generateRecommendations(issues, screenCount) {
  const recommendations = [];

  // Count issues by severity
  const severityCounts = issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {});

  // Add recommendations based on severity
  if (severityCounts.critical > 0) {
    recommendations.push({
      priority: 'critical',
      category: 'Stability',
      title: `Address ${severityCounts.critical} critical issue(s)`,
      description: 'Critical issues may cause app crashes or data loss. Address these immediately.',
    });
  }

  if (severityCounts.high > 0) {
    recommendations.push({
      priority: 'high',
      category: 'User Experience',
      title: `Address ${severityCounts.high} high priority issue(s)`,
      description: 'These issues significantly impact user experience and should be fixed soon.',
    });
  }

  // Screen count recommendations
  if (screenCount < 5) {
    recommendations.push({
      priority: 'medium',
      category: 'Coverage',
      title: 'Limited screen coverage',
      description: 'Consider exploring more screens to get a complete picture of the app.',
    });
  }

  // Issue type recommendations
  const issueTypes = issues.reduce((acc, issue) => {
    acc[issue.issue_type] = (acc[issue.issue_type] || 0) + 1;
    return acc;
  }, {});

  if (issueTypes.accessibility) {
    recommendations.push({
      priority: 'medium',
      category: 'Accessibility',
      title: 'Accessibility improvements needed',
      description: 'Consider improving accessibility to reach a wider audience.',
    });
  }

  if (issueTypes.ui_issue) {
    recommendations.push({
      priority: 'low',
      category: 'UI/UX',
      title: 'UI refinements suggested',
      description: 'Consider UI improvements for better user experience.',
    });
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      category: 'General',
      title: 'App looks good!',
      description: 'No major issues detected. Consider running additional tests for comprehensive coverage.',
    });
  }

  return recommendations;
}

// DELETE /api/insights/:appId - Delete insights
router.delete('/:appId', async (req, res) => {
  try {
    const { appId } = req.params;

    // Verify ownership
    const hasAccess = await verifyAppOwnership(appId, req.company.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query('DELETE FROM app_insights WHERE app_id = $1', [appId]);

    res.json({ message: 'Insights deleted successfully' });
  } catch (error) {
    console.error('Delete insights error:', error);
    res.status(500).json({ error: 'Failed to delete insights' });
  }
});

module.exports = router;
