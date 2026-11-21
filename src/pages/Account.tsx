import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Select } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { authMessage } from '@/lib/authErrors';
import { COUNTRIES } from '@/lib/countries';
import { creditsLabel, formatDate, formatEur, formatFcfa } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { CreditReason, CreditTransaction, Payment, PaymentStatus } from '@/types/database';

const REASONS: Record<CreditReason, string> = {
  purchase: 'Achat de crédits',
  generation: 'Génération de vidéo',
  refund: 'Remboursement',
  admin: 'Ajustement',
  signup_bonus: 'Bonus de bienvenue',
};
const PAY_STATUS: Record<PaymentStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  paid: { label: 'Payé', tone: 'success' },
  pending: { label: 'En attente', tone: 'warning' },
  failed: { label: 'Échoué', tone: 'danger' },
};

export function Account() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setCountry(profile.country_code ?? '');
  }, [profile]);

  useEffect(() => {
    supabase.from('credit_transactions').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => setTransactions((data as CreditTransaction[] | null) ?? []));
    supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(20).then(({ data }) => setPayments((data as Payment[] | null) ?? []));
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    if (!profile) return;
    if (fullName.trim().length < 2) return setProfileError('Indique ton nom.');
    if (phone && !/^[+0-9 ()-]{6,20}$/.test(phone)) return setProfileError('Ce numéro de téléphone ne semble pas valide.');
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null, country_code: country || null })
      .eq('id', profile.id);
    setSaving(false);
    if (error) return setProfileError("Impossible d'enregistrer. Réessaie dans un instant.");
    await refreshProfile();
    toast('Profil mis à jour.', 'success');
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (password.length < 8) return setPwError('Ton mot de passe doit faire au moins 8 caractères.');
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPwSaving(false);
    if (error) return setPwError(authMessage(error));
    setPassword('');
    toast('Mot de passe modifié.', 'success');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon compte</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Solde</p>
            <p className="text-3xl font-extrabold">{creditsLabel(profile?.credits ?? 0)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            {profileError && <Notice kind="error">{profileError}</Notice>}
            <div>
              <Label htmlFor="name">Nom complet</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="country">Pays</Label>
              <Select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Choisis ton pays</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </Select>
            </div>
            <Button type="submit" loading={saving}>Enregistrer</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historique des crédits</CardTitle></CardHeader>
        <CardContent>
          {transactions === null ? (
            <div className="skeleton h-24" />
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun mouvement pour le moment.</p>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{REASONS[t.reason]}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatDate(t.created_at)}{t.note ? ` · ${t.note}` : ''}</p>
                  </div>
                  <span className={t.delta > 0 ? 'font-semibold text-success' : 'font-semibold text-muted-foreground'}>{t.delta > 0 ? `+${t.delta}` : t.delta}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mes paiements</CardTitle></CardHeader>
        <CardContent>
          {payments === null ? (
            <div className="skeleton h-16" />
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement.</p>
          ) : (
            <ul className="divide-y divide-border">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{creditsLabel(p.credits)} · {p.currency === 'XOF' ? formatFcfa(p.amount) : formatEur(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.created_at)} · {p.provider === 'saspay' ? 'Mobile Money' : 'Carte'}</p>
                  </div>
                  <Badge tone={PAY_STATUS[p.status].tone}>{PAY_STATUS[p.status].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sécurité</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            {pwError && <Notice kind="error">{pwError}</Notice>}
            <div>
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" />
            </div>
            <Button type="submit" variant="outline" loading={pwSaving}>Changer le mot de passe</Button>
          </form>
        </CardContent>
      </Card>

      <Button variant="ghost" onClick={signOut} className="w-full text-destructive hover:text-destructive">Se déconnecter</Button>
    </div>
  );
}
