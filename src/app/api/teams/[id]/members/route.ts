import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET /api/teams/[id]/members - List all members of a team
// POST /api/teams/[id]/members - Add a member directly (for existing users)
// DELETE /api/teams/[id]/members - Remove a member
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
    
    // Get all members with company info
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        id,
        team_id,
        user_id,
        role,
        joined_at,
        companies:user_id (
          id,
          name,
          email
        )
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });
    
    if (membersError) throw membersError;
    
    // Transform the data
    const formattedMembers = members?.map(m => ({
      id: m.id,
      team_id: m.team_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      user: m.companies ? {
        id: m.companies.id,
        name: m.companies.name,
        email: m.companies.email,
      } : null,
    })) || [];
    
    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const teamId = params.id;
    const companyId = auth.company.id;
    const { userId, role = 'member' } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Validate role
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    
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
    
    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();
    
    if (existingMember) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
    }
    
    // Add member
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
      })
      .select()
      .single();
    
    if (memberError) throw memberError;
    
    // Get user info
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, email')
      .eq('id', userId)
      .single();
    
    return NextResponse.json({ 
      member: {
        ...member,
        user: company,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
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
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }
    
    // Get the member to be removed
    const { data: targetMember, error: targetError } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('id', memberId)
      .single();
    
    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    
    // Check current user's permissions
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', companyId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 403 });
    }
    
    // Owner can remove anyone, admins can remove non-owners
    if (membership.role === 'owner') {
      // Owner can remove anyone except themselves
      if (targetMember.user_id === companyId) {
        return NextResponse.json({ error: 'Cannot remove yourself from team' }, { status: 400 });
      }
    } else if (membership.role === 'admin') {
      // Admins can only remove non-owners and non-admins
      if (targetMember.role === 'owner' || targetMember.role === 'admin') {
        return NextResponse.json({ error: 'Insufficient permissions to remove this member' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Remove member
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);
    
    if (deleteError) throw deleteError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}
