import { supabase } from './supabase';
import { 
  createSignedPayload, 
  deliverWebhook, 
  WebhookEventType,
  WebhookConfig 
} from './webhooks';

/**
 * Trigger webhooks for a specific event type
 * This is called internally when events occur (test completed, device connected, etc.)
 */
export async function triggerWebhooks(
  teamId: number,
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<{ triggered: number; failed: number; results: Array<{ webhookId: string; success: boolean; error?: string }> }> {
  const results: Array<{ webhookId: string; success: boolean; error?: string }> = [];
  let triggered = 0;
  let failed = 0;

  try {
    // Get active webhooks for this team that subscribe to this event type
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('team_id', teamId)
      .eq('active', true)
      .contains('events', [eventType]);

    if (error) {
      console.error('Failed to fetch webhooks:', error);
      return { triggered: 0, failed: 0, results };
    }

    if (!webhooks || webhooks.length === 0) {
      return { triggered: 0, failed: 0, results: [] };
    }

    // Trigger each webhook
    for (const webhook of webhooks) {
      try {
        const { payload, signature } = createSignedPayload(
          eventType,
          data,
          webhook.secret
        );

        const result = await deliverWebhook(
          webhook.url,
          payload,
          signature,
          eventType
        );

        // Log the delivery
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event: eventType,
          payload: data,
          status_code: result.statusCode || null,
          response_body: result.responseBody || null,
          success: result.success,
          attempt: 1,
          error_message: result.error || null,
        });

        if (result.success) {
          triggered++;
        } else {
          failed++;
        }

        results.push({
          webhookId: webhook.id,
          success: result.success,
          error: result.error,
        });
      } catch (webhookError) {
        const errorMessage = webhookError instanceof Error ? webhookError.message : 'Unknown error';
        failed++;
        
        results.push({
          webhookId: webhook.id,
          success: false,
          error: errorMessage,
        });

        // Log failed attempt
        try {
          await supabase.from('webhook_logs').insert({
            webhook_id: webhook.id,
            event: eventType,
            payload: data,
            success: false,
            attempt: 1,
            error_message: errorMessage,
          });
        } catch (logError) {
          console.error('Failed to log webhook error:', logError);
        }
      }
    }
  } catch (error) {
    console.error('Trigger webhooks error:', error);
  }

  return { triggered, failed, results };
}

/**
 * Trigger test.completed event
 */
export async function triggerTestCompleted(
  teamId: number,
  testData: {
    testId: string;
    testName: string;
    duration?: number;
    results?: Record<string, unknown>;
  }
) {
  return triggerWebhooks(teamId, 'test.completed', testData);
}

/**
 * Trigger test.failed event
 */
export async function triggerTestFailed(
  teamId: number,
  testData: {
    testId: string;
    testName: string;
    error: string;
    duration?: number;
  }
) {
  return triggerWebhooks(teamId, 'test.failed', testData);
}

/**
 * Trigger device.connected event
 */
export async function triggerDeviceConnected(
  teamId: number,
  deviceData: {
    deviceId: string;
    deviceName: string;
    platform?: string;
  }
) {
  return triggerWebhooks(teamId, 'device.connected', deviceData);
}

/**
 * Trigger device.disconnected event
 */
export async function triggerDeviceDisconnected(
  teamId: number,
  deviceData: {
    deviceId: string;
    deviceName: string;
    platform?: string;
  }
) {
  return triggerWebhooks(teamId, 'device.disconnected', deviceData);
}

/**
 * Trigger subscription.created event
 */
export async function triggerSubscriptionCreated(
  teamId: number,
  subscriptionData: {
    subscriptionId: string;
    plan: string;
    billingCycle?: string;
  }
) {
  return triggerWebhooks(teamId, 'subscription.created', subscriptionData);
}

/**
 * Trigger subscription.expired event
 */
export async function triggerSubscriptionExpired(
  teamId: number,
  subscriptionData: {
    subscriptionId: string;
    plan: string;
    reason?: string;
  }
) {
  return triggerWebhooks(teamId, 'subscription.expired', subscriptionData);
}
