import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { query, insert } from '@/lib/supabase';

// GET /api/apps - List all apps
// Requires authentication
export async function GET(request) {
  // Require authentication
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: apps, error } = await query('apps', {
      where: { company_id: auth.company.id },
      order: 'created_at:desc'
    });

    if (error) throw error;

    return NextResponse.json(apps || []);
  } catch (error) {
    console.error('List apps error:', error);
    return NextResponse.json({ error: 'Failed to list apps' }, { status: 500 });
  }
}

// POST /api/apps - Create new app with token stored in config
// Requires authentication
export async function POST(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate unique app token
    const appToken = `apl_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const app = await insert('apps', {
      name,
      company_id: auth.company.id,
      status: 'pending',
      config: { app_token: appToken }
    });

    // Return with extracted token for convenience
    const result = {
      ...app[0],
      app_token: appToken
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Create app error:', error);
    return NextResponse.json({ error: 'Failed to create app' }, { status: 500 });
  }
}
