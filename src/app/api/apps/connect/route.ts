import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/apps/connect - Mobile app connects with token
export async function POST(request) {
  try {
    const body = await request.json();
    const { app_token, platform, bundle_id, device_info } = body;

    if (!app_token) {
      return NextResponse.json({ error: 'App token required' }, { status: 400 });
    }

    // Find app by token in config JSONB
    const { data: apps, error } = await supabase
      .from('apps')
      .select('*')
      .eq('config->>app_token', app_token);

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!apps || apps.length === 0) {
      return NextResponse.json({ error: 'Invalid app token' }, { status: 401 });
    }

    const app = apps[0];

    // Update app with connection details
    await supabase
      .from('apps')
      .update({
        platform: platform || null,
        bundle_id: bundle_id || null,
        device_info: device_info || null,
        status: 'connected',
        last_seen: new Date().toISOString()
      })
      .eq('id', app.id);

    return NextResponse.json({
      success: true,
      app: {
        id: app.id,
        name: app.name,
        company_id: app.company_id
      },
      message: 'App connected successfully'
    });
  } catch (error) {
    console.error('Connect error:', error);
    return NextResponse.json({ error: 'Failed to connect' }, { status: 500 });
  }
}

// GET /api/apps/connect - Check connection status
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const app_token = searchParams.get('token');

  if (!app_token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  try {
    const { data: apps } = await supabase
      .from('apps')
      .select('*')
      .eq('config->>app_token', app_token);

    if (!apps || apps.length === 0) {
      return NextResponse.json({ connected: false });
    }

    const app = apps[0];
    return NextResponse.json({
      connected: true,
      app: {
        id: app.id,
        name: app.name,
        status: app.status,
        platform: app.platform,
        last_seen: app.last_seen
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
