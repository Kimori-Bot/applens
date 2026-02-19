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
    const days = parseInt(searchParams.get('days') || '30');
    const appId = searchParams.get('app_id');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Base query for test runs
    let testRunsQuery = supabase
      .from('test_runs')
      .select('*')
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false });

    if (appId) {
      testRunsQuery = testRunsQuery.eq('app_id', appId);
    }

    const { data: testRuns, error } = await testRunsQuery;

    if (error) {
      console.error('Error fetching test runs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate metrics
    const totalTests = testRuns?.length || 0;
    const completedTests = testRuns?.filter(t => t.status === 'completed').length || 0;
    const failedTests = testRuns?.filter(t => t.status === 'failed').length || 0;
    const runningTests = testRuns?.filter(t => t.status === 'running').length || 0;
    const pendingTests = testRuns?.filter(t => t.status === 'pending').length || 0;

    const passRate = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

    // Calculate average duration
    const completedWithDuration = testRuns?.filter(t => 
      t.completed_at && t.started_at
    ) || [];
    const avgDuration = completedWithDuration.length > 0
      ? Math.round(
          completedWithDuration.reduce((acc, t) => {
            const duration = new Date(t.completed_at).getTime() - new Date(t.started_at).getTime();
            return acc + duration;
          }, 0) / completedWithDuration.length / 1000 // in seconds
        )
      : 0;

    // Group by date for trend
    const testsByDate: Record<string, { total: number; passed: number; failed: number }> = {};
    testRuns?.forEach(test => {
      const date = new Date(test.started_at).toISOString().split('T')[0];
      if (!testsByDate[date]) {
        testsByDate[date] = { total: 0, passed: 0, failed: 0 };
      }
      testsByDate[date].total++;
      if (test.status === 'completed') testsByDate[date].passed++;
      if (test.status === 'failed') testsByDate[date].failed++;
    });

    const trend = Object.entries(testsByDate)
      .map(([date, counts]) => ({
        date,
        ...counts
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);

    // Get most common errors from failed tests
    const { data: commands } = await supabase
      .from('commands')
      .select('*')
      .in('status', ['failed'])
      .gte('created_at', startDate.toISOString());

    const errorCounts: Record<string, number> = {};
    commands?.forEach(cmd => {
      const errorMsg = cmd.result?.error || cmd.result?.message || 'Unknown error';
      errorCounts[errorMsg] = (errorCounts[errorMsg] || 0) + 1;
    });

    const topErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get sessions for additional stats
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false });

    const totalSessions = sessions?.length || 0;
    const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;

    return NextResponse.json({
      summary: {
        totalTests,
        completedTests,
        failedTests,
        runningTests,
        pendingTests,
        passRate,
        avgDurationSeconds: avgDuration,
        totalSessions,
        completedSessions
      },
      trend,
      topErrors,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
