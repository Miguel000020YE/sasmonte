import { AppError, E } from '../errors.ts';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5';

export interface ClaudeResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export async function callClaude(opts: { system: string; user: string; maxTokens?: number }): Promise<ClaudeResult> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) {
    console.error('missing ANTHROPIC_API_KEY');
    throw new AppError('INTERNAL', 500, 'Service momentanément indisponible.');
  }

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 1200,
        system: opts.system,
        messages: [{ role: 'user', content: opts.user }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e) {
    console.error('claude_network_error', e instanceof Error ? e.name : 'unknown');
    throw E.upstream();
  }

  if (!res.ok) {
    console.error('claude_http_error', res.status); // jamais le corps complet : il peut contenir du contenu utilisateur
    throw E.upstream();
  }

  const data = await res.json();
  const text: string = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('');
  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

/** Extrait le premier objet JSON d'une réponse (tolère un éventuel texte ou des ``` autour). */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no_json');
  return JSON.parse(text.slice(start, end + 1));
}

/** Estimation de coût en USD (tarifs configurables par variables d'environnement). */
export function estimateClaudeCostUsd(inputTokens: number, outputTokens: number): number {
  const pIn = Number(Deno.env.get('CLAUDE_PRICE_IN_PER_MTOK') ?? 3);
  const pOut = Number(Deno.env.get('CLAUDE_PRICE_OUT_PER_MTOK') ?? 15);
  return (inputTokens * pIn + outputTokens * pOut) / 1_000_000;
}
