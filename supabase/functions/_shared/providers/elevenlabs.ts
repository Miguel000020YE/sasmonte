import { E } from '../errors.ts';
import type { Alignment } from './srt.ts';

const BASE_URL = 'https://api.elevenlabs.io/v1';
const MODEL_ID = Deno.env.get('ELEVENLABS_MODEL_ID') ?? 'eleven_multilingual_v2';

export interface TtsResult {
  audio: Uint8Array; // MP3
  alignment: Alignment;
}

/** Synthèse vocale avec timestamps (pour le SRT). Sortie MP3 44,1 kHz / 128 kbps. */
export async function synthesizeWithTimestamps(voiceId: string, text: string): Promise<TtsResult> {
  const key = Deno.env.get('ELEVENLABS_API_KEY');
  if (!key) {
    console.error('missing ELEVENLABS_API_KEY');
    throw E.internal();
  }

  let res: Response;
  try {
    res = await fetch(
      `${BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
        }),
        signal: AbortSignal.timeout(90_000),
      },
    );
  } catch (e) {
    console.error('elevenlabs_network_error', e instanceof Error ? e.name : 'unknown');
    throw E.upstream();
  }

  if (!res.ok) {
    let detail = '';
    try {
      detail = String((await res.json())?.detail?.status ?? ''); // ex. quota_exceeded : on ne loggue pas le corps complet
    } catch { /* corps non JSON */ }
    console.error('elevenlabs_http_error', res.status, detail);
    throw E.upstream();
  }

  const data = await res.json();
  const alignment: Alignment | undefined = data.alignment ?? data.normalized_alignment;
  const valid =
    typeof data.audio_base64 === 'string' &&
    alignment &&
    Array.isArray(alignment.characters) &&
    alignment.characters.length === alignment.character_start_times_seconds?.length &&
    alignment.characters.length === alignment.character_end_times_seconds?.length;
  if (!valid) {
    console.error('elevenlabs_bad_payload');
    throw E.upstream();
  }

  const audio = Uint8Array.from(atob(data.audio_base64), (c) => c.charCodeAt(0));
  return { audio, alignment: alignment! };
}
