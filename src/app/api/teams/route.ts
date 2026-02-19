import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET /api/teams - List all teams for the current user
export async function GET(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const companyId = auth.company.id;
    
    // Get teams where user is a member
    const { data: memberships, error: membershipError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', companyId);
    
    if (membershipError) throw membershipError;
    
    const teamIds = memberships?.map(m => m.team_id) || [];
    
    if (teamIds.length === 0) {
      return NextResponse.json({ teams: [] });
    }
    
    // Get team details
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .in('id', teamIds)
      .order('created_at', { ascending: false });
    
    if (teamsError) throw teamsError;
    
    // Add role to each team
    const teamsWithRole = teams?.map(team => {
      const membership = memberships.find(m => m.team_id === team.id);
      return {
        ...team,
        userRole: membership?.role || 'viewer',
      };
    }) || [];
    
    return NextResponse.json({ teams: teamsWithRole });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// POST /api/teams - Create a new team
export async function POST(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const companyId = auth.company.id;
    
    // Create the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        owner_id: companyId,
      })
      .select()
      .single();
    
    if (teamError) throw teamError;
    
    // Add owner as a team member with 'owner' role
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: companyId,
        role: 'owner',
      });
    
    if (memberError) throw memberError;
    
    return NextResponse.json({ 
      team: {
        ...team,
        userRole: 'owner',
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
