import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

let client: SupabaseClient | null = null;

/** Client service_role : contourne la RLS. À n'utiliser que côté Edge Function, après avoir vérifié l'utilisateur. */
export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
