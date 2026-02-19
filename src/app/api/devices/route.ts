import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';

// In-memory device registry (would be in Redis/DB in production)
// Note: This is shared across all users in demo mode
const devices = new Map();

// GET /api/devices - List connected devices
// Requires authentication
export async function GET(request) {
  // Require authentication
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Get all connected devices
  const deviceList = Array.from(devices.values()).map(d => ({
    deviceId: d.deviceId,
    appName: d.appName,
    platform: d.platform,
    bundleId: d.bundleId,
    screen: d.screen,
    elements: d.elements,
    connectedAt: d.connectedAt,
    lastUpdate: d.lastUpdate
  }));

  return NextResponse.json({ devices: deviceList });
}

// POST /api/devices - Register/unregister devices
// Requires authentication
export async function POST(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { type, deviceId, data } = body;

    if (type === 'register') {
      devices.set(deviceId, {
        ...data,
        deviceId,
        companyId: auth.company.id,
        connectedAt: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      });
      return NextResponse.json({ success: true });
    }

    if (type === 'screen_update') {
      const device = devices.get(deviceId);
      if (device) {
        device.screen = data.screenName;
        device.elements = data.elements?.length || 0;
        device.lastUpdate = new Date().toISOString();
      }
      return NextResponse.json({ success: true });
    }

    if (type === 'unregister') {
      devices.delete(deviceId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
