'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Smartphone, 
  Globe, 
  Trash2, 
  Play,
  ArrowRight,
  Search,
  Settings,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface App {
  id: string;
  name: string;
  url: string;
  platform: 'web' | 'android' | 'ios';
  createdAt: string;
  token?: string;
  healthScore?: number;
}

interface Session {
  id: string;
  appId: string;
  status: string;
  goal?: string;
  startedAt?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [apps, setApps] = useState<App[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newApp, setNewApp] = useState({ name: '', url: '', platform: 'web' as 'web' | 'android' | 'ios' });
  
  useEffect(() => {
    // Load data
    const storedApps = localStorage.getItem('applens_apps');
    const storedSessions = localStorage.getItem('applens_sessions');
    
    if (storedApps) setApps(JSON.parse(storedApps));
    if (storedSessions) setSessions(JSON.parse(storedSessions));
    setLoading(false);
    
    const handleOpenModal = () => setShowAddModal(true);
    window.addEventListener('openAddAppModal', handleOpenModal);
    return () => window.removeEventListener('openAddAppModal', handleOpenModal);
  }, []);
  
  // Add app
  const addApp = () => {
    if (!newApp.name.trim() || !newApp.url.trim()) return;
    
    // Generate unique token for this app
    const token = `apl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const app: App = {
      id: `app_${Date.now()}`,
      name: newApp.name,
      url: newApp.url.startsWith('http') ? newApp.url : `https://${newApp.url}`,
      platform: newApp.platform,
      createdAt: new Date().toISOString(),
      token
    };
    
    const updatedApps = [app, ...apps];
    setApps(updatedApps);
    localStorage.setItem('applens_apps', JSON.stringify(updatedApps));
    
    setShowAddModal(false);
    setNewApp({ name: '', url: '', platform: 'web' });
    
    // Redirect to new app dashboard
    router.push(`/app/${app.id}`);
  };
  
  // Delete app
  const deleteApp = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this app?')) return;
    
    const updatedApps = apps.filter(a => a.id !== id);
    setApps(updatedApps);
    localStorage.setItem('applens_apps', JSON.stringify(updatedApps));
  };
  
  // Get recent sessions
  const recentSessions = sessions.slice(0, 5);
  
  // Stats
  const totalTests = sessions.length;
  const completedTests = sessions.filter(s => s.status === 'completed').length;
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Manage your apps and view test results</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add App
        </button>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Smartphone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{apps.length}</p>
              <p className="text-sm text-gray-400">Apps</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Play className="w-5 h-5 text-purple-400" />
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
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {sessions.filter(s => s.status === 'running').length}
              </p>
              <p className="text-sm text-gray-400">Running</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Apps Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Your Apps</h2>
        
        {apps.length === 0 ? (
          <div className="text-center py-16 bg-[#12121a] border border-[#1a1a2e] rounded-xl">
            <Smartphone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl text-white mb-2">No apps yet</h3>
            <p className="text-gray-400 mb-6">Add your first app to start testing</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Your First App
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => {
              const appSessions = sessions.filter(s => s.appId === app.id);
              const appCompleted = appSessions.filter(s => s.status === 'completed').length;
              
              return (
                <Link
                  key={app.id}
                  href={`/app/${app.id}`}
                  className="group bg-[#12121a] border border-[#1a1a2e] hover:border-blue-500/50 rounded-xl p-5 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center text-2xl">
                      {app.platform === 'web' ? '🌐' : app.platform === 'android' ? '🤖' : '🍎'}
                    </div>
                    <button 
                      onClick={(e) => deleteApp(app.id, e)}
                      className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-1">{app.name}</h3>
                  <p className="text-sm text-gray-400 mb-4 truncate">{app.url}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {appCompleted} tests completed
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Recent Activity */}
      {recentSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="bg-[#12121a] border border-[#1a1a2e] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#1a1a2e]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Goal</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">App</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => {
                  const app = apps.find(a => a.id === session.appId);
                  return (
                    <tr key={session.id} className="border-t border-[#1a1a2e]">
                      <td className="px-4 py-3">
                        {session.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {session.status === 'running' && <Clock className="w-4 h-4 text-blue-400" />}
                        {session.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                      </td>
                      <td className="px-4 py-3 text-white">{session.goal || 'Test'}</td>
                      <td className="px-4 py-3 text-gray-400">{app?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(session.startedAt || session.id).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add App Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-md bg-[#12121a] border border-[#1a1a2e] rounded-xl p-6 z-10">
            <h2 className="text-xl font-bold text-white mb-4">Add New App</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">App Name</label>
                <input
                  type="text"
                  value={newApp.name}
                  onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                  placeholder="My Awesome App"
                  className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">App URL</label>
                <input
                  type="text"
                  value={newApp.url}
                  onChange={(e) => setNewApp({ ...newApp, url: e.target.value })}
                  placeholder="https://myapp.com"
                  className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Platform</label>
                <div className="flex gap-2">
                  {(['web', 'android', 'ios'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewApp({ ...newApp, platform: p })}
                      className={`flex-1 py-2 rounded-lg border transition-colors ${
                        newApp.platform === p
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-[#1a1a2e] border-[#2a2a3e] text-gray-400 hover:text-white'
                      }`}
                    >
                      {p === 'web' && <Globe className="w-4 h-4 inline mr-1" />}
                      {p === 'android' && <span className="mr-1">🤖</span>}
                      {p === 'ios' && <span className="mr-1">🍎</span>}
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2a2a3e]"
              >
                Cancel
              </button>
              <button
                onClick={addApp}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
