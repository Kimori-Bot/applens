import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

// Styles
const styles = {
  container: { minHeight: '100vh', background: '#0f0f23', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { background: '#1a1a3e', padding: '16px 24px', borderBottom: '1px solid #2a2a5e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: '24px', fontWeight: 'bold', color: '#6366f1' },
  nav: { display: 'flex', gap: '16px' },
  navButton: { padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' },
  main: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  card: { background: '#1a1a3e', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  cardTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#fff' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a5e', background: '#0f0f23', color: '#fff', fontSize: '14px', marginBottom: '12px' },
  button: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' },
  primaryBtn: { background: '#6366f1', color: '#fff' },
  dangerBtn: { background: '#ef4444', color: '#fff' },
  successBtn: { background: '#10b981', color: '#fff' },
  secondaryBtn: { background: '#2a2a5e', color: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
  stat: { textAlign: 'center', padding: '20px' },
  statValue: { fontSize: '32px', fontWeight: 'bold', color: '#6366f1' },
  statLabel: { fontSize: '14px', color: '#888', marginTop: '4px' },
  list: { maxHeight: '400px', overflowY: 'auto' },
  listItem: { padding: '12px', borderBottom: '1px solid #2a2a5e', cursor: 'pointer', transition: 'background 0.2s' },
  badge: { display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' },
  activeBadge: { background: '#10b981', color: '#fff' },
  inactiveBadge: { background: '#666', color: '#fff' },
  tree: { background: '#0f0f23', padding: '16px', borderRadius: '8px', fontSize: '13px', overflow: 'auto' },
  treeNode: { marginLeft: '20px', padding: '4px 0' },
  treeType: { color: '#6366f1', marginRight: '8px' },
  treeName: { color: '#10b981' },
  flex: { display: 'flex', gap: '12px', alignItems: 'center' },
  flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  section: { marginBottom: '24px' },
  sectionTitle: { fontSize: '20px', fontWeight: '600', marginBottom: '12px' },
  empty: { textAlign: 'center', padding: '40px', color: '#666' },
  tabContainer: { display: 'flex', gap: '8px', marginBottom: '16px' },
  tab: { padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#2a2a5e', color: '#888', fontSize: '14px' },
  activeTab: { background: '#6366f1', color: '#fff' },
  jsonContainer: { background: '#0f0f23', padding: '16px', borderRadius: '8px', overflow: 'auto', maxHeight: '500px' },
};

// Supabase Client
const createSupabaseClient = (url, key) => ({
  from: (table) => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: (data) => Promise.resolve({ data: [data], error: null }),
    eq: () => ({ update: () => Promise.resolve({ data: null, error: null }), select: () => Promise.resolve({ data: [], error: null }) }),
  }),
  SupabaseClient: true,
});

// Dashboard Component
function Dashboard() {
  // State
  const [apiUrl, setApiUrl] = useState(API_URL);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions');
  
  // Session state
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [appId, setAppId] = useState('');
  const [orgId, setOrgId] = useState('');
  
  // Data state
  const [screens, setScreens] = useState([]);
  const [elements, setElements] = useState([]);
  const [componentTree, setComponentTree] = useState(null);
  const [issues, setIssues] = useState([]);
  
  // Debug
  const [memoryData, setMemoryData] = useState(null);

  // Check connection
  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/health`);
      const data = await res.json();
      setConnected(data.status === 'ok');
    } catch (err) {
      setConnected(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!appId) return;
    try {
      const res = await fetch(`${apiUrl}/api/app/${appId}/sessions`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  }, [apiUrl, appId]);

  useEffect(() => {
    if (appId) fetchSessions();
  }, [appId, fetchSessions]);

  // Start session
  const startSession = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, organizationId: orgId }),
      });
      const data = await res.json();
      setCurrentSession(data);
      setSessionActive(true);
      setScreens([]);
      setElements([]);
      setComponentTree(null);
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  // End session
  const endSession = async () => {
    if (!currentSession?.id) return;
    try {
      await fetch(`${apiUrl}/api/session/${currentSession.id}/end`, {
        method: 'POST',
      });
      setSessionActive(false);
      fetchSessions();
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  };

  // Select session and load data
  const selectSession = async (session) => {
    setCurrentSession(session);
    try {
      const res = await fetch(`${apiUrl}/api/session/${session.id}`);
      const data = await res.json();
      setScreens(data.screens || []);
      setElements(data.elements || []);
      
      const treeRes = await fetch(`${apiUrl}/api/session/${session.id}/tree`);
      const tree = await treeRes.json();
      setComponentTree(tree);
    } catch (err) {
      console.error('Failed to load session data:', err);
    }
  };

  // Load memory data (debug)
  const loadMemoryData = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/debug/memory`);
      const data = await res.json();
      setMemoryData(data);
    } catch (err) {
      console.error('Failed to load memory:', err);
    }
  };

  // Render component tree recursively
  const renderTree = (node, depth = 0) => {
    if (!node) return null;
    return (
      <div key={node.id} style={{ ...styles.treeNode, marginLeft: `${depth * 20}px` }}>
        <span style={styles.treeType}>&lt;{node.type}&gt;</span>
        <span style={styles.treeName}>{node.name}</span>
        {node.children?.map(child => renderTree(child, depth + 1))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>🔍 AppLens</div>
        <div style={styles.nav}>
          <button style={{ ...styles.navButton, background: connected ? '#10b981' : '#ef4444', color: '#fff' }}>
            {connected ? '● Connected' : '○ Disconnected'}
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {/* Configuration */}
        <div style={styles.card}>
          <div style={styles.flexBetween}>
            <h2 style={styles.cardTitle}>⚙️ Configuration</h2>
            <div style={styles.flex}>
              <input
                type="text"
                placeholder="App ID"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                style={{ ...styles.input, width: '150px', marginBottom: 0 }}
              />
              <input
                type="text"
                placeholder="Organization ID"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                style={{ ...styles.input, width: '180px', marginBottom: 0 }}
              />
            </div>
          </div>
          
          <div style={styles.flex}>
            <input
              type="text"
              placeholder="API URL"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              style={{ ...styles.input, flex: 1, marginBottom: 0 }}
            />
            <button style={{ ...styles.button, ...styles.secondaryBtn }} onClick={checkConnection}>
              Test Connection
            </button>
          </div>

          <div style={{ ...styles.flex, marginTop: '12px' }}>
            <input
              type="text"
              placeholder="Supabase URL (optional)"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              style={{ ...styles.input, flex: 1, marginBottom: 0 }}
            />
            <input
              type="password"
              placeholder="Supabase Key (optional)"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              style={{ ...styles.input, flex: 1, marginBottom: 0 }}
            />
          </div>
        </div>

        {/* Session Control */}
        <div style={styles.card}>
          <div style={styles.flexBetween}>
            <h2 style={styles.cardTitle}>🎯 Review Session</h2>
            <div style={styles.flex}>
              {!sessionActive ? (
                <button
                  style={{ ...styles.button, ...styles.successBtn }}
                  onClick={startSession}
                  disabled={!appId}
                >
                  Start Session
                </button>
              ) : (
                <button style={{ ...styles.button, ...styles.dangerBtn }} onClick={endSession}>
                  Stop Session
                </button>
              )}
              <span style={{ ...styles.badge, background: sessionActive ? '#10b981' : '#666', color: '#fff', padding: '8px 16px' }}>
                {sessionActive ? '● Active' : '○ Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.stat}>
              <div style={styles.statValue}>{sessions.length}</div>
              <div style={styles.statLabel}>Total Sessions</div>
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.stat}>
              <div style={styles.statValue}>{screens.length}</div>
              <div style={styles.statLabel}>Screens Captured</div>
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.stat}>
              <div style={styles.statValue}>{elements.length}</div>
              <div style={styles.statLabel}>Elements Tracked</div>
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.stat}>
              <div style={styles.statValue}>{issues.length}</div>
              <div style={styles.statLabel}>Issues Found</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.grid}>
          {/* Sessions List */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📋 Sessions</h3>
            <div style={styles.list}>
              {sessions.length === 0 ? (
                <div style={styles.empty}>No sessions yet</div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      ...styles.listItem,
                      background: currentSession?.id === session.id ? '#2a2a5e' : 'transparent',
                    }}
                    onClick={() => selectSession(session)}
                  >
                    <div style={styles.flexBetween}>
                      <span style={{ color: '#fff', fontSize: '14px' }}>{session.id}</span>
                      <span style={{ ...styles.badge, background: session.status === 'active' ? '#10b981' : '#666' }}>
                        {session.status}
                      </span>
                    </div>
                    <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                      {session.started_at ? new Date(session.started_at).toLocaleString() : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Screens */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📱 Screens</h3>
            <div style={styles.list}>
              {screens.length === 0 ? (
                <div style={styles.empty}>No screens captured</div>
              ) : (
                screens.map((screen, idx) => (
                  <div key={idx} style={styles.listItem}>
                    <div style={{ color: '#fff', fontSize: '14px' }}>{screen.screen_name}</div>
                    <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                      {new Date(screen.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.card}>
          <div style={styles.tabContainer}>
            <button
              style={{ ...styles.tab, ...(activeTab === 'sessions' ? styles.activeTab : {}) }}
              onClick={() => setActiveTab('sessions')}
            >
              Component Tree
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'elements' ? styles.activeTab : {}) }}
              onClick={() => setActiveTab('elements')}
            >
              Elements
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'debug' ? styles.activeTab : {}) }}
              onClick={() => { setActiveTab('debug'); loadMemoryData(); }}
            >
              Debug
            </button>
          </div>

          {activeTab === 'sessions' && (
            <div style={styles.tree}>
              {componentTree ? (
                renderTree(componentTree)
              ) : (
                <div style={styles.empty}>Select a session to view component tree</div>
              )}
            </div>
          )}

          {activeTab === 'elements' && (
            <div style={styles.jsonContainer}>
              {elements.length > 0 ? (
                <JsonView data={elements} shouldExpandNode={allExpanded} style={defaultStyles} />
              ) : (
                <div style={styles.empty}>No elements tracked</div>
              )}
            </div>
          )}

          {activeTab === 'debug' && (
            <div style={styles.jsonContainer}>
              {memoryData ? (
                <JsonView data={memoryData} shouldExpandNode={allExpanded} style={defaultStyles} />
              ) : (
                <div style={styles.empty}>Click "Debug" to load memory data</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Mount the app
const root = createRoot(document.getElementById('root'));
root.render(<Dashboard />);
