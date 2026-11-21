import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const GENERIC = "Une erreur est survenue. Réessaie dans un instant.";

/** Appelle une Edge Function (JWT ajouté automatiquement) et renvoie des erreurs en français. */
export async function callFn<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const j = await error.context.json();
        throw new ApiError(j?.error?.code ?? 'UNKNOWN', j?.error?.message ?? GENERIC);
      } catch (e) {
        if (e instanceof ApiError) throw e;
      }
      throw new ApiError('UNKNOWN', GENERIC);
    }
    throw new ApiError('NETWORK', 'Connexion impossible. Vérifie ton réseau et réessaie.');
  }
  return data as T;
}

export const errorMessage = (e: unknown): string => (e instanceof Error && e.message ? e.message : GENERIC);
