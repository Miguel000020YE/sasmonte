import { requireUser } from '../_shared/auth.ts';
import { E, mapDbError } from '../_shared/errors.ts';
import { failAndRefund } from '../_shared/generations.ts';
import { handle, parseBody } from '../_shared/http.ts';
import { callClaude, estimateClaudeCostUsd, extractJson } from '../_shared/providers/claude.ts';
import { buildReverseUserPrompt, REVERSE_SYSTEM_PROMPT } from '../_shared/providers/reversePrompt.ts';
import { lensSearch } from '../_shared/providers/serpapi.ts';
import { reverseSearchInput, scriptSchema } from '../_shared/schemas.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { recordUsage } from '../_shared/usage.ts';

const BUCKET = 'reverse-inputs';

/**
 * POST /reverse-search  { image_path, tone }
 * Le client a d'abord envoyé la capture dans reverse-inputs/{user_id}/... (policy RLS du bucket).
 * 1. auth + Zod + propriété du fichier  2. limite horaire  3. génération + crédit réservé
 * 4. SerpApi google_lens (URL signée de 5 min)  5. Claude réécrit un script original
 * 6. sauvegarde. Toute erreur après la réservation => remboursement automatique.
 * La capture est supprimée dans tous les cas (vie privée + stockage) : elle ne sert qu'à la recherche.
 * La génération reste en "processing" : generate-voice la termine, comme pour le mode Sujet.
 */
Deno.serve(
  handle(async (req) => {
    const { user } = await requireUser(req);
    const input = await parseBody(req, reverseSearchInput);
    const db = supabaseAdmin();

    // Propriété vérifiée côté serveur : le fichier doit être dans le dossier de l'utilisateur.
    if (input.image_path.split('/')[0] !== user.id) throw E.forbidden();

    try {
      const { error: rlError } = await db.rpc('check_generation_rate_limit', { _user_id: user.id });
      if (rlError) throw mapDbError(rlError);

      // URL signée courte durée : SerpApi doit pouvoir lire l'image sans que le bucket soit public.
      const { data: signed, error: signError } = await db.storage.from(BUCKET).createSignedUrl(input.image_path, 300);
      if (signError || !signed?.signedUrl) throw E.validation("L'image est introuvable. Envoie-la de nouveau.");

      const { data: gen, error: genError } = await db
        .from('generations')
        .insert({ user_id: user.id, mode: 'reverse', input: { tone: input.tone } })
        .select('id')
        .single();
      if (genError || !gen) throw mapDbError(genError);

      const { error: creditError } = await db.rpc('consume_credit', { _user_id: user.id, _generation_id: gen.id });
      if (creditError) {
        await db.from('generations').delete().eq('id', gen.id);
        throw mapDbError(creditError);
      }
      await db.from('generations').update({ status: 'processing' }).eq('id', gen.id);

      try {
        // 4. recherche d'image inversée
        const results = await lensSearch(signed.signedUrl);
        await recordUsage('serpapi', 1, Number(Deno.env.get('SERPAPI_COST_PER_SEARCH') ?? 0));
        if (results.length === 0) throw E.noResults();

        // 5. réécriture par Claude
        const ai = await callClaude({
          system: REVERSE_SYSTEM_PROMPT,
          user: buildReverseUserPrompt(results, input.tone),
        });
        await recordUsage('claude', ai.inputTokens + ai.outputTokens, estimateClaudeCostUsd(ai.inputTokens, ai.outputTokens));

        let raw: unknown;
        try {
          raw = extractJson(ai.text);
        } catch {
          throw E.upstream();
        }
        if (typeof raw === 'object' && raw !== null && 'error' in raw) throw E.refused();

        const parsed = scriptSchema.safeParse(raw);
        if (!parsed.success) {
          console.error('script_invalid', parsed.error.issues[0]?.message);
          throw E.upstream();
        }

        // 6. sauvegarde (le chemin de l'image n'est plus conservé : le fichier est supprimé juste après)
        const { error: saveError } = await db
          .from('generations')
          .update({ script: parsed.data, input: { tone: input.tone, results } })
          .eq('id', gen.id);
        if (saveError) throw saveError;

        const { data: profile } = await db.from('profiles').select('credits').eq('id', user.id).single();
        return { generation_id: gen.id, results, script: parsed.data, credits_remaining: profile?.credits ?? null };
      } catch (err) {
        const code = err instanceof Error && 'code' in err ? String((err as { code: string }).code) : 'INTERNAL';
        await failAndRefund(db, gen.id, code);
        throw err instanceof Error && 'status' in err ? err : E.upstream();
      }
    } finally {
      const { error } = await db.storage.from(BUCKET).remove([input.image_path]);
      if (error) console.error('image_cleanup_failed', error.message);
    }
  }),
);
