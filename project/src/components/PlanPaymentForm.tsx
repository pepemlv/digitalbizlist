import { FormEvent, useState } from 'react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { confirmPlanPayment, createPlanPaymentIntent, PricingPlan, PricingPlanId, pricingPlans } from '../lib/firebase';

type PaidPlanId = Exclude<PricingPlanId, 'free'>;

type Props = {
  planId: PaidPlanId;
  plan?: PricingPlan;
  email: string;
  onCancel: () => void;
  onSuccess: () => void;
};

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function PaymentFields({ planId, plan: providedPlan, email, onCancel, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const plan = providedPlan ?? pricingPlans[planId];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) {
      setStatus('Card form is not ready.');
      return;
    }

    setSubmitting(true);
    setStatus('');
    try {
      const { clientSecret, paymentIntentId } = await createPlanPaymentIntent(planId, email);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            email,
          },
        },
      });

      if (result.error) {
        setStatus(result.error.message || 'Payment failed. Try another card.');
        setSubmitting(false);
        return;
      }

      if (result.paymentIntent?.status !== 'succeeded') {
        setStatus('Payment was not completed.');
        setSubmitting(false);
        return;
      }

      await confirmPlanPayment(paymentIntentId);
      setStatus('Payment complete. Your plan is active.');
      onSuccess();
    } catch {
      setStatus('Could not complete payment. Check backend and Stripe settings.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-gray-300 bg-white p-3">
      <div>
        <p className="text-sm font-semibold text-gray-900">{plan.name} - {plan.priceLabel}</p>
        <p className="text-xs text-gray-600">Pay securely without leaving DigitalBizList.</p>
      </div>
      <div className="border border-gray-400 bg-white px-2 py-2">
        <CardElement
          options={{
            hidePostalCode: true,
            style: {
              base: {
                fontSize: '14px',
                color: '#111827',
                '::placeholder': { color: '#9ca3af' },
              },
              invalid: { color: '#cc0000' },
            },
          }}
        />
      </div>
      {status && <p className="text-xs text-gray-600">{status}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="border border-[#00519b] bg-[#00519b] px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {submitting ? 'processing...' : `pay ${plan.priceLabel}`}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-[#00519b] hover:underline">
          cancel
        </button>
      </div>
    </form>
  );
}

export default function PlanPaymentForm(props: Props) {
  if (!stripePromise) {
    return (
      <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        Missing Stripe publishable key. Add VITE_STRIPE_PUBLISHABLE_KEY to the frontend environment.
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentFields {...props} />
    </Elements>
  );
}
