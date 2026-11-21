import { requireAdmin } from '../_shared/auth.ts';
import { mapDbError } from '../_shared/errors.ts';
import { handle } from '../_shared/http.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

interface ElevenQuota { ok: boolean; used?: number; limit?: number; tier?: string; resets_at?: string | null }
interface SerpQuota { ok: boolean; plan?: string; used?: number; limit?: number; left?: number }

/** Crédits restants ElevenLabs (la clé API doit avoir la permission "user_read"). */
async function elevenlabs(): Promise<ElevenQuota> {
  const key = Deno.env.get('ELEVENLABS_API_KEY');
  if (!key) return { ok: false };
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': key },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      console.error('quota_elevenlabs_http', r.status);
      return { ok: false };
    }
    const d = await r.json();
    return {
      ok: true,
      used: d.character_count,
      limit: d.character_limit,
      tier: d.tier,
      resets_at: d.next_character_count_reset_unix ? new Date(d.next_character_count_reset_unix * 1000).toISOString() : null,
    };
  } catch (e) {
    console.error('quota_elevenlabs_error', e instanceof Error ? e.name : 'unknown');
    return { ok: false };
  }
}

/** Recherches SerpApi restantes (endpoint /account ; la clé passe dans l'URL : on ne loggue jamais l'URL). */
async function serpapi(): Promise<SerpQuota> {
  const key = Deno.env.get('SERPAPI_KEY');
  if (!key) return { ok: false };
  try {
    const r = await fetch(`https://serpapi.com/account?api_key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      console.error('quota_serpapi_http', r.status);
      return { ok: false };
    }
    const d = await r.json();
    return {
      ok: true,
      plan: d.plan_name,
      used: d.this_month_usage,
      limit: d.searches_per_month,
      left: d.total_searches_left ?? d.plan_searches_left,
    };
  } catch (e) {
    console.error('quota_serpapi_error', e instanceof Error ? e.name : 'unknown');
    return { ok: false };
  }
}

/** POST /admin-quotas : quotas ElevenLabs et SerpApi + consommation du mois (dont estimation Claude) depuis api_usage. */
Deno.serve(
  handle(async (req) => {
    await requireAdmin(req);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const [eleven, serp, usage] = await Promise.all([
      elevenlabs(),
      serpapi(),
      supabaseAdmin().from('api_usage').select('service, units, cost_estimate').gte('date', monthStart),
    ]);
    if (usage.error) throw mapDbError(usage.error);

    const totals = new Map<string, { service: string; units: number; cost_estimate: number }>();
    for (const row of usage.data ?? []) {
      const t = totals.get(row.service) ?? { service: row.service, units: 0, cost_estimate: 0 };
      t.units += Number(row.units);
      t.cost_estimate += Number(row.cost_estimate);
      totals.set(row.service, t);
    }
    return { elevenlabs: eleven, serpapi: serp, usage_month: [...totals.values()] };
  }),
);
