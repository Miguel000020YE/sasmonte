import { requireAdmin } from '../_shared/auth.ts';
import { mapDbError } from '../_shared/errors.ts';
import { handle } from '../_shared/http.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

/** POST /admin-stats : chiffre d'affaires par moyen de paiement, utilisateurs, vidéos par jour. Admin uniquement (vérifié ici). */
Deno.serve(
  handle(async (req) => {
    await requireAdmin(req);
    const { data, error } = await supabaseAdmin().rpc('admin_stats');
    if (error) throw mapDbError(error);
    return data;
  }),
);
