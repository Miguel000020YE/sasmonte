import { requireUser } from '../_shared/auth.ts';
import { E, mapDbError } from '../_shared/errors.ts';
import { failAndRefund } from '../_shared/generations.ts';
import { handle, parseBody } from '../_shared/http.ts';
import { callClaude, estimateClaudeCostUsd, extractJson } from '../_shared/providers/claude.ts';
import { buildScriptUserPrompt, SCRIPT_SYSTEM_PROMPT } from '../_shared/providers/scriptPrompt.ts';
import { generateScriptInput, scriptSchema } from '../_shared/schemas.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { recordUsage } from '../_shared/usage.ts';

/**
 * POST /generate-script  { topic, tone }
 * 1. auth  2. validation Zod  3. limite horaire  4. création de la génération
 * 5. réservation atomique d'1 crédit  6. appel Claude  7. sauvegarde (ou remboursement en cas d'échec)
 *
 * La génération reste en statut "processing" : c'est generate-voice qui la passe à "done"
 * (1 crédit = 1 vidéo complète : script + voix off).
 */
Deno.serve(
  handle(async (req) => {
    const { user } = await requireUser(req);
    const input = await parseBody(req, generateScriptInput);
    const db = supabaseAdmin();

    // 3. limite : 10 générations / heure / utilisateur
    const { error: rlError } = await db.rpc('check_generation_rate_limit', { _user_id: user.id });
    if (rlError) throw mapDbError(rlError);

    // 4. création de la ligne de génération
    const { data: gen, error: genError } = await db
      .from('generations')
      .insert({ user_id: user.id, mode: 'topic', input })
      .select('id')
      .single();
    if (genError || !gen) throw mapDbError(genError);

    // 5. réservation du crédit (atomique). Si solde = 0 : on supprime la ligne et on renvoie une erreur claire.
    const { error: creditError } = await db.rpc('consume_credit', { _user_id: user.id, _generation_id: gen.id });
    if (creditError) {
      await db.from('generations').delete().eq('id', gen.id);
      throw mapDbError(creditError);
    }
    await db.from('generations').update({ status: 'processing' }).eq('id', gen.id);

    // 6. appel Claude + validation de la sortie. Toute erreur ici => remboursement automatique.
    try {
      const result = await callClaude({
        system: SCRIPT_SYSTEM_PROMPT,
        user: buildScriptUserPrompt(input.topic, input.tone),
      });
      await recordUsage(
        'claude',
        result.inputTokens + result.outputTokens,
        estimateClaudeCostUsd(result.inputTokens, result.outputTokens),
      );

      let raw: unknown;
      try {
        raw = extractJson(result.text);
      } catch {
        throw E.upstream(); // réponse non exploitable
      }
      if (typeof raw === 'object' && raw !== null && 'error' in raw) throw E.refused();

      const parsed = scriptSchema.safeParse(raw);
      if (!parsed.success) {
        console.error('script_invalid', parsed.error.issues[0]?.message);
        throw E.upstream();
      }

      // 7. sauvegarde
      const { error: saveError } = await db.from('generations').update({ script: parsed.data }).eq('id', gen.id);
      if (saveError) throw saveError;

      const { data: profile } = await db.from('profiles').select('credits').eq('id', user.id).single();
      return { generation_id: gen.id, script: parsed.data, credits_remaining: profile?.credits ?? null };
    } catch (err) {
      const code = err instanceof Error && 'code' in err ? String((err as { code: string }).code) : 'INTERNAL';
      await failAndRefund(db, gen.id, code);
      throw err instanceof Error && 'status' in err ? err : E.upstream();
    }
  }),
);
