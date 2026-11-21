import { z } from 'npm:zod@3.23.8';
import { requireUser } from '../_shared/auth.ts';
import { E, errorResponse, jsonResponse, mapDbError } from '../_shared/errors.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { createSoftpay } from '../_shared/providers/saspay.ts';

const SASPAY_COUNTRIES: Record<string, string> = {
  CI: 'XOF', BF: 'XOF', SN: 'XOF', ML: 'XOF', TG: 'XOF', BJ: 'XOF', NE: 'XOF',
  CM: 'XAF', GA: 'XAF', CG: 'XAF', CF: 'XAF', TD: 'XAF', CD: 'XAF',
};

const input = z.object({
  pack_id: z.string().uuid('Pack invalide.'),
  phone_number: z.string().trim().min(8, 'Numéro de téléphone invalide.').max(20).optional(),
});

/**
 * POST /saspay-create-payment { pack_id, phone_number? }
 *
 * 1. Vérifie l'utilisateur et récupère le pack.
 * 2. Crée la ligne `payments` (pending).
 * 3. Appelle SasPay Softpay.
 * 4. Enregistre le provider_ref et renvoie payment_url (checkout_url ou page retour).
 */
Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return errorResponse(E.validation('Méthode non autorisée.'), cors);
  }

  try {
    const { user } = await requireUser(req);
    const db = supabaseAdmin();

    // Parse input
    let raw: unknown;
    try { raw = await req.json(); } catch { throw E.validation('La requête est invalide.'); }
    const parsed = input.safeParse(raw);
    if (!parsed.success) throw E.validation(parsed.error.issues[0]?.message ?? 'Données invalides.');
    const { pack_id, phone_number } = parsed.data;

    // Get pack
    const { data: pack } = await db.from('credit_packs').select('*').eq('id', pack_id).eq('active', true).maybeSingle();
    if (!pack) throw E.validation('Ce pack n\'est pas disponible.');

    // Get user profile for country
    const { data: profile } = await db.from('profiles').select('country_code, email, full_name').eq('id', user.id).single();
    const countryCode = profile?.country_code ?? 'CI';
    const currency = SASPAY_COUNTRIES[countryCode] ?? 'XOF';

    // Build return URL from ALLOWED_ORIGINS
    const origins = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173').split(',').map(s => s.trim());
    const siteUrl = origins.find(o => o.startsWith('https://')) ?? origins[0];

    // Create pending payment row
    const { data: payment, error: insertError } = await db.from('payments').insert({
      user_id: user.id,
      pack_id: pack.id,
      credits: pack.credits,
      provider: 'saspay',
      amount: pack.price_xof,
      currency,
      status: 'pending',
    }).select('id').single();

    if (insertError || !payment) {
      console.error('payment_insert_error', insertError);
      throw E.internal();
    }

    const returnUrl = `${siteUrl}/paiement/retour?ref=${payment.id}`;

    // Call SasPay Softpay API
    const saspayRes = await createSoftpay(
      {
        amount: `${pack.price_xof}.00`,
        currency,
        country: countryCode,
        description: `${pack.name} — ${pack.credits} crédits SaSMonte`,
        reference: payment.id,
        return_url: returnUrl,
        customer: {
          name: profile?.full_name ?? undefined,
          email: profile?.email ?? user.email ?? undefined,
          phone_number: phone_number ?? undefined,
        },
      },
      payment.id, // idempotency key = our payment UUID
    );

    // Save SasPay transaction id as provider_ref
    if (saspayRes.data?.id) {
      await db.from('payments').update({ provider_ref: saspayRes.data.id }).eq('id', payment.id);
    }

    // Decide the URL to redirect the user to
    const paymentUrl = saspayRes.data?.checkout_url || returnUrl;

    return jsonResponse({ payment_url: paymentUrl, payment_id: payment.id }, 200, cors);
  } catch (err) {
    return errorResponse(err, cors);
  }
});
