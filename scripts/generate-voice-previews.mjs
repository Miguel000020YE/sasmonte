// Génère un court extrait MP3 par voix dans public/voices/ (aperçus du Studio et de la landing).
// Usage (Node 22.18+) :
//   ELEVENLABS_API_KEY=xxx node scripts/generate-voice-previews.mjs
// Prérequis : avoir remplacé les TODO_VOICE_ID_* dans supabase/functions/_shared/voices.ts.
import { mkdir, writeFile } from 'node:fs/promises';
import { VOICES } from '../supabase/functions/_shared/voices.ts';

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY manquante.');
const TEXT = "Salut ! Aujourd'hui, je te montre comment créer des vidéos qui captent l'attention dès la première seconde.";

await mkdir('public/voices', { recursive: true });
for (const [voiceKey, voice] of Object.entries(VOICES)) {
  if (voice.elevenLabsId.startsWith('TODO')) {
    console.log(`- ${voiceKey} : ignorée (Voice ID à renseigner)`);
    continue;
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.elevenLabsId)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ text: TEXT, model_id: process.env.ELEVENLABS_MODEL_ID ?? 'eleven_multilingual_v2' }),
    },
  );
  if (!res.ok) {
    console.error(`- ${voiceKey} : erreur ${res.status}`);
    continue;
  }
  await writeFile(`public/voices/${voiceKey}.mp3`, Buffer.from(await res.arrayBuffer()));
  console.log(`- ${voiceKey} : OK`);
}
