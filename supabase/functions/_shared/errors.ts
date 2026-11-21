export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'METHOD_NOT_ALLOWED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONFLICT'
  | 'NO_RESULTS'
  | 'INSUFFICIENT_CREDITS'
  | 'CONTENT_REFUSED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL';

/** Erreur "attendue" : son message (en français) peut être montré tel quel à l'utilisateur. */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const E = {
  unauthorized: () => new AppError('UNAUTHORIZED', 401, 'Ta session a expiré. Reconnecte-toi pour continuer.'),
  forbidden: () => new AppError('FORBIDDEN', 403, "Tu n'as pas accès à cette action."),
  validation: (msg: string) => new AppError('VALIDATION_ERROR', 400, msg),
  rateLimit: () =>
    new AppError('RATE_LIMIT_EXCEEDED', 429, 'Tu as atteint la limite de 10 générations par heure. Réessaie un peu plus tard.'),
  noResults: () =>
    new AppError('NO_RESULTS', 404, "Aucune source n'a été trouvée pour cette image. Ton crédit t'a été rendu. Essaie avec une capture plus nette, sans interface autour."),
  conflict: (msg: string) => new AppError('CONFLICT', 409, msg),
  noCredits: () =>
    new AppError('INSUFFICIENT_CREDITS', 402, "Tu n'as plus de crédits. Achète un pack pour continuer."),
  refused: () =>
    new AppError('CONTENT_REFUSED', 422, "Ce sujet ne peut pas être traité. Essaie avec un autre sujet. Ton crédit t'a été rendu."),
  upstream: () =>
    new AppError('UPSTREAM_ERROR', 502, "Le service de génération est momentanément indisponible. Ton crédit t'a été rendu, réessaie dans un instant."),
  internal: () => new AppError('INTERNAL', 500, "Une erreur est survenue de notre côté. Réessaie dans un instant."),
};

/** Traduit une erreur renvoyée par une fonction SQL (RAISE EXCEPTION 'CODE') en AppError. */
export function mapDbError(error: { message?: string } | null): AppError {
  const msg = error?.message ?? '';
  if (msg.includes('INSUFFICIENT_CREDITS')) return E.noCredits();
  if (msg.includes('RATE_LIMIT_EXCEEDED')) return E.rateLimit();
  if (msg.includes('profiles_credits_check')) return E.validation('Le solde est insuffisant pour cette opération.');
  console.error('db_error', msg); // le détail reste dans les logs serveur, jamais renvoyé au client
  return E.internal();
}

export function jsonResponse(body: unknown, status: number, cors: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(err: unknown, cors: HeadersInit): Response {
  if (err instanceof AppError) {
    return jsonResponse({ error: { code: err.code, message: err.message } }, err.status, cors);
  }
  console.error('unhandled_error', err instanceof Error ? err.message : 'unknown');
  const e = E.internal();
  return jsonResponse({ error: { code: e.code, message: e.message } }, e.status, cors);
}
