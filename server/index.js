/**
 * AppLens API Server
 * Simple Express server for SDK data collection
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (for demo/development)
const memoryStore = {
  screens: [],
  elements: [],
  sessions: [],
  issues: [],
};

// Supabase client (set environment variables to use)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
    
    // Store in memory
    memoryStore.screens.push(screenRecord);
    
    // Store in Supabase if available
    if (supabase) {
      await supabase.from('screenshots').insert({
        session_id: sessionId,
        app_id: appId,
        screen_name: screen.name,
        timestamp: screenRecord.timestamp,
      });
    }
    
    res.json({ success: true, id: screen.id });
  } catch (error) {
    console.error('Error storing screen:', error);
    res.status(500).json({ error: error.message });
  }
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
      screen: element.screen,
      timestamp: new Date(element.timestamp),
      created_at: new Date(),
    };
    
    // Store in memory
    memoryStore.elements.push(elementRecord);
    
    // Store in Supabase if available
    if (supabase) {
      // Could create an elements table or add to issues
    }
    
    res.json({ success: true, id: element.id });
  } catch (error) {
    console.error('Error storing element:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create/get app
app.post('/api/app', async (req, res) => {
  try {
    const { organizationId, name, platform } = req.body;
    
    const appRecord = {
      organization_id: organizationId,
      name,
      platform,
      created_at: new Date(),
    };
    
    if (supabase) {
      const { data, error } = await supabase
        .from('apps')
        .insert(appRecord)
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } else {
      const id = `app_${Date.now()}`;
      res.json({ id, ...appRecord });
    }
  } catch (error) {
    console.error('Error creating app:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start session
app.post('/api/session/start', async (req, res) => {
  try {
    const { appId, organizationId } = req.body;
    
    const sessionRecord = {
      app_id: appId,
      organization_id: organizationId,
      status: 'active',
      started_at: new Date(),
      ended_at: null,
    };
    
    if (supabase) {
      const { data, error } = await supabase
        .from('review_sessions')
        .insert(sessionRecord)
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } else {
      const id = `session_${Date.now()}`;
      memoryStore.sessions.push({ id, ...sessionRecord });
      res.json({ id, ...sessionRecord });
    }
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// End session
app.post('/api/session/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (supabase) {
      const { data, error } = await supabase
        .from('review_sessions')
        .update({ status: 'completed', ended_at: new Date() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } else {
      const session = memoryStore.sessions.find(s => s.id === id);
      if (session) {
        session.status = 'completed';
        session.ended_at = new Date();
      }
      res.json(session);
    }
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session data
app.get('/api/session/:id', (req, res) => {
  const { id } = req.params;
  
  const sessionScreens = memoryStore.screens.filter(s => s.session_id === id);
  const sessionElements = memoryStore.elements.filter(e => e.session_id === id);
  
  res.json({
    session: memoryStore.sessions.find(s => s.id === id),
    screens: sessionScreens,
    elements: sessionElements,
  });
});

// Get all sessions for an app
app.get('/api/app/:appId/sessions', (req, res) => {
  const { appId } = req.params;
  
  const sessions = memoryStore.sessions.filter(s => s.app_id === appId);
  res.json(sessions);
});

// Get component tree for a session
app.get('/api/session/:id/tree', (req, res) => {
  const { id } = req.params;
  
  const sessionScreens = memoryStore.screens.filter(s => s.session_id === id);
  const sessionElements = memoryStore.elements.filter(e => e.session_id === id);
  
  // Build tree structure
  const tree = {
    id: 'root',
    name: 'App',
    type: 'root',
    children: sessionScreens.map(screen => ({
      id: screen.screen_id,
      name: screen.screen_name,
      type: 'screen',
      children: sessionElements
        .filter(el => el.screen === screen.screen_name)
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

// Report an issue
app.post('/api/issue', async (req, res) => {
  try {
    const { sessionId, appId, type, description, severity } = req.body;
    
    const issueRecord = {
      session_id: sessionId,
      app_id: appId,
      type,
      description,
      severity: severity || 'medium',
      status: 'open',
      created_at: new Date(),
    };
    
    memoryStore.issues.push(issueRecord);
    
    if (supabase) {
      const { data, error } = await supabase
        .from('issues')
        .insert(issueRecord)
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } else {
      const id = `issue_${Date.now()}`;
      res.json({ id, ...issueRecord });
    }
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get issues for an app
app.get('/api/app/:appId/issues', (req, res) => {
  const { appId } = req.params;
  
  const issues = memoryStore.issues.filter(i => i.app_id === appId);
  res.json(issues);
});

// In-memory data endpoints (for debugging)
app.get('/api/debug/memory', (req, res) => {
  res.json(memoryStore);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`AppLens API server running on port ${PORT}`);
});

module.exports = app;
