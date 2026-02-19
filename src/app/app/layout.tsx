'use client';

import { useState, useEffect, ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface AppLayoutProps {
  children: ReactNode;
}

interface App {
  id: string;
  name: string;
  url: string;
  platform: 'web' | 'android' | 'ios';
  createdAt: string;
  token?: string;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadApps = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data } = await supabase
            .from('apps')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });
          
          if (data) {
            setApps(data.map((app: any) => ({
              id: app.id,
              name: app.name,
              url: app.url,
              platform: app.platform || 'web',
              createdAt: app.created_at,
              token: app.api_token
            })));
          }
        }
      } catch (e) {
        const stored = localStorage.getItem('applens_apps');
        if (stored) {
          setApps(JSON.parse(stored));
        }
      }
      setLoading(false);
    };
    
    loadApps();
  }, []);
  
  const handleAddApp = () => {
    window.dispatchEvent(new CustomEvent('openAddAppModal'));
  };
  
  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar 
        apps={apps} 
        onAddApp={handleAddApp}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
