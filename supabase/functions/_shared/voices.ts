/**
 * Catalogue des voix proposées dans le Studio.
 *
 * Valeurs par défaut : voix prédéfinies d'ElevenLabs (Rachel, Bella, Adam, Antoni), pour que le site fonctionne dès
 * le premier démarrage avec le modèle multilingue v2. Je n'ai pas pu les tester depuis ici : écoute-les (voir
 * scripts/generate-voice-previews.mjs) et, pour un meilleur rendu en français, remplace-les par des voix de la
 * bibliothèque ElevenLabs (Voices -> filtre "French" -> My Voices -> copie du Voice ID).
 * Une voix dont l'id commence par "TODO" est refusée côté serveur sans consommer de crédit.
 */
export const VOICE_KEYS = ['femme-chaleureuse', 'femme-dynamique', 'homme-pose', 'homme-energique'] as const;
export type VoiceKey = (typeof VOICE_KEYS)[number];

export interface VoiceDef {
  label: string;
  gender: 'femme' | 'homme';
  description: string;
  elevenLabsId: string;
}

export const VOICES: Record<VoiceKey, VoiceDef> = {
  'femme-chaleureuse': { label: 'Femme · Chaleureuse', gender: 'femme', description: 'Douce et rassurante', elevenLabsId: '21m00Tcm4TlvDq8ikWAM' },
  'femme-dynamique': { label: 'Femme · Dynamique', gender: 'femme', description: 'Énergique, idéale pour les hooks', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL' },
  'homme-pose': { label: 'Homme · Posé', gender: 'homme', description: 'Grave et narratif', elevenLabsId: 'pNInz6obpgDQGcFmaJgB' },
  'homme-energique': { label: 'Homme · Énergique', gender: 'homme', description: 'Rythmé, style motivation', elevenLabsId: 'ErXwobaYiN019PkySvjV' },
};

export const isVoiceConfigured = (v: VoiceDef) => !v.elevenLabsId.startsWith('TODO');
