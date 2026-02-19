import { NextResponse } from 'next/server';
import clusterRunner, { Runner, RunnerConfig } from './index';

// POST /api/cluster/start - Start a new runner
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, config } = body as { type: Runner['type']; config?: RunnerConfig };

    if (!type || !['android', 'ios', 'web', 'api'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid runner type required: android, ios, web, api' },
        { status: 400 }
      );
    }

    const runner = await clusterRunner.startRunner(type, config || {});

    return NextResponse.json({
      success: true,
      runner
    });
  } catch (error) {
    console.error('Start runner error:', error);
    return NextResponse.json(
      { error: 'Failed to start runner' },
      { status: 500 }
    );
  }
}

// GET /api/cluster - Get cluster status
export async function GET() {
  try {
    const status = clusterRunner.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Cluster status error:', error);
    return NextResponse.json(
      { error: 'Failed to get cluster status' },
      { status: 500 }
    );
  }
}
