import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET /api/media/:slug
export async function GET(request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const MEDIA_DIR = '/workspace/applens/web/public/media';
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    
    // Handle both /api/media/screenshots/filename and /api/media/screenshots/filename.png
    let filename = Array.isArray(slug) ? slug.join('/') : slug;
    
    const filePath = path.join(MEDIA_DIR, filename);
    
    console.log('[media] Request:', filename);
    console.log('[media] Full path:', filePath);
    console.log('[media] Exists:', fs.existsSync(filePath));
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(MEDIA_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }
    
    if (!fs.existsSync(filePath)) {
      // Try with 'storage' prefix
      const altPath = path.join(MEDIA_DIR, 'storage', filename);
      console.log('[media] Trying alt path:', altPath, 'exists:', fs.existsSync(altPath));
      return NextResponse.json({ error: 'File not found', path: filePath }, { status: 404 });
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    const contentTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.webm': 'video/webm',
      '.mp4': 'video/mp4'
    };
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
