import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET /api/teams/[id] - Get a specific team
// PUT /api/teams/[id] - Update a team
// DELETE /api/teams/[id] - Delete a team
export async function GET(request, { params }) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const teamId = params.id;
    const companyId = auth.company.id;
    
    // Check if user is a member of this team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', companyId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 403 });
    }
    
    // Get team details
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    
    if (teamError) throw teamError;
    
    return NextResponse.json({ 
      team: {
        ...team,
        userRole: membership.role,
      }
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const teamId = params.id;
    const companyId = auth.company.id;
    const { name } = await request.json();
    
    // Check if user is owner or admin
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', companyId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 403 });
    }
    
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Update team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .update({ 
        name: name?.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId)
      .select()
      .single();
    
    if (teamError) throw teamError;
    
    return NextResponse.json({ 
      team: {
        ...team,
        userRole: membership.role,
      }
    });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const teamId = params.id;
    const companyId = auth.company.id;
    
    // Check if user is owner
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();
    
    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    if (team.owner_id !== companyId) {
      return NextResponse.json({ error: 'Only the team owner can delete the team' }, { status: 403 });
    }
    
    // Delete team (cascades to members and invitations)
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);
    
    if (deleteError) throw deleteError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
