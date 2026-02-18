/**
 * AppLens API Server
 * Week 2 Enhanced - Screenshot capture, human review markers, export reports
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased for base64 images

// In-memory storage
const memoryStore = {
  screens: [],
  elements: [],
  sessions: [],
  issues: [],
  screenshots: [],
  activities: [],
};

// Helper: Get session duration
const getSessionDuration = (session) => {
  const start = new Date(session.started_at || session.created_at);
  const end = session.ended_at ? new Date(session.ended_at) : new Date();
  const diff = end - start;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

// Helper: Format date for filtering
const formatDate = (date) => new Date(date).toISOString().split('T')[0];

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ SCREENSHOT ENDPOINTS ============

// Store screenshot
app.post('/api/screenshot', async (req, res) => {
  try {
    const { sessionId, appId, screenshot } = req.body;
    
    const screenshotRecord = {
      session_id: sessionId,
      app_id: appId,
      screenshot_id: screenshot.id,
      data: screenshot.data, // base64
      screen_name: screenshot.screen,
      timestamp: new Date(screenshot.timestamp),
      created_at: new Date(),
      markers: [], // Issue markers will be added here
    };
    
    memoryStore.screenshots.push(screenshotRecord);
    
    res.json({ success: true, id: screenshot.id });
  } catch (error) {
    console.error('Error storing screenshot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get screenshots for a session
app.get('/api/session/:id/screenshots', (req, res) => {
  const { id } = req.params;
  
  const screenshots = memoryStore.screenshots
    .filter(s => s.session_id === id)
    .map(s => ({
      id: s.screenshot_id,
      screen_name: s.screen_name,
      timestamp: s.timestamp,
      markers: s.markers,
      // Don't send full base64 for list view
      has_image: !!s.data,
    }));
  
  res.json(screenshots);
});

// Get single screenshot with image data
app.get('/api/screenshot/:id', (req, res) => {
  const { id } = req.params;
  
  const screenshot = memoryStore.screenshots.find(s => s.screenshot_id === id);
  if (!screenshot) {
    return res.status(404).json({ error: 'Screenshot not found' });
  }
  
  res.json({
    id: screenshot.screenshot_id,
    session_id: screenshot.session_id,
    data: screenshot.data,
    screen_name: screenshot.screen_name,
    timestamp: screenshot.timestamp,
    markers: screenshot.markers,
  });
});

// Add marker to screenshot (human review)
app.post('/api/screenshot/:id/marker', (req, res) => {
  try {
    const { id } = req.params;
    const { x, y, description, type = 'issue' } = req.body;
    
    const screenshot = memoryStore.screenshots.find(s => s.screenshot_id === id);
    if (!screenshot) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }
    
    const marker = {
      id: `marker_${Date.now()}`,
      x,
      y,
      description,
      type,
      created_at: new Date(),
    };
    
    screenshot.markers = screenshot.markers || [];
    screenshot.markers.push(marker);
    
    // Also create an issue record
    const issue = {
      session_id: screenshot.session_id,
      app_id: screenshot.app_id,
      type: 'review_mark',
      description: `${type}: ${description} (at ${x}%, ${y}%)`,
      severity: 'medium',
      status: 'open',
      screenshot_id: id,
      marker_x: x,
      marker_y: y,
      created_at: new Date(),
    };
    memoryStore.issues.push(issue);
    
    res.json({ success: true, marker });
  } catch (error) {
    console.error('Error adding marker:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get markers for a screenshot
app.get('/api/screenshot/:id/markers', (req, res) => {
  const { id } = req.params;
  
  const screenshot = memoryStore.screenshots.find(s => s.screenshot_id === id);
  if (!screenshot) {
    return res.status(404).json({ error: 'Screenshot not found' });
  }
  
  res.json(screenshot.markers || []);
});

// ============ SCREEN & ELEMENT ENDPOINTS ============

// Store screen event
app.post('/api/screen', async (req, res) => {
  try {
    const { sessionId, appId, screen } = req.body;
    
    const screenRecord = {
      session_id: sessionId,
      app_id: appId,
      screen_id: screen.id,
      screen_name: screen.name,
      timestamp: new Date(screen.timestamp),
      created_at: new Date(),
    };
    
    memoryStore.screens.push(screenRecord);
    res.json({ success: true, id: screen.id });
  } catch (error) {
    console.error('Error storing screen:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all screens
app.get('/api/screens', (req, res) => {
  res.json(memoryStore.screens);
});

// Store element event
app.post('/api/element', async (req, res) => {
  try {
    const { sessionId, appId, element } = req.body;
    
    const elementRecord = {
      session_id: sessionId,
      app_id: appId,
      element_id: element.id,
      element_type: element.type,
      element_label: element.label,
      screen_name: element.screen,
      timestamp: new Date(element.timestamp),
      created_at: new Date(),
    };
    
    memoryStore.elements.push(elementRecord);
    res.json({ success: true, id: element.id });
  } catch (error) {
    console.error('Error storing element:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all elements
app.get('/api/elements', (req, res) => {
  res.json(memoryStore.elements);
});

// ============ SESSION ENDPOINTS ============

// Store activity
app.post('/api/activity', (req, res) => {
  try {
    const { sessionId, appId, activity } = req.body;
    
    const activityRecord = {
      session_id: sessionId,
      app_id: appId,
      activity_id: activity.id,
      activity_type: activity.type,
      activity_data: activity.data,
      timestamp: new Date(activity.timestamp),
      created_at: new Date(),
    };
    
    memoryStore.activities.push(activityRecord);
    res.json({ success: true });
  } catch (error) {
    console.error('Error storing activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create/get app
app.post('/api/app', async (req, res) => {
  try {
    const { organizationId, name, platform } = req.body;
    
    const id = `app_${Date.now()}`;
    const appRecord = {
      id,
      organization_id: organizationId,
      name,
      platform,
      created_at: new Date(),
    };
    
    res.json(appRecord);
  } catch (error) {
    console.error('Error creating app:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start session (auto-creates when SDK connects)
app.post('/api/session/start', async (req, res) => {
  try {
    const { sessionId, appId, organizationId } = req.body;
    
    const sessionRecord = {
      id: sessionId,
      app_id: appId,
      organization_id: organizationId,
      status: 'active',
      started_at: new Date(),
      ended_at: null,
      created_at: new Date(),
    };
    
    // Check if session already exists
    const existing = memoryStore.sessions.find(s => s.id === sessionId);
    if (existing) {
      existing.status = 'active';
      existing.started_at = new Date();
      return res.json(existing);
    }
    
    memoryStore.sessions.push(sessionRecord);
    res.json(sessionRecord);
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// End session
app.post('/api/session/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = memoryStore.sessions.find(s => s.id === id);
    if (session) {
      session.status = 'completed';
      session.ended_at = new Date();
    }
    res.json(session);
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all sessions (with filtering)
app.get('/api/sessions', (req, res) => {
  const { appId, status, dateFrom, dateTo } = req.query;
  
  let sessions = [...memoryStore.sessions];
  
  if (appId) {
    sessions = sessions.filter(s => s.app_id === appId);
  }
  
  if (status) {
    sessions = sessions.filter(s => s.status === status);
  }
  
  if (dateFrom) {
    const from = new Date(dateFrom);
    sessions = sessions.filter(s => new Date(s.started_at) >= from);
  }
  
  if (dateTo) {
    const to = new Date(dateTo);
    sessions = sessions.filter(s => new Date(s.started_at) <= to);
  }
  
  // Add computed fields
  const sessionsWithMeta = sessions.map(s => ({
    ...s,
    duration: getSessionDuration(s),
    screen_count: memoryStore.screens.filter(sc => sc.session_id === s.id).length,
    element_count: memoryStore.elements.filter(e => e.session_id === s.id).length,
    screenshot_count: memoryStore.screenshots.filter(sc => sc.session_id === s.id).length,
    activity_count: memoryStore.activities.filter(a => a.session_id === s.id).length,
  }));
  
  // Sort by most recent
  sessionsWithMeta.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
  
  res.json(sessionsWithMeta);
});

// Get session data with all details
app.get('/api/session/:id', (req, res) => {
  const { id } = req.params;
  
  const session = memoryStore.sessions.find(s => s.id === id);
  const sessionScreens = memoryStore.screens.filter(s => s.session_id === id);
  const sessionElements = memoryStore.elements.filter(e => e.session_id === id);
  const sessionScreenshots = memoryStore.screenshots.filter(s => s.session_id === id);
  const sessionActivities = memoryStore.activities.filter(a => a.session_id === id);
  const sessionIssues = memoryStore.issues.filter(i => i.session_id === id);
  
  res.json({
    session,
    screens: sessionScreens,
    elements: sessionElements,
    screenshots: sessionScreenshots,
    activities: sessionActivities,
    issues: sessionIssues,
    duration: session ? getSessionDuration(session) : '0s',
  });
});

// Get component tree for a session
app.get('/api/session/:id/tree', (req, res) => {
  const { id } = req.params;
  
  const sessionScreens = memoryStore.screens.filter(s => s.session_id === id);
  const sessionElements = memoryStore.elements.filter(e => e.session_id === id);
  
  const tree = {
    id: 'root',
    name: 'App',
    type: 'root',
    children: sessionScreens.map(screen => ({
      id: screen.screen_id,
      name: screen.screen_name,
      type: 'screen',
      children: sessionElements
        .filter(el => el.screen_name === screen.screen_name)
        .map(el => ({
          id: el.element_id,
          name: el.element_label || el.element_id,
          type: el.element_type,
          children: [],
        })),
    })),
  };
  
  res.json(tree);
});

// ============ ISSUE ENDPOINTS ============

// Report an issue
app.post('/api/issue', async (req, res) => {
  try {
    const { sessionId, appId, type, description, severity, screenshotId, markerX, markerY } = req.body;
    
    const issueRecord = {
      session_id: sessionId,
      app_id: appId,
      type: type || 'bug',
      description,
      severity: severity || 'medium',
      status: 'open',
      screenshot_id: screenshotId,
      marker_x: markerX,
      marker_y: markerY,
      created_at: new Date(),
    };
    
    memoryStore.issues.push(issueRecord);
    
    const id = `issue_${Date.now()}`;
    res.json({ id, ...issueRecord });
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get issues for an app or session
app.get('/api/issues', (req, res) => {
  const { appId, sessionId } = req.query;
  
  let issues = [...memoryStore.issues];
  
  if (appId) {
    issues = issues.filter(i => i.app_id === appId);
  }
  
  if (sessionId) {
    issues = issues.filter(i => i.session_id === sessionId);
  }
  
  res.json(issues);
});

// ============ EXPORT ENDPOINTS ============

// Export session data as JSON
app.get('/api/session/:id/export/json', (req, res) => {
  const { id } = req.params;
  
  const session = memoryStore.sessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const sessionScreens = memoryStore.screens.filter(s => s.session_id === id);
  const sessionElements = memoryStore.elements.filter(e => e.session_id === id);
  const sessionScreenshots = memoryStore.screenshots
    .filter(s => s.session_id === id)
    .map(s => ({
      ...s,
      data: s.data ? '[BASE64_DATA]' : null, // Don't include full base64 in export
    }));
  const sessionActivities = memoryStore.activities.filter(a => a.session_id === id);
  const sessionIssues = memoryStore.issues.filter(i => i.session_id === id);
  
  const exportData = {
    exported_at: new Date().toISOString(),
    session: {
      id: session.id,
      app_id: session.app_id,
      status: session.status,
      started_at: session.started_at,
      ended_at: session.ended_at,
      duration: getSessionDuration(session),
    },
    summary: {
      screen_count: sessionScreens.length,
      element_count: sessionElements.length,
      screenshot_count: sessionScreenshots.length,
      activity_count: sessionActivities.length,
      issue_count: sessionIssues.length,
    },
    screens: sessionScreens,
    elements: sessionElements,
    screenshots: sessionScreenshots,
    activities: sessionActivities,
    issues: sessionIssues,
    component_tree: {
      id: 'root',
      name: 'App',
      type: 'root',
      children: sessionScreens.map(screen => ({
        id: screen.screen_id,
        name: screen.screen_name,
        type: 'screen',
        children: sessionElements
          .filter(el => el.screen_name === screen.screen_name)
          .map(el => ({
            id: el.element_id,
            name: el.element_label || el.element_id,
            type: el.element_type,
          })),
      })),
    },
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="session_${id}_export.json"`);
  res.json(exportData);
});

// Export session data as Markdown report
app.get('/api/session/:id/export/markdown', (req, res) => {
  const { id } = req.params;
  
  const session = memoryStore.sessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const sessionScreens = memoryStore.screens.filter(s => s.session_id === id);
  const sessionElements = memoryStore.elements.filter(e => e.session_id === id);
  const sessionScreenshots = memoryStore.screenshots.filter(s => s.session_id === id);
  const sessionActivities = memoryStore.activities.filter(a => a.session_id === id);
  const sessionIssues = memoryStore.issues.filter(i => i.session_id === id);
  
  let md = `# AppLens Session Report
  
**Generated:** ${new Date().toLocaleString()}
**Session ID:** ${session.id}
**App ID:** ${session.app_id || 'N/A'}
**Status:** ${session.status}
**Duration:** ${getSessionDuration(session)}

## Summary

- Screens visited: ${sessionScreens.length}
- Elements tracked: ${sessionElements.length}
- Screenshots captured: ${sessionScreenshots.length}
- Activities recorded: ${sessionActivities.length}
- Issues found: ${sessionIssues.length}

## Screens

`;
  
  sessionScreens.forEach(screen => {
    const screenElements = sessionElements.filter(e => e.screen_name === screen.screen_name);
    md += `### ${screen.screen_name || 'Unnamed Screen'}\n`;
    md += `- ID: \`${screen.screen_id}\`\n`;
    md += `- Time: ${new Date(screen.timestamp).toLocaleString()}\n`;
    md += `- Elements: ${screenElements.length}\n`;
    
    if (screenElements.length > 0) {
      md += `\n**Tracked Elements:**\n`;
      screenElements.forEach(el => {
        md += `- \`${el.element_id}\` (${el.element_type}): ${el.element_label || 'no label'}\n`;
      });
    }
    md += '\n';
  });
  
  md += `## Issues

`;
  
  if (sessionIssues.length === 0) {
    md += 'No issues recorded.\n';
  } else {
    sessionIssues.forEach(issue => {
      md += `### ${issue.type || 'Issue'}\n`;
      md += `- **Severity:** ${issue.severity}\n`;
      md += `- **Status:** ${issue.status}\n`;
      md += `- **Description:** ${issue.description}\n`;
      if (issue.marker_x !== undefined) {
        md += `- **Position:** (${issue.marker_x}%, ${issue.marker_y}%)\n`;
      }
      md += `- **Created:** ${new Date(issue.created_at).toLocaleString()}\n\n`;
    });
  }
  
  md += `## Activity Timeline

`;
  
  sessionActivities.slice(-20).forEach(activity => {
    md += `- ${new Date(activity.timestamp).toLocaleTimeString()}: ${activity.activity_type}\n`;
  });
  
  md += `\n---\n*Generated by AppLens SDK*\n`;
  
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="session_${id}_report.md"`);
  res.send(md);
});

// ============ DEBUG ENDPOINT ============

app.get('/api/debug/memory', (req, res) => {
  res.json(memoryStore);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`AppLens API server running on port ${PORT}`);
});

module.exports = app;