import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

async function fetchFromAPI(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'API request failed');
  }
  return res.json();
}

// GET /api/devices/[id] - Get device details
// POST /api/devices/[id]/reserve - Reserve device
// POST /api/devices/[id]/release - Release device
// DELETE /api/devices/[id] - Delete device
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const result = await fetchFromAPI(`/api/devices/${id}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching device:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Determine action from path or body
    const url = request.url;
    let action = '';
    
    if (url.includes('/reserve')) {
      action = 'reserve';
    } else if (url.includes('/release')) {
      action = 'release';
    } else {
      action = body.action;
    }
    
    if (action === 'reserve') {
      const result = await fetchFromAPI(`/api/devices/${id}/reserve`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return NextResponse.json(result);
    }
    
    if (action === 'release') {
      const result = await fetchFromAPI(`/api/devices/${id}/release`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const result = await fetchFromAPI(`/api/devices/${id}`, {
      method: 'DELETE',
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
