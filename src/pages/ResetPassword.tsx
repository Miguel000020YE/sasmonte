import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/AuthContext';
import { authMessage } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';

/** Atteinte depuis le lien reçu par email : Supabase ouvre une session de récupération automatiquement. */
export function ResetPassword() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Ton mot de passe doit faire au moins 8 caractères.');
    if (password !== confirm) return setError('Les deux mots de passe ne correspondent pas.');
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) return setError(authMessage(err));
    navigate('/studio', { replace: true });
  }

  if (loading) {
    return (
      <AuthLayout title="Nouveau mot de passe">
        <div className="flex justify-center py-6">
          <Spinner className="h-6 w-6 text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (!session) {
    return (
      <AuthLayout title="Lien expiré">
        <Notice kind="error">Ce lien n'est plus valide. Demande un nouveau lien de réinitialisation.</Notice>
        <Link to="/mot-de-passe-oublie" className="text-sm font-medium text-primary">
          Recevoir un nouveau lien
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nouveau mot de passe">
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice kind="error">{error}</Notice>}
        <div>
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" />
        </div>
        <div>
          <Label htmlFor="confirm">Confirme le mot de passe</Label>
          <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" loading={saving}>
          Enregistrer
        </Button>
      </form>
    </AuthLayout>
  );
}
