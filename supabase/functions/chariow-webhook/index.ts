import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { safeEqual } from '../_shared/security.ts';
import { mapDbError } from '../_shared/errors.ts';

/**
 * POST /chariow-webhook — appelé par Chariow quand un paiement par carte est confirmé.
 *
 * TODO : Implémenter quand le compte Chariow sera créé.
 *        La structure attendue du payload et de la signature dépend de la documentation Chariow.
 *        Les briques sont prêtes : add_credits idempotent, table payments, safeEqual.
 *
 * Flux prévu :
 *  1. Vérifier le secret/signature (CHARIOW_WEBHOOK_SECRET)
 *  2. Extraire email + ref (user_id) du payload
 *  3. Trouver ou créer la ligne payments (via l'email et le ref passés dans l'URL Chariow)
 *  4. add_credits idempotent
 */
Deno.serve(async (req: Request): Promise<Response> => {
  const headers = { 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const secret = Deno.env.get('CHARIOW_WEBHOOK_SECRET');
    if (!secret) {
      console.error('chariow_webhook: CHARIOW_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Chariow payments are not yet configured.' }),
        { status: 503, headers },
      );
    }

    // Vérifier le secret (header ou query param selon la documentation Chariow)
    const authHeader = req.headers.get('X-Webhook-Secret') ?? req.headers.get('Authorization') ?? '';
    const providedSecret = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!providedSecret || !safeEqual(providedSecret, secret)) {
      console.error('chariow_webhook: invalid secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const payload = await req.json() as Record<string, unknown>;
    console.log('chariow_webhook: received payload', JSON.stringify(payload));

    // TODO : extraire les champs du payload Chariow
    // const { email, ref, amount, transaction_id, status } = extractFromPayload(payload);
    //
    // const db = supabaseAdmin();
    //
    // 1. Trouver le paiement via email + ref
    // 2. Vérifier le statut
    // 3. db.rpc('add_credits', { _user_id, _amount, _reason: 'purchase', _ref: payment.id })
    // 4. Mettre à jour le paiement (status: 'paid', paid_at, raw_payload)

    return new Response(
      JSON.stringify({ received: true, message: 'Chariow webhook received but not yet fully implemented.' }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error('chariow_webhook: error', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
  }
});
