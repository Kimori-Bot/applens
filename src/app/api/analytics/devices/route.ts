import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const appId = searchParams.get('app_id');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get sessions with device info
    let sessionsQuery = supabase
      .from('sessions')
      .select('*')
      .gte('started_at', startDate.toISOString());

    if (appId) {
      sessionsQuery = sessionsQuery.eq('app_id', appId);
    }

    const { data: sessions, error } = await sessionsQuery;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by device
    const deviceStats: Record<string, {
      deviceId: string;
      totalSessions: number;
      completedSessions: number;
      failedSessions: number;
      avgDuration: number;
      lastUsed: string;
    }> = {};

    sessions?.forEach(session => {
      const deviceId = session.device_id || 'unknown';
      
      if (!deviceStats[deviceId]) {
        deviceStats[deviceId] = {
          deviceId,
          totalSessions: 0,
          completedSessions: 0,
          failedSessions: 0,
          avgDuration: 0,
          lastUsed: session.started_at
        };
      }

      deviceStats[deviceId].totalSessions++;
      
      if (session.status === 'completed') {
        deviceStats[deviceId].completedSessions++;
      }
      if (session.status === 'failed') {
        deviceStats[deviceId].failedSessions++;
      }
      
      if (session.completed_at && session.started_at) {
        const duration = new Date(session.completed_at).getTime() - new Date(session.started_at).getTime();
        const currentAvg = deviceStats[deviceId].avgDuration;
        const n = deviceStats[deviceId].totalSessions;
        deviceStats[deviceId].avgDuration = currentAvg + (duration - currentAvg) / n;
      }
      
      if (new Date(session.started_at) > new Date(deviceStats[deviceId].lastUsed)) {
        deviceStats[deviceId].lastUsed = session.started_at;
      }
    });

    // Calculate reliability for each device
    const devices = Object.values(deviceStats).map(device => ({
      ...device,
      reliability: device.totalSessions > 0 
        ? Math.round((device.completedSessions / device.totalSessions) * 100) 
        : 0,
      avgDurationSeconds: Math.round(device.avgDuration / 1000)
    }));

    // Sort by usage
    devices.sort((a, b) => b.totalSessions - a.totalSessions);

    // Get device fleet info if available
    const { data: deviceFleet } = await supabase
      .from('devices')
      .select('*')
      .order('last_seen', { ascending: false })
      .limit(50);

    // Merge with fleet info if available
    const devicesWithFleetInfo = devices.map(d => {
      const fleetDevice = deviceFleet?.find(f => f.id === d.deviceId || f.device_id === d.deviceId);
      return {
        ...d,
        name: fleetDevice?.name || d.deviceId,
        model: fleetDevice?.model || 'Unknown',
        os: fleetDevice?.os || 'Unknown',
        status: fleetDevice?.status || 'available'
      };
    });

    // Summary stats
    const totalDeviceSessions = sessions?.length || 0;
    const uniqueDevices = devices.length;

    return NextResponse.json({
      devices: devicesWithFleetInfo,
      summary: {
        totalSessions: totalDeviceSessions,
        uniqueDevices,
        avgSessionsPerDevice: uniqueDevices > 0 
          ? Math.round(totalDeviceSessions / uniqueDevices) 
          : 0
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Analytics devices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
