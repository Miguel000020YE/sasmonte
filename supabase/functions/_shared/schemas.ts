import { z } from 'npm:zod@3.23.8';
import { VOICE_KEYS } from './voices.ts';

export const TONES = ['percutant', 'humoristique', 'inspirant', 'dramatique', 'educatif', 'mysterieux'] as const;

export const generateScriptInput = z.object({
  topic: z
    .string({ required_error: 'Indique un sujet.', invalid_type_error: 'Le sujet est invalide.' })
    .trim()
    .min(3, 'Le sujet est trop court (3 caractères minimum).')
    .max(500, 'Le sujet est trop long (500 caractères maximum).'),
  tone: z.enum(TONES, { errorMap: () => ({ message: 'Le ton choisi est invalide.' }) }).default('percutant'),
});
export type GenerateScriptInput = z.infer<typeof generateScriptInput>;

/** Sortie attendue de Claude. Les hashtags sont normalisés (#mot, sans espace). */
export const scriptSchema = z
  .object({
    titre: z.string().trim().min(1).max(100),
    hook: z.string().trim().min(1).max(200),
    script: z.string().trim().min(20).max(1800),
    cta: z.string().trim().min(1).max(250),
    hashtags: z
      .array(z.string().trim().min(1).max(40))
      .min(3)
      .max(10)
      .transform((tags) => tags.map((t) => '#' + t.replace(/^#+/, '').replace(/\s+/g, ''))),
  })
  .refine(
    (s) => {
      const words = `${s.hook} ${s.script} ${s.cta}`.split(/\s+/).filter(Boolean).length;
      return words >= 50 && words <= 220; // ≈ 20 à 85 s de voix off : garde-fou large autour de la cible 30-60 s
    },
    { message: 'Durée du script hors limites' },
  );
export type Script = z.infer<typeof scriptSchema>;

export const generateVoiceInput = z.object({
  generation_id: z.string({ required_error: 'Génération manquante.' }).uuid('Identifiant de génération invalide.'),
  // Le client envoie une clé de voix du catalogue, jamais un voice_id ElevenLabs arbitraire (anti-abus).
  voice_key: z.enum(VOICE_KEYS, { errorMap: () => ({ message: 'La voix choisie est invalide.' }) }),
});
export type GenerateVoiceInput = z.infer<typeof generateVoiceInput>;

export const reverseSearchInput = z.object({
  // Chemin dans le bucket reverse-inputs : {user_id}/{nom}.{jpg|png|webp}. Le préfixe est re-vérifié côté serveur.
  image_path: z
    .string({ required_error: 'Image manquante.' })
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]{1,100}\.(jpe?g|png|webp)$/i,
      "Le chemin de l'image est invalide.",
    ),
  tone: z.enum(TONES, { errorMap: () => ({ message: 'Le ton choisi est invalide.' }) }).default('percutant'),
});
export type ReverseSearchInput = z.infer<typeof reverseSearchInput>;

export const adjustCreditsInput = z.object({
  user_id: z.string({ required_error: 'Utilisateur manquant.' }).uuid('Utilisateur invalide.'),
  amount: z
    .number({ required_error: 'Indique un montant.', invalid_type_error: 'Le montant doit être un nombre.' })
    .int('Le montant doit être un nombre entier.')
    .refine((n) => n !== 0, 'Le montant ne peut pas être 0.')
    .refine((n) => Math.abs(n) <= 1000, 'Maximum 1 000 crédits par ajustement.'),
  reason: z
    .string({ required_error: 'Indique un motif.' })
    .trim()
    .min(3, 'Indique un motif (3 caractères minimum).')
    .max(200, 'Motif trop long (200 caractères maximum).'),
});

export const validatePaymentInput = z.object({
  payment_id: z.string({ required_error: 'Paiement manquant.' }).uuid('Paiement invalide.'),
  provider_ref: z.string().trim().min(1).max(100).optional(),
});
