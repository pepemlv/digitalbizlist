import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import admin from 'firebase-admin';
import Stripe from 'stripe';

const app = express();
const port = process.env.PORT || 10000;

const requiredEnv = ['STRIPE_SECRET_KEY', 'FRONTEND_URL', 'FIREBASE_SERVICE_ACCOUNT'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.warn(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })
  : null;

const defaultPricingPlans = {
  starter: {
    planId: 'starter',
    name: 'Starter Plan',
    amount: 100,
    adsLimit: 5,
    publishWindowDays: 30,
    activeDays: 60,
  },
  business: {
    planId: 'business',
    name: 'Business Plan',
    amount: 200,
    adsLimit: 15,
    publishWindowDays: 30,
    activeDays: 60,
  },
};

function parseServiceAccount(raw) {
  if (!raw) return null;

  const serviceAccount = JSON.parse(raw);
  if (typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  return serviceAccount;
}

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    return parseServiceAccount(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
  }

  return parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
}

if (!admin.apps.length) {
  try {
    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (error) {
    console.error(`Firebase Admin initialization failed: ${error.message}`);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

const allowedOrigins = new Set([
  normalizeOrigin(process.env.FRONTEND_URL),
  'https://digitalbizlist.com',
  'https://www.digitalbizlist.com',
].filter(Boolean));

function accountDocId(email) {
  return email.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '_') || 'unknown';
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function packageFromLegacyPlan(data) {
  if (!data || data.plan_id === 'free' || !data.ads_limit) return null;

  return {
    id: data.payment_intent_id || `legacy-${data.plan_id}`,
    plan_id: data.plan_id,
    ads_limit: Number(data.ads_limit) || 0,
    ads_used: Number(data.ads_used) || 0,
    purchased_at: data.period_started_at || data.updated_at || new Date().toISOString(),
    period_started_at: data.period_started_at || null,
    period_ends_at: data.period_ends_at || null,
    payment_intent_id: data.payment_intent_id || null,
  };
}

function normalizePackages(data) {
  if (Array.isArray(data?.packages)) return data.packages;
  const legacyPackage = packageFromLegacyPlan(data);
  return legacyPackage ? [legacyPackage] : [];
}

function summarizePackages(packages) {
  const validPackages = packages.filter((item) => item.plan_id === 'starter' || item.plan_id === 'business');
  const adsLimit = validPackages.reduce((total, item) => total + (Number(item.ads_limit) || 0), 0);
  const adsUsed = validPackages.reduce((total, item) => total + (Number(item.ads_used) || 0), 0);
  const periodEndsAt = validPackages
    .map((item) => item.period_ends_at)
    .filter(Boolean)
    .sort()
    .at(-1) || null;
  const periodStartedAt = validPackages.find((item) => item.period_started_at)?.period_started_at || null;
  const firstAvailable = validPackages.find((item) => (Number(item.ads_limit) || 0) > (Number(item.ads_used) || 0));
  const activePackage = firstAvailable || validPackages.at(-1);

  return {
    planId: activePackage?.plan_id || 'free',
    adsLimit,
    adsUsed,
    periodStartedAt,
    periodEndsAt,
  };
}

async function activatePlan({ email, planId, paymentIntentId }) {
  if (!db) {
    const error = new Error('Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_BASE64 in Render.');
    error.statusCode = 503;
    throw error;
  }
  const plan = await getPricingPlan(planId);

  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();
  const nowIso = now.toISOString();
  const packageId = paymentIntentId || `${plan.planId}-${now.getTime()}`;
  const planRef = db.collection('userPlans').doc(accountDocId(normalizedEmail));

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(planRef);
    const existing = snapshot.exists ? snapshot.data() : {};
    const packages = normalizePackages(existing);
    const alreadyAdded = packages.some((item) => item.id === packageId || item.payment_intent_id === paymentIntentId);
    const nextPackages = alreadyAdded
      ? packages
      : [
        ...packages,
        {
          id: packageId,
          plan_id: plan.planId,
          ads_limit: plan.adsLimit,
          ads_used: 0,
          purchased_at: nowIso,
          period_started_at: null,
          period_ends_at: addDays(now, plan.publishWindowDays || 30).toISOString(),
          payment_intent_id: paymentIntentId || null,
        },
      ];
    const summary = summarizePackages(nextPackages);

    transaction.set(planRef, {
      email: normalizedEmail,
      plan_id: summary.planId,
      ads_limit: summary.adsLimit,
      ads_used: summary.adsUsed,
      period_started_at: summary.periodStartedAt,
      period_ends_at: summary.periodEndsAt,
      packages: nextPackages,
      payment_intent_id: paymentIntentId || existing.payment_intent_id || null,
      updated_at: nowIso,
    }, { merge: true });
  });
}

async function getPricingPlan(planId) {
  const fallback = defaultPricingPlans[planId];
  if (!fallback) throw new Error(`Unknown plan: ${planId}`);
  if (!db) return fallback;

  const planDoc = await db.collection('pricingPlans').doc(planId).get();
  if (!planDoc.exists) return fallback;

  const data = planDoc.data() || {};
  const amount = Number(data.amount_cents);
  const adsLimit = Number(data.ads_limit);
  const activeDays = Number(data.active_days);
  const publishWindowValue = data.publish_window_days;
  const publishWindowDays = publishWindowValue === null || publishWindowValue === ''
    ? null
    : Number(publishWindowValue);

  return {
    ...fallback,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : fallback.name,
    amount: Number.isFinite(amount) && amount >= 50 ? Math.round(amount) : fallback.amount,
    adsLimit: Number.isFinite(adsLimit) && adsLimit > 0 ? Math.round(adsLimit) : fallback.adsLimit,
    activeDays: Number.isFinite(activeDays) && activeDays > 0 ? Math.round(activeDays) : fallback.activeDays,
    publishWindowDays: publishWindowDays === null
      ? fallback.publishWindowDays
      : Number.isFinite(publishWindowDays) && publishWindowDays > 0
        ? Math.round(publishWindowDays)
        : fallback.publishWindowDays,
  };
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
}));

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'digitalbizlist-backend', firebaseAdmin: Boolean(db) });
});

app.get('/', (_request, response) => {
  response.json({
    ok: true,
    service: 'digitalbizlist-backend',
    payments: 'payment-intents',
  });
});

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  if (!stripe) return response.status(500).send('Stripe is not configured.');

  let event;
  try {
    const signature = request.headers['stripe-signature'];
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(request.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(request.body.toString());
    }
  } catch (error) {
    return response.status(400).send(`Webhook error: ${error.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const email = paymentIntent.metadata?.email;
      const planId = paymentIntent.metadata?.planId;

      if (email && planId) {
        await activatePlan({
          email,
          planId,
          paymentIntentId: paymentIntent.id,
        });
      }
    }

    response.json({ received: true });
  } catch (error) {
    response.status(500).send(`Webhook handler failed: ${error.message}`);
  }
});

app.use(express.json());

app.post('/api/stripe/create-payment-intent', async (request, response) => {
  if (!stripe) return response.status(500).json({ error: 'Stripe is not configured.' });

  const { planId, email } = request.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) return response.status(400).json({ error: 'Email is required.' });

  try {
    const plan = await getPricingPlan(planId);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.amount,
      currency: 'usd',
      receipt_email: normalizedEmail,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        email: normalizedEmail,
        planId: plan.planId,
      },
      description: `DigitalBizList ${plan.name}`,
    });

    response.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error(`Create payment intent failed: ${error.message}`);
    response.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.post('/api/stripe/confirm-plan-payment', async (request, response) => {
  if (!stripe) return response.status(500).json({ error: 'Stripe is not configured.' });

  const { paymentIntentId } = request.body || {};
  if (!paymentIntentId) return response.status(400).json({ error: 'Payment intent is required.' });

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return response.status(400).json({ error: 'Payment is not complete.' });
    }

    const email = paymentIntent.metadata?.email;
    const planId = paymentIntent.metadata?.planId;
    if (!email || !planId) return response.status(400).json({ error: 'Payment metadata is missing.' });

    await activatePlan({
      email,
      planId,
      paymentIntentId: paymentIntent.id,
    });

    response.json({ ok: true, planId });
  } catch (error) {
    console.error(`Confirm plan payment failed: ${error.message}`);
    response.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`DigitalBizList backend running on port ${port}`);
});
