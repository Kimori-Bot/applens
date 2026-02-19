'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface Company {
  id: number;
  name: string;
  email: string;
  apiKey?: string;
}

interface AuthContextType {
  company: Company | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  updateCompany: (updates: Partial<Company>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = '/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCompany(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCompany = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCompany(data.company);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Failed to fetch company:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    const { token, company: companyData } = data;
    
    localStorage.setItem('token', token);
    setCompany(companyData);
    setIsAuthenticated(true);
    
    return data;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    
    const { token, company: companyData } = data;
    
    localStorage.setItem('token', token);
    setCompany(companyData);
    setIsAuthenticated(true);
    
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setCompany(null);
      setIsAuthenticated(false);
    }
  }, []);

  const updateCompany = useCallback((updates: Partial<Company>) => {
    setCompany(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const value = {
    company,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateCompany,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
