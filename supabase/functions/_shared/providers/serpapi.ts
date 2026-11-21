import { z } from 'npm:zod@3.23.8';
import { E } from '../errors.ts';

export interface LensResult {
  title: string;
  link: string;
  source: string | null;
  thumbnail: string | null;
}

const matchSchema = z.object({
  title: z.string().optional(),
  link: z.string().url(),
  source: z.string().optional(),
  thumbnail: z.string().url().optional(),
});

const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * Recherche d'image inversée (Google Lens via SerpApi). `imageUrl` doit être joignable depuis Internet
 * (URL signée temporaire du bucket privé). Retourne au plus 5 résultats (liens http/https uniquement).
 * La clé API passe dans l'URL : on ne loggue JAMAIS cette URL.
 */
export async function lensSearch(imageUrl: string): Promise<LensResult[]> {
  const key = Deno.env.get('SERPAPI_KEY');
  if (!key) {
    console.error('missing SERPAPI_KEY');
    throw E.internal();
  }

  const params = new URLSearchParams({ engine: 'google_lens', url: imageUrl, hl: 'fr', api_key: key });
  let res: Response;
  try {
    res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(40_000) });
  } catch (e) {
    console.error('serpapi_network_error', e instanceof Error ? e.name : 'unknown');
    throw E.upstream();
  }

  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch { /* corps non JSON */ }

  if (!res.ok || typeof data.error === 'string') {
    const msg = typeof data.error === 'string' ? data.error : '';
    if (/hasn't returned any results|no results/i.test(msg)) return [];
    console.error('serpapi_error', res.status, msg.slice(0, 120));
    throw E.upstream();
  }

  const raw = Array.isArray(data.visual_matches) ? data.visual_matches : [];
  const results: LensResult[] = [];
  for (const item of raw) {
    const p = matchSchema.safeParse(item);
    if (!p.success || !/^https?:\/\//i.test(p.data.link)) continue;
    results.push({
      title: clean(p.data.title ?? p.data.source ?? new URL(p.data.link).hostname, 200),
      link: p.data.link,
      source: p.data.source ? clean(p.data.source, 80) : null,
      thumbnail: p.data.thumbnail && /^https?:\/\//i.test(p.data.thumbnail) ? p.data.thumbnail : null,
    });
    if (results.length === 5) break;
  }
  return results;
}
