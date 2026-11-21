import type { User } from 'npm:@supabase/supabase-js@2.45.4';
import { E } from './errors.ts';
import { supabaseAdmin } from './supabaseAdmin.ts';

export interface AuthContext {
  user: User;
  token: string;
}

/** Vérifie le JWT auprès de Supabase Auth (ne fait jamais confiance à un id envoyé par le client). */
export async function requireUser(req: Request): Promise<AuthContext> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw E.unauthorized();

  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) throw E.unauthorized();
  return { user: data.user, token };
}

/** Vérification admin CÔTÉ SERVEUR, via la table user_roles (has_role). */
export async function requireAdmin(req: Request): Promise<AuthContext> {
  const ctx = await requireUser(req);
  const { data, error } = await supabaseAdmin().rpc('has_role', { _user_id: ctx.user.id, _role: 'admin' });
  if (error || data !== true) throw E.forbidden();
  return ctx;
}
