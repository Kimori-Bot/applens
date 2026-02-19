import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET /api/teams/accept/[token] - Check invitation details (public)
// POST /api/teams/accept/[token] - Accept an invitation
export async function GET(request, { params }) {
  const token = params.token;
  
  try {
    // Get invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select(`
        id,
        team_id,
        email,
        role,
        token,
        expires_at,
        created_at,
        teams:team_id (
          id,
          name,
          owner_id
        )
      `)
      .eq('token', token)
      .single();
    
    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
    }
    
    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }
    
    // Check if already a member
    // Note: This requires auth to check, so we'll just return invitation info
    
    return NextResponse.json({
      invitation: {
        id: invitation.id,
        team_id: invitation.team_id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        team: invitation.teams ? {
          id: invitation.teams.id,
          name: invitation.teams.name,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json({ error: 'Failed to fetch invitation' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  // First authenticate the user
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const token = params.token;
  const companyId = auth.company.id;
  const userEmail = auth.company.email;
  
  try {
    // Get invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .single();
    
    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
    }
    
    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }
    
    // Verify email matches
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json({ 
        error: 'This invitation was sent to a different email address',
        expected: invitation.email,
        current: userEmail,
      }, { status: 403 });
    }
    
    // Check if already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', invitation.team_id)
      .eq('user_id', companyId)
      .single();
    
    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this team' }, { status: 400 });
    }
    
    // Add user to team
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: companyId,
        role: invitation.role,
      })
      .select()
      .single();
    
    if (memberError) throw memberError;
    
    // Delete the invitation
    await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitation.id);
    
    // Get team info
    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('id', invitation.team_id)
      .single();
    
    return NextResponse.json({
      success: true,
      member: {
        ...member,
        user: {
          id: companyId,
          name: auth.company.name,
          email: userEmail,
        },
      },
      team: {
        ...team,
        userRole: invitation.role,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
