import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to verify API key
async function verifyApiKey(request) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return null;
  }

  const { data } = await supabase
    .from('companies')
    .select('id, name')
    .eq('api_key', apiKey)
    .single();

  return data || null;
}

// Helper to verify session ownership
async function verifySession(sessionId, companyId) {
  const { data } = await supabase
    .from('sessions')
    .select('*, apps!inner(company_id)')
    .eq('id', sessionId)
    .single();
  
  return data && data.apps?.company_id === companyId;
}

// GET /api/test/commands - Poll for pending commands
export async function GET(request) {
  const company = await verifyApiKey(request);
  
  if (!company) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get('session_id');

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    const hasAccess = await verifySession(parseInt(session_id), company.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get pending commands
    const { data: commands, error } = await supabase
      .from('commands')
      .select('*')
      .eq('session_id', parseInt(session_id))
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) throw error;

    // Mark commands as running
    for (const cmd of (commands || [])) {
      if (cmd.status === 'pending') {
        await supabase
          .from('commands')
          .update({ status: 'running' })
          .eq('id', cmd.id);
      }
    }

    return NextResponse.json({ commands: commands || [] });
  } catch (error) {
    console.error('Get commands error:', error);
    return NextResponse.json({ error: 'Failed to get commands' }, { status: 500 });
  }
}

// POST /api/test/commandResult - Report command result
export async function POST(request) {
  const company = await verifyApiKey(request);
  
  if (!company) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { command_id, status, result, error_message } = body;

    if (!command_id) {
      return NextResponse.json({ error: 'command_id is required' }, { status: 400 });
    }

    // Get command and verify ownership
    const { data: cmd, error: cmdError } = await supabase
      .from('commands')
      .select('*, apps!inner(company_id)')
      .eq('id', command_id)
      .single();

    if (cmdError || !cmd) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    if (cmd.apps?.company_id !== company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update command
    const { error: updateError } = await supabase
      .from('commands')
      .update({ 
        status, 
        result: result || {},
        completed_at: new Date().toISOString()
      })
      .eq('id', command_id);

    if (updateError) throw updateError;

    // Update session if failed
    if (status === 'failed') {
      await supabase
        .from('sessions')
        .update({ 
          status: 'failed', 
          error_message,
          completed_at: new Date().toISOString()
        })
        .eq('id', cmd.session_id);

      // Stop automation
      await supabase
        .from('automation_state')
        .update({ is_running: false })
        .eq('app_id', cmd.app_id);
    }

    return NextResponse.json({ message: 'Command result recorded' });
  } catch (error) {
    console.error('Report command result error:', error);
    return NextResponse.json({ error: 'Failed to report command result' }, { status: 500 });
  }
}
