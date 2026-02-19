import { NextResponse } from 'next/server';
import clusterRunner from './index';

// DELETE /api/cluster/[id] - Stop a specific runner
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runner = await clusterRunner.stopRunner(id);

    if (!runner) {
      return NextResponse.json(
        { error: 'Runner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      runner
    });
  } catch (error) {
    console.error('Stop runner error:', error);
    return NextResponse.json(
      { error: 'Failed to stop runner' },
      { status: 500 }
    );
  }
}

// POST /api/cluster/[id]/restart - Restart a runner
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runner = await clusterRunner.restartRunner(id);

    if (!runner) {
      return NextResponse.json(
        { error: 'Runner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      runner
    });
  } catch (error) {
    console.error('Restart runner error:', error);
    return NextResponse.json(
      { error: 'Failed to restart runner' },
      { status: 500 }
    );
  }
}

// POST /api/cluster/[id]/heartbeat - Runner heartbeat
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runner = clusterRunner.getRunner(id);

    if (!runner) {
      return NextResponse.json(
        { error: 'Runner not found' },
        { status: 404 }
      );
    }

    clusterRunner.heartbeat(id);

    return NextResponse.json({
      success: true,
      runner
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Failed to update heartbeat' },
      { status: 500 }
    );
  }
}
