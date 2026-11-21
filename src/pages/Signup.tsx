import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { GoogleButton } from '@/components/layout/GoogleButton';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { authMessage } from '@/lib/authErrors';
import { COUNTRIES, guessCountryFromTimezone } from '@/lib/countries';
import { supabase } from '@/lib/supabase';

export function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState(guessCountryFromTimezone() ?? '');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) return setError('Indique ton nom.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Cet email ne semble pas valide.');
    if (password.length < 8) return setError('Ton mot de passe doit faire au moins 8 caractères.');
    if (!country) return setError('Choisis ton pays.');
    if (phone && !/^[+0-9 ()-]{6,20}$/.test(phone)) return setError('Ce numéro de téléphone ne semble pas valide.');

    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim(), country_code: country },
        emailRedirectTo: `${window.location.origin}/studio`,
      },
    });
    setLoading(false);
    if (err) return setError(authMessage(err));
    // Supabase masque les comptes existants : l'utilisateur renvoyé n'a alors aucune identité
    if (data.user && data.user.identities?.length === 0) return setError('Un compte existe déjà avec cet email.');
    if (data.session) navigate('/studio', { replace: true });
    else setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout title="Vérifie ta boîte mail">
        <Notice kind="success">
          Nous avons envoyé un lien de confirmation à <strong>{email}</strong>. Clique dessus pour activer ton compte et recevoir tes 2 crédits offerts.
        </Notice>
        <p className="text-sm text-muted-foreground">Pense à regarder dans les courriers indésirables.</p>
        <Link to="/connexion" className="text-sm font-medium text-primary">
          Retour à la connexion
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Créer un compte" subtitle="2 crédits offerts pour tester, sans carte bancaire.">
      {error && <Notice kind="error">{error}</Notice>}
      <GoogleButton label="S'inscrire avec Google" onError={setError} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nom complet</Label>
          <Input id="name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" />
        </div>
        <div>
          <Label htmlFor="country">Pays</Label>
          <Select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Choisis ton pays</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">Il sert à te proposer le bon moyen de paiement.</p>
        </div>
        <div>
          <Label htmlFor="phone">Téléphone (facultatif)</Label>
          <Input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 07 00 00 00 00" />
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Créer mon compte
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ?{' '}
        <Link to="/connexion" className="font-medium text-primary">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
}
