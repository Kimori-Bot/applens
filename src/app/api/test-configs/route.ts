import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// GET /api/test-configs - List all test configs for user/team
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');
    const type = searchParams.get('type');

    let query = supabase
      .from('test_configs')
      .select('*')
      .order('updated_at', { ascending: false });

    if (appId) {
      query = query.eq('app_id', appId);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ configs: data });
  } catch (error) {
    console.error('Get test configs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test configs' },
      { status: 500 }
    );
  }
}

// POST /api/test-configs - Create a new test config
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      type, 
      appId, 
      goal, 
      maxSteps = 10, 
      credentials,
      model,
      schedule 
    } = body;

    if (!name || !type || !appId) {
      return NextResponse.json(
        { error: 'Name, type, and appId are required' },
        { status: 400 }
      );
    }

    const config = {
      id: uuidv4(),
      name,
      description: description || '',
      type,
      app_id: appId,
      goal: goal || null,
      max_steps: maxSteps,
      credentials: credentials || [],
      model: model || 'minimax-m2.5:cloud',
      schedule: schedule || { enabled: false },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('test_configs')
      .insert(config)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data }, { status: 201 });
  } catch (error) {
    console.error('Create test config error:', error);
    return NextResponse.json(
      { error: 'Failed to create test config' },
      { status: 500 }
    );
  }
}
