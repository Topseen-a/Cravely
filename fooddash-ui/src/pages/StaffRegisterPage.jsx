import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/hooks';
import { apiError } from '../lib/format';
import AuthLayout from '../components/AuthLayout';
import { Button, Input, PasswordInput } from '../components/ui';

export default function StaffRegisterPage() {
  const { registerStaff } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', staff_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerStaff(form);
      navigate('/staff');
    } catch (err) {
      setError(apiError(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout quote="Every plate that leaves this kitchen carries our name. Make am sweet." by="Head Chef">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-jollof">Kitchen team</p>
      <h1 className="mt-1 text-4xl font-extrabold">Staff sign-up</h1>
      <p className="mt-2 text-muted">You need the staff code from your manager.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input label="Full name" value={form.name} onChange={set('name')} required />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
        <Input label="Phone number" type="tel" value={form.phone} onChange={set('phone')} placeholder="0803 123 4567" />
        <PasswordInput autoComplete="new-password" minLength={8} value={form.password} onChange={set('password')} required hint="At least 8 characters" />
        <PasswordInput label="Staff code" autoComplete="off" value={form.staff_code} onChange={set('staff_code')} required />
        {error && <p role="alert" className="rounded-xl bg-jollof-soft px-4 py-3 text-sm font-semibold text-jollof-dark">{error}</p>}
        <Button type="submit" size="lg" variant="dark" loading={loading} className="w-full">Create staff account</Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Already on the team? <Link to="/login" className="font-bold text-ink underline">Log in</Link>
      </p>
    </AuthLayout>
  );
}
