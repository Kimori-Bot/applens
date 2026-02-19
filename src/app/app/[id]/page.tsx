'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  BarChart3,
  Eye,
  FileText,
  Settings,
  RefreshCw,
  Plus,
  Zap,
  ArrowRight,
  Smartphone,
  Globe,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react';

// Types
interface Session {
  id: string;
  appId: string;
  status: 'running' | 'completed' | 'failed';
  goal?: string;
  testType?: string;
  steps: number;
  startedAt: string;
  completedAt?: string;
  aiSummary?: string;
  healthScore?: number;
  screenshots: string[];
  reviews?: any[];
  videoPath?: string;
}

interface App {
  id: string;
  name: string;
  url: string;
  platform: 'web' | 'android' | 'ios';
  createdAt: string;
  token?: string;
  healthScore?: number;
  totalTests?: number;
}

export default function AppDashboard({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const pathname = usePathname();
  
  const [app, setApp] = useState<App | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRunning, setIsRunning] = useState(false);
  const [testGoal, setTestGoal] = useState('');
  const [testType, setTestType] = useState('explore');
  const [showToken, setShowToken] = useState(false);
  
  // Tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'tests', label: 'Tests', icon: Play },
    { id: 'screenshots', label: 'Screenshots', icon: Eye },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  
  // Load app and sessions
  useEffect(() => {
    const loadData = async () => {
      // Get app from localStorage
      const storedApps = localStorage.getItem('applens_apps');
      if (storedApps) {
        const apps = JSON.parse(storedApps) as App[];
        const foundApp = apps.find(a => a.id === resolvedParams.id);
        if (foundApp) {
          setApp(foundApp);
          
          // Get sessions for this app
          const storedSessions = localStorage.getItem('applens_sessions');
          if (storedSessions) {
            const allSessions = JSON.parse(storedSessions) as Session[];
            const appSessions = allSessions
              .filter(s => s.appId === resolvedParams.id)
              .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
            setSessions(appSessions);
          }
        }
      }
      setLoading(false);
    };
    
    loadData();
  }, [resolvedParams.id]);
  
  // Run test
  const runTest = async () => {
    if (!testGoal.trim()) return;
    
    setIsRunning(true);
    const sessionId = `test_${Date.now()}`;
    
    // Create initial session
    const newSession: Session = {
      id: sessionId,
      appId: resolvedParams.id,
      status: 'running',
      goal: testGoal,
      testType,
      steps: 0,
      startedAt: new Date().toISOString(),
      screenshots: []
    };
    
    // Save to localStorage
    const storedSessions = localStorage.getItem('applens_sessions');
    const allSessions = storedSessions ? JSON.parse(storedSessions) : [];
    allSessions.push(newSession);
    localStorage.setItem('applens_sessions', JSON.stringify(allSessions));
    setSessions([newSession, ...sessions]);
    
    try {
      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: app?.url,
          goal: testGoal,
          testType,
          sessionId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update session with results
        const updatedSessions = allSessions.map((s: Session) => 
          s.id === sessionId ? { ...s, ...result } : s
        );
        localStorage.setItem('applens_sessions', JSON.stringify(updatedSessions));
        setSessions(updatedSessions.filter((s: Session) => s.appId === resolvedParams.id));
      }
    } catch (error) {
      console.error('Test failed:', error);
    }
    
    setIsRunning(false);
    setTestGoal('');
  };
  
  // Copy token
  const copyToken = () => {
    if (app?.token) {
      navigator.clipboard.writeText(app.token);
    }
  };
  
  // Delete app
  const deleteApp = () => {
    if (!confirm('Are you sure you want to delete this app?')) return;
    
    const storedApps = localStorage.getItem('applens_apps');
    if (storedApps) {
      const apps = JSON.parse(storedApps).filter((a: App) => a.id !== resolvedParams.id);
      localStorage.setItem('applens_apps', JSON.stringify(apps));
      router.push('/dashboard');
    }
  };
  
  // Get status icon
  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'running') return <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />;
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!app) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl text-white mb-2">App not found</h2>
        <p className="text-gray-400 mb-4">The app you're looking for doesn't exist.</p>
        <button 
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }
  
  // Stats
  const totalTests = sessions.length;
  const completedTests = sessions.filter(s => s.status === 'completed').length;
  const failedTests = sessions.filter(s => s.status === 'failed').length;
  const runningTests = sessions.filter(s => s.status === 'running').length;
  const avgHealthScore = sessions.filter(s => s.healthScore).reduce((acc, s) => acc + (s.healthScore || 0), 0) / (sessions.filter(s => s.healthScore).length || 1);
  
  return (
    <div className="space-y-6">
      {/* App Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center text-2xl">
            {app.platform === 'web' ? '🌐' : app.platform === 'android' ? '🤖' : '🍎'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{app.name}</h1>
            <a 
              href={app.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gray-400 hover:text-blue-400 text-sm"
            >
              {app.url} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {app.healthScore && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              app.healthScore >= 80 ? 'bg-green-500/20 text-green-400' :
              app.healthScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              Health: {app.healthScore}%
            </div>
          )}
        </div>
      </div>
      
      {/* Test Runner */}
      <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Run New Test
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={testGoal}
              onChange={(e) => setTestGoal(e.target.value)}
              placeholder="What should the AI do? (e.g., 'Search for a video', 'Test login flow')"
              className="w-full px-4 py-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            className="px-4 py-3 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="explore">Explore (🧭 Discover features)</option>
            <option value="task">Task (🎯 Complete goal)</option>
            <option value="auth">Auth (🔐 Test login/signup)</option>
          </select>
          
          <button
            onClick={runTest}
            disabled={isRunning || !testGoal.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2"
          >
            {isRunning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {isRunning ? 'Running...' : 'Run Test'}
          </button>
        </div>
        
        {isRunning && (
          <div className="mt-4 flex items-center gap-2 text-blue-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>AI is exploring your app...</span>
          </div>
        )}
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Play className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalTests}</p>
              <p className="text-sm text-gray-400">Total Tests</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{completedTests}</p>
              <p className="text-sm text-gray-400">Completed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{failedTests}</p>
              <p className="text-sm text-gray-400">Failed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{Math.round(avgHealthScore)}%</p>
              <p className="text-sm text-gray-400">Avg Health</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-[#1a1a2e]">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Recent Tests</h3>
          
          {sessions.length === 0 ? (
            <div className="text-center py-12 bg-[#12121a] border border-[#1a1a2e] rounded-xl">
              <Play className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg text-white mb-2">No tests yet</h3>
              <p className="text-gray-400">Run your first test to see results here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 10).map((session) => (
                <div 
                  key={session.id}
                  className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4 hover:border-[#2a2a3e] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={session.status} />
                      <div>
                        <p className="text-white font-medium">{session.goal || 'Test'}</p>
                        <p className="text-sm text-gray-400">
                          {session.testType} • {session.steps} steps •{' '}
                          {new Date(session.startedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {session.healthScore && (
                      <div className={`px-3 py-1 rounded-full text-sm ${
                        session.healthScore >= 80 ? 'bg-green-500/20 text-green-400' :
                        session.healthScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {session.healthScore}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">All Tests</h3>
          {/* Full test list with more details */}
          <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#1a1a2e]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Goal</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Steps</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Health</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-t border-[#1a1a2e]">
                    <td className="px-4 py-3">
                      <StatusIcon status={session.status} />
                    </td>
                    <td className="px-4 py-3 text-white">{session.goal || '-'}</td>
                    <td className="px-4 py-3 text-gray-400">{session.testType}</td>
                    <td className="px-4 py-3 text-gray-400">{session.steps}</td>
                    <td className="px-4 py-3">
                      {session.healthScore ? (
                        <span className={session.healthScore >= 80 ? 'text-green-400' : session.healthScore >= 60 ? 'text-yellow-400' : 'text-red-400'}>
                          {session.healthScore}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(session.startedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'screenshots' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Screenshots</h3>
          <p className="text-gray-400">View all screenshots captured during tests.</p>
          
          {/* Screenshots grid - would show from sessions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sessions.flatMap(s => s.screenshots.map((shotUrl, i) => ({
              sessionId: s.id,
              step: i + 1,
              url: shotUrl
            }))).slice(0, 20).map((shot, i) => (
              <div key={`${shot.sessionId}-${i}`} className="bg-[#12121a] border border-[#1a1a2e] rounded-lg overflow-hidden">
                <img 
                  src={shot.url} 
                  alt={`Step ${shot.step}`}
                  className="w-full aspect-video object-cover"
                />
                <div className="p-2 text-center text-sm text-gray-400">
                  Step {shot.step}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Analytics</h3>
          <p className="text-gray-400">Charts and insights coming soon.</p>
          
          {/* Placeholder for charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-6">
              <h4 className="text-white font-medium mb-4">Test Frequency</h4>
              <div className="h-48 flex items-end gap-2">
                {[65, 45, 80, 55, 70, 90, 75].map((h, i) => (
                  <div key={i} className="flex-1 bg-blue-500/30 rounded-t" style={{ height: `${h}%` }}></div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
            
            <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-6">
              <h4 className="text-white font-medium mb-4">Health Score Trend</h4>
              <div className="h-48 flex items-end gap-2">
                {[70, 75, 65, 80, 85, 78, 90].map((h, i) => (
                  <div key={i} className="flex-1 bg-green-500/30 rounded-t" style={{ height: `${h}%` }}></div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">App Settings</h3>
          
          {/* App Info */}
          <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-6 space-y-4">
            <h4 className="text-white font-medium">App Information</h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input 
                  type="text" 
                  defaultValue={app.name}
                  className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">URL</label>
                <input 
                  type="text" 
                  defaultValue={app.url}
                  className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white"
                />
              </div>
            </div>
          </div>
          
          {/* API Token */}
          <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-6 space-y-4">
            <h4 className="text-white font-medium">API Token</h4>
            <p className="text-sm text-gray-400">Use this token to integrate with your CI/CD pipeline.</p>
            
            <div className="flex gap-2">
              <input 
                type={showToken ? 'text' : 'password'}
                value={app.token || ''}
                readOnly
                className="flex-1 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white font-mono text-sm"
              />
              <button 
                onClick={() => setShowToken(!showToken)}
                className="px-4 py-2 bg-[#2a2a3e] text-white rounded-lg hover:bg-[#3a3a4e]"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
              <button 
                onClick={copyToken}
                className="px-4 py-2 bg-[#2a2a3e] text-white rounded-lg hover:bg-[#3a3a4e]"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Danger Zone */}
          <div className="bg-[#12121a] border border-red-900/50 rounded-xl p-6 space-y-4">
            <h4 className="text-red-400 font-medium">Danger Zone</h4>
            <p className="text-sm text-gray-400">Deleting this app will remove all associated tests and data.</p>
            
            <button 
              onClick={deleteApp}
              className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg hover:bg-red-600/30 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete App
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
