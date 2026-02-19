import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { supabase, query } from '@/lib/supabase';

// GET /api/webhooks/logs - Get webhook delivery logs
export async function GET(request) {
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhookId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const success = searchParams.get('success');

    // First get webhooks for this team
    const { data: webhooks, error: webhooksError } = await query('webhooks', {
      where: { team_id: auth.company.id },
    });

    if (webhooksError) throw webhooksError;
    if (!webhooks || webhooks.length === 0) {
      return NextResponse.json({ logs: [], pagination: { total: 0, limit, offset } });
    }

    const webhookIds = webhooks.map(wh => wh.id);

    // Build query for webhook_logs
    let dbQuery = supabase
      .from('webhook_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by webhook ID if specified
    if (webhookId) {
      const targetWebhook = webhooks.find(wh => wh.id === webhookId);
      if (!targetWebhook) {
        return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
      }
      dbQuery = dbQuery.eq('webhook_id', webhookId);
    } else {
      // Filter to only webhooks belonging to this team
      dbQuery = dbQuery.in('webhook_id', webhookIds);
    }

    // Filter by success if specified
    if (success !== null) {
      dbQuery = dbQuery.eq('success', success === 'true');
    }

    const { data: logs, error, count } = await dbQuery;

    if (error) throw error;

    // Enrich logs with webhook info
    const enrichedLogs = (logs || []).map(log => {
      const webhook = webhooks.find(wh => wh.id === log.webhook_id);
      return {
        ...log,
        webhook_name: webhook?.name,
        webhook_url: webhook?.url,
      };
    });

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0),
      },
    });
  } catch (error) {
    console.error('Get webhook logs error:', error);
    return NextResponse.json({ error: 'Failed to get webhook logs' }, { status: 500 });
  }
}
