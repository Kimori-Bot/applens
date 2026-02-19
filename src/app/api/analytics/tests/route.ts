import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Filters
    const appId = searchParams.get('app_id');
    const status = searchParams.get('status');
    const testType = searchParams.get('test_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const days = parseInt(searchParams.get('days') || '30');
    const sortBy = searchParams.get('sort_by') || 'started_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query
    let query = supabase
      .from('test_runs')
      .select(`
        *,
        app:apps(id, name, platform)
      `)
      .gte('started_at', startDate.toISOString())
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (appId) {
      query = query.eq('app_id', appId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (testType) {
      query = query.eq('test_type', testType);
    }

    const { data: testRuns, error } = await query;

    if (error) {
      console.error('Error fetching test runs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('test_runs')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', startDate.toISOString());

    if (appId) countQuery = countQuery.eq('app_id', appId);
    if (status) countQuery = countQuery.eq('status', status);
    if (testType) countQuery = countQuery.eq('test_type', testType);

    const { count } = await countQuery;

    // Get API test results if available
    const testRunIds = testRuns?.map(t => t.id) || [];
    let apiResults: any[] = [];
    
    if (testRunIds.length > 0) {
      const { data: apiData } = await supabase
        .from('api_test_results')
        .select('*')
        .in('test_run_id', testRunIds);
      apiResults = apiData || [];
    }

    // Map API results to test runs
    const testRunsWithApiResults = testRuns?.map(test => ({
      ...test,
      apiResults: apiResults.filter(r => r.test_run_id === test.id)
    })) || [];

    return NextResponse.json({
      tests: testRunsWithApiResults,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      },
      filters: {
        appId,
        status,
        testType,
        days
      }
    });
  } catch (error) {
    console.error('Analytics tests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
