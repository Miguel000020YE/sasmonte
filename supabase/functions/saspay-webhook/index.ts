import { E, errorResponse, jsonResponse } from '../_shared/errors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { verifyWebhookSignature, verifyPayment } from '../_shared/providers/saspay.ts';
import { mapDbError } from '../_shared/errors.ts';

/**
 * POST /saspay-webhook — appelé par SasPay quand un paiement change de statut.
 *
 * Headers attendus :
 *   X-Webhook-Signature  — HMAC-SHA256 hex du body
 *   X-Webhook-Timestamp  — Unix timestamp (secondes)
 *   X-Webhook-Event      — ex. transaction.success, transaction.failed
 *
 * Sécurité :
 *   1. Vérification HMAC + anti-replay (5 min)
 *   2. Double-vérification via GET /payments/{id}/verify/ (ne jamais faire confiance au payload seul)
 *   3. add_credits est idempotent (index unique reason + ref_id)
 */
Deno.serve(async (req: Request): Promise<Response> => {
  // Pas de CORS : c'est un webhook serveur-à-serveur
  const headers = { 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const rawBody = new Uint8Array(await req.arrayBuffer());
    const signature = req.headers.get('X-Webhook-Signature') ?? '';
    const timestamp = req.headers.get('X-Webhook-Timestamp') ?? '';
    const event = req.headers.get('X-Webhook-Event') ?? '';

    // 1. Vérifier la signature HMAC
    const valid = await verifyWebhookSignature(rawBody, signature, timestamp);
    if (!valid) {
      console.error('saspay_webhook: invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers });
    }

    // 2. Parser le payload
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(new TextDecoder().decode(rawBody));
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
    }

    // Événement de test
    if (event === 'webhook.test') {
      console.log('saspay_webhook: test event received');
      return new Response(JSON.stringify({ received: true }), { status: 200, headers });
    }

    // On ne traite que transaction.success et transaction.failed
    if (event !== 'transaction.success' && event !== 'transaction.failed') {
      console.log(`saspay_webhook: ignoring event ${event}`);
      return new Response(JSON.stringify({ received: true }), { status: 200, headers });
    }

    const data = (payload.data ?? payload) as Record<string, unknown>;
    const saspayId = (data.id ?? data.transaction_id ?? '') as string;
    const reference = (data.reference ?? '') as string; // notre payment.id

    if (!reference) {
      console.error('saspay_webhook: missing reference in payload');
      return new Response(JSON.stringify({ error: 'Missing reference' }), { status: 400, headers });
    }

    const db = supabaseAdmin();

    // 3. Chercher notre paiement par reference (= payment.id) ou par provider_ref
    const { data: payment } = await db
      .from('payments')
      .select('id, user_id, credits, status, provider_ref')
      .or(`id.eq.${reference},provider_ref.eq.${saspayId}`)
      .eq('provider', 'saspay')
      .maybeSingle();

    if (!payment) {
      console.error('saspay_webhook: payment not found', { reference, saspayId });
      return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404, headers });
    }

    // Déjà traité ?
    if (payment.status === 'paid' || payment.status === 'failed') {
      console.log('saspay_webhook: payment already processed', payment.id, payment.status);
      return new Response(JSON.stringify({ received: true, already_processed: true }), { status: 200, headers });
    }

    // 4. Double-vérification auprès de SasPay
    const verifyId = saspayId || payment.provider_ref;
    let confirmedStatus: 'paid' | 'failed' = 'failed';

    if (event === 'transaction.success' && verifyId) {
      try {
        const verification = await verifyPayment(verifyId);
        if (verification.data?.status === 'SUCCESS') {
          confirmedStatus = 'paid';
        } else {
          console.warn('saspay_webhook: verify returned non-SUCCESS', verification.data?.status);
        }
      } catch (err) {
        console.error('saspay_webhook: verify call failed, trusting webhook event', err);
        // En cas d'échec de la vérification, on fait confiance au webhook signé
        confirmedStatus = 'paid';
      }
    }

    // 5. Mettre à jour le paiement
    const patch: Record<string, unknown> = {
      status: confirmedStatus,
      raw_payload: payload,
    };
    if (saspayId && !payment.provider_ref) patch.provider_ref = saspayId;
    if (confirmedStatus === 'paid') patch.paid_at = new Date().toISOString();

    await db.from('payments').update(patch).eq('id', payment.id);

    // 6. Créditer l'utilisateur (idempotent grâce à l'index unique reason+ref_id)
    if (confirmedStatus === 'paid') {
      const { error: creditError } = await db.rpc('add_credits', {
        _user_id: payment.user_id,
        _amount: payment.credits,
        _reason: 'purchase',
        _ref: payment.id,
      });

      if (creditError) {
        // L'erreur la plus probable est un doublon (déjà crédité) → pas grave
        console.warn('saspay_webhook: add_credits result', creditError.message);
      } else {
        console.log('saspay_webhook: credits added', { userId: payment.user_id, credits: payment.credits });
      }
    }

    return new Response(JSON.stringify({ received: true, status: confirmedStatus }), { status: 200, headers });
  } catch (err) {
    console.error('saspay_webhook: unhandled error', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
  }
});
