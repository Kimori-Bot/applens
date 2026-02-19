import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { query, insert, update } from '@/lib/supabase';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Check if ADB is available
async function checkAdb(): Promise<{ available: boolean; devices: string[] }> {
  try {
    const { stdout } = await execAsync('adb devices 2>/dev/null');
    const devices: string[] = [];
    const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('List'));
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts[1]?.trim() === 'device') {
        devices.push(parts[0].trim());
      }
    }
    return { available: true, devices };
  } catch (error) {
    return { available: false, devices: [] };
  }
}

// Install APK to device
async function installApk(deviceId: string, apkPath: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const deviceArg = deviceId ? `-s ${deviceId}` : '';
    const { stdout, stderr } = await execAsync(`adb ${deviceArg} install -r "${apkPath}" 2>&1`);
    
    if (stdout.includes('Success') || stdout.includes('success')) {
      return { success: true, output: stdout };
    }
    
    return { success: false, output: stdout, error: stderr || stdout };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

// Launch app
async function launchApp(deviceId: string, packageName: string, activity?: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const deviceArg = deviceId ? `-s ${deviceId}` : '';
    
    // If activity is provided, use it; otherwise try to get main activity
    let launchComponent = packageName;
    if (activity) {
      launchComponent = `${packageName}/${activity}`;
    } else {
      // Try to get the main activity
      try {
        const { stdout } = await execAsync(`adb ${deviceArg} shell cmd package resolve-activity --brief -c android.intent.category.LAUNCHER ${packageName} 2>/dev/null`);
        if (stdout.trim()) {
          launchComponent = `${packageName}/${stdout.trim()}`;
        }
      } catch (e) {
        // Fallback to package name - will use default main activity
      }
    }
    
    const { stdout, stderr } = await execAsync(`adb ${deviceArg} shell am start -n "${launchComponent}" 2>&1`);
    
    if (stdout.includes('Starting') || stdout.includes('started')) {
      return { success: true, output: stdout };
    }
    
    return { success: false, output: stdout, error: stderr || stdout };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

// Get package info
async function getPackageInfo(deviceId: string, packageName: string): Promise<{ installed: boolean; info: any }> {
  try {
    const deviceArg = deviceId ? `-s ${deviceId}` : '';
    const { stdout } = await execAsync(`adb ${deviceArg} shell pm list packages ${packageName} 2>/dev/null`);
    
    const installed = stdout.includes(packageName);
    
    if (installed) {
      // Get more details
      try {
        const { stdout: infoStdout } = await execAsync(`adb ${deviceArg} shell dumpsys package ${packageName} 2>/dev/null | head -20`);
        return { installed: true, info: infoStdout };
      } catch (e) {
        return { installed: true, info: {} };
      }
    }
    
    return { installed: false, info: null };
  } catch (error) {
    return { installed: false, info: null };
  }
}

// Uninstall package
async function uninstallPackage(deviceId: string, packageName: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const deviceArg = deviceId ? `-s ${deviceId}` : '';
    const { stdout, stderr } = await execAsync(`adb ${deviceArg} uninstall ${packageName} 2>&1`);
    
    if (stdout.includes('Success')) {
      return { success: true, output: stdout };
    }
    
    return { success: false, output: stdout, error: stderr || stdout };
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

// POST /api/builds/[id]/test - Run test on build
export async function POST(request, { params }) {
  const { id } = await params;
  const auth = await authenticateToken(request);
  
  if (auth.error && !request.headers.get('authorization')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { action, device_id } = body; // action: 'install' | 'launch' | 'uninstall' | 'test' | 'status'
    const fullPath = process.cwd() + '/public';

    // Get the build
    const { data: builds, error: queryError } = await query('builds', {
      where: { id: parseInt(id) }
    });

    if (queryError) throw queryError;
    
    if (!builds || builds.length === 0) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    const build = builds[0];
    const apkPath = fullPath + build.file_path;

    // Check ADB first
    const adbStatus = await checkAdb();
    
    if (!adbStatus.available) {
      return NextResponse.json({ 
        error: 'ADB not available',
        adb: { available: false, devices: [] }
      }, { status: 500 });
    }

    // If no device specified, use first available
    const targetDevice = device_id || adbStatus.devices[0];
    
    if (!targetDevice) {
      return NextResponse.json({ 
        error: 'No device connected',
        adb: adbStatus
      }, { status: 400 });
    }

    let result: any = { action };

    switch (action) {
      case 'install':
        result = await installApk(targetDevice, apkPath);
        if (result.success) {
          await update('builds', { status: 'installed' }, { id: build.id });
        }
        break;
        
      case 'launch':
        result = await launchApp(targetDevice, build.package_name);
        break;
        
      case 'uninstall':
        result = await uninstallPackage(targetDevice, build.package_name);
        if (result.success) {
          await update('builds', { status: 'uninstalled' }, { id: build.id });
        }
        break;
        
      case 'status':
        result = await getPackageInfo(targetDevice, build.package_name);
        break;
        
      case 'test':
        // Full test: install, launch, get status, then optionally uninstall
        const installResult = await installApk(targetDevice, apkPath);
        result.install = installResult;
        
        if (installResult.success) {
          await update('builds', { status: 'installed' }, { id: build.id });
          
          // Small delay to let app settle
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const launchResult = await launchApp(targetDevice, build.package_name);
          result.launch = launchResult;
          
          const statusResult = await getPackageInfo(targetDevice, build.package_name);
          result.status = statusResult;
          
          await update('builds', { 
            status: 'completed',
            test_results: result
          }, { id: build.id });
        } else {
          await update('builds', { status: 'failed' }, { id: build.id });
        }
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    result.adb = adbStatus;
    result.device = targetDevice;
    result.build = {
      id: build.id,
      package_name: build.package_name,
      version: build.version
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ error: 'Failed to run test' }, { status: 500 });
  }
}
