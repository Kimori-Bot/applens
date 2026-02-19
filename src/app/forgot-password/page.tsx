'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Smartphone, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }
      
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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

            {/* Success message */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--primary)' + '20' }}>
                <CheckCircle className="w-8 h-8" style={{ color: 'var(--primary)' }} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Check your email</h1>
              <p className="mb-6" style={{ color: 'var(--muted-foreground)' }}>
                We&apos;ve sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm mb-8" style={{ color: 'var(--muted-foreground)' }}>
                Didn&apos;t receive the email? Check your spam folder, or{' '}
                <button 
                  onClick={() => setSuccess(false)}
                  className="font-medium"
                  style={{ color: 'var(--primary)' }}
                >
                  try another email address
                </button>
              </p>
              
              <Link 
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium"
                style={{ color: 'var(--primary)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
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
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Forgot password?</h1>
          <p className="mb-8" style={{ color: 'var(--muted-foreground)' }}>
            No worries, we&apos;ll send you reset instructions.
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: 'var(--primary)', 
                color: 'var(--primary-foreground)' 
              }}
            >
              {loading ? 'Sending...' : 'Reset password'}
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
