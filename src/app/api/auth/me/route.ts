import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';

// GET /api/auth/me
export async function GET(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({
    company: {
      id: auth.company.id,
      name: auth.company.name,
      email: auth.company.email,
      apiKey: auth.company.apiKey,
    },
  });
}
