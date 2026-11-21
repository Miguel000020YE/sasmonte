import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Affichage uniquement : la vraie vérification admin est faite côté serveur (RLS + Edge Functions). */
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s); // pas d'appel Supabase ici (évite les blocages) : le chargement du profil est dans l'effet ci-dessous
      setSessionReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    const [p, admin] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
    ]);
    setProfile((p.data as Profile | null) ?? null);
    setIsAdmin(admin.data === true);
  }, [userId]);

  useEffect(() => {
    if (!sessionReady) return;
    setDataReady(false);
    loadProfile().finally(() => setDataReady(true));
  }, [sessionReady, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      loading: !sessionReady || !dataReady,
      refreshProfile: loadProfile,
      signOut,
    }),
    [session, profile, isAdmin, sessionReady, dataReady, loadProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return ctx;
}
