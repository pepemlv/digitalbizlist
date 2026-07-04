# DigitalBizList

DigitalBizList has two deployable parts:

- `project/` - Vite React frontend
- `backend/` - Render-ready Node/Express backend for Stripe checkout and Stripe webhooks

## GitHub Repo

Repository:

`https://github.com/pepemlv/digitalbizlist`

## Backend On Render

Create a new Render Web Service from the GitHub repo.

Use these settings:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

Or use the included `render.yaml` blueprint.

## Backend Environment Variables

Set these in Render:

```env
FRONTEND_URL=https://your-frontend-domain.com
STRIPE_SECRET_KEY=sk_live_or_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_BUSINESS_PRICE_ID=price_xxx
FIREBASE_SERVICE_ACCOUNT={"type":"service_account", "...": "..."}
```

`FIREBASE_SERVICE_ACCOUNT` must be the Firebase Admin service account JSON pasted as one line.

## Stripe Webhook

In Stripe Dashboard, add this webhook endpoint:

```text
https://your-render-backend.onrender.com/api/stripe/webhook
```

Listen for:

```text
checkout.session.completed
```

When payment succeeds, the backend writes/updates this Firestore document:

```text
userPlans/{email-doc-id}
```

The frontend dashboard reads that document to show the active plan.

## Frontend Environment Variable

In the frontend hosting provider, set:

```env
VITE_STRIPE_CHECKOUT_ENDPOINT=https://your-render-backend.onrender.com/api/stripe/create-checkout-session
```

Local frontend app is in `project/`.

```bash
cd project
npm install
npm run build
```

## Local Backend Test

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Open:

```text
http://localhost:10000/health
```
