'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  LayoutDashboard, 
  Smartphone, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Bell,
  ChevronDown
} from 'lucide-react';

export default function Layout({ children }) {
  const { company, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path) => pathname === path;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Top bar */}
      <header 
        className="fixed top-0 left-0 right-0 h-16 border-b z-50"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <Smartphone className="w-7 h-7" style={{ color: 'var(--primary)' }} />
              <span className="text-lg font-bold">AppLens</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg"
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {company?.name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <span className="text-sm font-medium hidden sm:block">{company?.name}</span>
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
              </button>

              {userMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border py-1"
                  style={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)' }}
                >
                  <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium">{company?.name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{company?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-56 border-r z-40 transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: isActive(item.path) ? 'var(--primary)' + '20' : 'transparent',
                color: isActive(item.path) ? 'var(--primary)' : 'var(--foreground)'
              }}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className={`pt-16 transition-all ${sidebarOpen ? 'ml-56' : 'ml-0'}`}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
