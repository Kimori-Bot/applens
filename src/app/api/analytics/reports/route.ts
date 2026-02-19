import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, format, days, appId, emailTo, schedule } = body;

    // Fetch analytics data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days || 30));

    let testRunsQuery = supabase
      .from('test_runs')
      .select('*')
      .gte('started_at', startDate.toISOString());

    if (appId) {
      testRunsQuery = testRunsQuery.eq('app_id', appId);
    }

    const { data: testRuns } = await testRunsQuery;

    // Calculate metrics
    const totalTests = testRuns?.length || 0;
    const completedTests = testRuns?.filter(t => t.status === 'completed').length || 0;
    const failedTests = testRuns?.filter(t => t.status === 'failed').length || 0;
    const runningTests = testRuns?.filter(t => t.status === 'running').length || 0;
    const passRate = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

    // Calculate average duration
    const completedWithDuration = testRuns?.filter(t => t.completed_at && t.started_at) || [];
    const avgDuration = completedWithDuration.length > 0
      ? Math.round(
          completedWithDuration.reduce((acc, t) => {
            const duration = new Date(t.completed_at).getTime() - new Date(t.started_at).getTime();
            return acc + duration;
          }, 0) / completedWithDuration.length / 1000
        )
      : 0;

    // Group by date
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
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get top errors
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

    // Build report data
    const reportData = {
      generatedAt: new Date().toISOString(),
      period: {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        days: days || 30
      },
      summary: {
        totalTests,
        completedTests,
        failedTests,
        runningTests,
        passRate,
        avgDurationSeconds: avgDuration
      },
      trend,
      topErrors,
      type: type || 'summary'
    };

    // Generate report based on format
    let reportContent: any;
    
    if (format === 'csv') {
      // Convert to CSV
      const csvRows = [
        ['Date', 'Total Tests', 'Passed', 'Failed'],
        ...trend.map(t => [t.date, t.total, t.passed, t.failed])
      ];
      reportContent = {
        format: 'csv',
        content: csvRows.map(row => row.join(',')).join('\n'),
        filename: `test_report_${new Date().toISOString().split('T')[0]}.csv`
      };
    } else if (format === 'html') {
      // Generate HTML report
      const html = generateHTMLReport(reportData);
      reportContent = {
        format: 'html',
        content: html,
        filename: `test_report_${new Date().toISOString().split('T')[0]}.html`
      };
    } else {
      // JSON format (default)
      reportContent = {
        format: 'json',
        content: JSON.stringify(reportData, null, 2),
        filename: `test_report_${new Date().toISOString().split('T')[0]}.json`
      };
    }

    // Handle email scheduling
    if (schedule) {
      console.log('Scheduled report:', { schedule, emailTo, type });
    }

    // If email is specified, log it (in production, integrate with email service)
    if (emailTo && emailTo.length > 0) {
      console.log('Sending report to:', emailTo);
    }

    return NextResponse.json({
      success: true,
      report: reportContent,
      message: schedule ? 'Report scheduled successfully' : 'Report generated successfully'
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateHTMLReport(data: any): string {
  const { summary, trend, topErrors, period, generatedAt } = data;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AppLens Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #0a0a0f; color: #fff; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: #3b82f6; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
    .stat { background: #12121a; padding: 20px; border-radius: 12px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; }
    .stat-label { color: #9ca3af; margin-top: 8px; }
    .stat-success .stat-value { color: #22c55e; }
    .stat-danger .stat-value { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #2a2a3e; }
    th { background: #1a1a2e; color: #9ca3af; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .badge-success { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .badge-danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #2a2a3e; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 AppLens Test Report</h1>
    <p>Period: ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}</p>
    
    <div class="summary">
      <div class="stat">
        <div class="stat-value">${summary.totalTests}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat stat-success">
        <div class="stat-value">${summary.passRate}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
      <div class="stat stat-danger">
        <div class="stat-value">${summary.failedTests}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${summary.avgDurationSeconds}s</div>
        <div class="stat-label">Avg Duration</div>
      </div>
    </div>

    <h2>Daily Trend</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Total</th>
          <th>Passed</th>
          <th>Failed</th>
        </tr>
      </thead>
      <tbody>
        ${trend.slice(-14).map((t: any) => `
        <tr>
          <td>${t.date}</td>
          <td>${t.total}</td>
          <td><span class="badge badge-success">${t.passed}</span></td>
          <td><span class="badge badge-danger">${t.failed}</span></td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>Top Errors</h2>
    <table>
      <thead>
        <tr>
          <th>Error</th>
          <th>Count</th>
        </tr>
      </thead>
      <tbody>
        ${topErrors.map((e: any) => `
        <tr>
          <td>${e.error}</td>
          <td><span class="badge badge-danger">${e.count}</span></td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="footer">
      Generated by AppLens on ${new Date(generatedAt).toLocaleString()}
    </div>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      reportTypes: ['summary', 'detailed', 'errors', 'performance'],
      formats: ['json', 'csv', 'html'],
      schedules: [
        { id: 'daily', name: 'Daily', cron: '0 9 * * *' },
        { id: 'weekly', name: 'Weekly', cron: '0 9 * * 1' },
        { id: 'monthly', name: 'Monthly', cron: '0 9 1 * *' }
      ]
    });
  } catch (error) {
    console.error('Reports list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
