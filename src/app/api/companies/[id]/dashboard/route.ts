import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { query } from '@/lib/supabase';

// GET /api/companies/:id/dashboard
export async function GET(request, { params }) {
  // Next.js 16 - params is a Promise
  const resolvedParams = await params;
  const companyId = resolvedParams.id;
  
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (String(companyId) !== String(auth.company.id)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    // Get app counts by platform
    const { data: apps } = await query('apps', { 
      where: { company_id: parseInt(companyId) },
      select: 'platform'
    });

    const iosApps = apps?.filter(a => a.platform === 'ios').length || 0;
    const androidApps = apps?.filter(a => a.platform === 'android').length || 0;
    const totalApps = apps?.length || 0;

    // Get test sessions count
    const { data: sessions } = await query('sessions', {
      where: { company_id: parseInt(companyId) }
    });
    const totalTests = sessions?.length || 0;

    // Get issues count
    const { data: issues } = await query('issues', {
      where: { company_id: parseInt(companyId) }
    });
    const totalIssues = issues?.length || 0;

    // Get screens count
    const { data: screens } = await query('screens', {
      where: { company_id: parseInt(companyId) }
    });
    const totalScreens = screens?.length || 0;

    return NextResponse.json({
      stats: {
        totalApps,
        iosApps,
        androidApps,
        totalTests,
        totalIssues,
        totalScreens
      },
      recentApps: apps?.slice(0, 5) || []
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
