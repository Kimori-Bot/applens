import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// DELETE /api/teams/reject/[token] - Reject (delete) an invitation
export async function DELETE(request, { params }) {
  // Authenticate first
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const token = params.token;
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
    
    // Verify email matches (only the invited user can reject)
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json({ 
        error: 'You can only reject your own invitations' }, { status: 403 });
    }
    
    // Delete the invitation
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitation.id);
    
    if (deleteError) throw deleteError;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    return NextResponse.json({ error: 'Failed to reject invitation' }, { status: 500 });
  }
}
