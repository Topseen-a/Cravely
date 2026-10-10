import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { forgotPassword } from '../api/endpoints';
import { apiError } from '../lib/format';
import AuthLayout from '../components/AuthLayout';
import { Button, Input } from '../components/ui';
import Icon from '../components/Icon';

export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout quote="No wahala. Even the best of us forget passwords — we'll sort you out sharp sharp." by="The Cravely team">
      {sent ? (
        <div className="animate-fade-up">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-danfo">
            <Icon name="mail" className="h-7 w-7" />
          </span>
          <h1 className="mt-6 text-4xl font-extrabold">Check your email</h1>
          <p className="mt-3 text-muted">
            If an account exists for <span className="font-semibold text-ink">{email}</span>, we&rsquo;ve sent a link to reset your password. It works for 30 minutes.
          </p>
          <p className="mt-3 text-sm text-muted">Can&rsquo;t find it? Check your spam or promotions folder.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login"><Button size="lg">Back to log in</Button></Link>
            <Button size="lg" variant="outline" loading={loading} onClick={submit}>Resend link</Button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-4xl font-extrabold">Forgot your password?</h1>
          <p className="mt-2 text-muted">Enter the email you signed up with and we&rsquo;ll send you a link to choose a new one.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoFocus />
            {error && <p role="alert" className="rounded-xl bg-jollof-soft px-4 py-3 text-sm font-semibold text-jollof-dark">{error}</p>}
            <Button type="submit" size="lg" loading={loading} className="w-full">Send reset link</Button>
          </form>
          <p className="mt-8 text-center text-sm text-muted">
            Remembered it? <Link to="/login" className="font-bold text-ink underline decoration-danfo decoration-4 underline-offset-4">Log in</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
