import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { query, insert } from '@/lib/supabase';
import { deliverWebhook, createSignedPayload } from '@/lib/webhooks';

// POST /api/webhooks/test - Send a test event to a webhook
export async function POST(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { webhookId, eventType } = body;

    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    // Verify webhook belongs to this team
    const { data: webhooks, error: fetchError } = await query('webhooks', {
      where: { id: webhookId, team_id: auth.company.id },
    });

    if (fetchError) throw fetchError;
    if (!webhooks || webhooks.length === 0) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const webhook = webhooks[0];

    // Create test payload
    const testData = {
      testId: 'test_' + Math.random().toString(36).substring(7),
      testName: 'Sample Test',
      message: 'This is a test webhook event from AppLens',
      company: {
        id: auth.company.id,
        name: auth.company.name,
      },
    };

    const { payload, signature } = createSignedPayload(
      eventType || 'test.completed',
      testData,
      webhook.secret
    );

    // Deliver the webhook
    const result = await deliverWebhook(
      webhook.url,
      payload,
      signature,
      eventType || 'test.completed'
    );

    // Log the delivery attempt
    await insert('webhook_logs', {
      webhook_id: webhookId,
      event: eventType || 'test.completed',
      payload: JSON.parse(payload),
      status_code: result.statusCode || null,
      response_body: result.responseBody || null,
      success: result.success,
      attempt: 1,
      error_message: result.error || null,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test webhook delivered successfully',
        statusCode: result.statusCode,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Test webhook delivery failed',
        error: result.error,
        statusCode: result.statusCode,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json({ error: 'Failed to send test webhook' }, { status: 500 });
  }
}
