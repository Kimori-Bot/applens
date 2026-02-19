'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Smartphone, Play, Loader2, Trash2, X, Settings, Save, CheckCircle,
  Brain, Eye, FileText, History, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Types
interface App { id: string; name: string; url: string; platform: 'web' | 'android'; createdAt: string; settings: any; }
interface Session { id: string; appId: string; status: string; startedAt: string; completedAt: string; duration: number; steps: number; screenshots: string[]; screenshotPaths: string[]; videoPath?: string; healthScore: number; aiSummary: string; goal?: string; testType?: string; navigationPath: string[]; generatedTests: any[]; reviews?: any[]; stepReasoning?: string[]; currentAction?: string; }

// Storage helpers
const loadApps = (): App[] => { if (typeof window === 'undefined') return []; const s = localStorage.getItem('applens_apps'); return s ? JSON.parse(s) : []; };
const loadSessions = (): Session[] => { if (typeof window === 'undefined') return []; const s = localStorage.getItem('applens_sessions'); return s ? JSON.parse(s) : []; };
const loadSettings = () => { if (typeof window === 'undefined') return { aiModel: 'minimax-m2.5:cloud', maxSteps: 10, defaultPlatform: 'web' as const, recordVideo: false, aiAnalysis: true }; const s = localStorage.getItem('applens_settings'); return s ? JSON.parse(s) : { aiModel: 'minimax-m2.5:cloud', maxSteps: 10, defaultPlatform: 'web' as const, recordVideo: false, aiAnalysis: true }; };
const saveApps = (a: App[]) => localStorage.setItem('applens_apps', JSON.stringify(a));
const saveSessions = (s: Session[]) => localStorage.setItem('applens_sessions', JSON.stringify(s));
const saveSettings = (s: any) => localStorage.setItem('applens_settings', JSON.stringify(s));

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [apps, setApps] = useState<App[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [view, setView] = useState<'apps' | 'dashboard' | 'settings'>('apps');
  
  // Sync view state with URL on mount
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'settings') {
      navigateTo('settings');
    } else if (viewParam === 'dashboard') {
      navigateTo('dashboard', selectedApp?.id);
    }
  }, [searchParams]);

  // Sync view changes to URL
  const navigateTo = (newView: 'apps' | 'dashboard' | 'settings', appId?: string, sessionId?: string) => {
    setView(newView);
    const params = new URLSearchParams();
    if (newView !== 'apps') params.set('view', newView);
    if (appId) params.set('app', appId);
    if (sessionId) params.set('session', sessionId);
    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : '/dashboard', { scroll: false });
  };

  // Restore selected app/session from URL on mount
  useEffect(() => {
    const appId = searchParams.get('app');
    const sessionId = searchParams.get('session');
    if (appId) {
      const app = apps.find(a => a.id === appId);
      if (app) {
        setSelectedApp(app);
        navigateTo('dashboard', selectedApp?.id);
      }
    }
  }, [searchParams, apps]);
  
  // Settings
  const [settings, setSettings] = useState(loadSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Test state
  const [testUrl, setTestUrl] = useState('');
  const [testPlatform, setTestPlatform] = useState<'web' | 'android'>('web');
  const [testGoal, setTestGoal] = useState('');
  const [testType, setTestType] = useState<'explore' | 'task' | 'auth'>('explore');
  const [testSteps, setTestSteps] = useState(10);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [testing, setTesting] = useState(false);
  const [currentAction, setCurrentAction] = useState('');  // For "currently testing: login"

  // App form
  const [showAppForm, setShowAppForm] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppUrl, setNewAppUrl] = useState('');
  const [newAppPlatform, setNewAppPlatform] = useState<'web' | 'android'>('web');

  // Load from Supabase on mount
  useEffect(() => {
    const load = async () => {
      try {
        const { data: a } = await supabase.from('apps').select('*').order('created_at', { ascending: false });
        if (a && a.length) {
          const conv = a.map((x: any) => ({ id: x.id.toString(), name: x.name, url: x.config?.url || '', platform: x.platform || 'web', createdAt: x.created_at, settings: x.config?.settings || {} }));
          setApps(conv); saveApps(conv);
        } else { setApps(loadApps()); }
        
        const { data: s } = await supabase.from('sessions').select('*').order('started_at', { ascending: false });
        if (s && s.length) {
          const conv = s.map((x: any) => ({ id: x.id.toString(), appId: x.app_id?.toString() || '', status: x.status, startedAt: x.started_at, completedAt: x.completed_at, duration: 60, steps: x.config?.steps || 0, screenshots: x.config?.screenshots || [], screenshotPaths: x.config?.screenshotPaths || [], healthScore: x.config?.healthScore || 0, aiSummary: x.config?.summary || '', navigationPath: x.config?.history || [], generatedTests: x.config?.generatedTests || [], reviews: x.config?.reviews || [] }));
          setSessions(conv); saveSessions(conv);
        } else { setSessions(loadSessions()); }
      } catch { setApps(loadApps()); setSessions(loadSessions()); }
    };
    load();
  }, []);

  const appSessions = selectedApp ? sessions.filter(s => s.appId === selectedApp.id) : [];
  const stats = selectedApp ? { total: appSessions.length, avg: appSessions.length ? Math.round(appSessions.reduce((a,b) => a + b.healthScore, 0) / appSessions.length) : 0, shots: appSessions.reduce((a,b) => a + b.screenshots.length, 0) } : null;

  const addApp = async () => {
    if (!newAppName || !newAppUrl) return;
    const app: App = { id: `app_${Date.now()}`, name: newAppName, url: newAppUrl, platform: newAppPlatform, createdAt: new Date().toISOString(), settings: {} };
    const updated = [...apps, app];
    setApps(updated); saveApps(updated);
    try { await supabase.from('apps').insert({ name: newAppName, platform: newAppPlatform, status: 'active', config: { url: newAppUrl, settings: {} } }); } catch {}
    navigateTo('dashboard', app.id); setShowAppForm(false); setNewAppName(''); setNewAppUrl('');
  };

  const deleteApp = (id: string) => {
    const a = apps.filter(x => x.id !== id);
    const s = sessions.filter(x => x.appId !== id);
    setApps(a); setSessions(s); saveApps(a); saveSessions(s);
    if (selectedApp?.id === id) { setSelectedApp(null); navigateTo('apps'); }
  };

  const runTest = async () => {
    if (!selectedApp) return;
    setTesting(true);
    setCurrentAction('Starting test...');
    try {
      const res = await fetch(testPlatform === 'android' ? '/api/explore/android' : '/api/explore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appId: selectedApp.id, appName: selectedApp.name, appUrl: testUrl || selectedApp.url, goal: testGoal, testType, credentials: testType === 'auth' ? credentials : null, maxSteps: testSteps, model: settings.aiModel, aiAnalysis: settings.aiAnalysis }) });
      const data = await res.json();
      if (data.success) {
        const sess: Session = { id: data.testId, appId: selectedApp.id, status: 'completed', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), duration: 60, steps: data.steps, screenshots: data.screenshots || [], screenshotPaths: data.screenshotPaths || [], videoPath: data.videoPath || undefined, healthScore: data.healthScore, aiSummary: data.summary || '', goal: data.goal || '', testType: data.testType || testType, navigationPath: data.history || [], generatedTests: data.generatedTests || [], reviews: data.reviews || [], stepReasoning: data.stepReasoning || [], currentAction: data.currentAction || '' };
        const updated = [sess, ...sessions];
        setSessions(updated); saveSessions(updated);
        setSelectedSession(sess);
        setCurrentAction('');
        alert(`Test complete! ${data.steps} steps, ${data.healthScore}% health`);
      } else { alert('Test failed: ' + (data.error || 'error')); setCurrentAction(''); }
    } catch (err) { alert('Error: ' + (err as Error).message); setCurrentAction(''); }
    finally { setTesting(false); }
  };

  const getImgSrc = (sess: Session, i: number, shot: string) => { if (sess.screenshotPaths?.[i]) return sess.screenshotPaths[i].replace('/media/', '/api/media/'); if (shot?.startsWith('data:')) return shot; if (shot) return `data:image/png;base64,${shot}`; return null; };

  const handleSaveSettings = () => { saveSettings(settings); try { supabase.from('companies').upsert({ name: 'AppLens', email: 'settings@local', config: settings }); } catch {} setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000); };

  // Renders
  const renderApps = () => (
    <div className="p-6">
      <div className="flex justify-between mb-6"><h2 className="text-2xl font-bold">Your Apps</h2><button onClick={() => setShowAppForm(true)} className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>+ Add App</button></div>
      {showAppForm && <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <h3 className="font-semibold mb-4">Add App</h3>
        <input className="w-full mb-2 px-3 py-2 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} placeholder="App Name" value={newAppName} onChange={e => setNewAppName(e.target.value)} />
        <input className="w-full mb-2 px-3 py-2 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} placeholder="App URL" value={newAppUrl} onChange={e => setNewAppUrl(e.target.value)} />
        <div className="flex gap-2 mb-2"><button onClick={() => setNewAppPlatform('web')} className={`px-4 py-2 rounded-lg ${newAppPlatform === 'web' ? 'ring-2' : ''}`} style={{ backgroundColor: 'var(--secondary)' }}>Web</button><button onClick={() => setNewAppPlatform('android')} className={`px-4 py-2 rounded-lg ${newAppPlatform === 'android' ? 'ring-2' : ''}`} style={{ backgroundColor: 'var(--secondary)' }}>Android</button></div>
        <div className="flex gap-2"><button onClick={addApp} className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>Add</button><button onClick={() => setShowAppForm(false)} className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--secondary)' }}>Cancel</button></div>
      </div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {apps.map(app => <div key={app.id} className="p-4 rounded-xl border cursor-pointer" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} onClick={() => { navigateTo('dashboard', app.id); }}>
          <div className="flex justify-between"><div className="flex gap-3"><div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}><Smartphone className="w-6 h-6" /></div><div><h3 className="font-semibold">{app.name}</h3><p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{app.platform}</p></div></div><button onClick={e => { e.stopPropagation(); deleteApp(app.id); }}><Trash2 className="w-4 h-4 text-red-500" /></button></div>
          <p className="text-sm mt-2 truncate" style={{ color: 'var(--muted-foreground)' }}>{app.url}</p>
          <button className="w-full mt-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }} onClick={e => { e.stopPropagation(); setSelectedApp(app); setTestUrl(app.url); setTestPlatform(app.platform); navigateTo('dashboard', app.id); }}>Run Test</button>
        </div>)}
        {apps.length === 0 && !showAppForm && <p className="col-span-full text-center py-12" style={{ color: 'var(--muted-foreground)' }}>No apps. Click "Add App" to start.</p>}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="p-6">
      <div className="mb-6"><button onClick={() => navigateTo('apps')} className="text-sm mb-1" style={{ color: 'var(--muted-foreground)' }}>← Back to Apps</button><h2 className="text-2xl font-bold">{selectedApp?.name}</h2><p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{selectedApp?.url}</p></div>
      {stats && <div className="grid grid-cols-3 gap-4 mb-6"><div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}><div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Tests</div><div className="text-2xl font-bold">{stats.total}</div></div><div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}><div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Avg Health</div><div className="text-2xl font-bold" style={{ color: stats.avg >= 70 ? 'green' : 'red' }}>{stats.avg}%</div></div><div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}><div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Screens</div><div className="text-2xl font-bold">{stats.shots}</div></div></div>}
      <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <h3 className="font-semibold mb-3">Run Test</h3>
        <div className="space-y-3">
          <input className="w-full px-3 py-2 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} placeholder="App URL (optional, uses app URL if empty)" value={testUrl} onChange={e => setTestUrl(e.target.value)} />
          
          {/* Test Type Selector */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setTestType('explore')} className={`flex-1 px-3 py-2 rounded-lg text-sm ${testType === 'explore' ? 'ring-2' : ''}`} style={{ backgroundColor: testType === 'explore' ? 'var(--primary)' : 'var(--secondary)', color: testType === 'explore' ? 'var(--primary-foreground)' : 'inherit' }}>🧭 Explore</button>
            <button type="button" onClick={() => setTestType('task')} className={`flex-1 px-3 py-2 rounded-lg text-sm ${testType === 'task' ? 'ring-2' : ''}`} style={{ backgroundColor: testType === 'task' ? 'var(--primary)' : 'var(--secondary)', color: testType === 'task' ? 'var(--primary-foreground)' : 'inherit' }}>🎯 Task</button>
            <button type="button" onClick={() => setTestType('auth')} className={`flex-1 px-3 py-2 rounded-lg text-sm ${testType === 'auth' ? 'ring-2' : ''}`} style={{ backgroundColor: testType === 'auth' ? 'var(--primary)' : 'var(--secondary)', color: testType === 'auth' ? 'var(--primary-foreground)' : 'inherit' }}>🔐 Auth</button>
          </div>
          
          {/* Goal input for Explore/Task */}
          {testType !== 'auth' && (
            <input className="w-full px-3 py-2 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} placeholder={testType === 'explore' ? "What to explore: e.g., 'Find all features', 'Test navigation'" : "Task to complete: e.g., 'Add item to cart', 'Submit a form'"} value={testGoal} onChange={e => setTestGoal(e.target.value)} />
          )}
          
          {/* Credentials for Auth test */}
          {testType === 'auth' && (
            <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--accent)' }}>
              <p className="text-sm font-medium">Test Credentials</p>
              <input className="w-full px-3 py-2 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} placeholder="Email / Username" value={credentials.email} onChange={e => setCredentials({...credentials, email: e.target.value})} />
              <input className="w-full px-3 py-2 rounded-lg border" type="password" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} placeholder="Password" value={credentials.password} onChange={e => setCredentials({...credentials, password: e.target.value})} />
            </div>
          )}
          
          {/* Max Steps */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Steps:</span>
            <input type="number" min="1" max="50" className="w-20 px-3 py-2 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} value={testSteps} onChange={e => setTestSteps(parseInt(e.target.value) || 10)} />
            <select className="px-3 py-2 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} value={testPlatform} onChange={e => setTestPlatform(e.target.value as any)}><option value="web">Web</option><option value="android">Android</option></select>
            <button onClick={runTest} disabled={testing} className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>{testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}{testing ? (currentAction || 'Testing...') : 'Run Test'}</button>
          </div>
        </div>
      </div>
      <div><h3 className="font-semibold mb-3">Sessions</h3>
        {appSessions.length === 0 ? <p className="text-center py-8" style={{ color: 'var(--muted-foreground)' }}>No tests yet.</p> : <div className="space-y-2">{appSessions.map(sess => <div key={sess.id} onClick={() => setSelectedSession(sess)} className="p-4 rounded-lg border cursor-pointer" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}><div className="flex justify-between"><div><div className="font-medium">{new Date(sess.startedAt).toLocaleString()}</div><div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{sess.steps} steps</div></div><div className="text-2xl font-bold" style={{ color: sess.healthScore >= 70 ? 'green' : 'red' }}>{sess.healthScore}%</div></div></div>)}</div>}
      </div>
      {selectedSession && <div className="border-t pt-6 mt-6">
        <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Session Details</h3><button onClick={() => setSelectedSession(null)}><X className="w-5 h-5" /></button></div>
        <div className="mb-4 p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}><h4 className="font-semibold mb-2"><Brain className="w-5 h-5 inline mr-2" />AI Analysis</h4><p className="text-sm">{selectedSession.aiSummary || 'No analysis'}</p></div>
        {selectedSession.goal && <div className="mb-4 p-4 rounded-xl border" style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--border)' }}><h4 className="font-semibold mb-2">🎯 Goal</h4><p className="text-sm">{selectedSession.goal}</p></div>}
        {selectedSession.stepReasoning && selectedSession.stepReasoning.length > 0 && <div className="mb-4"><h4 className="font-semibold mb-2"><History className="w-5 h-5 inline mr-2" />Step-by-Step Reasoning</h4><div className="space-y-2">{selectedSession.stepReasoning.map((reason, i) => <div key={i} className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}><span className="font-semibold text-sm">Step {i+1}:</span> <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{reason}</span></div>)}</div></div>}
        {selectedSession.videoPath && <div className="mb-4"><h4 className="font-semibold mb-2">Video Recording</h4><video controls className="w-full max-h-64 rounded-lg" src={selectedSession.videoPath.replace('/media/', '/api/media/')}>Your browser does not support video.</video></div>}
        {selectedSession.reviews && selectedSession.reviews.length > 0 && <div className="mb-4 p-4 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}><h4 className="font-semibold mb-3"><Eye className="w-5 h-5 inline mr-2" />Screen Analysis</h4><div className="space-y-2">{selectedSession.reviews.map((r: any, i: number) => <div key={i} className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}><div className="font-medium">Step {r.step}: {r.action} {r.element}</div><p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{r.analysis}</p>{r.suggestions?.length > 0 && <div className="flex gap-1 mt-1">{r.suggestions.map((s: string, j: number) => <span key={j} className="px-2 py-0.5 text-xs rounded-full">{s}</span>)}</div>}</div>)}</div></div>}
        {selectedSession.screenshots.length > 0 && <div className="mb-4"><h4 className="font-semibold mb-2"><Eye className="w-5 h-5 inline mr-2" />Screenshots ({selectedSession.screenshots.length})</h4><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">{selectedSession.screenshots.map((shot, i) => { const src = getImgSrc(selectedSession, i, shot); return <div key={i} className="rounded-lg overflow-hidden border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>{src ? <img src={src} alt={`Screen ${i+1}`} className="w-full" /> : <div className="aspect-video flex items-center justify-center">{i+1}</div>}<div className="text-center text-xs py-1">Step {i+1}</div></div>; })}</div></div>}
        {selectedSession.generatedTests.length > 0 && <div><h4 className="font-semibold mb-2"><FileText className="w-5 h-5 inline mr-2" />Tests ({selectedSession.generatedTests.length})</h4><div className="space-y-2">{selectedSession.generatedTests.map((t: any) => <div key={t.id} className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}><div className="font-medium">{t.name}</div><div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{t.action} → {t.target}</div></div>)}</div></div>}
      </div>}
    </div>
  );

  const renderSettings = () => (
    <div className="p-6">
      <div className="flex justify-between mb-6"><h2 className="text-2xl font-bold">Settings</h2><button onClick={() => navigateTo('apps')} className="text-sm" style={{ color: 'var(--muted-foreground)' }}>← Back</button></div>
      <div className="mb-6 p-6 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <h3 className="font-semibold mb-4"><Brain className="w-5 h-5 inline mr-2" />AI Configuration</h3>
        <div className="space-y-4"><div><label className="block text-sm font-medium mb-1">AI Model</label><select className="w-full px-3 py-2 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} value={settings.aiModel} onChange={e => setSettings({...settings, aiModel: e.target.value})}><option value="minimax-m2.5:cloud">MiniMax M2.5 (Cloud)</option><option value="llama3.2:latest">Llama 3.2 (Local)</option><option value="llama3.2:1b">Llama 3.2 1B (Local)</option><option value="llama3">Llama 3 (Local)</option><option value="qwen2.5">Qwen 2.5 (Local)</option></select></div><div><label className="block text-sm font-medium mb-1">Max Steps</label><input type="number" min="1" max="100" className="w-full px-3 py-2 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} value={settings.maxSteps} onChange={e => setSettings({...settings, maxSteps: parseInt(e.target.value) || 10})} /></div><div className="flex items-center gap-2"><input type="checkbox" id="aiAnalysis" checked={settings.aiAnalysis} onChange={e => setSettings({...settings, aiAnalysis: e.target.checked})} /><label htmlFor="aiAnalysis" className="text-sm">AI Screen Analysis (costs money)</label></div></div>
      </div>
      <div className="mb-6 p-6 rounded-xl border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <h3 className="font-semibold mb-4"><Smartphone className="w-5 h-5 inline mr-2" />Device Settings</h3>
        <div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Default Platform</label><select className="w-full px-3 py-2 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} value={settings.defaultPlatform} onChange={e => setSettings({...settings, defaultPlatform: e.target.value as any})}><option value="web">Web</option><option value="android">Android</option></select></div><div className="flex items-center gap-2"><input type="checkbox" checked={settings.recordVideo} onChange={e => setSettings({...settings, recordVideo: e.target.checked})} /><label className="text-sm">Record video</label></div></div>
      </div>
      <div className="flex items-center gap-4"><button onClick={handleSaveSettings} className="px-6 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}><Save className="w-4 h-4" />Save Settings</button>{settingsSaved && <span className="text-green-500">Saved!</span>}</div>
      <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}><p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>AppLens v1.0.0 • AI-Powered Mobile Testing</p></div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <header className="border-b" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}><Smartphone className="w-6 h-6" style={{ color: 'var(--primary-foreground)' }} /></div><div><h1 className="text-xl font-bold">AppLens</h1><p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>AI-Powered Mobile Testing</p></div></div>
          <button onClick={() => navigateTo('settings')} className="flex items-center gap-2 px-3 py-1 rounded-lg" style={{ backgroundColor: 'var(--accent)' }}><Settings className="w-4 h-4" /><span className="text-sm">Settings</span></button>
        </div>
      </header>
      {view === 'apps' && apps.length > 0 && <div className="border-b" style={{ backgroundColor: 'var(--card)' }}><div className="max-w-7xl mx-auto px-4 py-2 flex justify-center gap-4 flex-wrap text-sm"><span>1. Add App</span><ChevronRight className="w-4 h-4" /><span>2. AI Explores</span><ChevronRight className="w-4 h-4" /><span>3. Records</span><ChevronRight className="w-4 h-4" /><span>4. Analyzes</span><ChevronRight className="w-4 h-4" /><span>5. Tests</span></div></div>}
      <main className="max-w-7xl mx-auto">{view === 'apps' && renderApps()}{view === 'dashboard' && renderDashboard()}{view === 'settings' && renderSettings()}</main>
    </div>
  );
}
