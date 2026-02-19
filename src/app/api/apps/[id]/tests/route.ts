import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/apps/:id/tests - Get tests for an app
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    const { data: tests, error } = await supabase
      .from('apps')
      .select(`
        id,
        name,
        status,
        config,
        created_at
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // For now, return mock test data (would be from tests table)
    const mockTests = [
      {
        id: 'test_1',
        appId: id,
        appName: tests.name,
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        steps: 10,
        screenshots: [],
        issues: 0,
        videoUrl: null
      }
    ];
    
    return NextResponse.json(mockTests);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
