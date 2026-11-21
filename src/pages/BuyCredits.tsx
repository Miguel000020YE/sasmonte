import { useEffect, useState } from 'react';
import { PackCard } from '@/components/billing/PackCard';
import { PaymentMethodPicker } from '@/components/billing/PaymentMethodPicker';
import { Button } from '@/components/ui/button';
import { Label, Select } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { usePacks } from '@/hooks/usePacks';
import { errorMessage } from '@/lib/api';
import { COUNTRIES, guessCountryFromTimezone, providerOrder, type Provider } from '@/lib/countries';
import { creditsLabel } from '@/lib/format';
import { PAYMENTS_ENABLED, startCheckout } from '@/lib/payments';

export function BuyCredits() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { packs, loading } = usePacks();

  // Pays : profil d'abord, sinon fuseau horaire. Modifiable à la main.
  const [country, setCountry] = useState(profile?.country_code ?? guessCountryFromTimezone() ?? '');
  const [provider, setProvider] = useState<Provider>(providerOrder(country)[0]);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.country_code) setCountry(profile.country_code);
  }, [profile?.country_code]);
  useEffect(() => {
    setProvider(providerOrder(country)[0]);
  }, [country]);

  async function buy(packId: string) {
    const pack = packs.find((p) => p.id === packId);
    if (!pack || !user) return;
    setBuyingId(pack.id);
    try {
      await startCheckout(pack, provider, { id: user.id, email: user.email });
    } catch (e) {
      toast(errorMessage(e), 'error');
      setBuyingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Acheter des crédits</h1>
        <p className="text-sm text-muted-foreground">
          1 crédit = 1 vidéo. Il te reste <strong className="text-foreground">{creditsLabel(profile?.credits ?? 0)}</strong>.
        </p>
      </div>

      {!PAYMENTS_ENABLED && (
        <Notice kind="info">Les paiements ouvrent très bientôt. Tes 2 crédits offerts restent utilisables dès maintenant dans le Studio.</Notice>
      )}

      <div className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div>
          <Label htmlFor="country">Ton pays</Label>
          <Select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Choisis ton pays</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <Label>Moyen de paiement</Label>
          <PaymentMethodPicker country={country} value={provider} onChange={setProvider} />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-52" />)}</div>
      ) : packs.length === 0 ? (
        <Notice kind="info">Aucun pack n'est disponible pour le moment.</Notice>
      ) : (
        <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          {packs.map((p, i) => (
            <PackCard key={p.id} pack={p} highlighted={i === 1} showEur={provider === 'chariow'}>
              <Button className="w-full" variant={i === 1 ? 'primary' : 'outline'} disabled={!PAYMENTS_ENABLED} loading={buyingId === p.id} onClick={() => buy(p.id)}>
                {PAYMENTS_ENABLED ? 'Acheter' : 'Bientôt disponible'}
              </Button>
            </PackCard>
          ))}
        </div>
      )}
    </div>
  );
}
