'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Smartphone, Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo & Theme Toggle */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <Smartphone className="w-6 h-6 text-white" style={{ color: 'var(--primary-foreground)' }} />
              </div>
              <span className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>AppLens</span>
            </div>
            <ThemeToggle />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Welcome back</h1>
          <p className="mb-8" style={{ color: 'var(--muted-foreground)' }}>Sign in to your account to continue</p>

          {/* Error */}
          {error && (
            <div 
              className="flex items-center gap-2 p-3 rounded-lg mb-4"
              style={{ backgroundColor: 'var(--destructive)' + '20', color: 'var(--destructive)' }}
            >
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--foreground)' }}
              >
                Email address
              </label>
              <div className="relative">
                <Mail 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
                  style={{ color: 'var(--muted-foreground)' }} 
                />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: 'var(--input)', 
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)'
                  }}
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium"
                  style={{ color: 'var(--foreground)' }}
                >
                  Password
                </label>
                <Link 
                  href="/forgot-password"
                  className="text-sm font-medium"
                  style={{ color: 'var(--primary)' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
                  style={{ color: 'var(--muted-foreground)' }} 
                />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: 'var(--input)', 
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)'
                  }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: 'var(--primary)', 
                color: 'var(--primary-foreground)' 
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
            Don&apos;t have an account?{' '}
            <Link 
              href="/register" 
              className="font-medium"
              style={{ color: 'var(--primary)' }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div 
        className="hidden lg:flex flex-1 items-center justify-center p-12"
        style={{ backgroundColor: 'var(--primary)' }}
      >
        <div className="max-w-lg text-center">
          <div 
            className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-8"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <Smartphone className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">AI-Powered App Analysis</h2>
          <p className="text-blue-100 text-lg">
            Automatically analyze mobile apps, identify issues, and get actionable insights to improve your app quality.
          </p>
        </div>
      </div>
    </div>
  );
}
