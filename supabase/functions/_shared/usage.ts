import { supabaseAdmin } from './supabaseAdmin.ts';

/** Enregistre la consommation d'une API tierce. N'échoue jamais : un souci de suivi ne doit pas casser une génération. */
export async function recordUsage(service: 'claude' | 'elevenlabs' | 'serpapi', units: number, costUsd = 0) {
  const { error } = await supabaseAdmin().rpc('record_api_usage', {
    _service: service,
    _units: units,
    _cost: costUsd,
  });
  if (error) console.error('record_usage_failed', service, error.message);
}
