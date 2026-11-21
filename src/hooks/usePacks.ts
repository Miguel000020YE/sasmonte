import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CreditPack } from '@/types/database';

/** Packs actifs (lecture publique grâce à la policy "packs_select_active"). */
export function usePacks() {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from('credit_packs')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (!active) return;
        setPacks((data as CreditPack[] | null) ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { packs, loading };
}
