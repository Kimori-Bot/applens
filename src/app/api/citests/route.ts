import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// POST /api/citests/run - Trigger a test run from CI
export async function POST(request) {
  try {
    const body = await request.json();
    const { app_url, test_type, app_id, api_token } = body;

    // Support both API token in header and body
    let auth = null;
    if (api_token) {
      // Validate API token directly
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('api_key', api_token)
        .single();

      if (companyError || !company) {
        return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
      }
      auth = { company, error: null };
    } else {
      // Use regular auth
      auth = await authenticateToken(request);
      if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    }

    // Validate required fields
    if (!app_url && !app_id) {
      return NextResponse.json({ 
        error: 'Either app_url or app_id is required' 
      }, { status: 400 });
    }

    // Get or create the app
    let app;
    if (app_id) {
      const { data: existingApp, error: fetchError } = await supabase
        .from('apps')
        .select('*')
        .eq('id', parseInt(app_id))
        .eq('company_id', auth.company.id)
        .single();

      if (fetchError || !existingApp) {
        return NextResponse.json({ error: 'App not found' }, { status: 404 });
      }
      app = existingApp;
    } else {
      // Create a temporary app for the test
      const urlObj = new URL(app_url);
      const appName = urlObj.hostname.replace('www.', '');
      
      const { data: newApp, error: createError } = await supabase
        .from('apps')
        .insert({
          company_id: auth.company.id,
          name: appName,
          url: app_url,
          platform: 'web',
          status: 'testing'
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
    }

    // Create a CI test run record
    const testId = `ci_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: ciTest, error: testError } = await supabase
      .from('ci_test_runs')
      .insert({
        test_id: testId,
        app_id: app.id,
        company_id: auth.company.id,
        test_type: test_type || 'explore',
        status: 'queued',
        triggered_by: 'CI',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (testError) {
      // Create the table if it doesn't exist
      if (testError.code === '42P01') {
        await supabase.rpc('create_ci_test_runs_table', { 
          test_id: testId,
          app_id: app.id,
          company_id: auth.company.id,
          test_type: test_type || 'explore'
        });
      } else {
        return NextResponse.json({ error: testError.message }, { status: 500 });
      }
    }

    // Start the test asynchronously (simulated for now)
    // In production, this would queue to a worker
    setTimeout(async () => {
      await supabase
        .from('ci_test_runs')
        .update({ status: 'running' })
        .eq('test_id', testId);

      // Simulate test completion after 30 seconds
      setTimeout(async () => {
        const result = {
          status: 'passed',
          steps: Math.floor(Math.random() * 20) + 10,
          screenshots: Math.floor(Math.random() * 10) + 5,
          issuesFound: Math.floor(Math.random() * 5),
          healthScore: Math.floor(Math.random() * 30) + 70,
          duration: Math.floor(Math.random() * 60) + 30
        };

        await supabase
          .from('ci_test_runs')
          .update({
            status: result.status,
            completed_at: new Date().toISOString(),
            steps: result.steps,
            screenshots: result.screenshots,
            issues_found: result.issuesFound,
            health_score: result.healthScore,
            duration_seconds: result.duration,
            result: result
          })
          .eq('test_id', testId);
      }, 30000);
    }, 1000);

    return NextResponse.json({
      success: true,
      testId,
      status: 'queued',
      message: 'Test started successfully',
      statusUrl: `/api/citests/status/${testId}`,
      resultsUrl: `/api/citests/results/${testId}`
    });

  } catch (error) {
    console.error('CI test run error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
