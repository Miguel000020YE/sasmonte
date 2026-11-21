/** Catalogue affiché dans le Studio. Les clés DOIVENT rester identiques à supabase/functions/_shared/voices.ts. */
export const VOICE_CATALOG = [
  { key: 'femme-chaleureuse', label: 'Femme · Chaleureuse', gender: 'femme', description: 'Douce et rassurante' },
  { key: 'femme-dynamique', label: 'Femme · Dynamique', gender: 'femme', description: 'Énergique, idéale pour les hooks' },
  { key: 'homme-pose', label: 'Homme · Posé', gender: 'homme', description: 'Grave et narratif' },
  { key: 'homme-energique', label: 'Homme · Énergique', gender: 'homme', description: 'Rythmé, style motivation' },
] as const;

export type VoiceKey = (typeof VOICE_CATALOG)[number]['key'];

/** Aperçus : fichiers /public/voices/{key}.mp3 (voir scripts/generate-voice-previews.mjs). */
export const previewUrl = (key: string) => `/voices/${key}.mp3`;
