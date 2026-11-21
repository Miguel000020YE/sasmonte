import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Select } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { COUNTRIES, guessCountryFromTimezone } from '@/lib/countries';
import { supabase } from '@/lib/supabase';

/** Demande le pays après une connexion Google (le pays sert à proposer le bon moyen de paiement). */
export function CountryPrompt() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState(guessCountryFromTimezone() ?? '');
  const [saving, setSaving] = useState(false);

  if (!profile || profile.country_code) return null;

  async function save() {
    if (!code || !profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ country_code: code }).eq('id', profile.id);
    setSaving(false);
    if (error) return toast("Impossible d'enregistrer ton pays. Réessaie.", 'error');
    await refreshProfile();
  }

  return (
    <Notice kind="info" className="mb-5">
      <p className="mb-2 font-medium">Dans quel pays es-tu ?</p>
      <p className="mb-3 text-muted-foreground">Cela nous permet de te proposer le bon moyen de paiement.</p>
      <div className="flex gap-2">
        <Select value={code} onChange={(e) => setCode(e.target.value)} aria-label="Pays">
          <option value="">Choisis ton pays</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button onClick={save} loading={saving} disabled={!code}>
          Valider
        </Button>
      </div>
    </Notice>
  );
}
