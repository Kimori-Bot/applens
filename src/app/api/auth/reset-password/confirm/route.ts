import { NextResponse } from 'next/server';
import { update } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// POST /api/auth/reset-password/confirm
// Confirms password reset with the token
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Decode and validate token
    let payload;
    try {
      payload = JSON.parse(Buffer.from(token, 'base64').toString());
    } catch {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (payload.exp < Date.now()) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 400 }
      );
    }

    // Verify token type
    if (payload.type !== 'password_reset') {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update the password
    await update('companies', 
      { password_hash: passwordHash },
      { id: payload.id }
    );

    console.log('Password reset successful for user:', payload.email);

    return NextResponse.json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Confirm reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
