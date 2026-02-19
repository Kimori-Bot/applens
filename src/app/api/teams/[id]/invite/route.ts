import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// POST /api/teams/[id]/invite - Send an invitation to join a team
// GET /api/teams/[id]/invite - List pending invitations for a team
// DELETE /api/teams/[id]/invite - Cancel an invitation
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
    
    // Get pending invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('team_invitations')
      .select(`
        id,
        team_id,
        email,
        role,
        token,
        invited_by,
        expires_at,
        created_at,
        teams:team_id (
          id,
          name
        )
      `)
      .eq('team_id', teamId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (invitationsError) throw invitationsError;
    
    // Format invitations
    const formattedInvitations = invitations?.map(inv => ({
      id: inv.id,
      team_id: inv.team_id,
      email: inv.email,
      role: inv.role,
      token: inv.token,
      invited_by: inv.invited_by,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
      team: inv.teams ? {
        id: inv.teams.id,
        name: inv.teams.name,
      } : null,
    })) || [];
    
    return NextResponse.json({ invitations: formattedInvitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
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
    const { email, role = 'member' } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    
    // Validate role (can't invite as owner)
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
      return NextResponse.json({ error: 'Insufficient permissions to invite members' }, { status: 403 });
    }
    
    // Check if user is already a member
    const { data: existingUser } = await supabase
      .from('companies')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    
    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', existingUser.id)
        .single();
      
      if (existingMember) {
        return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
      }
    }
    
    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('email', email.toLowerCase())
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (existingInvitation) {
      return NextResponse.json({ error: 'A pending invitation already exists for this email' }, { status: 400 });
    }
    
    // Get team info
    const { data: team } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();
    
    // Create invitation with new token
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        role,
        invited_by: companyId,
      })
      .select()
      .single();
    
    if (invitationError) throw invitationError;
    
    // In a real app, you would send an email here with the invitation link
    // For now, we just return the invitation details
    
    return NextResponse.json({ 
      invitation: {
        ...invitation,
        team: team,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
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
    const invitationId = searchParams.get('invitationId');
    
    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Insufficient permissions to cancel invitations' }, { status: 403 });
    }
    
    // Delete invitation
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('team_id', teamId);
    
    if (deleteError) throw deleteError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error canceling invitation:', error);
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
  }
}
