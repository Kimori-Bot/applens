'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ChevronLeft,
  User,
  Key,
  Copy,
  Check,
  Loader2,
  Save,
  Settings as SettingsIcon
} from 'lucide-react';

export default function SettingsPage() {
  const { company, loading: authLoading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!authLoading && !company) {
      router.push('/login');
    }
  }, [authLoading, company, router]);

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setApiKey(company.apiKey || '');
    }
  }, [company]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage({ type: 'success', text: 'Saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div style={{ color: 'var(--foreground)' }}>
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm mb-4"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <SettingsIcon className="w-7 h-7" style={{ color: 'var(--primary)' }} />
          Settings
        </h1>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Company Info */}
        <div 
          className="p-6 rounded-xl border"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h2 className="text-lg font-semibold mb-4">Company</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg"
                style={{ 
                  backgroundColor: 'var(--input)', 
                  color: 'var(--foreground)',
                  borderColor: 'var(--border)'
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="text"
                value={company?.email || ''}
                disabled
                className="w-full px-4 py-2 rounded-lg opacity-60"
                style={{ 
                  backgroundColor: 'var(--input)', 
                  color: 'var(--foreground)',
                  borderColor: 'var(--border)'
                }}
              />
            </div>
          </div>
        </div>

        {/* API Key */}
        <div 
          className="p-6 rounded-xl border"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h2 className="text-lg font-semibold mb-4">API Key</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Use this key to integrate with AppLens programmatically.
          </p>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={apiKey}
              readOnly
              className="flex-1 px-4 py-2 rounded-lg font-mono text-sm"
              style={{ 
                backgroundColor: 'var(--input)', 
                color: 'var(--foreground)',
                borderColor: 'var(--border)'
              }}
            />
            <button
              onClick={copyApiKey}
              className="px-4 py-2 rounded-lg border"
              style={{ borderColor: 'var(--border)' }}
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg font-medium"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {message && (
            <span style={{ color: message.type === 'error' ? 'var(--destructive)' : '#22c55e' }}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
