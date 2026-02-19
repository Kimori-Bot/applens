'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    const updateTheme = () => {
      let resolved: 'light' | 'dark';
      
      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolved = theme;
      }
      
      setResolvedTheme(resolved);
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
      root.style.setProperty('--background', resolved === 'dark' ? '#0f172a' : '#ffffff');
      root.style.setProperty('--foreground', resolved === 'dark' ? '#f1f5f9' : '#0f172a');
      root.style.setProperty('--card', resolved === 'dark' ? '#1e293b' : '#ffffff');
      root.style.setProperty('--card-foreground', resolved === 'dark' ? '#f1f5f9' : '#0f172a');
      root.style.setProperty('--popover', resolved === 'dark' ? '#1e293b' : '#ffffff');
      root.style.setProperty('--popover-foreground', resolved === 'dark' ? '#f1f5f9' : '#0f172a');
      root.style.setProperty('--primary', resolved === 'dark' ? '#3b82f6' : '#2563eb');
      root.style.setProperty('--primary-foreground', resolved === 'dark' ? '#ffffff' : '#ffffff');
      root.style.setProperty('--secondary', resolved === 'dark' ? '#334155' : '#f1f5f9');
      root.style.setProperty('--secondary-foreground', resolved === 'dark' ? '#f1f5f9' : '#0f172a');
      root.style.setProperty('--muted', resolved === 'dark' ? '#334155' : '#f1f5f9');
      root.style.setProperty('--muted-foreground', resolved === 'dark' ? '#94a3b8' : '#64748b');
      root.style.setProperty('--accent', resolved === 'dark' ? '#334155' : '#f1f5f9');
      root.style.setProperty('--accent-foreground', resolved === 'dark' ? '#f1f5f9' : '#0f172a');
      root.style.setProperty('--destructive', resolved === 'dark' ? '#7f1d1d' : '#dc2626');
      root.style.setProperty('--destructive-foreground', resolved === 'dark' ? '#fef2f2' : '#ffffff');
      root.style.setProperty('--border', resolved === 'dark' ? '#334155' : '#e2e8f0');
      root.style.setProperty('--input', resolved === 'dark' ? '#334155' : '#e2e8f0');
      root.style.setProperty('--ring', resolved === 'dark' ? '#3b82f6' : '#2563eb');
    };

    updateTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);

    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
