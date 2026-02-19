import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { insert } from '@/lib/supabase';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Store uploads in public media directory
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'media', 'storage', 'builds');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Helper to extract APK info using aapt or aapt2
async function extractApkInfo(apkPath: string) {
  try {
    // Try aapt2 first (newer Android SDK)
    const aaptPath = await findAapt();
    if (aaptPath) {
      const { stdout } = await execAsync(`${aaptPath} dump badging "${apkPath}" 2>/dev/null`);
      
      const packageMatch = stdout.match(/package: name='([^']+)'/);
      const versionMatch = stdout.match(/package: name='[^']+' versionCode='([^']+)'/);
      const versionNameMatch = stdout.match(/package: name='[^']+' versionName='([^']+)'/);
      const launchableMatch = stdout.match(/launchable-activity: name='([^']+)'/);
      
      return {
        package_name: packageMatch?.[1] || null,
        version_code: versionMatch ? parseInt(versionMatch[1], 10) : null,
        version: versionNameMatch?.[1] || null,
        launch_activity: launchableMatch?.[1] || null,
      };
    }
  } catch (error) {
    console.error('Error extracting APK info:', error);
  }
  
  // Fallback: try using unzip to read AndroidManifest.xml (basic parsing)
  try {
    const manifestPath = path.join(UPLOAD_DIR, 'AndroidManifest.xml');
    // Basic fallback - return nulls if can't parse
    return {
      package_name: null,
      version_code: null,
      version: null,
      launch_activity: null,
    };
  } catch (e) {
    return { package_name: null, version_code: null, version: null, launch_activity: null };
  }
}

// Find aapt or aapt2 in common locations
async function findAapt(): Promise<string | null> {
  const paths = [
    '/usr/bin/aapt',
    '/usr/bin/aapt2',
    '/opt/android-sdk/build-tools/34.0.0/aapt',
    '/opt/android-sdk/build-tools/34.0.0/aapt2',
    '/opt/android-sdk/build-tools/33.0.0/aapt',
    '/opt/android-sdk/build-tools/33.0.0/aapt2',
    process.env.ANDROID_HOME ? `${process.env.ANDROID_HOME}/build-tools/latest/aapt` : null,
    process.env.ANDROID_HOME ? `${process.env.ANDROID_HOME}/build-tools/latest/aapt2` : null,
  ].filter(Boolean) as string[];
  
  for (const p of paths) {
    try {
      await fs.promises.access(p);
      return p;
    } catch {}
  }
  
  return null;
}

// POST /api/builds/upload - Upload APK file
export async function POST(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('apk') as File;
    const appId = formData.get('app_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'No APK file provided' }, { status: 400 });
    }

    // Validate APK format
    const filename = file.name.toLowerCase();
    if (!filename.endsWith('.apk')) {
      return NextResponse.json({ error: 'File must be an APK' }, { status: 400 });
    }

    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.apk`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(filePath, buffer);

    // Extract APK info
    const apkInfo = await extractApkInfo(filePath);

    // Save to database
    const build = await insert('builds', {
      app_id: appId ? parseInt(appId, 10) : null,
      filename: file.name,
      filesize: file.size,
      file_path: `/media/storage/builds/${uniqueFilename}`,
      package_name: apkInfo.package_name,
      version: apkInfo.version,
      version_code: apkInfo.version_code,
      user_id: auth.company.id,
      status: 'uploaded'
    });

    const result = {
      ...build[0],
      launch_activity: apkInfo.launch_activity,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload APK' }, { status: 500 });
  }
}
