import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { authMessage } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Cet email ne semble pas valide.');
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    setLoading(false);
    if (err) return setError(authMessage(err));
    setSent(true); // message identique que le compte existe ou non (pas de fuite d'information)
  }

  return (
    <AuthLayout title="Mot de passe oublié" subtitle="Nous t'envoyons un lien pour en choisir un nouveau.">
      {sent ? (
        <Notice kind="success">Si un compte existe avec cet email, tu vas recevoir un lien dans quelques instants.</Notice>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Notice kind="error">{error}</Notice>}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Envoyer le lien
          </Button>
        </form>
      )}
      <Link to="/connexion" className="text-sm font-medium text-primary">
        Retour à la connexion
      </Link>
    </AuthLayout>
  );
}
