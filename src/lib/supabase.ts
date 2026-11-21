import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  throw new Error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes (voir .env.example).');
}

/** Client navigateur : clé "anon" uniquement. Toute la sécurité repose sur la RLS et les Edge Functions. */
export const supabase = createClient(url, anonKey);
