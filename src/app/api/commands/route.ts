import { NextResponse } from 'next/server';

// Command queue for each device
const commandQueues = new Map();

// POST /api/commands - Queue a command for a device
export async function POST(request) {
  try {
    const body = await request.json();
    const { deviceId, command } = body;

    if (!deviceId || !command) {
      return NextResponse.json({ error: 'deviceId and command required' }, { status: 400 });
    }

    if (!commandQueues.has(deviceId)) {
      commandQueues.set(deviceId, []);
    }

    commandQueues.get(deviceId).push({
      command,
      queuedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, queued: commandQueues.get(deviceId).length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/commands?device=xxx - Get pending command for device
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('device');

  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId required' }, { status: 400 });
  }

  const queue = commandQueues.get(deviceId) || [];
  
  if (queue.length > 0) {
    const next = queue.shift();
    return NextResponse.json(next);
  }

  return NextResponse.json({ command: null });
}
