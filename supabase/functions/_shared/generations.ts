import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

/**
 * Marque une génération en échec ET rembourse le crédit (ligne `refund` dans le journal).
 * Idempotent : refund_generation ne rembourse qu'une seule fois.
 */
export async function failAndRefund(db: SupabaseClient, generationId: string, reason: string) {
  const { error: refundError } = await db.rpc('refund_generation', { _generation_id: generationId });
  if (refundError) {
    // Cas grave : à surveiller dans les logs (remboursement manuel via l'admin si besoin)
    console.error('REFUND_FAILED', generationId, refundError.message);
  }
  const { error } = await db.from('generations').update({ status: 'failed', error: reason }).eq('id', generationId);
  if (error) console.error('mark_failed_error', generationId, error.message);
}
