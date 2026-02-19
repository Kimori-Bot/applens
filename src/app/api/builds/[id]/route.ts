import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { query, deleteRecord, update } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'media', 'storage', 'builds');

// GET /api/builds/[id] - Get build details
export async function GET(request, { params }) {
  const { id } = await params;
  const auth = await authenticateToken(request);
  
  // Allow demo mode
  if (auth.error && !request.headers.get('authorization')) {
    // For demo, just return mock data
    return NextResponse.json({
      id: parseInt(id),
      filename: 'demo.apk',
      filesize: 1024000,
      package_name: 'com.demo.app',
      version: '1.0.0',
      status: 'uploaded',
      uploaded_at: new Date().toISOString()
    });
  }
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: builds, error } = await query('builds', {
      where: { id: parseInt(id), user_id: auth.company.id }
    });

    if (error) throw error;
    
    if (!builds || builds.length === 0) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    return NextResponse.json(builds[0]);
  } catch (error) {
    console.error('Get build error:', error);
    return NextResponse.json({ error: 'Failed to get build' }, { status: 500 });
  }
}

// DELETE /api/builds/[id] - Delete build
export async function DELETE(request, { params }) {
  const { id } = await params;
  const auth = await authenticateToken(request);
  
  if (auth.error && !request.headers.get('authorization')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // First get the build to find the file path
    const { data: builds, error: queryError } = await query('builds', {
      where: { id: parseInt(id), user_id: auth.company.id }
    });

    if (queryError) throw queryError;
    
    if (!builds || builds.length === 0) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    const build = builds[0];

    // Delete the file from disk
    if (build.file_path) {
      const fullPath = path.join(process.cwd(), 'public', build.file_path);
      try {
        await fs.promises.unlink(fullPath);
      } catch (e) {
        console.error('Error deleting file:', e);
      }
    }

    // Delete from database
    await deleteRecord('builds', { id: parseInt(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete build error:', error);
    return NextResponse.json({ error: 'Failed to delete build' }, { status: 500 });
  }
}
