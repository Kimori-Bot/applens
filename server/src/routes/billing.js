/**
 * Billing Routes for AppLens
 * Handles subscriptions, usage tracking, and invoices
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabase, insert, query, update, delete: dbDelete } = require('../db');

// Pricing configuration
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    testsLimit: 10,
    devicesLimit: 1,
    features: [
      '10 tests per month',
      '1 device',
      'Basic analytics',
      'Community support'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    testsLimit: 100,
    devicesLimit: 5,
    features: [
      '100 tests per month',
      '5 devices',
      'Advanced analytics',
      'Priority support',
      'API access',
      'Custom test scheduling'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
    testsLimit: -1, // unlimited
    devicesLimit: -1, // unlimited
    features: [
      'Unlimited tests',
      'Unlimited devices',
      'Advanced analytics',
      'Dedicated support',
      'Full API access',
      'Custom integrations',
      'SLA guarantee',
      'Team management'
    ]
  }
};

// Initialize usage for new company
async function initializeCompanyUsage(companyId, plan = 'free') {
  const planConfig = PLANS[plan];
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  try {
    const { data: existing } = await supabase
      .from('usage')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (!existing) {
      await insert('usage', {
        company_id: companyId,
        tests_used: 0,
        tests_limit: planConfig.testsLimit,
        devices_used: 0,
        devices_limit: planConfig.devicesLimit,
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString()
      });
    }
  } catch (error) {
    console.error('Error initializing company usage:', error);
  }
}

// Get current subscription for company
async function getSubscription(companyId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data || null;
}

// Get current usage for company
async function getUsage(companyId) {
  const { data, error } = await supabase
    .from('usage')
    .select('*')
    .eq('company_id', companyId)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  // Return default usage if none exists
  return data || {
    company_id: companyId,
    tests_used: 0,
    tests_limit: 10,
    devices_used: 0,
    devices_limit: 1,
    period_start: new Date().toISOString(),
    period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
}

// Check if company can run a test
async function canRunTest(companyId) {
  const usage = await getUsage(companyId);
  const subscription = await getSubscription(companyId);
  const plan = subscription?.plan || 'free';
  const planConfig = PLANS[plan];

  // Check if we're in a new billing period
  const now = new Date();
  const periodEnd = new Date(usage.period_end);

  if (now > periodEnd) {
    // Reset for new period
    await resetUsage(companyId);
    return { allowed: true, remaining: planConfig.testsLimit };
  }

  // Check test limit
  const testsRemaining = planConfig.testsLimit === -1 
    ? -1 
    : planConfig.testsLimit - usage.tests_used;

  if (testsRemaining === 0) {
    return { allowed: false, remaining: 0, message: 'Test limit reached for this billing period' };
  }

  return { allowed: true, remaining: testsRemaining };
}

// Reset usage for new billing period
async function resetUsage(companyId) {
  const subscription = await getSubscription(companyId);
  const plan = subscription?.plan || 'free';
  const planConfig = PLANS[plan];

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: existing } = await supabase
    .from('usage')
    .select('id')
    .eq('company_id', companyId)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    await update('usage', {
      tests_used: 0,
      tests_limit: planConfig.testsLimit,
      devices_used: 0,
      devices_limit: planConfig.devicesLimit,
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString()
    }, { id: existing.id });
  } else {
    await initializeCompanyUsage(companyId, plan);
  }
}

// Increment test count
async function incrementTestCount(companyId) {
  const usage = await getUsage(companyId);
  
  if (usage) {
    await update('usage', {
      tests_used: usage.tests_used + 1
    }, { id: usage.id });
  }
}

// Check device limit
async function canAddDevice(companyId) {
  const usage = await getUsage(companyId);
  const subscription = await getSubscription(companyId);
  const plan = subscription?.plan || 'free';
  const planConfig = PLANS[plan];

  const devicesRemaining = planConfig.devicesLimit === -1 
    ? -1 
    : planConfig.devicesLimit - usage.devices_used;

  if (devicesRemaining === 0) {
    return { allowed: false, remaining: 0, message: 'Device limit reached for this plan' };
  }

  return { allowed: true, remaining: devicesRemaining };
}

// Middleware to require authentication via API key
function requireAuth(req, res, next) {
  const companyId = req.headers['x-company-id'];
  
  if (!companyId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  req.companyId = companyId;
  next();
}

const router = express.Router();

// Get available plans
router.get('/plans', async (req, res) => {
  try {
    const plansList = Object.values(PLANS);
    res.json({ plans: plansList });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Get current subscription
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const subscription = await getSubscription(req.companyId);
    const plan = subscription?.plan || 'free';
    
    res.json({
      subscription: subscription ? {
        ...subscription,
        planDetails: PLANS[plan]
      } : null,
      plan: plan,
      planDetails: PLANS[plan]
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Create checkout session (Stripe integration)
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const plan = PLANS[planId];

    // Free plan - just update subscription
    if (planId === 'free') {
      const existingSub = await getSubscription(req.companyId);
      
      if (existingSub) {
        await update('subscriptions', {
          plan: 'free',
          status: 'active'
        }, { company_id: req.companyId });
      } else {
        await insert('subscriptions', {
          company_id: req.companyId,
          plan: 'free',
          status: 'active'
        });
      }

      await initializeCompanyUsage(req.companyId, 'free');

      return res.json({
        success: true,
        message: 'Switched to free plan',
        subscription: { plan: 'free', status: 'active' }
      });
    }

    // Paid plans - create Stripe checkout session
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Get or create customer
    let customerId;
    const existingSub = await getSubscription(req.companyId);
    
    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      // Create customer
      const customer = await stripe.customers.create({
        metadata: { companyId: req.companyId }
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: plan.priceId,
        quantity: 1
      }],
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/billing?success=true&plan=${planId}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/billing?canceled=true`,
      metadata: {
        companyId: req.companyId,
        plan: planId
      }
    });

    // Create or update subscription record
    if (existingSub) {
      await update('subscriptions', {
        stripe_customer_id: customerId
      }, { company_id: req.companyId });
    } else {
      await insert('subscriptions', {
        company_id: req.companyId,
        plan: planId,
        status: 'incomplete',
        stripe_customer_id: customerId
      });
    }

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Cancel subscription
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const subscription = await getSubscription(req.companyId);

    if (!subscription || !subscription.stripe_subscription_id) {
      // No Stripe subscription, just switch to free
      await update('subscriptions', {
        plan: 'free',
        status: 'active',
        cancel_at_period_end: false
      }, { company_id: req.companyId });
      
      await initializeCompanyUsage(req.companyId, 'free');
      
      return res.json({
        success: true,
        message: 'Switched to free plan'
      });
    }

    // Cancel Stripe subscription
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    await update('subscriptions', {
      cancel_at_period_end: true
    }, { company_id: req.companyId });

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period'
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
router.post('/reactivate', requireAuth, async (req, res) => {
  try {
    const subscription = await getSubscription(req.companyId);

    if (!subscription || !subscription.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription to reactivate' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false
    });

    await update('subscriptions', {
      cancel_at_period_end: false,
      status: 'active'
    }, { company_id: req.companyId });

    res.json({
      success: true,
      message: 'Subscription reactivated'
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// Upgrade/downgrade plan
router.post('/change-plan', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const subscription = await getSubscription(req.companyId);
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Handle free plan
    if (planId === 'free') {
      if (subscription?.stripe_subscription_id && stripe) {
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true
        });
      }

      await update('subscriptions', {
        plan: 'free',
        status: 'active',
        cancel_at_period_end: false
      }, { company_id: req.companyId });

      await initializeCompanyUsage(req.companyId, 'free');

      return res.json({
        success: true,
        message: 'Plan changed to free'
      });
    }

    // Paid plan change
    if (subscription?.stripe_subscription_id && stripe) {
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [{
          id: stripeSub.items.data[0].id,
          price: PLANS[planId].priceId
        }],
        proration_behavior: 'create_prorations'
      });
    }

    await update('subscriptions', {
      plan: planId,
      status: 'active'
    }, { company_id: req.companyId });

    // Update usage limits
    await initializeCompanyUsage(req.companyId, planId);

    res.json({
      success: true,
      message: `Plan changed to ${PLANS[planId].name}`
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({ error: 'Failed to change plan' });
  }
});

// Get current usage
router.get('/usage', requireAuth, async (req, res) => {
  try {
    const usage = await getUsage(req.companyId);
    const subscription = await getSubscription(req.companyId);
    const plan = subscription?.plan || 'free';
    const planConfig = PLANS[plan];

    const testsRemaining = planConfig.testsLimit === -1 
      ? -1 
      : planConfig.testsLimit - usage.tests_used;

    const devicesRemaining = planConfig.devicesLimit === -1 
      ? -1 
      : planConfig.devicesLimit - usage.devices_used;

    res.json({
      usage: {
        tests: {
          used: usage.tests_used,
          limit: planConfig.testsLimit,
          remaining: testsRemaining,
          unlimited: planConfig.testsLimit === -1
        },
        devices: {
          used: usage.devices_used,
          limit: planConfig.devicesLimit,
          remaining: devicesRemaining,
          unlimited: planConfig.devicesLimit === -1
        },
        period: {
          start: usage.period_start,
          end: usage.period_end
        }
      },
      plan: plan
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// Check if test can be run
router.get('/can-test', requireAuth, async (req, res) => {
  try {
    const result = await canRunTest(req.companyId);
    res.json(result);
  } catch (error) {
    console.error('Error checking test permission:', error);
    res.status(500).json({ error: 'Failed to check test permission' });
  }
});

// Record test usage
router.post('/record-test', requireAuth, async (req, res) => {
  try {
    const canRun = await canRunTest(req.companyId);

    if (!canRun.allowed) {
      return res.status(403).json(canRun);
    }

    await incrementTestCount(req.companyId);
    
    const result = await canRunTest(req.companyId);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error recording test:', error);
    res.status(500).json({ error: 'Failed to record test' });
  }
});

// Get invoice history
router.get('/invoices', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({ invoices: data || [] });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const companyId = session.metadata?.companyId;
        const plan = session.metadata?.plan || 'pro';

        if (companyId) {
          // Create or update subscription
          const existingSub = await getSubscription(companyId);
          
          const subData = {
            company_id: companyId,
            plan: plan,
            status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            current_period_start: new Date().toISOString()
          };

          if (existingSub) {
            await update('subscriptions', subData, { company_id: companyId });
          } else {
            await insert('subscriptions', subData);
          }

          // Initialize usage for the plan
          await initializeCompanyUsage(companyId, plan);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        const { data: subRecord } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (subRecord) {
          const statusMap = {
            active: 'active',
            canceled: 'canceled',
            past_due: 'past_due',
            trialing: 'trialing',
            incomplete: 'incomplete'
          };

          await update('subscriptions', {
            status: statusMap[subscription.status] || 'active',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
          }, { stripe_subscription_id: subscription.id });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        await update('subscriptions', {
          status: 'canceled',
          plan: 'free'
        }, { stripe_subscription_id: subscription.id });

        // Switch to free plan
        const { data: subRecord } = await supabase
          .from('subscriptions')
          .select('company_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (subRecord) {
          await initializeCompanyUsage(subRecord.company_id, 'free');
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
          const { data: subRecord } = await supabase
            .from('subscriptions')
            .select('company_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();

          if (subRecord) {
            await insert('invoices', {
              company_id: subRecord.company_id,
              stripe_invoice_id: invoice.id,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              status: invoice.status,
              period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
              period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
              paid_at: new Date().toISOString(),
              invoice_url: invoice.hosted_invoice_url
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
          await update('subscriptions', {
            status: 'past_due'
          }, { stripe_subscription_id: invoice.subscription });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
module.exports.PLANS = PLANS;
module.exports.canRunTest = canRunTest;
module.exports.canAddDevice = canAddDevice;
module.exports.incrementTestCount = incrementTestCount;
module.exports.initializeCompanyUsage = initializeCompanyUsage;
