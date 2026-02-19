import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/test-runs - List test runs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testConfigId = searchParams.get('testConfigId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('test_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (testConfigId) {
      query = query.eq('test_config_id', testConfigId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ runs: data });
  } catch (error) {
    console.error('Get test runs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test runs' },
      { status: 500 }
    );
  }
}

// POST /api/test-runs - Create a new test run
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { testConfigId, status = 'queued' } = body;

    if (!testConfigId) {
      return NextResponse.json(
        { error: 'testConfigId is required' },
        { status: 400 }
      );
    }

    const run = {
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      test_config_id: testConfigId,
      status,
      started_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('test_runs')
      .insert(run)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ run: data }, { status: 201 });
  } catch (error) {
    console.error('Create test run error:', error);
    return NextResponse.json(
      { error: 'Failed to create test run' },
      { status: 500 }
    );
  }
}
