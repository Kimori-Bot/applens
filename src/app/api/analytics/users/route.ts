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
    const limit = parseInt(searchParams.get('limit') || '10');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get company ID for the user
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', authUser.id)
      .single();

    const companyId = companyUser?.company_id;

    // Get test runs with user info
    const { data: testRuns } = await supabase
      .from('test_runs')
      .select(`
        *,
        app:apps(id, name, user_id),
        session:sessions(id, user_id)
      `)
      .gte('started_at', startDate.toISOString());

    // Get sessions with user info
    const { data: sessions } = await supabase
      .from('sessions')
      .select(`
        *,
        app:apps(id, name, user_id)
      `)
      .gte('started_at', startDate.toISOString());

    // Get users from auth (for company)
    const { data: companyMembers } = companyId 
      ? await supabase
          .from('company_users')
          .select(`
            user_id,
            role,
            user:users(id, email, full_name, avatar_url)
          `)
          .eq('company_id', companyId)
      : { data: null };

    // Aggregate user activity
    const userActivity: Record<string, {
      userId: string;
      email: string;
      fullName: string;
      avatarUrl?: string;
      role?: string;
      totalTests: number;
      completedTests: number;
      failedTests: number;
      totalSessions: number;
      completedSessions: number;
      lastActivity: string;
    }> = {};

    // Process test runs
    testRuns?.forEach(test => {
      const userId = test.app?.user_id || 'unknown';
      
      if (!userActivity[userId]) {
        userActivity[userId] = {
          userId,
          email: 'Unknown',
          fullName: 'Unknown User',
          totalTests: 0,
          completedTests: 0,
          failedTests: 0,
          totalSessions: 0,
          completedSessions: 0,
          lastActivity: test.started_at
        };
      }

      userActivity[userId].totalTests++;
      if (test.status === 'completed') userActivity[userId].completedTests++;
      if (test.status === 'failed') userActivity[userId].failedTests++;
      
      if (new Date(test.started_at) > new Date(userActivity[userId].lastActivity)) {
        userActivity[userId].lastActivity = test.started_at;
      }
    });

    // Process sessions
    sessions?.forEach(session => {
      const userId = session.app?.user_id || 'unknown';
      
      if (!userActivity[userId]) {
        userActivity[userId] = {
          userId,
          email: 'Unknown',
          fullName: 'Unknown User',
          totalTests: 0,
          completedTests: 0,
          failedTests: 0,
          totalSessions: 0,
          completedSessions: 0,
          lastActivity: session.started_at
        };
      }

      userActivity[userId].totalSessions++;
      if (session.status === 'completed') userActivity[userId].completedSessions++;
      
      if (new Date(session.started_at) > new Date(userActivity[userId].lastActivity)) {
        userActivity[userId].lastActivity = session.started_at;
      }
    });

    // Enrich with user info from company members
    if (companyMembers) {
      companyMembers.forEach((member: any) => {
        if (userActivity[member.user_id]) {
          userActivity[member.user_id].email = member.user?.email || 'Unknown';
          userActivity[member.user_id].fullName = member.user?.full_name || member.user?.email?.split('@')[0] || 'Unknown';
          userActivity[member.user_id].avatarUrl = member.user?.avatar_url;
          userActivity[member.user_id].role = member.role;
        }
      });
    }

    // Convert to array and calculate additional metrics
    const users = Object.values(userActivity)
      .map(user => ({
        ...user,
        passRate: user.totalTests > 0 
          ? Math.round((user.completedTests / user.totalTests) * 100) 
          : 0,
        sessionSuccessRate: user.totalSessions > 0
          ? Math.round((user.completedSessions / user.totalSessions) * 100)
          : 0
      }))
      .sort((a, b) => (b.totalTests + b.totalSessions) - (a.totalTests + a.totalSessions))
      .slice(0, limit);

    // Summary
    const totalActiveUsers = users.length;
    const totalTestActivity = users.reduce((acc, u) => acc + u.totalTests, 0);
    const totalSessionActivity = users.reduce((acc, u) => acc + u.totalSessions, 0);
    const avgTestsPerUser = totalActiveUsers > 0 ? Math.round(totalTestActivity / totalActiveUsers) : 0;

    return NextResponse.json({
      users,
      summary: {
        totalActiveUsers,
        totalTestActivity,
        totalSessionActivity,
        avgTestsPerUser,
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Analytics users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
