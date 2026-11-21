import type { CreditPack, PaymentProvider } from '@/types/database';
import { callFn } from './api';

/** Interrupteur : passer à "true" quand les paiements sont configurés côté serveur. */
export const PAYMENTS_ENABLED = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';

/**
 * Lance un achat de pack.
 * - SasPay (Mobile Money) : crée le paiement côté serveur et redirige vers checkout_url ou page retour.
 * - Chariow (Carte) : redirige vers le lien de paiement Chariow du pack.
 */
export async function startCheckout(
  pack: CreditPack,
  provider: PaymentProvider,
  user: { id: string; email?: string | null },
): Promise<void> {
  if (!PAYMENTS_ENABLED) throw new Error("Les paiements ne sont pas encore activés.");

  if (provider === 'saspay') {
    const r = await callFn<{ payment_url: string }>('saspay-create-payment', { pack_id: pack.id });
    window.location.assign(r.payment_url);
    return;
  }

  if (!pack.chariow_url) throw new Error("Ce pack n'est pas encore disponible par carte.");
  const url = new URL(pack.chariow_url);
  if (url.protocol !== 'https:') throw new Error("Lien de paiement invalide.");
  if (user.email) url.searchParams.set('email', user.email);
  url.searchParams.set('ref', user.id);
  window.location.assign(url.toString());
}
