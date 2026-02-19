import { NextResponse } from 'next/server';

// POST /api/ai/explore - Trigger AI to explore an app
export async function POST(request) {
  try {
    const body = await request.json();
    const { appId, screenName, elements } = body;

    if (!appId) {
      return NextResponse.json({ error: 'appId required' }, { status: 400 });
    }

    // For now, return a simple command to explore
    // In production, this would call the AI engine
    const actions = [
      { action: 'TAP', x: 0.5, y: 0.3, reason: 'Explore top area' },
      { action: 'TAP', x: 0.5, y: 0.7, reason: 'Explore bottom area' },
      { action: 'TAP', x: 0.2, y: 0.5, reason: 'Explore left side' },
      { action: 'TAP', x: 0.8, y: 0.5, reason: 'Explore right side' },
    ];

    // Pick a random action
    const action = actions[Math.floor(Math.random() * actions.length)];

    return NextResponse.json({ 
      action,
      message: 'AI will explore the app'
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
