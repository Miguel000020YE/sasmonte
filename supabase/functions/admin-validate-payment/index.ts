import { requireAdmin } from '../_shared/auth.ts';
import { E, mapDbError } from '../_shared/errors.ts';
import { handle, parseBody } from '../_shared/http.ts';
import { validatePaymentInput } from '../_shared/schemas.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

/**
 * POST /admin-validate-payment { payment_id, provider_ref? } : validation manuelle d'un paiement.
 * Idempotent : add_credits (reason "purchase", ref = id du paiement) ne crédite qu'une seule fois, même si un webhook a déjà crédité.
 */
Deno.serve(
  handle(async (req) => {
    const { user: admin } = await requireAdmin(req);
    const input = await parseBody(req, validatePaymentInput);
    const db = supabaseAdmin();

    const { data: p } = await db.from('payments').select('id, user_id, credits').eq('id', input.payment_id).maybeSingle();
    if (!p) throw E.validation('Paiement introuvable.');

    const { error: creditError } = await db.rpc('add_credits', {
      _user_id: p.user_id,
      _amount: p.credits,
      _reason: 'purchase',
      _ref: p.id,
      _note: 'Validation manuelle par un administrateur',
      _created_by: admin.id,
    });
    if (creditError) throw mapDbError(creditError);

    const patch: Record<string, unknown> = { status: 'paid', paid_at: new Date().toISOString() };
    if (input.provider_ref) patch.provider_ref = input.provider_ref;
    const { error: updateError } = await db.from('payments').update(patch).eq('id', p.id);
    if (updateError) {
      if (updateError.code === '23505') throw E.conflict('Cette référence fournisseur est déjà utilisée par un autre paiement.');
      throw mapDbError(updateError);
    }
    return { payment_id: p.id, status: 'paid' };
  }),
);
