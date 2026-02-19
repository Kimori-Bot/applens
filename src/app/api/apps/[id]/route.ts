import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET /api/apps/:id
export async function GET(request, { params }) {
  const resolvedParams = await params;
  const appId = resolvedParams.id;
  
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: app } = await supabase
      .from('apps')
      .select('*')
      .eq('id', parseInt(appId))
      .eq('company_id', auth.company.id)
      .single();

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    return NextResponse.json(app);
  } catch (error) {
    console.error('Get app error:', error);
    return NextResponse.json({ error: 'Failed to get app' }, { status: 500 });
  }
}

// DELETE /api/apps/:id
export async function DELETE(request, { params }) {
  const resolvedParams = await params;
  const appId = resolvedParams.id;
  
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { error } = await supabase
      .from('apps')
      .delete()
      .eq('id', parseInt(appId))
      .eq('company_id', auth.company.id);

    if (error) throw error;

    return NextResponse.json({ message: 'App deleted' });
  } catch (error) {
    console.error('Delete app error:', error);
    return NextResponse.json({ error: 'Failed to delete app' }, { status: 500 });
  }
}
