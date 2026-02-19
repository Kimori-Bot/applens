import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/test-configs/[id] - Get single test config
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('test_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error('Get test config error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test config' },
      { status: 500 }
    );
  }
}

// PUT /api/test-configs/[id] - Update test config
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updates = {
      ...body,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('test_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error('Update test config error:', error);
    return NextResponse.json(
      { error: 'Failed to update test config' },
      { status: 500 }
    );
  }
}

// DELETE /api/test-configs/[id] - Delete test config
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('test_configs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete test config error:', error);
    return NextResponse.json(
      { error: 'Failed to delete test config' },
      { status: 500 }
    );
  }
}
