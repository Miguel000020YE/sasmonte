import { failAndRefund } from '../_shared/generations.ts';
import { safeEqual } from '../_shared/security.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const STUCK_AFTER_MIN = 15;

/**
 * Tâche planifiée (toutes les 10 min) : voir docs/DEPLOIEMENT.md, étape "Cron".
 * 1. rembourse les générations restées en pending/processing depuis plus de 15 min ;
 * 2. supprime les captures de recherche inversée abandonnées depuis plus d'1 h.
 * Authentification : en-tête x-cron-secret (secret CRON_SECRET), pas de JWT utilisateur.
 */
Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET') ?? '';
  const got = req.headers.get('x-cron-secret') ?? '';
  if (!secret || !safeEqual(got, secret)) return new Response('forbidden', { status: 403 });

  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - STUCK_AFTER_MIN * 60_000).toISOString();

  const { data: stuck, error: stuckError } = await db
    .from('generations')
    .select('id')
    .in('status', ['pending', 'processing'])
    .lt('created_at', cutoff)
    .limit(100);
  if (stuckError) console.error('cron_stuck_query', stuckError.message);
  for (const g of stuck ?? []) await failAndRefund(db, g.id, 'TIMEOUT'); // refund_generation ne rembourse que si un crédit a été consommé

  let removed = 0;
  const { data: orphans, error: orphanError } = await db.rpc('list_orphan_reverse_inputs');
  if (orphanError) console.error('cron_orphans_query', orphanError.message);
  const names = ((orphans ?? []) as { name: string }[]).map((o) => o.name);
  if (names.length) {
    const { error } = await db.storage.from('reverse-inputs').remove(names);
    if (error) console.error('cron_orphans_remove', error.message);
    else removed = names.length;
  }

  return new Response(JSON.stringify({ stuck_refunded: stuck?.length ?? 0, orphans_removed: removed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
