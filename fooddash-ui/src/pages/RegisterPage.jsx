import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/hooks';
import { useToast } from '../context/hooks';
import { apiError } from '../lib/format';
import AuthLayout from '../components/AuthLayout';
import { Button, Input, PasswordInput } from '../components/ui';

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFields({});
    setLoading(true);
    try {
      const user = await register(form);
      toast(`Welcome to Cravely, ${user.name.split(' ')[0]}! 🎉`, 'success');
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : '/');
    } catch (err) {
      setFields(err.response?.data?.fields || {});
      setError(apiError(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout quote="Amala and ewedu on a Tuesday night, delivered to Yaba in 40 minutes. Correct!" by="Emeka, Yaba">
      <h1 className="text-4xl font-extrabold">Join Cravely</h1>
      <p className="mt-2 text-muted">Create an account in seconds. Your first jollof is waiting.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input label="Full name" autoComplete="name" value={form.name} onChange={set('name')} required placeholder="Adaeze Okafor" error={fields.name} />
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" error={fields.email} />
        <Input label="Phone number" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="0803 123 4567" hint="So our riders can reach you. We'll never spam you." error={fields.phone} />
        <PasswordInput autoComplete="new-password" minLength={8} value={form.password} onChange={set('password')} required hint="At least 8 characters" error={fields.password} />
        {error && !Object.keys(fields).length && <p role="alert" className="rounded-xl bg-jollof-soft px-4 py-3 text-sm font-semibold text-jollof-dark">{error}</p>}
        <Button type="submit" size="lg" loading={loading} className="w-full">Create account</Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="font-bold text-ink underline decoration-danfo decoration-4 underline-offset-4">Log in</Link>
      </p>
    </AuthLayout>
  );
}
