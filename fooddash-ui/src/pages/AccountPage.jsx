import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/hooks';
import { useToast } from '../context/hooks';
import { updateMe, changePassword } from '../api/endpoints';
import { apiError, prettyPhone } from '../lib/format';
import { Button, Card, Input, PasswordInput, PageTitle } from '../components/ui';

export default function AccountPage() {
  const { user, updateUser, saveSession, logout, isStaff } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: user.name, phone: prettyPhone(user.phone) });
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [saving, setSaving] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving('profile');
    try {
      const { data } = await updateMe(profile);
      updateUser(data.data);
      setProfile({ name: data.data.name, phone: prettyPhone(data.data.phone) });
      toast('Profile updated', 'success');
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setSaving('');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setSaving('password');
    try {
      // Other devices are signed out; this one gets a fresh session.
      const { data } = await changePassword(pw);
      saveSession(data);
      setPw({ current_password: '', new_password: '' });
      toast('Password changed. Other devices have been signed out.', 'success');
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle eyebrow={isStaff ? 'Kitchen team' : 'Your account'} title={`Hello, ${user.name.split(' ')[0]}`}>
        {user.email}
      </PageTitle>

      <Card className="p-6">
        <h2 className="text-2xl font-bold">Profile</h2>
        <form onSubmit={saveProfile} className="mt-5 space-y-4">
          <Input label="Full name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} required />
          <Input label="Phone number" type="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="0803 123 4567" hint="Used by riders to reach you on delivery" />
          <Button type="submit" loading={saving === 'profile'}>Save changes</Button>
        </form>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="text-2xl font-bold">Password</h2>
        <form onSubmit={savePassword} className="mt-5 space-y-4">
          <PasswordInput label="Current password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))} required />
          <PasswordInput label="New password" autoComplete="new-password" minLength={8} value={pw.new_password} onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))} required hint="At least 8 characters" />
          <Button type="submit" variant="dark" loading={saving === 'password'}>Change password</Button>
        </form>
      </Card>

      <Button variant="danger" className="mt-6 w-full md:hidden" onClick={() => { logout(); navigate('/'); }}>Log out</Button>
    </div>
  );
}
