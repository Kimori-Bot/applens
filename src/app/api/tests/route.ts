import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET /api/tests - List test sessions with optional filters
// Requires authentication
export async function GET(request) {
  // Require authentication
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const appId = searchParams.get('appId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // If ID provided, return specific test
    if (id) {
      const appIdNum = parseInt(id.replace('session_', ''));
      const { data: app, error } = await supabase
        .from('apps')
        .select('*')
        .eq('id', appIdNum)
        .eq('company_id', auth.company.id) // Ensure user owns the app
        .single();
      
      if (error || !app) {
        return NextResponse.json({ error: 'Test not found' }, { status: 404 });
      }
      
      const config = app.config || {};
      const lastTest = config.lastTest || {};
      
      return NextResponse.json({
        id: `session_${app.id}`,
        appId: app.id,
        appName: app.name,
        appUrl: app.url,
        status: app.status,
        ...lastTest
      });
    }
    
    // Otherwise list all test sessions for this company
    let query = supabase
      .from('apps')
      .select('id, name, url, platform, status, config, created_at, company_id')
      .eq('company_id', auth.company.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (appId) query = query.eq('id', parseInt(appId));
    
    const { data: apps, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Transform apps to include test history
    const testSessions = apps.map(app => {
      const config = app.config || {};
      const lastTest = config.lastTest || {};
      
      return {
        id: `session_${app.id}`,
        appId: app.id,
        appName: app.name,
        appUrl: app.url,
        platform: app.platform,
        status: app.status,
        startedAt: app.created_at,
        completedAt: lastTest.completedAt || null,
        steps: lastTest.steps || 0,
        screenshots: lastTest.screenshots || 0,
        healthScore: lastTest.healthScore || null,
        issuesFound: lastTest.issuesFound || 0
      };
    });
    
    // Filter to only include apps that have been tested
    const testedSessions = testSessions.filter(s => s.steps > 0);
    
    return NextResponse.json(testedSessions);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/tests - Save a test as a reusable test case
// Requires authentication
export async function POST(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { appId, name, description, steps } = body;
    
    // In production, save to saved_tests table
    // For now, return success
    
    return NextResponse.json({
      success: true,
      testId: `saved_${Date.now()}`,
      name,
      description,
      stepsCount: steps?.length || 0
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
