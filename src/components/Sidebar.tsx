'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Smartphone, 
  BarChart3, 
  Settings, 
  Plus,
  ChevronRight,
  Zap,
  X,
  Package,
  Server
} from 'lucide-react';

// Types
interface App {
  id: string;
  name: string;
  url: string;
  platform: 'web' | 'android' | 'ios';
  createdAt: string;
  token?: string;
}

interface SidebarProps {
  apps: App[];
  onAddApp: () => void;
  collapsed?: boolean;
}

// App icons
const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'web') return <span className="text-blue-500">🌐</span>;
  if (platform === 'android') return <span className="text-green-500">🤖</span>;
  return <span className="text-gray-500">🍎</span>;
};

export default function Sidebar({ apps, onAddApp, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  
  // Get current app ID from path
  const currentAppId = pathname.match(/\/app\/([^/]+)/)?.[1];
  
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/dashboard/devices', icon: Server, label: 'Devices' },
    { href: '/dashboard/builds', icon: Package, label: 'Builds' },
    { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];
  
  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-[#0a0a0f] border-r border-[#1a1a2e] flex flex-col transition-all duration-300 h-screen sticky top-0`}>
      {/* Logo */}
      <div className="p-4 border-b border-[#1a1a2e]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && <span className="font-bold text-lg text-white">AppLens</span>}
        </Link>
      </div>
      
      {/* Main Navigation */}
      <nav className="p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                isActive 
                  ? 'bg-blue-600/20 text-blue-400' 
                  : 'text-gray-400 hover:bg-[#1a1a2e] hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      
      {/* Apps Section */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden flex flex-col mt-4">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Apps</span>
            <button 
              onClick={onAddApp}
              className="p-1 rounded hover:bg-[#1a1a2e] text-gray-400 hover:text-white"
              title="Add App"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-2">
            {apps.length === 0 ? (
              <p className="text-gray-500 text-sm px-2 py-4 text-center">No apps yet</p>
            ) : (
              apps.map((app) => {
                const isActive = currentAppId === app.id;
                return (
                  <Link
                    key={app.id}
                    href={`/app/${app.id}`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                      isActive 
                        ? 'bg-[#1a1a2e] text-white border-l-2 border-blue-500' 
                        : 'text-gray-400 hover:bg-[#1a1a2e] hover:text-white'
                    }`}
                  >
                    <PlatformIcon platform={app.platform} />
                    <span className="truncate text-sm">{app.name}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
      
      {/* Collapse Toggle */}
      <div className="p-4 border-t border-[#1a1a2e]">
        <button 
          onClick={() => {}}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#1a1a2e] text-gray-400 hover:text-white"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </aside>
  );
}
