import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { GoogleButton } from '@/components/layout/GoogleButton';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { authMessage } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/studio';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError('Renseigne ton email et ton mot de passe.');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) return setError(authMessage(err));
    navigate(from, { replace: true });
  }

  return (
    <AuthLayout title="Connexion" subtitle="Content de te revoir !">
      {error && <Notice kind="error">{error}</Notice>}
      <GoogleButton label="Continuer avec Google" onError={setError} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" />
        </div>
        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Se connecter
        </Button>
      </form>
      <div className="flex justify-between text-sm">
        <Link to="/mot-de-passe-oublie" className="text-muted-foreground hover:text-foreground">
          Mot de passe oublié ?
        </Link>
        <Link to="/inscription" className="font-medium text-primary">
          Créer un compte
        </Link>
      </div>
    </AuthLayout>
  );
}
