import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { insert, query, deleteRecord } from '@/lib/supabase';
import path from 'path';
import fs from 'fs';

// GET /api/builds - List all builds
export async function GET(request) {
  const auth = await authenticateToken(request);
  
  // Allow demo mode without auth
  if (auth.error && !request.headers.get('authorization')) {
    return NextResponse.json([]);
  }
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: builds, error } = await query('builds', {
      where: { user_id: auth.company.id }
    }, {
      order: 'uploaded_at:desc'
    });

    if (error) throw error;

    return NextResponse.json(builds || []);
  } catch (error) {
    console.error('List builds error:', error);
    return NextResponse.json({ error: 'Failed to list builds' }, { status: 500 });
  }
}
