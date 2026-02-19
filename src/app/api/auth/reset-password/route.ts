import { NextResponse } from 'next/server';
import { query, update } from '@/lib/supabase';

// POST /api/auth/reset-password
// Initiates password reset by sending email with reset link
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if company exists
    const result = await query('companies', { where: { email } });
    
    if (!result.data || result.data.length === 0) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        message: 'If an account exists, a reset link has been sent'
      });
    }

    // In production, you would:
    // 1. Generate a reset token
    // 2. Store it in the database with expiration
    // 3. Send email with reset link
    
    // For now, generate a reset token and return it (in production, send via email)
    const resetToken = Buffer.from(JSON.stringify({
      email,
      id: result.data[0].id,
      exp: Date.now() + 60 * 60 * 1000, // 1 hour
      type: 'password_reset'
    })).toString('base64');

    // In production, integrate with an email service (SendGrid, Resend, etc.)
    // For demo purposes, we'll return the reset link
    const resetLink = `/reset-password?token=${resetToken}`;

    console.log('Password reset requested for:', email);
    console.log('Reset link (dev only):', resetLink);

    // Return success - don't reveal if email exists
    return NextResponse.json({
      message: 'If an account exists, a reset link has been sent'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
