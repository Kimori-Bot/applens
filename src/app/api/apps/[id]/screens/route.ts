import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase, query, insert } from '@/lib/supabase';

// Helper to verify app ownership
async function verifyAppOwnership(appId, companyId) {
  const { data } = await supabase
    .from('apps')
    .select('company_id')
    .eq('id', appId)
    .single();
  return data && data.company_id === companyId;
}

// GET /api/apps/:id/screens
export async function GET(request, { params }) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const appId = parseInt(params.id);
    const hasAccess = await verifyAppOwnership(appId, auth.company.id);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get latest session
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('app_id', appId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ screens: [] });
    }

    // Get screens
    const { data: screens, error } = await supabase
      .from('screens')
      .select('*')
      .eq('session_id', sessions[0].id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ screens: screens || [] });
  } catch (error) {
    console.error('Get screens error:', error);
    return NextResponse.json({ error: 'Failed to get screens' }, { status: 500 });
  }
}

// POST /api/apps/:id/test - Start test run
export async function POST(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // This endpoint expects appId in URL params, not body
    // But since it's nested, we need to handle differently
    return NextResponse.json({ error: 'Use /api/automation/start' }, { status: 400 });
  } catch (error) {
    console.error('Start test error:', error);
    return NextResponse.json({ error: 'Failed to start test' }, { status: 500 });
  }
}
