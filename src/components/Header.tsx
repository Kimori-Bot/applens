'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search, Plus, User, ChevronDown } from 'lucide-react';

interface App {
  id: string;
  name: string;
  url: string;
  platform: 'web' | 'android' | 'ios';
}

export default function Header() {
  const pathname = usePathname();
  const [apps, setApps] = useState<App[]>([]);
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [currentApp, setCurrentApp] = useState<App | null>(null);
  
  // Get app ID from path
  const appId = pathname.match(/\/app\/([^/]+)/)?.[1];
  
  useEffect(() => {
    // Load apps
    const stored = localStorage.getItem('applens_apps');
    if (stored) {
      const appsList = JSON.parse(stored);
      setApps(appsList);
      
      // Set current app if on app page
      if (appId) {
        const app = appsList.find((a: App) => a.id === appId);
        if (app) setCurrentApp(app);
      }
    }
  }, [appId]);
  
  // Update current app when path changes
  useEffect(() => {
    if (appId && apps.length > 0) {
      const app = apps.find((a: App) => a.id === appId);
      if (app) setCurrentApp(app);
    }
  }, [appId, apps]);
  
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/analytics') return 'Analytics';
    if (pathname === '/settings') return 'Settings';
    if (pathname.startsWith('/app/')) {
      if (pathname.includes('/tests')) return `${currentApp?.name || 'App'} Tests`;
      if (pathname.includes('/analytics')) return `${currentApp?.name || 'App'} Analytics`;
      if (pathname.includes('/settings')) return `${currentApp?.name || 'App'} Settings`;
      return currentApp?.name || 'App';
    }
    return 'AppLens';
  };
  
  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-[#1a1a2e]">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Page Title + App Switcher */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-white">{getPageTitle()}</h1>
          
          {/* App Switcher Dropdown */}
          {currentApp && (
            <div className="relative">
              <button 
                onClick={() => setShowAppSwitcher(!showAppSwitcher)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a2e] text-gray-300 hover:text-white text-sm"
              >
                <span>{currentApp.name}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showAppSwitcher && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowAppSwitcher(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-[#12121a] border border-[#1a1a2e] rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-[#1a1a2e]">
                      <span className="text-xs text-gray-500 uppercase">Switch App</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {apps.map((app) => (
                        <Link
                          key={app.id}
                          href={`/app/${app.id}`}
                          onClick={() => setShowAppSwitcher(false)}
                          className={`block px-4 py-2 hover:bg-[#1a1a2e] ${
                            app.id === appId ? 'bg-[#1a1a2e] text-blue-400' : 'text-gray-300'
                          }`}
                        >
                          {app.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="pl-10 pr-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white placeholder-gray-500 text-sm w-48 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-white">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          {/* User */}
          <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#1a1a2e] text-gray-400 hover:text-white">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
