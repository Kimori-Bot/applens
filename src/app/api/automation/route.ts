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

// POST /api/automation/start
export async function POST(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { app_id, max_explorations = 100 } = body;

    if (!app_id) {
      return NextResponse.json({ error: 'app_id is required' }, { status: 400 });
    }

    const hasAccess = await verifyAppOwnership(app_id, auth.company.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if already running
    const { data: existingState } = await supabase
      .from('automation_state')
      .select('*')
      .eq('app_id', app_id)
      .eq('is_running', true);

    if (existingState && existingState.length > 0) {
      return NextResponse.json({ error: 'Automation already running for this app' }, { status: 400 });
    }

    // Create a new session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        app_id,
        company_id: auth.company.id,
        status: 'running'
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Initialize automation state
    const { error: stateError } = await supabase
      .from('automation_state')
      .insert({
        app_id,
        is_running: true,
        max_explorations,
        started_at: new Date().toISOString(),
        visited_screens: []
      });

    // Log activity
    await insert('activity_logs', {
      company_id: auth.company.id,
      action: 'automation_started',
      details: { appId: app_id, sessionId: session.id }
    });

    return NextResponse.json({
      message: 'Automation started successfully',
      session
    });
  } catch (error) {
    console.error('Start automation error:', error);
    return NextResponse.json({ error: 'Failed to start automation' }, { status: 500 });
  }
}

// GET /api/automation/status
export async function GET(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const app_id = searchParams.get('app_id');

    if (!app_id) {
      return NextResponse.json({ error: 'app_id is required' }, { status: 400 });
    }

    const hasAccess = await verifyAppOwnership(parseInt(app_id), auth.company.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get automation state
    const { data: automation } = await supabase
      .from('automation_state')
      .select('*')
      .eq('app_id', parseInt(app_id))
      .single();

    // Get latest session
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('app_id', parseInt(app_id))
      .order('created_at', { ascending: false })
      .limit(1);

    let commands = { total: 0, completed: 0, failed: 0 };
    if (sessions && sessions.length > 0) {
      const { data: cmdCounts } = await supabase
        .from('commands')
        .select('status')
        .eq('session_id', sessions[0].id);
      
      if (cmdCounts) {
        commands.total = cmdCounts.length;
        commands.completed = cmdCounts.filter(c => c.status === 'completed').length;
        commands.failed = cmdCounts.filter(c => c.status === 'failed').length;
      }
    }

    return NextResponse.json({
      automation: automation || null,
      session: sessions?.[0] || null,
      commands
    });
  } catch (error) {
    console.error('Get automation status error:', error);
    return NextResponse.json({ error: 'Failed to get automation status' }, { status: 500 });
  }
}
