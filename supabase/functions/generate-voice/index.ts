import { requireUser } from '../_shared/auth.ts';
import { AppError, E, mapDbError } from '../_shared/errors.ts';
import { failAndRefund } from '../_shared/generations.ts';
import { handle, parseBody } from '../_shared/http.ts';
import { narrationText } from '../_shared/narration.ts';
import { synthesizeWithTimestamps } from '../_shared/providers/elevenlabs.ts';
import { buildSrt } from '../_shared/providers/srt.ts';
import { generateVoiceInput, scriptSchema } from '../_shared/schemas.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { recordUsage } from '../_shared/usage.ts';
import { isVoiceConfigured, VOICES } from '../_shared/voices.ts';

const BUCKET = 'audios';
const SIGNED_URL_TTL = 3600; // 1 h (le front peut re-signer à la demande : policy "audios_select_own")

/**
 * POST /generate-voice  { generation_id, voice_key }
 * Prérequis : generate-script (ou reverse-search) a déjà réservé le crédit et enregistré le script.
 * Succès  : MP3 dans audios/{user_id}/{generation_id}.mp3 + SRT, statut "done".
 * Échec   : crédit remboursé (ligne "refund"), statut "failed" ; le script reste lisible dans "Mes vidéos".
 */
Deno.serve(
  handle(async (req) => {
    const { user } = await requireUser(req);
    const { generation_id, voice_key } = await parseBody(req, generateVoiceInput);
    const db = supabaseAdmin();

    // Propriété vérifiée explicitement : le client ne peut agir que sur SES générations.
    const { data: gen, error } = await db
      .from('generations')
      .select('id, status, script, audio_path, srt')
      .eq('id', generation_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw mapDbError(error);
    if (!gen) throw E.validation('Génération introuvable.');

    const credits = async () =>
      (await db.from('profiles').select('credits').eq('id', user.id).single()).data?.credits ?? null;
    const signed = async (path: string) => {
      const { data } = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
      return data?.signedUrl ?? null;
    };

    // Rejeu (double clic, retry réseau) : on renvoie le résultat existant, sans rappeler ElevenLabs.
    if (gen.status === 'done' && gen.audio_path) {
      return {
        generation_id: gen.id,
        audio_url: await signed(gen.audio_path),
        audio_path: gen.audio_path,
        srt: gen.srt,
        script: gen.script,
        credits_remaining: await credits(),
      };
    }
    if (gen.status !== 'processing' || !gen.script) {
      throw E.validation("Cette génération n'est plus disponible. Lance-en une nouvelle depuis le Studio.");
    }

    const parsedScript = scriptSchema.safeParse(gen.script);
    if (!parsedScript.success) {
      await failAndRefund(db, gen.id, 'INVALID_SCRIPT');
      throw E.internal();
    }

    const voice = VOICES[voice_key];
    if (!isVoiceConfigured(voice)) {
      console.error('voice_not_configured', voice_key); // aucune réservation de voix : le crédit reste intact
      throw new AppError('INTERNAL', 500, "Cette voix n'est pas encore disponible. Choisis-en une autre.");
    }

    // Verrou atomique : un seul appel ElevenLabs par génération (évite le double coût en cas de requêtes simultanées).
    const { data: claimed, error: claimError } = await db
      .from('generations')
      .update({ voice_id: voice.elevenLabsId })
      .eq('id', gen.id)
      .eq('user_id', user.id)
      .eq('status', 'processing')
      .is('voice_id', null)
      .select('id');
    if (claimError) throw mapDbError(claimError);
    if (!claimed?.length) throw E.conflict('La voix off est déjà en cours de génération. Patiente un instant.');

    const path = `${user.id}/${gen.id}.mp3`;
    try {
      const text = narrationText(parsedScript.data);
      const { audio, alignment } = await synthesizeWithTimestamps(voice.elevenLabsId, text);

      const costPer1k = Number(Deno.env.get('ELEVENLABS_COST_PER_1K_CHARS') ?? 0);
      await recordUsage('elevenlabs', text.length, (text.length / 1000) * costPer1k);

      const srt = buildSrt(alignment);

      const { error: uploadError } = await db.storage
        .from(BUCKET)
        .upload(path, audio, { contentType: 'audio/mpeg', upsert: true });
      if (uploadError) {
        console.error('upload_failed', uploadError.message);
        throw E.upstream();
      }

      const { error: saveError } = await db
        .from('generations')
        .update({ audio_path: path, srt, status: 'done', error: null })
        .eq('id', gen.id);
      if (saveError) {
        console.error('save_failed', saveError.message);
        await db.storage.from(BUCKET).remove([path]); // pas de MP3 orphelin
        throw E.internal();
      }

      return {
        generation_id: gen.id,
        audio_url: await signed(path),
        audio_path: path,
        srt,
        script: parsedScript.data,
        credits_remaining: await credits(),
      };
    } catch (err) {
      const code = err instanceof AppError ? err.code : 'INTERNAL';
      await failAndRefund(db, gen.id, code);
      throw err instanceof AppError ? err : E.upstream();
    }
  }),
);
