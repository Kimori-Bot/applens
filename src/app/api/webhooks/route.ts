import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { query, insert, update, deleteRecord } from '@/lib/supabase';
import { 
  generateWebhookSecret, 
  isValidWebhookUrl, 
  getSupportedEvents,
  deliverWebhook,
  createSignedPayload,
  WebhookEventType
} from '@/lib/webhooks';

// GET /api/webhooks - List all webhooks for the team
export async function GET(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: webhooks, error } = await query('webhooks', {
      where: { team_id: auth.company.id },
      order: 'created_at:desc'
    });

    if (error) throw error;

    // Return webhooks without exposing the secret
    const sanitized = (webhooks || []).map(wh => ({
      ...wh,
      secret: wh.secret ? '••••••••' + wh.secret.slice(-8) : null,
    }));

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error('List webhooks error:', error);
    return NextResponse.json({ error: 'Failed to list webhooks' }, { status: 500 });
  }
}

// POST /api/webhooks - Create a new webhook
export async function POST(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { url, name, description, events } = body;

    // Validate URL
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!isValidWebhookUrl(url)) {
      return NextResponse.json({ error: 'URL must be a valid HTTPS endpoint' }, { status: 400 });
    }

    // Validate events
    const supportedEvents = getSupportedEvents().map(e => e.type);
    const invalidEvents = (events || []).filter(e => !supportedEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json({ 
        error: `Invalid event types: ${invalidEvents.join(', ')}`,
        supportedEvents 
      }, { status: 400 });
    }

    // Generate secret if not provided
    const secret = generateWebhookSecret();

    const webhook = await insert('webhooks', {
      team_id: auth.company.id,
      url,
      name: name || 'Webhook',
      description: description || '',
      events: events || [],
      secret,
      active: true,
    });

    // Return without exposing full secret (show only first 8 chars)
    const result = {
      ...webhook[0],
      secret: webhook[0].secret.slice(0, 12) + '...',
      fullSecret: webhook[0].secret, // Only shown once on creation
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Create webhook error:', error);
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
  }
}

// PUT /api/webhooks - Update webhook
export async function PUT(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, url, name, description, events, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    // Verify webhook belongs to this team
    const { data: existing, error: fetchError } = await query('webhooks', {
      where: { id, team_id: auth.company.id },
    });

    if (fetchError) throw fetchError;
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Validate URL if provided
    if (url && !isValidWebhookUrl(url)) {
      return NextResponse.json({ error: 'URL must be a valid HTTPS endpoint' }, { status: 400 });
    }

    // Validate events if provided
    if (events) {
      const supportedEvents = getSupportedEvents().map(e => e.type);
      const invalidEvents = events.filter(e => !supportedEvents.includes(e));
      if (invalidEvents.length > 0) {
        return NextResponse.json({ 
          error: `Invalid event types: ${invalidEvents.join(', ')}` 
        }, { status: 400 });
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (url) updateData.url = url;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (events) updateData.events = events;
    if (active !== undefined) updateData.active = active;

    const updated = await update('webhooks', updateData, { id });

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Update webhook error:', error);
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
  }
}

// DELETE /api/webhooks - Delete a webhook
export async function DELETE(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    // Verify webhook belongs to this team
    const { data: existing, error: fetchError } = await query('webhooks', {
      where: { id, team_id: auth.company.id },
    });

    if (fetchError) throw fetchError;
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    await deleteRecord('webhooks', { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete webhook error:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
