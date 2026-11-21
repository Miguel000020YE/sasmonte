import type { z } from 'npm:zod@3.23.8';
import { corsHeaders } from './cors.ts';
import { AppError, E, errorResponse, jsonResponse } from './errors.ts';

/** Enveloppe commune : CORS, méthode POST, gestion d'erreurs uniforme. */
export function handle(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request): Promise<Response> => {
    const cors = corsHeaders(req);
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') {
      return errorResponse(new AppError('METHOD_NOT_ALLOWED', 405, 'Méthode non autorisée.'), cors);
    }
    try {
      return jsonResponse(await fn(req), 200, cors);
    } catch (err) {
      return errorResponse(err, cors);
    }
  };
}

/** Lit et valide le corps JSON avec Zod. Le message d'erreur est celui du schéma (en français). */
export async function parseBody<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw E.validation('La requête est invalide.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw E.validation(parsed.error.issues[0]?.message ?? 'Les informations envoyées sont invalides.');
  }
  return parsed.data;
}
