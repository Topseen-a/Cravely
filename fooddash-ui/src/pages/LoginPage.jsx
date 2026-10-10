import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/hooks';
import { apiError } from '../lib/format';
import AuthLayout from '../components/AuthLayout';
import { Button, Input, PasswordInput } from '../components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : user.role === 'staff' ? '/staff' : '/');
    } catch (err) {
      setError(apiError(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout quote="The jollof reach Lekki and e still dey hot. Na here I dey order from now." by="Tolu, Lekki Phase 1">
      <h1 className="text-4xl font-extrabold">Welcome back</h1>
      <p className="mt-2 text-muted">Log in to order and track your food in real time.</p>
      {params.get('reset') && (
        <p className="mt-6 rounded-xl bg-palm-soft px-4 py-3 text-sm font-semibold text-palm">Password updated. Log in with your new password.</p>
      )}
      {params.get('expired') && (
        <p className="mt-6 rounded-xl bg-danfo-soft px-4 py-3 text-sm font-semibold">Your session expired. Please log in again.</p>
      )}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
        <div>
          <PasswordInput autoComplete="current-password" value={form.password} onChange={set('password')} required />
          <div className="mt-2 text-right">
            <Link to={`/forgot-password${form.email ? `?email=${encodeURIComponent(form.email)}` : ''}`} className="text-sm font-semibold text-ink-soft underline decoration-danfo decoration-2 underline-offset-4 hover:text-ink">
              Forgot password?
            </Link>
          </div>
        </div>
        {error && <p role="alert" className="rounded-xl bg-jollof-soft px-4 py-3 text-sm font-semibold text-jollof-dark">{error}</p>}
        <Button type="submit" size="lg" loading={loading} className="w-full">Log in</Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        New to Cravely? <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`} className="font-bold text-ink underline decoration-danfo decoration-4 underline-offset-4">Create an account</Link>
      </p>
      <p className="mt-3 text-center text-sm text-muted">
        Kitchen staff? <Link to="/staff/register" className="font-semibold text-ink-soft underline">Staff sign-up</Link>
      </p>
    </AuthLayout>
  );
}
