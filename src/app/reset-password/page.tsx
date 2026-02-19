'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Smartphone, Lock, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setInvalidToken(true);
      return;
    }

    // Validate token format (base64 encoded JSON)
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      if (payload.exp < Date.now()) {
        setInvalidToken(true);
      }
    } catch {
      setInvalidToken(true);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (invalidToken) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--destructive)' + '20' }}>
              <AlertCircle className="w-8 h-8" style={{ color: 'var(--destructive)' }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Invalid or expired link</h1>
            <p className="mb-8" style={{ color: 'var(--muted-foreground)' }}>
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link 
              href="/forgot-password"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              Request new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--primary)' + '20' }}>
              <CheckCircle className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Password reset successful</h1>
            <p className="mb-8" style={{ color: 'var(--muted-foreground)' }}>
              Your password has been reset. Redirecting to login...
            </p>
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 font-medium"
              style={{ color: 'var(--primary)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Go to login now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
              <Smartphone className="w-6 h-6 text-white" style={{ color: 'var(--primary-foreground)' }} />
            </div>
            <span className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>AppLens</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Create new password</h1>
          <p className="mb-8" style={{ color: 'var(--muted-foreground)' }}>
            Your new password must be different from previously used passwords.
          </p>

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
                htmlFor="password" 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--foreground)' }}
              >
                New password
              </label>
              <div className="relative">
                <Lock 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
                  style={{ color: 'var(--muted-foreground)' }} 
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: 'var(--input)', 
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)'
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                  ) : (
                    <Eye className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--foreground)' }}
              >
                Confirm new password
              </label>
              <div className="relative">
                <Lock 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
                  style={{ color: 'var(--muted-foreground)' }} 
                />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: 'var(--input)', 
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)'
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                  ) : (
                    <Eye className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                  )}
                </button>
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
              {loading ? 'Resetting password...' : 'Reset password'}
            </button>
          </form>

          <p className="mt-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 font-medium"
              style={{ color: 'var(--primary)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
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

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
