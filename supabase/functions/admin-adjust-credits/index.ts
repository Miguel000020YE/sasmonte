import { requireAdmin } from '../_shared/auth.ts';
import { E, mapDbError } from '../_shared/errors.ts';
import { handle, parseBody } from '../_shared/http.ts';
import { adjustCreditsInput } from '../_shared/schemas.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

/** POST /admin-adjust-credits { user_id, amount (+/-), reason } : ajoute ou retire des crédits, avec motif et auteur dans le journal. */
Deno.serve(
  handle(async (req) => {
    const { user: admin } = await requireAdmin(req);
    const input = await parseBody(req, adjustCreditsInput);
    const db = supabaseAdmin();

    const { data: target } = await db.from('profiles').select('id, credits').eq('id', input.user_id).maybeSingle();
    if (!target) throw E.validation('Utilisateur introuvable.');
    if (input.amount < 0 && target.credits < -input.amount) {
      throw E.validation('Le solde de cet utilisateur est insuffisant pour retirer autant de crédits.');
    }

    const { error } = await db.rpc('add_credits', {
      _user_id: input.user_id,
      _amount: input.amount,
      _reason: 'admin',
      _ref: null,
      _note: input.reason,
      _created_by: admin.id,
    });
    if (error) throw mapDbError(error);

    const { data: after } = await db.from('profiles').select('credits').eq('id', input.user_id).single();
    return { user_id: input.user_id, credits: after?.credits ?? null };
  }),
);
