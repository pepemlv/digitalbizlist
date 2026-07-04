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

const pricingPlans = {
  starter: {
    planId: 'starter',
    name: 'Starter Plan',
    amount: 500,
    adsLimit: 5,
    publishWindowDays: null,
    activeDays: 60,
    priceEnv: 'STRIPE_STARTER_PRICE_ID',
  },
  business: {
    planId: 'business',
    name: 'Business Plan',
    amount: 1000,
    adsLimit: 15,
    publishWindowDays: 30,
    activeDays: 60,
    priceEnv: 'STRIPE_BUSINESS_PRICE_ID',
  },
};

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  return JSON.parse(raw);
}

if (!admin.apps.length) {
  const serviceAccount = getServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

const db = admin.apps.length ? admin.firestore() : null;

function accountDocId(email) {
  return email.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '_') || 'unknown';
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function activatePlan({ email, planId, checkoutSessionId }) {
  if (!db) throw new Error('Firebase Admin is not initialized.');
  const plan = pricingPlans[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const now = new Date();
  const periodEndsAt = plan.publishWindowDays ? addDays(now, plan.publishWindowDays).toISOString() : null;
  const normalizedEmail = email.trim().toLowerCase();

  await db.collection('userPlans').doc(accountDocId(normalizedEmail)).set({
    email: normalizedEmail,
    plan_id: plan.planId,
    ads_limit: plan.adsLimit,
    ads_used: 0,
    period_started_at: now.toISOString(),
    period_ends_at: periodEndsAt,
    checkout_session_id: checkoutSessionId || null,
    updated_at: now.toISOString(),
  }, { merge: true });
}

app.use(cors({
  origin: process.env.FRONTEND_URL,
}));

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'digitalbizlist-backend' });
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
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.metadata?.email || session.customer_details?.email;
      const planId = session.metadata?.planId;

      if (email && planId) {
        await activatePlan({
          email,
          planId,
          checkoutSessionId: session.id,
        });
      }
    }

    response.json({ received: true });
  } catch (error) {
    response.status(500).send(`Webhook handler failed: ${error.message}`);
  }
});

app.use(express.json());

app.post('/api/stripe/create-checkout-session', async (request, response) => {
  if (!stripe) return response.status(500).json({ error: 'Stripe is not configured.' });

  const { planId, email, successUrl, cancelUrl } = request.body || {};
  const plan = pricingPlans[planId];
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!plan) return response.status(400).json({ error: 'Invalid plan.' });
  if (!normalizedEmail) return response.status(400).json({ error: 'Email is required.' });

  try {
    const configuredPriceId = process.env[plan.priceEnv];
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: normalizedEmail,
      success_url: successUrl || `${process.env.FRONTEND_URL}?page=user&checkout=success`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}?page=user&checkout=cancelled`,
      metadata: {
        email: normalizedEmail,
        planId: plan.planId,
      },
      line_items: [
        configuredPriceId
          ? { price: configuredPriceId, quantity: 1 }
          : {
              quantity: 1,
              price_data: {
                currency: 'usd',
                unit_amount: plan.amount,
                product_data: {
                  name: `DigitalBizList ${plan.name}`,
                  description: `${plan.adsLimit} ads, each active for ${plan.activeDays} days`,
                },
              },
            },
      ],
    });

    response.json({ url: session.url });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`DigitalBizList backend running on port ${port}`);
});
