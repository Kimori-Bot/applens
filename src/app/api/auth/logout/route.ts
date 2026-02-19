import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';

// POST /api/auth/logout
export async function POST(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // In a real app, you might want to invalidate the token
    // For now, we just return success
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
