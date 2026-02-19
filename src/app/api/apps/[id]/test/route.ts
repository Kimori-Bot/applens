import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// POST /api/apps/:id/test - Start a test run
export async function POST(request, { params }) {
  const resolvedParams = await params;
  const appId = resolvedParams.id;
  
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Verify app belongs to company
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('*')
      .eq('id', parseInt(appId))
      .eq('company_id', auth.company.id);

    if (appError) throw appError;

    if (!app || app.length === 0) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Generate session_id
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Create a test session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        session_id: sessionId,
        app_id: parseInt(appId),
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select();

    if (sessionError) {
      console.error('Session insert error:', sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Update app status
    await supabase
      .from('apps')
      .update({ status: 'testing' })
      .eq('id', parseInt(appId));

    return NextResponse.json({
      message: 'Test started',
      sessionId: session[0].session_id,
      status: 'running'
    });
  } catch (error) {
    console.error('Start test error:', error);
    return NextResponse.json({ error: 'Failed to start test' }, { status: 500 });
  }
}

// GET /api/apps/:id/test - Get test status
export async function GET(request, { params }) {
  const resolvedParams = await params;
  const appId = resolvedParams.id;
  
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('app_id', parseInt(appId))
      .order('created_at', { ascending: false })
      .limit(1);

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ status: 'no_tests', tests: [] });
    }

    return NextResponse.json({
      status: sessions[0].status,
      tests: sessions
    });
  } catch (error) {
    console.error('Get test status error:', error);
    return NextResponse.json({ error: 'Failed to get test status' }, { status: 500 });
  }
}
