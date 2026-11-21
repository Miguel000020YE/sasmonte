/**
 * SasPay provider — API REST pour Mobile Money (Afrique de l'Ouest / Centrale).
 * Doc : https://docs.saspay.me
 *
 * Flux :
 *  1. POST /payments/softpay/ → crée la transaction (statut PENDING)
 *  2. Si checkout_url non vide → rediriger l'utilisateur
 *  3. Webhook transaction.success / transaction.failed → créditer ou marquer échec
 *  4. (optionnel) GET /payments/{id}/verify/ → double-vérification
 */

const BASE_URL = 'https://api.saspay.me/api/v1';

function apiKey(): string {
  const key = Deno.env.get('SASPAY_API_KEY');
  if (!key) throw new Error('SASPAY_API_KEY is not set');
  return key;
}

export function webhookSecret(): string {
  const s = Deno.env.get('SASPAY_WEBHOOK_SECRET');
  if (!s) throw new Error('SASPAY_WEBHOOK_SECRET is not set');
  return s;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SaspayCreatePayload {
  amount: string;          // ex. "2500.00"
  currency: string;        // "XOF"
  country: string;         // "CI", "SN", etc.
  network?: string;        // "mtn_ci", "moov_ci", "orange_sn"… ou omis pour checkout générique
  description: string;
  reference: string;       // notre payment.id (UUID)
  return_url: string;
  customer: {
    name?: string;
    email?: string;
    phone_number?: string;
  };
}

export interface SaspayCreateResponse {
  success: boolean;
  data: {
    id: string;             // id SasPay de la transaction
    status: string;         // "PENDING"
    checkout_url: string;   // vide si push direct, sinon URL à ouvrir
    instructions: string;
  };
}

export interface SaspayVerifyResponse {
  success: boolean;
  data: {
    id: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    amount: string;
    currency: string;
    reference: string;
  };
}

// ─── Appels API ──────────────────────────────────────────────────────────────

/** Crée un paiement Softpay. */
export async function createSoftpay(
  payload: SaspayCreatePayload,
  idempotencyKey: string,
): Promise<SaspayCreateResponse> {
  const res = await fetch(`${BASE_URL}/payments/softpay/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('saspay_create_error', res.status, text);
    throw new Error(`SasPay create failed: ${res.status}`);
  }

  return (await res.json()) as SaspayCreateResponse;
}

/** Vérifie le statut d'un paiement. */
export async function verifyPayment(saspayId: string): Promise<SaspayVerifyResponse> {
  const res = await fetch(`${BASE_URL}/payments/${saspayId}/verify/`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey()}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('saspay_verify_error', res.status, text);
    throw new Error(`SasPay verify failed: ${res.status}`);
  }

  return (await res.json()) as SaspayVerifyResponse;
}

// ─── Vérification du webhook ─────────────────────────────────────────────────

/**
 * Vérifie la signature HMAC-SHA256 du webhook SasPay.
 * Rejette les requêtes de plus de 5 minutes (replay).
 */
export async function verifyWebhookSignature(
  rawBody: Uint8Array,
  signatureHeader: string,
  timestampHeader: string,
): Promise<boolean> {
  // Anti-replay : 300 secondes
  const ts = parseInt(timestampHeader, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const secret = webhookSecret();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign('HMAC', key, rawBody);
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Comparaison en temps constant
  if (computed.length !== signatureHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return diff === 0;
}
