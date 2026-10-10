import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPayment } from '../api/endpoints';
import { apiError } from '../lib/format';
import { Button, EmptyState, Spinner } from '../components/ui';
import FoodArt from '../components/illustrations/FoodArt';

// Paystack redirects here with ?reference=... after checkout.
export default function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const reference = params.get('reference') || params.get('trxref');

  useEffect(() => {
    if (!reference) return;
    verifyPayment(reference)
      .then(({ data }) => navigate(`/orders/${data.data.ID}${data.data.payment_status === 'paid' ? '?new=1' : ''}`, { replace: true }))
      .catch((err) => setError(apiError(err)));
  }, [reference, navigate]);

  if (error || !reference)
    return (
      <EmptyState title="We couldn't confirm your payment" action={<Link to="/orders"><Button>Go to my orders</Button></Link>}>
        {error || 'No payment reference was provided.'} If you were debited, don&rsquo;t worry — it will reflect on your order shortly.
      </EmptyState>
    );

  return (
    <EmptyState art={<FoodArt name="Jollof Rice" className="h-32" />} title="Confirming your payment…">
      <span className="inline-flex items-center gap-2"><Spinner className="h-4 w-4" /> Hold on small, this takes a few seconds.</span>
    </EmptyState>
  );
}
