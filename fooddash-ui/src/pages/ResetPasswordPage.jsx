import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/endpoints';
import { useAuth, useToast } from '../context/hooks';
import { apiError } from '../lib/format';
import AuthLayout from '../components/AuthLayout';
import { Button, PasswordInput } from '../components/ui';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { saveSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const mismatch = form.confirm && form.password !== form.confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('The two passwords don’t match');
    setError('');
    setLoading(true);
    try {
      const { data } = await resetPassword(token, form.password);
      const user = saveSession(data);
      toast('Password updated — you’re logged in', 'success');
      navigate(user.role === 'staff' ? '/staff' : '/', { replace: true });
    } catch (err) {
      setError(apiError(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout quote="New password, same sweet jollof." by="The Cravely team">
      {!token ? (
        <>
          <h1 className="text-4xl font-extrabold">Link not valid</h1>
          <p className="mt-3 text-muted">This password reset link is incomplete. Please request a new one.</p>
          <Link to="/forgot-password" className="mt-8 inline-block"><Button size="lg">Request a new link</Button></Link>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-extrabold">Choose a new password</h1>
          <p className="mt-2 text-muted">You&rsquo;ll be logged in straight away, and signed out on every other device.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <PasswordInput label="New password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required hint="At least 8 characters" autoFocus />
            <PasswordInput label="Confirm new password" autoComplete="new-password" minLength={8} value={form.confirm} onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))} required error={mismatch ? 'Passwords don’t match yet' : undefined} />
            {error && (
              <div role="alert" className="rounded-xl bg-jollof-soft px-4 py-3 text-sm font-semibold text-jollof-dark">
                {error}
                {error.includes('expired') && <> <Link to="/forgot-password" className="underline">Request a new link</Link></>}
              </div>
            )}
            <Button type="submit" size="lg" loading={loading} disabled={mismatch} className="w-full">Update password</Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
