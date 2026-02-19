import * as crypto from 'crypto';

export type WebhookEventType = 
  | 'test.completed'
  | 'test.failed'
  | 'device.connected'
  | 'device.disconnected'
  | 'subscription.created'
  | 'subscription.expired';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookConfig {
  id: string;
  team_id: number;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  name?: string;
  description?: string;
}

export interface WebhookLogEntry {
  id: string;
  webhook_id: string;
  event: string;
  payload: Record<string, unknown>;
  status_code?: number;
  response_body?: string;
  success: boolean;
  attempt: number;
  error_message?: string;
  created_at: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 5000]; // Exponential backoff delays in ms

/**
 * Sign a webhook payload using HMAC-SHA256
 */
export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Create a signed webhook payload with signature header
 */
export function createSignedPayload(
  event: WebhookEventType,
  data: Record<string, unknown>,
  secret: string
): { payload: string; signature: string } {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  
  const payloadString = JSON.stringify(payload);
  const signature = signPayload(payloadString, secret);
  
  return { payload: payloadString, signature };
}

/**
 * Verify a webhook signature
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = signPayload(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Deliver a webhook with retry logic
 */
export async function deliverWebhook(
  url: string,
  payload: string,
  signature: string,
  event: string,
  attempt: number = 1
): Promise<{ success: boolean; statusCode?: number; responseBody?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      return {
        success: true,
        statusCode: response.status,
        responseBody,
      };
    }

    // Non-2xx response - could retry
    const error = `HTTP ${response.status}: ${responseBody.substring(0, 200)}`;
    
    // Retry on 5xx or specific 4xx errors
    if (response.status >= 500 || response.status === 429 || response.status === 408) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        await new Promise(resolve => setTimeout(resolve, delay));
        return deliverWebhook(url, payload, signature, event, attempt + 1);
      }
    }

    return {
      success: false,
      statusCode: response.status,
      responseBody,
      error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Network errors are retryable
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      await new Promise(resolve => setTimeout(resolve, delay));
      return deliverWebhook(url, payload, signature, event, attempt + 1);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate a random secret for webhooks
 */
export function generateWebhookSecret(): string {
  return 'whsec_' + crypto.randomBytes(32).toString('hex');
}

/**
 * Validate webhook URL
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get integration templates for common platforms
 */
export const INTEGRATION_TEMPLATES = {
  slack: {
    name: 'Slack',
    description: 'Send webhook notifications to a Slack channel',
    payloadTemplate: {
      channel: '#general',
      username: 'AppLens',
      icon_emoji: ':robot:',
      attachments: [
        {
          color: '{{color}}',
          title: '{{title}}',
          text: '{{text}}',
          footer: 'AppLens',
          ts: '{{timestamp}}',
        },
      ],
    },
    mapping: {
      'test.completed': { color: '#36a64f', title: '✅ Test Completed', text: '{{data.testName}} passed' },
      'test.failed': { color: '#ff0000', title: '❌ Test Failed', text: '{{data.testName}} failed: {{data.error}}' },
      'device.connected': { color: '#36a64f', title: '📱 Device Connected', text: '{{data.deviceName}} is now online' },
      'device.disconnected': { color: '#ff0000', title: '📱 Device Disconnected', text: '{{data.deviceName}} went offline' },
      'subscription.created': { color: '#36a64f', title: '💳 Subscription Created', text: 'New {{data.plan}} subscription' },
      'subscription.expired': { color: '#ff0000', title: '💳 Subscription Expired', text: '{{data.plan}} subscription expired' },
    },
  },
  discord: {
    name: 'Discord',
    description: 'Send webhook notifications to a Discord channel',
    payloadTemplate: {
      username: 'AppLens',
      avatar_url: 'https://applens.dev/icon.png',
      embeds: [
        {
          color: '{{color}}',
          title: '{{title}}',
          description: '{{description}}',
          timestamp: '{{timestamp}}',
          footer: { text: 'AppLens' },
        },
      ],
    },
    mapping: {
      'test.completed': { color: 0x36a64f, title: '✅ Test Completed', description: '{{data.testName}} passed' },
      'test.failed': { color: 0xff0000, title: '❌ Test Failed', description: '{{data.testName}} failed: {{data.error}}' },
      'device.connected': { color: 0x36a64f, title: '📱 Device Connected', description: '{{data.deviceName}} is now online' },
      'device.disconnected': { color: 0xff0000, title: '📱 Device Disconnected', description: '{{data.deviceName}} went offline' },
      'subscription.created': { color: 0x36a64f, title: '💳 Subscription Created', description: 'New {{data.plan}} subscription' },
      'subscription.expired': { color: 0xff0000, title: '💳 Subscription Expired', description: '{{data.plan}} subscription expired' },
    },
  },
  teams: {
    name: 'Microsoft Teams',
    description: 'Send webhook notifications to a Teams channel',
    payloadTemplate: {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '{{color}}',
      summary: 'AppLens Notification',
      sections: [
        {
          activityTitle: '{{title}}',
          activitySubtitle: 'AppLens',
          facts: [],
          markdown: true,
        },
      ],
    },
    mapping: {
      'test.completed': { color: '36a64f', title: '✅ Test Completed', facts: [{ name: 'Test', value: '{{data.testName}}' }] },
      'test.failed': { color: 'ff0000', title: '❌ Test Failed', facts: [{ name: 'Test', value: '{{data.testName}}' }, { name: 'Error', value: '{{data.error}}' }] },
      'device.connected': { color: '36a64f', title: '📱 Device Connected', facts: [{ name: 'Device', value: '{{data.deviceName}}' }] },
      'device.disconnected': { color: 'ff0000', title: '📱 Device Disconnected', facts: [{ name: 'Device', value: '{{data.deviceName}}' }] },
      'subscription.created': { color: '36a64f', title: '💳 Subscription Created', facts: [{ name: 'Plan', value: '{{data.plan}}' }] },
      'subscription.expired': { color: 'ff0000', title: '💳 Subscription Expired', facts: [{ name: 'Plan', value: '{{data.plan}}' }] },
    },
  },
  custom: {
    name: 'Custom URL',
    description: 'Send raw webhook payload to any HTTPS endpoint',
    payloadTemplate: null, // Raw JSON
    mapping: null,
  },
};

/**
 * Get all supported event types
 */
export function getSupportedEvents(): { type: WebhookEventType; description: string }[] {
  return [
    { type: 'test.completed', description: 'Triggered when a test completes successfully' },
    { type: 'test.failed', description: 'Triggered when a test fails' },
    { type: 'device.connected', description: 'Triggered when a device comes online' },
    { type: 'device.disconnected', description: 'Triggered when a device goes offline' },
    { type: 'subscription.created', description: 'Triggered when a new subscription is created' },
    { type: 'subscription.expired', description: 'Triggered when a subscription expires' },
  ];
}
